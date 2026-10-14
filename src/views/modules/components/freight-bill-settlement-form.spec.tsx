// @vitest-environment jsdom

import type { FormInstance } from 'antd'
import { Form } from 'antd'
import dayjs from 'dayjs'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { freightOperationsPageConfigs } from '@/config/business-pages/operations/freight-operations'
import { buildFormControlId } from '@/utils/form-control-id'
import { ModuleEditorFormSection } from '@/views/modules/components/ModuleEditorFormSection'

/**
 * 新建物流单「结算方式」联动的渲染级回归。
 *
 * <p>覆盖三件容易悄悄坏掉的事：
 * 1. 结算方式控件必须真的把值写进表单（Form.Item 通过 cloneElement 注入 value/onChange，
 *    返回自定义组件元素会变成非受控——仓库里踩过一次，控件只显示标签但表单没值）；
 * 2. 固定运费金额只在固定运费模式出现，且未填/0/负数都有明确文案；
 * 3. 从固定运费切回按吨位时，上一模式的必填错误必须消失且不拦住提交。</p>
 */

const config = freightOperationsPageConfigs['freight-bill']

function EditorForm({ form }: { form: FormInstance }) {
  return createElement(
    Form,
    { form, layout: 'vertical' },
    createElement(ModuleEditorFormSection, {
      config,
      moduleKey: 'freight-bill',
      actions: {
        canSave: true,
        canAudit: false,
        saving: false,
        visible: false,
        onCancel: () => {},
        onSave: () => {},
      },
      editorState: { isEdit: false, lineItemsLocked: false },
      lockedLineItemsNotice: '',
    }),
  )
}

describe('新建物流单结算方式联动', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    // antd Row/Col 走 useBreakpoint，jsdom 没有 matchMedia。
    if (!window.matchMedia) {
      window.matchMedia = (query: string) =>
        ({
          matches: false,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }) as MediaQueryList
    }
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  /** 渲染真实配置驱动的表单，并把 antd 表单实例交出去用于驱动/断言校验。 */
  const renderForm = async (values: Record<string, unknown> = {}) => {
    let captured: FormInstance | undefined
    const Capture = () => {
      const [formInstance] = Form.useForm()
      captured = formInstance
      return createElement(EditorForm, { form: formInstance })
    }

    act(() => {
      root.render(createElement(Capture))
    })
    await act(async () => {
      // 补齐与结算方式无关的必填项，让校验失败只可能来自被测字段。
      captured?.setFieldsValue({
        carrierId: '9223372036854775807',
        billTime: dayjs('2026-10-14 09:00:00'),
        ...values,
      })
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    if (!captured) {
      throw new Error('表单实例未就绪')
    }
    return captured
  }

  const errorTexts = () =>
    Array.from(container.querySelectorAll('.ant-form-item-explain-error')).map(
      (node) => node.textContent?.trim(),
    )

  const hasField = (key: string) =>
    Boolean(
      container.querySelector(`#${buildFormControlId('module-form', key)}`),
    )

  const clickSegmented = async (label: string) => {
    const item = Array.from(
      container.querySelectorAll('.ant-segmented-item'),
    ).find((node) => node.textContent?.trim() === label)
    if (!item) {
      throw new Error(`未找到分段选项：${label}`)
    }
    await act(async () => {
      item.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  const flush = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  const expectValidationFails = async (form: FormInstance) => {
    await act(async () => {
      await expect(form.validateFields()).rejects.toBeTruthy()
    })
    await flush()
  }

  it('默认按吨位：结算方式渲染两个选项，固定运费金额不出现', async () => {
    await renderForm({ settlementMode: 'BY_TONNAGE', unitPrice: 100 })

    expect(container.textContent).toContain('结算方式')
    expect(container.textContent).toContain('按吨位结算')
    expect(container.textContent).toContain('固定运费')
    expect(hasField('fixedFreightAmount')).toBe(false)
    // 单价在按吨位模式下就是结算依据，不该出现「不是结算依据」的提示。
    expect(container.textContent).not.toContain('不作为结算依据')
  })

  it('切到固定运费：控件把值写进表单，固定运费金额出现并标注单价非结算依据', async () => {
    const form = await renderForm({
      settlementMode: 'BY_TONNAGE',
      unitPrice: 100,
    })

    await clickSegmented('固定运费')

    // 控件真的受控：值进了表单，而不是只换了个高亮。
    expect(form.getFieldValue('settlementMode')).toBe('FIXED')
    expect(hasField('fixedFreightAmount')).toBe(true)
    expect(container.textContent).toContain('不作为结算依据')
    // 单价在固定运费模式下仍必填（后端 NOT NULL），字段不能被藏掉。
    expect(hasField('unitPrice')).toBe(true)
  })

  it('固定运费未填金额：报必填文案', async () => {
    const form = await renderForm({ settlementMode: 'FIXED', unitPrice: 100 })

    await expectValidationFails(form)

    expect(errorTexts()).toContain('请输入固定运费金额（元）')
  })

  it.each([
    ['0', 0],
    ['负数', -20],
  ])('固定运费填 %s：报「大于 0」文案', async (_label, amount) => {
    const form = await renderForm({
      settlementMode: 'FIXED',
      unitPrice: 100,
      fixedFreightAmount: amount,
    })

    await expectValidationFails(form)

    expect(errorTexts()).toContain('固定运费结算必须填写大于 0 的固定运费金额')
  })

  it('切回按吨位：清除上一模式的必填错误且不再拦住提交', async () => {
    const form = await renderForm({ settlementMode: 'FIXED', unitPrice: 100 })

    // 先制造固定运费模式下的必填错误。
    await expectValidationFails(form)
    expect(errorTexts()).toContain('请输入固定运费金额（元）')

    // 切回按吨位后：字段卸载、错误消失、校验通过（不会被不存在的金额拦住）。
    await act(async () => {
      form.setFieldsValue({ settlementMode: 'BY_TONNAGE' })
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(hasField('fixedFreightAmount')).toBe(false)
    expect(errorTexts()).not.toContain('请输入固定运费金额（元）')
    await act(async () => {
      await expect(form.validateFields()).resolves.toBeTruthy()
    })
  })

  it('固定运费填有效值：校验通过', async () => {
    const form = await renderForm({
      settlementMode: 'FIXED',
      unitPrice: 100,
      fixedFreightAmount: 1500,
    })

    await act(async () => {
      const values = await form.validateFields()
      expect(values.fixedFreightAmount).toBe(1500)
    })
    expect(errorTexts()).toEqual([])
  })
})
