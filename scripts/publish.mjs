import { execFileSync, execSync } from 'node:child_process'
import { readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ENV_FILE = '.env.publish'
const UPLOAD_TIMEOUT_MS = 180_000

function fail(message) {
  console.error(`\n✖ ${message}`)
  process.exit(1)
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function createVersion(date) {
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `${day}-${time}`
}

// 从 Git Bash 调用时 PATH 里可能先命中 GNU tar，它会把 C:\ 误判为远程主机；
// Windows 自带的 bsdtar 才能正确处理绝对路径。
function resolveTarCommand() {
  if (process.platform !== 'win32') return 'tar'
  const systemRoot = process.env.SystemRoot
  if (!systemRoot) fail('无法定位 SystemRoot，找不到 Windows 自带的 tar。')
  return join(systemRoot, 'System32', 'tar.exe')
}

try {
  process.loadEnvFile(ENV_FILE)
} catch {
  fail(`未找到 ${ENV_FILE}，请从 deploy/publish.env.example 复制并填写 DEPLOY_URL / DEPLOY_TOKEN。`)
}

const deployUrl = process.env.DEPLOY_URL
const deployToken = process.env.DEPLOY_TOKEN

if (!deployUrl || !deployToken) {
  fail(`${ENV_FILE} 缺少 DEPLOY_URL 或 DEPLOY_TOKEN。`)
}

let endpoint
try {
  endpoint = new URL(deployUrl)
} catch {
  fail(`DEPLOY_URL 不是合法 URL：${deployUrl}`)
}
if (endpoint.protocol !== 'http:' && endpoint.protocol !== 'https:') {
  fail(`DEPLOY_URL 必须以 http:// 或 https:// 开头：${deployUrl}`)
}

// DEPLOY_URL 是钩子服务的根地址；反向代理场景下也可以带统一前缀。
const hookUrl = new URL(endpoint.origin)
hookUrl.pathname = `${endpoint.pathname.replace(/\/+$/, '')}/deploy`

const buildTime = new Date()
const version = createVersion(buildTime)

console.log(`\n▸ [1/3] 构建 ${version}`)
try {
  execSync('pnpm build', {
    stdio: 'inherit',
    env: { ...process.env, BUILD_TIME: buildTime.toISOString() },
  })
} catch {
  fail('构建失败，未上传任何文件。')
}

const archivePath = join(tmpdir(), `table-arcades-${version}.tar.gz`)

try {
  console.log('▸ [2/3] 打包 dist')
  try {
    execFileSync(resolveTarCommand(), ['-czf', archivePath, '-C', 'dist', '.'], {
      stdio: 'inherit',
    })
  } catch (error) {
    fail(`打包失败：${error.message}`)
  }

  const { size } = await stat(archivePath)
  console.log(
    `▸ [3/3] 上传 ${(size / 1024 / 1024).toFixed(2)} MB → ${endpoint.origin}${hookUrl.pathname}`,
  )

  let response
  try {
    response = await fetch(hookUrl, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${deployToken}`,
        'content-type': 'application/octet-stream',
      },
      body: await readFile(archivePath),
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    })
  } catch (error) {
    fail(
      `连接部署钩子失败：${error.message}\n  请检查 DEPLOY_URL、服务器端口是否放行、部署服务是否运行。`,
    )
  }

  const raw = await response.text()
  let payload = null
  try {
    payload = JSON.parse(raw)
  } catch {
    // 非 JSON 响应会作为原文附在错误信息里。
  }

  if (!response.ok) {
    fail(`部署失败（HTTP ${response.status}）：${payload?.error ?? raw}`)
  }
  if (!payload?.ok) {
    fail(`部署钩子返回异常响应：${raw}`)
  }

  console.log(`\n✔ 已发布 ${payload.version}`)
  console.log(`  服务器当前版本：${payload.current ?? payload.version}`)
  console.log(`  上一版本：${payload.previous ?? '无'}`)
} finally {
  await rm(archivePath, { force: true })
}