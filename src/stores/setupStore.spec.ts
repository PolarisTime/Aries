import { beforeEach, describe, expect, it } from 'vitest'
import { useSetupStore } from './setupStore'

describe('setupStore', () => {
  beforeEach(() => {
    useSetupStore.setState({ status: null })
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
})
