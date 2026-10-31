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
  /ResizeObserver loop/i,
  /Failed to load resource: the server responded with a status of 4\d\d/,
]

/**
 * antd 开发期废弃写法告警（`Warning: [antd: Modal] 'autoFocusButton' is deprecated. ...`）。
 *
 * <p>**不再当良性忽略**：这条曾经被放进 BENIGN 列表，结果「运行时用了已废弃 API」在 e2e 里
 * 永远绿。现在出现即让该用例失败，并把原文附到 Playwright 报告；antd CLI 只看 JSX 属性，
 * 命令式 API 配置对象 / 嵌套配置对象的废弃写法（`modal.confirm({ autoFocusButton })`、
 * `preview={{ visible }}`）只有这条运行时告警能兜住。</p>
 */
const ANT_DEPRECATION_PATTERN = /\[antd: .*\].*deprecated/i

const FATAL_CONSOLE_PATTERNS =
  /Maximum update depth exceeded|The above error occurred|TypeError:|ReferenceError:|Minified React error|Cannot read properties of undefined|ChunkLoadError|Loading chunk .* failed/i

function isBenign(message: string) {
  return BENIGN_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}

export const test = base.extend<FatalErrorFixture>({
  page: async ({ page }, use, testInfo) => {
    const coverageStarted = await startE2eCoverage(page)
    await clearBrowserSession(page)
    /*
     * 收集 antd 运行时废弃告警：无论用例是否调用 assertNoFatalUiErrors 都要判定，
     * 因为「没人调断言」不该等于「废弃写法被放过」。
     */
    const deprecationWarnings: string[] = []
    page.on('console', (message) => {
      const text = message.text()
      if (ANT_DEPRECATION_PATTERN.test(text)) {
        deprecationWarnings.push(text)
      }
    })
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
    if (deprecationWarnings.length > 0) {
      await testInfo.attach('antd-deprecation-warnings', {
        body: deprecationWarnings.join('\n\n'),
        contentType: 'text/plain',
      })
      throw new Error(
        `检测到 ${deprecationWarnings.length} 条 antd 废弃写法告警（已附报告）。` +
          `antd 6 请用新 API（例如 focusable.autoFocusButton / mask.closable / Image preview.open）：\n` +
          deprecationWarnings.join('\n'),
      )
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
