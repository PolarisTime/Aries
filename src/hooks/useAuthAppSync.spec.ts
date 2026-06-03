import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  syncFromUserMock,
  clearPermissionsMock,
  loadMenusMock,
  clearMenusMock,
  reloadSupplierOptionsMock,
  reloadCustomerOptionsMock,
  reloadCarrierOptionsMock,
  reloadWarehouseOptionsMock,
  reloadMaterialCategoriesMock,
  isApiKeyTokenMock,
} = vi.hoisted(() => ({
  syncFromUserMock: vi.fn(),
  clearPermissionsMock: vi.fn(),
  loadMenusMock: vi.fn().mockResolvedValue(undefined),
  clearMenusMock: vi.fn(),
  reloadSupplierOptionsMock: vi.fn(),
  reloadCustomerOptionsMock: vi.fn(),
  reloadCarrierOptionsMock: vi.fn(),
  reloadWarehouseOptionsMock: vi.fn(),
  reloadMaterialCategoriesMock: vi.fn(),
  isApiKeyTokenMock: vi.fn().mockReturnValue(false),
}))

let authState: any = {
  token: 'test-token',
  user: { userName: 'test' },
  authReady: true,
}
let permissionState: any = {
  syncFromUser: syncFromUserMock,
  clearPermissions: clearPermissionsMock,
  can: vi.fn().mockReturnValue(false),
}
let menuState: any = { loadMenus: loadMenusMock, clearMenus: clearMenusMock }

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (state: any) => any) => selector(authState),
}))

vi.mock('@/stores/permissionStore', () => ({
  usePermissionStore: Object.assign(
    (selector: (state: any) => any) => selector(permissionState),
    { getState: () => permissionState },
  ),
}))

vi.mock('@/stores/systemMenuStore', () => ({
  useSystemMenuStore: (selector: (state: any) => any) => selector(menuState),
}))

vi.mock('@/api/carrier-options', () => ({
  reloadCarrierOptions: reloadCarrierOptionsMock,
}))
vi.mock('@/api/customer-options', () => ({
  reloadCustomerOptions: reloadCustomerOptionsMock,
}))
vi.mock('@/api/material-categories', () => ({
  reloadMaterialCategories: reloadMaterialCategoriesMock,
}))
vi.mock('@/api/supplier-options', () => ({
  reloadSupplierOptions: reloadSupplierOptionsMock,
}))
vi.mock('@/api/warehouse-options', () => ({
  reloadWarehouseOptions: reloadWarehouseOptionsMock,
}))
vi.mock('@/constants/resource-permissions', () => ({
  loadPermissionCatalog: vi.fn(),
}))
vi.mock('@/utils/auth-token', () => ({ isApiKeyToken: isApiKeyTokenMock }))
vi.mock('@/utils/logger', () => ({ logger: { warn: vi.fn() } }))

import { useAuthAppSync } from './useAuthAppSync'

describe('useAuthAppSync', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()

    authState = {
      token: 'test-token',
      user: { userName: 'test' },
      authReady: true,
    }
    permissionState = {
      syncFromUser: syncFromUserMock,
      clearPermissions: clearPermissionsMock,
      can: vi.fn().mockReturnValue(false),
    }
    loadMenusMock.mockResolvedValue(undefined)
    menuState = { loadMenus: loadMenusMock, clearMenus: clearMenusMock }
    isApiKeyTokenMock.mockReturnValue(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('syncs permissions when user is present', () => {
    renderHook(() => useAuthAppSync())
    expect(syncFromUserMock).toHaveBeenCalledWith({ userName: 'test' })
  })

  it('clears permissions when user is null', () => {
    authState = { ...authState, user: null }
    renderHook(() => useAuthAppSync())
    expect(clearPermissionsMock).toHaveBeenCalled()
  })

  it('clears menus when token is missing', () => {
    authState = { ...authState, token: null }
    renderHook(() => useAuthAppSync())
    expect(clearMenusMock).toHaveBeenCalled()
  })

  it('clears menus when token is API key', () => {
    isApiKeyTokenMock.mockReturnValue(true)
    renderHook(() => useAuthAppSync())
    expect(clearMenusMock).toHaveBeenCalled()
  })

  it('loads menus when auth is ready with valid token', async () => {
    renderHook(() => useAuthAppSync())
    await vi.advanceTimersByTimeAsync(300)
    expect(loadMenusMock).toHaveBeenCalled()
  })

  it('refreshes master data caches when auth is ready', async () => {
    renderHook(() => useAuthAppSync())
    await vi.advanceTimersByTimeAsync(300)
    expect(reloadSupplierOptionsMock).toHaveBeenCalled()
    expect(reloadCustomerOptionsMock).toHaveBeenCalled()
    expect(reloadCarrierOptionsMock).toHaveBeenCalled()
    expect(reloadWarehouseOptionsMock).toHaveBeenCalled()
    expect(reloadMaterialCategoriesMock).toHaveBeenCalled()
  })

  it('does not load menus when auth is not ready', () => {
    authState = { ...authState, authReady: false }
    renderHook(() => useAuthAppSync())
    // clearMenus IS called when authReady is false (guard clause)
    expect(clearMenusMock).toHaveBeenCalled()
    expect(loadMenusMock).not.toHaveBeenCalled()
  })

  it('does not load menus when user is null', () => {
    authState = { ...authState, user: null }
    renderHook(() => useAuthAppSync())
    expect(clearMenusMock).toHaveBeenCalled()
  })

  it('does not refresh master data when auth is not ready', () => {
    authState = { ...authState, authReady: false }
    renderHook(() => useAuthAppSync())
    expect(reloadSupplierOptionsMock).not.toHaveBeenCalled()
  })

  it('does not refresh master data when token is missing', () => {
    authState = { ...authState, token: null }
    renderHook(() => useAuthAppSync())
    expect(reloadSupplierOptionsMock).not.toHaveBeenCalled()
  })

  it('does not refresh master data when user is null', () => {
    authState = { ...authState, user: null }
    renderHook(() => useAuthAppSync())
    expect(reloadSupplierOptionsMock).not.toHaveBeenCalled()
  })

  it('logs warning when menu loading fails', async () => {
    const error = new Error('Menu load failed')
    loadMenusMock.mockRejectedValue(error)
    const loggerWarnMock = vi.fn()
    vi.mocked(await import('@/utils/logger')).logger.warn = loggerWarnMock

    renderHook(() => useAuthAppSync())
    await vi.advanceTimersByTimeAsync(300)

    await vi.waitFor(() => {
      expect(loggerWarnMock).toHaveBeenCalledWith(
        'Failed to load dynamic menus, falling back to local registry',
        error,
      )
    })
  })

  it('loads permission catalog when user has permission read access', async () => {
    permissionState = {
      ...permissionState,
      can: vi.fn().mockReturnValue(true),
    }
    renderHook(() => useAuthAppSync())
    await vi.advanceTimersByTimeAsync(300)
  })
})
