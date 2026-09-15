import { test as base, expect } from '@playwright/test'
import { clearBrowserSession } from './api-key'
import { startE2eCoverage, stopE2eCoverage } from './e2e-coverage-runtime'

interface FatalErrorFixture {
  /** 断言当前页面自加载以来没有致命前端错误（pageerror / React 崩溃 / 资源加载失败 5xx 等）。 */
  assertNoFatalUiErrors: () => Promise<void>
}

const BENIGN_ERROR_PATTERNS = [
  /Failed to read the 'localStorage' property from 'Window': Access is denied for this document/,
  /Accessing element\.ref was removed in React 19/,
  /\[antd: .*\].*deprecated/i,
  /ResizeObserver loop/i,
  /Failed to load resource: the server responded with a status of 4\d\d/,
]

const FATAL_CONSOLE_PATTERNS =
  /Maximum update depth exceeded|The above error occurred|TypeError:|ReferenceError:|Minified React error|Cannot read properties of undefined|ChunkLoadError|Loading chunk .* failed/i

function isBenign(message: string) {
  return BENIGN_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}

export const test = base.extend<FatalErrorFixture>({
  page: async ({ page }, use, testInfo) => {
    const coverageStarted = await startE2eCoverage(page)
    await clearBrowserSession(page)
    await page.addInitScript(() => {
      try {
        localStorage.setItem('leo-locale', 'zh-CN')
      } catch {
        // 浏览器内部文档（about:blank）无法访问 localStorage。
      }
    })
    try {
      await use(page)
    } finally {
      await stopE2eCoverage(page, testInfo, coverageStarted)
    }
  },
  assertNoFatalUiErrors: async ({ page }, use) => {
    const fatalErrors: string[] = []

    page.on('pageerror', (error) => {
      if (isBenign(error.message)) return
      fatalErrors.push(`pageerror: ${error.message}`)
    })

    page.on('console', (message) => {
      if (message.type() !== 'error') return
      const text = message.text()
      if (isBenign(text)) return
      if (FATAL_CONSOLE_PATTERNS.test(text)) {
        fatalErrors.push(`console: ${text}`)
      }
    })

    await use(async () => {
      expect(fatalErrors, fatalErrors.join('\n')).toEqual([])
    })
  },
})

export { expect }
