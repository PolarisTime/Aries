// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'

const { messageSuccessMock, messageWarningMock, modalConfirmMock } = vi.hoisted(
  () => ({
    messageSuccessMock: vi.fn(),
    messageWarningMock: vi.fn(),
    modalConfirmMock: vi.fn(),
  }),
)

vi.mock('@/utils/antd-app', () => ({
  message: {
    success: messageSuccessMock,
    warning: messageWarningMock,
    info: vi.fn(),
    error: vi.fn(),
  },
  modal: { confirm: modalConfirmMock },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

import { useModuleRecordActions } from '@/hooks/useModuleRecordActions'

describe('useModuleRecordActions 复制单号', () => {
  let root: Root
  let container: HTMLDivElement
  let latest: ReturnType<typeof useModuleRecordActions>
  let writeTextMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    writeTextMock = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText: writeTextMock } })
    messageSuccessMock.mockReset()
    messageWarningMock.mockReset()

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.unstubAllGlobals()
  })

  const render = (
    record: ModuleRecord,
    props: { primaryNoKey?: string; isReadOnly?: boolean } = {},
  ) => {
    function Probe() {
      latest = useModuleRecordActions({
        moduleKey: 'sales-order',
        primaryNoKey: props.primaryNoKey ?? 'docNo',
        isReadOnly: props.isReadOnly ?? false,
        onAttach: vi.fn(),
        onDetail: vi.fn(),
      })
      return null
    }
    act(() => {
      root.render(createElement(Probe))
    })
    return latest.buildActions(record)
  }

  it('有单号时渲染「复制单号」菜单项', () => {
    const actions = render({ id: '9', docNo: 'XS-2024-001' })

    const copyAction = actions.find((action) => action.key === 'copy-doc-no')
    expect(copyAction).toBeDefined()
    expect(copyAction?.label).toBe('hooks.recordActions.copyDocNo')
  })

  it('点击写入剪贴板并提示成功', async () => {
    const actions = render({ id: '9', docNo: ' XS-2024-001 ' })

    await act(async () => {
      actions.find((action) => action.key === 'copy-doc-no')?.onClick()
      await Promise.resolve()
    })

    expect(writeTextMock).toHaveBeenCalledWith('XS-2024-001')
    expect(messageSuccessMock).toHaveBeenCalledWith(
      'hooks.recordActions.copyDocNoSuccess',
    )
  })

  it('无单号时不渲染该项（也不回落到 id）', () => {
    expect(
      render({ id: '9' }).some((action) => action.key === 'copy-doc-no'),
    ).toBe(false)
    expect(
      render({ id: '9', docNo: '   ' }).some(
        (action) => action.key === 'copy-doc-no',
      ),
    ).toBe(false)
  })

  it('未配置 primaryNoKey 时不渲染该项', () => {
    const actions = render({ id: '9', docNo: 'XS-2024-001' })
    // 上面默认配置了 primaryNoKey，这里单独验证未配置的场景
    function Probe() {
      latest = useModuleRecordActions({
        moduleKey: 'sales-order',
        onAttach: vi.fn(),
      })
      return null
    }
    act(() => {
      root.render(createElement(Probe))
    })

    const actionsWithoutKey = latest.buildActions({
      id: '9',
      docNo: 'XS-2024-001',
    })
    expect(
      actionsWithoutKey.some((action) => action.key === 'copy-doc-no'),
    ).toBe(false)
    expect(actions.some((action) => action.key === 'copy-doc-no')).toBe(true)
  })

  it('只读单据仍可复制单号', () => {
    const actions = render(
      { id: '9', docNo: 'XS-2024-001' },
      { isReadOnly: true },
    )

    expect(actions.some((action) => action.key === 'copy-doc-no')).toBe(true)
    // 只读时不再展示编辑等写操作
    expect(actions.some((action) => action.key === 'attach')).toBe(false)
  })

  it('剪贴板不可用时提示失败', async () => {
    writeTextMock.mockRejectedValue(new Error('denied'))
    const actions = render({ id: '9', docNo: 'XS-2024-001' })

    await act(async () => {
      actions.find((action) => action.key === 'copy-doc-no')?.onClick()
      await Promise.resolve()
    })

    expect(messageWarningMock).toHaveBeenCalledWith(
      'hooks.recordActions.copyDocNoFailed',
    )
  })
})
