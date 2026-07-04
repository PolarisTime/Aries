import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from '@/constants/storage'
import { useSetupStore } from './setupStore'

describe('setupStore', () => {
  afterEach(() => {
    useSetupStore.setState({ status: null })
    useSetupStore.persist.clearStorage()
  })

  beforeEach(() => {
    localStorage.clear()
    useSetupStore.setState({ status: null })
    useSetupStore.persist.clearStorage()
  })

  it('starts with an empty setup status', () => {
    expect(useSetupStore.getState().status).toBeNull()
  })

  it('sets setup status', () => {
    useSetupStore.getState().setStatus({ setupRequired: true })

    expect(useSetupStore.getState().status).toEqual({ setupRequired: true })
  })

  it('clears setup status', () => {
    useSetupStore.getState().setStatus({ setupRequired: false })
    useSetupStore.getState().clearStatus()

    expect(useSetupStore.getState().status).toBeNull()
  })

  it('persists setup status to localStorage', () => {
    useSetupStore.getState().setStatus({ setupRequired: true })

    expect(localStorage.getItem(STORAGE_KEYS.setupStatus)).toContain(
      'setupRequired',
    )
  })

  it('rehydrates setup status from localStorage', () => {
    localStorage.setItem(
      STORAGE_KEYS.setupStatus,
      JSON.stringify({
        state: { status: { setupRequired: true } },
        version: 1,
      }),
    )

    useSetupStore.persist.rehydrate()

    expect(useSetupStore.getState().status).toEqual({ setupRequired: true })
  })

  it('recovers invalid persisted setup status', () => {
    localStorage.setItem(
      STORAGE_KEYS.setupStatus,
      JSON.stringify({
        state: { status: { setupRequired: 'yes' } },
        version: 1,
      }),
    )

    useSetupStore.persist.rehydrate()

    expect(useSetupStore.getState().status).toBeNull()
  })
})
