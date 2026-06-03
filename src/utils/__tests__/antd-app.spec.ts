import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bindAntdAppApi, message, modal } from '../antd-app'

const staticModalDestroyAll = vi.fn()

vi.mock('antd/es/modal', () => ({
  default: {
    confirm: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    destroyAll: (...args: unknown[]) => staticModalDestroyAll(...args),
  },
}))

const mockMessageApi = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  loading: vi.fn(),
  destroy: vi.fn(),
  open: vi.fn(),
}

const mockModalApi = {
  confirm: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  destroyAll: vi.fn(),
}

const mockAntdAppApi = {
  message: mockMessageApi,
  modal: mockModalApi,
  notification: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    open: vi.fn(),
    destroy: vi.fn(),
  },
}

describe('antd-app', () => {
  beforeEach(() => {
    bindAntdAppApi(null)
    vi.clearAllMocks()
  })

  describe('bindAntdAppApi', () => {
    it('binds API for subsequent calls', () => {
      bindAntdAppApi(mockAntdAppApi as any)
      message.success('hello')
      expect(mockMessageApi.success).toHaveBeenCalledWith('hello')
    })

    it('clears API when null is passed', () => {
      bindAntdAppApi(mockAntdAppApi as any)
      bindAntdAppApi(null)
      modal.confirm({ title: 'test' })
      expect(mockModalApi.confirm).not.toHaveBeenCalled()
    })
  })

  describe('message', () => {
    it('calls success on bound API', () => {
      bindAntdAppApi(mockAntdAppApi as any)
      message.success('ok')
      expect(mockMessageApi.success).toHaveBeenCalledWith('ok')
    })

    it('calls error on bound API', () => {
      bindAntdAppApi(mockAntdAppApi as any)
      message.error('fail')
      expect(mockMessageApi.error).toHaveBeenCalledWith('fail')
    })

    it('calls warning on bound API', () => {
      bindAntdAppApi(mockAntdAppApi as any)
      message.warning('warn')
      expect(mockMessageApi.warning).toHaveBeenCalledWith('warn')
    })

    it('calls info on bound API', () => {
      bindAntdAppApi(mockAntdAppApi as any)
      message.info('info')
      expect(mockMessageApi.info).toHaveBeenCalledWith('info')
    })

    it('calls loading on bound API', () => {
      bindAntdAppApi(mockAntdAppApi as any)
      message.loading('load')
      expect(mockMessageApi.loading).toHaveBeenCalledWith('load')
    })

    it('calls destroy on bound API', () => {
      bindAntdAppApi(mockAntdAppApi as any)
      message.destroy()
      expect(mockMessageApi.destroy).toHaveBeenCalled()
    })

    it('returns undefined when no API bound (falls back to dynamic import)', () => {
      const result = message.success('test')
      expect(result).toBeUndefined()
    })
  })

  describe('modal', () => {
    it('calls confirm on bound API', () => {
      bindAntdAppApi(mockAntdAppApi as any)
      modal.confirm({ title: 'confirm' })
      expect(mockModalApi.confirm).toHaveBeenCalledWith({ title: 'confirm' })
    })

    it('calls info on bound API', () => {
      bindAntdAppApi(mockAntdAppApi as any)
      modal.info({ title: 'info' })
      expect(mockModalApi.info).toHaveBeenCalledWith({ title: 'info' })
    })

    it('calls success on bound API', () => {
      bindAntdAppApi(mockAntdAppApi as any)
      modal.success({ title: 'success' })
      expect(mockModalApi.success).toHaveBeenCalledWith({ title: 'success' })
    })

    it('calls warning on bound API', () => {
      bindAntdAppApi(mockAntdAppApi as any)
      modal.warning({ title: 'warning' })
      expect(mockModalApi.warning).toHaveBeenCalledWith({ title: 'warning' })
    })

    it('calls error on bound API', () => {
      bindAntdAppApi(mockAntdAppApi as any)
      modal.error({ title: 'error' })
      expect(mockModalApi.error).toHaveBeenCalledWith({ title: 'error' })
    })

    it('calls destroyAll via static modal import', () => {
      modal.destroyAll()
      expect(staticModalDestroyAll).toHaveBeenCalled()
    })
  })
})
