// @vitest-environment jsdom

import { act, createElement, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { ModulePageConfig } from '@/types/module-page'
import type { WorkspaceFormApi } from '@/views/modules/module-editor-workspace-support'

const feedback = vi.hoisted(() => ({
  warning: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
}))

vi.mock('@/utils/antd-app', () => ({ message: feedback }))

import { useEditorWizard } from './use-editor-wizard'

const THREE_STEP_CONFIG = {
  key: 'project',
  title: '项目资料',
  primaryNoKey: 'projectCode',
  formSteps: [
    { title: '基本信息' },
    { title: '取价与价格规定' },
    { title: '范围与比价配置' },
  ],
  formFields: [
    {
      key: 'projectCode',
      label: '项目编码',
      type: 'input',
      formStep: 1,
      required: true,
      disabled: true,
    },
    {
      key: 'projectName',
      label: '项目名称',
      type: 'input',
      formStep: 1,
      required: true,
    },
    {
      key: 'pricePeriodPolicy',
      label: '取价时段策略',
      type: 'select',
      formStep: 2,
    },
    {
      key: 'pricePeriodFixed',
      label: '固定取价时段',
      type: 'select',
      formStep: 2,
      validate: (value: unknown, form?: Record<string, unknown>) =>
        form?.pricePeriodPolicy === 'FIXED' && !value
          ? '选择「固定时段」时必须选择具体取价时段'
          : null,
    },
    {
      key: 'allowedBrands',
      label: '允许品牌',
      type: 'multiSelect',
      formStep: 3,
    },
  ],
  columns: [],
  filters: [],
  detailFields: [],
} as unknown as ModulePageConfig

describe('useEditorWizard 向导控制器', () => {
  let container: HTMLDivElement
  let root: Root
  let formValues: Record<string, unknown>
  let form: WorkspaceFormApi
  let overlayBody: HTMLDivElement
  let latest: ReturnType<typeof useEditorWizard>

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    feedback.warning.mockReset()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    overlayBody = document.createElement('div')
    overlayBody.scrollTop = 260
    formValues = {
      projectCode: 'PRJ-001',
      projectName: '测试项目',
      pricePeriodPolicy: 'AUTO',
      pricePeriodFixed: '',
    }
    form = {
      validateFields: vi.fn(() => Promise.resolve({ ...formValues })),
      getFieldsValue: vi.fn(() => ({ ...formValues })),
      setFieldsValue: vi.fn(),
      resetFields: vi.fn(),
      focusField: vi.fn(),
    }
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  function renderWizard(props: { recordId?: string; isEdit?: boolean }) {
    function Probe() {
      const bodyRef = useRef<HTMLDivElement | null>(overlayBody)
      latest = useEditorWizard({
        config: THREE_STEP_CONFIG,
        moduleKey: 'project',
        recordId: props.recordId,
        isEdit: props.isEdit ?? false,
        form,
        overlayBodyRef: bodyRef,
      })
      return null
    }
    act(() => {
      root.render(createElement(Probe))
    })
  }

  it('编辑态允许直接跨步跳转，切步后将滚动容器回顶，并在切换记录或重开时重置到第 1 步', async () => {
    renderWizard({ recordId: '101', isEdit: true })
    expect(latest.currentStep).toBe(0)

    await act(async () => {
      await latest.goToStep(2)
    })
    expect(latest.currentStep).toBe(2)
    expect(overlayBody.scrollTop).toBe(0)
    // 编辑态直跳不阻塞于 validateFields
    expect(form.validateFields).not.toHaveBeenCalled()

    // 切换到另一条记录时自动回到第 1 步（纯派生归零）
    renderWizard({ recordId: '102', isEdit: true })
    expect(latest.currentStep).toBe(0)

    // 先切到第 2 步，模拟弹层关闭卸载后重新挂载，必须回到第 1 步
    await act(async () => {
      await latest.goToStep(1)
    })
    expect(latest.currentStep).toBe(1)
    act(() => {
      root.render(null)
    })
    renderWizard({ recordId: '102', isEdit: true })
    expect(latest.currentStep).toBe(0)
  })

  it('新建态跨步跳转：第 2 步无校验错误时可从第 1 步直达第 3 步；有错误时自动停在第 2 步并定位', async () => {
    renderWizard({ isEdit: false })

    // 第 2 步为 AUTO（无阻塞）→ 校验第 1 步通过后直达第 3 步
    await act(async () => {
      await latest.goToStep(2)
    })
    expect(form.validateFields).toHaveBeenCalledWith(['projectName'])
    expect(latest.currentStep).toBe(2)

    // 回到第 1 步并把第 2 步改为 FIXED 但未选具体时段
    await act(async () => {
      await latest.goToStep(0)
    })
    formValues.pricePeriodPolicy = 'FIXED'
    formValues.pricePeriodFixed = ''

    await act(async () => {
      await latest.goToStep(2)
    })
    expect(latest.currentStep).toBe(1)
    expect(feedback.warning).toHaveBeenCalledWith(
      '选择「固定时段」时必须选择具体取价时段',
    )
    expect(form.validateFields).toHaveBeenCalledWith(['pricePeriodFixed'])
    expect(form.focusField).toHaveBeenCalledWith('pricePeriodFixed')
  })

  it('保存时跨步校验失败：focusInvalidField 自动跳回出错步骤并触发该字段标红与聚焦', async () => {
    renderWizard({ recordId: '101', isEdit: true })
    expect(latest.currentStep).toBe(0)

    await act(async () => {
      latest.focusInvalidField('pricePeriodFixed')
      await Promise.resolve()
    })

    expect(latest.currentStep).toBe(1)
    expect(form.validateFields).toHaveBeenCalledWith(['pricePeriodFixed'])
    expect(form.focusField).toHaveBeenCalledWith('pricePeriodFixed')
  })
})
