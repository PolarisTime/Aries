// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from 'vitest'
import { DOCUMENT_STATUS } from '@/constants/status-constants'
import type { ModuleRecord } from '@/types/module-page'

const {
  forceCloseMock,
  cancelMock,
  confirmMock,
  successMock,
  hasPermissionMock,
  validateFieldsMock,
} = vi.hoisted(() => ({
  forceCloseMock: vi.fn(),
  cancelMock: vi.fn(),
  confirmMock: vi.fn(),
  successMock: vi.fn(),
  hasPermissionMock: vi.fn(() => true),
  validateFieldsMock: vi.fn(() => Promise.resolve({ reason: '剩余 1 件报废' })),
}))

vi.mock('@/api/purchase/purchase-order-force-close', () => ({
  forceClosePurchaseOrder: forceCloseMock,
  cancelPurchaseOrderForceClose: cancelMock,
}))

vi.mock('@/utils/antd-app', () => ({
  message: { success: successMock, warning: vi.fn(), error: vi.fn() },
  modal: { confirm: confirmMock },
}))

vi.mock('@/hooks/usePermission', () => ({
  useHasPermission: hasPermissionMock,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>()
  return {
    ...actual,
    Form: Object.assign(actual.Form, {
      useForm: () => [
        { validateFields: validateFieldsMock, resetFields: vi.fn() },
      ],
    }),
  }
})

import { PurchaseOrderForceCloseAction } from './PurchaseOrderForceCloseAction'

function record(overrides: Partial<ModuleRecord> = {}): ModuleRecord {
  return {
    id: '363907829455855616',
    orderNo: '363907829455855616',
    status: DOCUMENT_STATUS.AUDITED,
    ...overrides,
  }
}

function findButton(container: HTMLElement, label: string) {
  return Array.from(container.querySelectorAll('button')).find(
    (button) => button.textContent === label,
  )
}

describe('PurchaseOrderForceCloseAction', () => {
  let container: HTMLDivElement
  let root: Root
  let refreshMock: Mock<() => Promise<void>>

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    forceCloseMock.mockReset().mockResolvedValue({})
    cancelMock.mockReset().mockResolvedValue(undefined)
    confirmMock.mockReset()
    successMock.mockReset()
    hasPermissionMock.mockReset().mockReturnValue(true)
    validateFieldsMock
      .mockReset()
      .mockResolvedValue({ reason: '剩余 1 件报废' })
    refreshMock = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const render = (rows: ModuleRecord[]) => {
    act(() => {
      root.render(
        createElement(PurchaseOrderForceCloseAction, {
          selectedRows: rows,
          refreshModuleQueries: refreshMock,
        }),
      )
    })
  }

  it('无权限时不渲染任何入口', () => {
    hasPermissionMock.mockReturnValue(false)

    render([record()])

    expect(container.querySelector('button')).toBeNull()
  })

  it('已审核订单可结单; 未选中或非已审核时按钮禁用', () => {
    render([record()])
    expect(
      findButton(container, 'modules.purchaseForceClose.action')?.disabled,
    ).toBe(false)

    render([])
    expect(
      findButton(container, 'modules.purchaseForceClose.action')?.disabled,
    ).toBe(true)

    render([record({ status: DOCUMENT_STATUS.DRAFT })])
    expect(
      findButton(container, 'modules.purchaseForceClose.action')?.disabled,
    ).toBe(true)
  })

  it('结单弹窗确认后提交原因并刷新列表', async () => {
    render([record()])

    act(() => {
      findButton(container, 'modules.purchaseForceClose.action')?.click()
    })
    expect(confirmMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      await confirmMock.mock.calls[0][0].onOk()
    })

    expect(forceCloseMock).toHaveBeenCalledWith(
      '363907829455855616',
      '剩余 1 件报废',
    )
    expect(successMock).toHaveBeenCalledWith(
      'modules.purchaseForceClose.success',
    )
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })

  it('未强制结单时不出现撤销入口; 结单后出现且可撤销', async () => {
    render([record()])
    expect(
      findButton(container, 'modules.purchaseForceClose.cancelAction'),
    ).toBeUndefined()

    render([
      record({
        status: DOCUMENT_STATUS.PURCHASE_COMPLETED,
        forceClose: { reason: '剩余 1 件报废', remainingQuantity: 1 },
      }),
    ])
    const cancelButton = findButton(
      container,
      'modules.purchaseForceClose.cancelAction',
    )
    expect(cancelButton).toBeTruthy()
    // 已强制结单的订单不能再结一次
    expect(
      findButton(container, 'modules.purchaseForceClose.action')?.disabled,
    ).toBe(true)

    await act(async () => {
      cancelButton?.click()
      await Promise.resolve()
    })

    expect(cancelMock).toHaveBeenCalledWith('363907829455855616')
    expect(successMock).toHaveBeenCalledWith(
      'modules.purchaseForceClose.cancelSuccess',
    )
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })

  it('提交失败时保留弹窗结果且不误报成功', async () => {
    forceCloseMock.mockRejectedValue(new Error('剩余件数已被销售占用'))
    render([record()])

    act(() => {
      findButton(container, 'modules.purchaseForceClose.action')?.click()
    })

    await act(async () => {
      await expect(confirmMock.mock.calls[0][0].onOk()).rejects.toThrow()
    })

    expect(successMock).not.toHaveBeenCalled()
    expect(refreshMock).not.toHaveBeenCalled()
  })
})
