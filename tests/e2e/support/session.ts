import type { Page } from '@playwright/test'
import type { MockLoginUser } from './mock-api'

const STORAGE_KEYS = {
  token: 'aries-token',
  user: 'aries-user',
  authPersistence: 'aries-auth-persistence',
  e2eMode: 'aries-e2e-mode',
} as const

export async function primeAuthSession(page: Page, user: MockLoginUser) {
  await page.addInitScript(({ storageKeys, currentUser }) => {
    localStorage.setItem(storageKeys.token, 'mock-access-token')
    localStorage.setItem(storageKeys.user, JSON.stringify(currentUser))
    localStorage.setItem(storageKeys.authPersistence, 'local')
    localStorage.setItem(storageKeys.e2eMode, '1')
  }, {
    storageKeys: STORAGE_KEYS,
    currentUser: user,
  })
}
