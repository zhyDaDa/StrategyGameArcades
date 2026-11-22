#!/usr/bin/env python3
"""TABLE 静态站点部署钩子（仅依赖 Python 3 标准库）。

直接部署到 1Panel 站点目录：
/opt/1panel/www/sites/strategy-game-arcade.zhydada.com/index
每次先解压到同级临时目录，校验成功后原子替换 index 目录，只保留一份。
"""

import hmac
import json
import os
import shutil
import sys
import tarfile
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

TOKEN = os.environ.get("DEPLOY_TOKEN", "")
HOST = os.environ.get("DEPLOY_HOST", "0.0.0.0")
PORT = int(os.environ.get("DEPLOY_PORT", "28443"))
SITE_DIR = os.path.realpath(
    os.environ.get(
        "DEPLOY_SITE_DIR",
        "/opt/1panel/www/sites/strategy-game-arcade.zhydada.com/index",
    )
)
MAX_ARCHIVE_BYTES = int(os.environ.get("DEPLOY_MAX_BYTES", str(200 * 1024 * 1024)))

STAGE_PARENT = os.path.dirname(SITE_DIR)
DEPLOY_LOCK = threading.Lock()


class DeployError(Exception):
    pass


def current_release():
    if not os.path.isfile(os.path.join(SITE_DIR, "index.html")):
        return None
    return "latest"


def deploy(archive_path):
    with DEPLOY_LOCK:
        staging = tempfile.mkdtemp(prefix=".deploy-", dir=STAGE_PARENT)
        retired = SITE_DIR + ".retired"
        staging_moved = False
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
                        archive.extractall(staging, filter="data")
                    except TypeError:
                        archive.extractall(staging)
            except (tarfile.TarError, OSError) as exc:
                raise DeployError("解压失败：%s" % exc)

            if not os.path.isfile(os.path.join(staging, "index.html")):
                raise DeployError("压缩包根目录缺少 index.html")

            for dirpath, _dirnames, filenames in os.walk(staging):
                os.chmod(dirpath, 0o755)
                for name in filenames:
                    os.chmod(os.path.join(dirpath, name), 0o644)

            shutil.rmtree(retired, ignore_errors=True)
            had_site = os.path.exists(SITE_DIR)
            if had_site:
                os.rename(SITE_DIR, retired)
            try:
                os.rename(staging, SITE_DIR)
            except OSError:
                if had_site:
                    os.rename(retired, SITE_DIR)
                raise
            staging_moved = True
            if had_site:
                shutil.rmtree(retired, ignore_errors=True)
            return "latest"
        finally:
            if not staging_moved:
                shutil.rmtree(staging, ignore_errors=True)


class DeployHandler(BaseHTTPRequestHandler):
    server_version = "TableDeploy/3"
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
        self.send_json(200, {"ok": True, "current": current_release()})

    def do_POST(self):
        if urlparse(self.path).path != "/deploy":
            self.send_json(404, {"ok": False, "error": "not found"})
            return

        if not self.is_authorized():
            self.send_json(401, {"ok": False, "error": "unauthorized"}, close=True)
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
            dir=STAGE_PARENT, prefix=".upload-", suffix=".tar.gz", delete=False
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

            current = deploy(archive_path)
            print("deployed %s" % current, flush=True)
            self.send_json(200, {"ok": True, "current": current})
        except DeployError as exc:
            self.send_json(400, {"ok": False, "error": str(exc)}, close=True)
        except Exception as exc:  # noqa: BLE001
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

    if not os.path.isdir(STAGE_PARENT):
        sys.exit("站点目录不存在：%s" % STAGE_PARENT)

    server = ThreadingHTTPServer((HOST, PORT), DeployHandler)
    print("deploy hook listening on %s:%s (site=%s)" % (HOST, PORT, SITE_DIR), flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()