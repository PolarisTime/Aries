import { test as base, expect } from '@playwright/test'
import { clearBrowserSession } from './api-key'
import { startE2eCoverage, stopE2eCoverage } from './e2e-coverage-runtime'

interface FatalErrorFixture {
  assertNoFatalUiErrors: () => Promise<void>
}

export const test = base.extend<FatalErrorFixture>({
  page: async ({ page }, applyFixture, testInfo) => {
    const coverageStarted = await startE2eCoverage(page)
    await clearBrowserSession(page)
    await page.addInitScript(() => {
      try {
        localStorage.setItem('leo-locale', 'zh-CN')
      } catch {
        // 浏览器内部文档可能无法访问 localStorage。
      }
    })
    try {
      await applyFixture(page)
    } finally {
      await stopE2eCoverage(page, testInfo, coverageStarted)
    }
  },
  assertNoFatalUiErrors: async ({ page }, applyFixture) => {
    const fatalErrors: string[] = []
    const isBenignStorageAccessError = (message: string) =>
      /Failed to read the 'localStorage' property from 'Window': Access is denied for this document/.test(
        message,
      )

    page.on('pageerror', (error) => {
      if (isBenignStorageAccessError(error.message)) {
        return
      }

      fatalErrors.push(`pageerror: ${error.message}`)
    })

    page.on('console', (message) => {
      if (message.type() !== 'error') {
        return
      }

      const text = message.text()
      if (
        /Maximum update depth exceeded|The above error occurred|TypeError:|ReferenceError:|Minified React error|Cannot read properties of undefined/.test(
          text,
        )
      ) {
        fatalErrors.push(`console: ${text}`)
      }
    })

    await applyFixture(() =>
      Promise.resolve().then(() => {
        expect(fatalErrors, fatalErrors.join('\n')).toEqual([])
      }),
    )
  },
})

export { expect }
