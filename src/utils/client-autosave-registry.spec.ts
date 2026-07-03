import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  flushClientAutosaveHandlers,
  installClientAutosaveFlushListeners,
  registerClientAutosaveHandler,
} from './client-autosave-registry'

describe('client-autosave-registry', () => {
  const unregisters: Array<() => void> = []

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    while (unregisters.length) {
      unregisters.pop()?.()
    }
  })

  it('flushes registered autosave handlers with the trigger reason', () => {
    const handler = vi.fn()

    unregisters.push(registerClientAutosaveHandler(handler))
    flushClientAutosaveHandlers('error-boundary')

    expect(handler).toHaveBeenCalledWith('error-boundary')
  })

  it('flushes every registered autosave handler once', () => {
    const firstHandler = vi.fn()
    const secondHandler = vi.fn()

    unregisters.push(registerClientAutosaveHandler(firstHandler))
    unregisters.push(registerClientAutosaveHandler(secondHandler))

    flushClientAutosaveHandlers('items-change')

    expect(firstHandler).toHaveBeenCalledTimes(1)
    expect(firstHandler).toHaveBeenCalledWith('items-change')
    expect(secondHandler).toHaveBeenCalledTimes(1)
    expect(secondHandler).toHaveBeenCalledWith('items-change')
  })

  it('does not call an unregistered autosave handler', () => {
    const handler = vi.fn()
    const unregister = registerClientAutosaveHandler(handler)

    unregister()
    flushClientAutosaveHandlers('pagehide')

    expect(handler).not.toHaveBeenCalled()
  })

  it('keeps unregister idempotent', () => {
    const handler = vi.fn()
    const unregister = registerClientAutosaveHandler(handler)

    unregister()
    unregister()
    flushClientAutosaveHandlers('editor-change')

    expect(handler).not.toHaveBeenCalled()
  })

  it('flushes autosave handlers for global client failure events', () => {
    const handler = vi.fn()
    unregisters.push(registerClientAutosaveHandler(handler))

    const uninstall = installClientAutosaveFlushListeners()

    window.dispatchEvent(new Event('error'))
    window.dispatchEvent(new Event('unhandledrejection'))
    window.dispatchEvent(new Event('pagehide'))
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    document.dispatchEvent(new Event('visibilitychange'))

    expect(handler).toHaveBeenCalledWith('window-error')
    expect(handler).toHaveBeenCalledWith('unhandled-rejection')
    expect(handler).toHaveBeenCalledWith('pagehide')
    expect(handler).toHaveBeenCalledWith('visibility-hidden')

    handler.mockClear()
    uninstall()
    window.dispatchEvent(new Event('pagehide'))
    expect(handler).not.toHaveBeenCalled()
  })

  it('does not flush autosave handlers when visibility stays visible', () => {
    const handler = vi.fn()
    unregisters.push(registerClientAutosaveHandler(handler))
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })

    const uninstall = installClientAutosaveFlushListeners()
    document.dispatchEvent(new Event('visibilitychange'))

    expect(handler).not.toHaveBeenCalled()
    uninstall()
  })
})
