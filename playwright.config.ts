import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import {
  RESOLVED_OUTPUT_DIR_ENV,
  resolveRunOutputDir,
} from './tests/e2e/support/run-output'

const configDir = path.dirname(fileURLToPath(import.meta.url))
const localChromiumLauncher = path.resolve(
  configDir,
  'scripts/local-chromium.sh',
)
const localChromiumBinary = path.resolve(
  configDir,
  '../.local-browser/chromium/usr/lib64/chromium-browser/chromium-browser',
)

function loadLocalEnv() {
  const envPath = path.resolve(configDir, '.env.local')
  if (!fs.existsSync(envPath)) {
    return
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

loadLocalEnv()

const hasLocalChromium =
  fs.existsSync(localChromiumLauncher) && fs.existsSync(localChromiumBinary)
const e2eBackendMode = process.env.E2E_BACKEND_MODE === 'mock' ? 'mock' : 'real'
const isRealBackendMode = e2eBackendMode === 'real'
const includeDebugProject = process.env.E2E_INCLUDE_DEBUG === '1'

// outputDir 必须按 run 派生：Playwright 每次 run 启动即清空 outputDir（默认
// test-results），共用同一目录会让并发 run 互删产物（夹具被删后报 ENOENT）。
// 详见 tests/e2e/README.md「产物目录与并发」与 tests/e2e/support/run-output.ts。
const outputDir = resolveRunOutputDir()
// worker 进程会重新执行本 config，这里把主进程解析结果传给它们，避免 runner 与
// worker 各自算出不同的 pid/时间戳目录。
process.env[RESOLVED_OUTPUT_DIR_ENV] = path.resolve(configDir, outputDir)

export default defineConfig({
  testDir: './tests/e2e',
  outputDir,
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  timeout: isRealBackendMode ? 60_000 : 30_000,
  fullyParallel: !isRealBackendMode,
  workers: isRealBackendMode ? 1 : undefined,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    locale: 'zh-CN',
    trace: 'on-first-retry',
    launchOptions: {
      args: ['--no-sandbox'],
      ...(hasLocalChromium ? { executablePath: localChromiumLauncher } : {}),
    },
  },
  webServer: {
    command: isRealBackendMode
      ? 'bash ../leo/scripts/dev.sh start'
      : 'pnpm dev --host 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: true,
    timeout: isRealBackendMode ? 180_000 : 120_000,
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: [/debug-.*\.spec\.ts/, /.*-debug\.spec\.ts/],
      use: { ...devices['Desktop Chrome'] },
    },
    ...(includeDebugProject
      ? [
          {
            name: 'debug-chromium',
            testMatch: [/debug-.*\.spec\.ts/, /.*-debug\.spec\.ts/],
            use: { ...devices['Desktop Chrome'] },
          },
        ]
      : []),
  ],
})
