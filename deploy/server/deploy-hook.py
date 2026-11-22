#!/usr/bin/env python3
"""TABLE 桌游实验室静态站点部署钩子（仅依赖 Python 3 标准库）。

流程：本地 pnpm release -> POST /deploy 上传 tar.gz -> 解压到 releases/<版本>
-> 原子切换 current 软链 -> 清理超出保留数量的旧版本。
"""

import hmac
import json
import os
import re
import shutil
import sys
import tarfile
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

TOKEN = os.environ.get("DEPLOY_TOKEN", "")
HOST = os.environ.get("DEPLOY_HOST", "0.0.0.0")
PORT = int(os.environ.get("DEPLOY_PORT", "28443"))
ROOT = os.path.realpath(os.environ.get("DEPLOY_ROOT", "/opt/table-deploy"))
KEEP_RELEASES = int(os.environ.get("DEPLOY_KEEP", "5"))
MAX_ARCHIVE_BYTES = int(os.environ.get("DEPLOY_MAX_BYTES", str(200 * 1024 * 1024)))

RELEASES_DIR = os.path.join(ROOT, "releases")
CURRENT_LINK = os.path.join(ROOT, "current")
VERSION_PATTERN = re.compile(r"^[0-9A-Za-z][0-9A-Za-z._-]{0,63}$")
DEPLOY_LOCK = threading.Lock()


class DeployError(Exception):
    pass


def read_current_version():
    if not os.path.islink(CURRENT_LINK):
        return None
    resolved = os.path.realpath(CURRENT_LINK)
    if not os.path.isdir(resolved):
        return None
    return os.path.basename(resolved)


def switch_current(target):
    tmp_link = CURRENT_LINK + ".next"
    if os.path.lexists(tmp_link):
        os.remove(tmp_link)
    os.symlink(target, tmp_link)
    try:
        os.replace(tmp_link, CURRENT_LINK)
    except OSError as exc:
        raise DeployError(
            "无法切换 current 软链：%s（若 current 已存在且不是软链，请先删除它）" % exc
        )


def prune_releases():
    keep_names = {read_current_version()}
    entries = [
        name
        for name in os.listdir(RELEASES_DIR)
        if VERSION_PATTERN.fullmatch(name)
        and os.path.isdir(os.path.join(RELEASES_DIR, name))
    ]
    entries.sort(reverse=True)
    keep_names.update(entries[:KEEP_RELEASES])
    for name in entries:
        if name not in keep_names:
            shutil.rmtree(os.path.join(RELEASES_DIR, name), ignore_errors=True)


def deploy(archive_path, version):
    target = os.path.join(RELEASES_DIR, version)
    with DEPLOY_LOCK:
        if os.path.exists(target):
            raise DeployError("版本 %s 已存在，请重试" % version)

        workdir = tempfile.mkdtemp(prefix=".extract-", dir=RELEASES_DIR)
        try:
            try:
                with tarfile.open(archive_path, "r:gz") as archive:
                    members = archive.getmembers()
                    if not members:
                        raise DeployError("上传的压缩包为空")
                    for member in members:
                        if os.path.isabs(member.name) or ".." in member.name.split("/"):
                            raise DeployError("压缩包包含非法路径：%s" % member.name)
                        if not (member.isfile() or member.isdir()):
                            raise DeployError(
                                "压缩包包含不支持的文件类型：%s" % member.name
                            )
                    try:
                        archive.extractall(workdir, filter="data")
                    except TypeError:
                        archive.extractall(workdir)
            except (tarfile.TarError, OSError) as exc:
                raise DeployError("解压失败：%s" % exc)

            if not os.path.isfile(os.path.join(workdir, "index.html")):
                raise DeployError("压缩包根目录缺少 index.html")

            for dirpath, _dirnames, filenames in os.walk(workdir):
                os.chmod(dirpath, 0o755)
                for name in filenames:
                    os.chmod(os.path.join(dirpath, name), 0o644)

            os.rename(workdir, target)
        finally:
            shutil.rmtree(workdir, ignore_errors=True)

        previous = read_current_version()
        switch_current(target)
        prune_releases()
        return previous


class DeployHandler(BaseHTTPRequestHandler):
    server_version = "TableDeploy/1"
    protocol_version = "HTTP/1.1"

    def send_json(self, status, payload, close=False):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if close:
            self.send_header("Connection", "close")
            self.close_connection = True
        self.end_headers()
        self.wfile.write(body)

    def is_authorized(self):
        expected = ("Bearer " + TOKEN).encode("utf-8")
        provided = self.headers.get("Authorization", "").encode("utf-8")
        return hmac.compare_digest(provided, expected)

    def do_GET(self):
        if urlparse(self.path).path != "/health":
            self.send_json(404, {"ok": False, "error": "not found"})
            return
        self.send_json(200, {"ok": True, "current": read_current_version()})

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/deploy":
            self.send_json(404, {"ok": False, "error": "not found"})
            return

        if not self.is_authorized():
            self.send_json(401, {"ok": False, "error": "unauthorized"}, close=True)
            return

        version = parse_qs(parsed.query).get("version", [""])[0]
        if not VERSION_PATTERN.fullmatch(version):
            self.send_json(400, {"ok": False, "error": "非法版本号"}, close=True)
            return

        content_length = self.headers.get("Content-Length")
        if content_length is None:
            self.send_json(400, {"ok": False, "error": "缺少 Content-Length"}, close=True)
            return
        try:
            length = int(content_length)
        except ValueError:
            self.send_json(400, {"ok": False, "error": "非法 Content-Length"}, close=True)
            return
        if length <= 0 or length > MAX_ARCHIVE_BYTES:
            self.send_json(413, {"ok": False, "error": "压缩包大小超出限制"}, close=True)
            return

        archive = tempfile.NamedTemporaryFile(
            dir=RELEASES_DIR, prefix=".incoming-", suffix=".tar.gz", delete=False
        )
        archive_path = archive.name
        try:
            remaining = length
            while remaining > 0:
                chunk = self.rfile.read(min(remaining, 256 * 1024))
                if not chunk:
                    raise DeployError("上传中断")
                archive.write(chunk)
                remaining -= len(chunk)
            archive.close()

            previous = deploy(archive_path, version)
            print("deployed %s (previous: %s)" % (version, previous), flush=True)
            self.send_json(
                200,
                {
                    "ok": True,
                    "version": version,
                    "current": version,
                    "previous": previous,
                },
            )
        except DeployError as exc:
            self.send_json(400, {"ok": False, "error": str(exc)}, close=True)
        except Exception as exc:  # noqa: BLE001 - 必须把失败原因返回给发布端
            print("deploy failed: %s" % exc, file=sys.stderr, flush=True)
            self.send_json(500, {"ok": False, "error": "部署失败：%s" % exc}, close=True)
        finally:
            archive.close()
            try:
                os.unlink(archive_path)
            except OSError:
                pass

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def main():
    if not TOKEN:
        sys.exit("DEPLOY_TOKEN 未配置，拒绝启动")

    os.makedirs(RELEASES_DIR, exist_ok=True)
    server = ThreadingHTTPServer((HOST, PORT), DeployHandler)
    print("deploy hook listening on %s:%s (root=%s)" % (HOST, PORT, ROOT), flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()