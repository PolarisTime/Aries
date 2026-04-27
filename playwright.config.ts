import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const configDir = path.dirname(fileURLToPath(import.meta.url))
const localChromiumLauncher = path.resolve(configDir, 'scripts/local-chromium.sh')
const localChromiumBinary = path.resolve(
  configDir,
  '../.local-browser/chromium/usr/lib64/chromium-browser/chromium-browser',
)
const hasLocalChromium = fs.existsSync(localChromiumLauncher) && fs.existsSync(localChromiumBinary)
const e2eBackendMode = process.env.E2E_BACKEND_MODE === 'mock' ? 'mock' : 'real'
const isRealBackendMode = e2eBackendMode === 'real'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: isRealBackendMode ? 60_000 : 30_000,
  fullyParallel: !isRealBackendMode,
  workers: isRealBackendMode ? 1 : undefined,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
    launchOptions: {
      args: ['--no-sandbox'],
      ...(hasLocalChromium ? { executablePath: localChromiumLauncher } : {}),
    },
  },
  webServer: {
    command: isRealBackendMode
      ? 'bash ../scripts/start-local.sh'
      : 'pnpm dev --host 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: true,
    timeout: isRealBackendMode ? 180_000 : 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
