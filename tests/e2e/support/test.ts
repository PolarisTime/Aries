import { test as base, expect } from '@playwright/test'
import { clearBrowserSession } from './api-key'

interface FatalErrorFixture {
  assertNoFatalUiErrors: () => Promise<void>
}

export const test = base.extend<FatalErrorFixture>({
  page: async ({ page }, applyFixture) => {
    await clearBrowserSession(page)
    await applyFixture(page)
  },
  assertNoFatalUiErrors: async ({ page }, applyFixture) => {
    const fatalErrors: string[] = []

    page.on('pageerror', (error) => {
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
