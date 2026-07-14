import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBusinessGridOverlayPreload } from './use-business-grid-overlay-preload'

const mocks = vi.hoisted(() => ({
  loadModuleEditorWorkspace: vi.fn(),
  loadModuleRecordDetailOverlay: vi.fn(),
  useIdleActivation: vi.fn(),
  useQuery: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQuery,
}))

vi.mock('@/hooks/useIdleActivation', () => ({
  useIdleActivation: mocks.useIdleActivation,
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: {
    businessGridOverlayPreload: (name: string) => [
      'business-grid-overlay-preload',
      name,
    ],
  },
}))

vi.mock('@/views/modules/components/business-grid-overlay-loaders', () => ({
  loadModuleEditorWorkspace: mocks.loadModuleEditorWorkspace,
  loadModuleRecordDetailOverlay: mocks.loadModuleRecordDetailOverlay,
}))

describe('useBusinessGridOverlayPreload', () => {
  const editableConfig = { key: 'sales-order', readOnly: false } as any
  const readOnlyConfig = { key: 'receivable-payable', readOnly: true } as any

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useIdleActivation.mockReturnValue(true)
    mocks.loadModuleEditorWorkspace.mockResolvedValue({})
    mocks.loadModuleRecordDetailOverlay.mockResolvedValue({})
    mocks.useQuery.mockImplementation(({ enabled, queryFn }) => {
      if (enabled) {
        void queryFn()
      }
      return {}
    })
  })

  it('preloads editor and detail overlays for editable modules', () => {
    renderHook(() =>
      useBusinessGridOverlayPreload({
        canUpdateRecord: true,
        canViewRecords: true,
        config: editableConfig,
      }),
    )

    expect(mocks.useIdleActivation).toHaveBeenCalledWith(true, 2000)
    expect(mocks.loadModuleEditorWorkspace).toHaveBeenCalledTimes(1)
    expect(mocks.loadModuleRecordDetailOverlay).toHaveBeenCalledTimes(1)
  })

  it('preloads only detail overlay for read-only modules', () => {
    renderHook(() =>
      useBusinessGridOverlayPreload({
        canUpdateRecord: true,
        canViewRecords: true,
        config: readOnlyConfig,
      }),
    )

    expect(mocks.loadModuleEditorWorkspace).not.toHaveBeenCalled()
    expect(mocks.loadModuleRecordDetailOverlay).toHaveBeenCalledTimes(1)
  })

  it('preloads editor before idle activation', () => {
    mocks.useIdleActivation.mockReturnValue(false)

    renderHook(() =>
      useBusinessGridOverlayPreload({
        canUpdateRecord: true,
        canViewRecords: true,
        config: editableConfig,
      }),
    )

    expect(mocks.loadModuleEditorWorkspace).toHaveBeenCalledTimes(1)
    expect(mocks.loadModuleRecordDetailOverlay).not.toHaveBeenCalled()
  })

  it('does not preload detail without view permission', () => {
    renderHook(() =>
      useBusinessGridOverlayPreload({
        canUpdateRecord: false,
        canViewRecords: false,
        config: editableConfig,
      }),
    )

    expect(mocks.loadModuleEditorWorkspace).not.toHaveBeenCalled()
    expect(mocks.loadModuleRecordDetailOverlay).not.toHaveBeenCalled()
  })
})
