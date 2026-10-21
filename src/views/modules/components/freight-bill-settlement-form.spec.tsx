// @vitest-environment jsdom

import type { FormInstance } from 'antd'
import { Form } from 'antd'
import dayjs from 'dayjs'
import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { freightOperationsPageConfigs } from '@/config/business-pages/operations/freight-operations'
import { buildFormControlId } from '@/utils/form-control-id'
import { ModuleEditorFormArea } from '@/views/modules/components/ModuleEditorFormArea'

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

const baseProps = {
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
}

/**
 * 走**真实的** `ModuleEditorFormArea`，而不是自己搭一个 Form：layout 由它持有，
 * 自建 Form 会让「实测 vertical、代码里却是 horizontal」这类偏差永远测不出来
 * （本文件此前正是自己写死 `layout: 'vertical'`）。
 */
function EditorForm({ form }: { form: FormInstance }) {
  return createElement(ModuleEditorFormArea, {
    ...baseProps,
    form,
    onValuesChange: () => {},
  })
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

  afterEach(async () => {
    act(() => root.unmount())
    /*
     * rc 的延迟状态(useDelayState: Tooltip / Popover 一类)在 unmount 之后仍会留下一个短
     * 定时器; 一旦它晚于 jsdom 环境销毁才触发, React 会在调度入口读 window 并抛
     * "ReferenceError: window is not defined" —— 断言全过, 但整个 run 的 exit≠0(CI 判红)。
     * 这里在 jsdom 还活着的时候把它排空。
     */
    await new Promise((resolve) => setTimeout(resolve, 250))
    container.remove()
  })

  /** 渲染真实配置驱动的表单，并把 antd 表单实例交出去用于驱动/断言校验。 */
  const renderForm = async (values: Record<string, unknown> = {}) => {
    let captured: FormInstance | undefined
    const Capture = () => {
      const [formInstance] = Form.useForm()
      // 实例在 effect 里交给用例：渲染期写外部变量会被 React Compiler 判为副作用
      // （react-hooks/globals「Cannot reassign variables declared outside of the
      // component/hook」）。act 会同步冲刷 effect，render 返回后即可用。
      useEffect(() => {
        captured = formInstance
      }, [formInstance])
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

  it('标签与控件在同一行(横向布局), 且标签不带全角空格补白', async () => {
    await renderForm()
    const shell = container.querySelector('.editor-form-shell')
    expect(shell, '表单外壳应存在').not.toBeNull()
    // 方向由 antd 的 layout 类 + label/control 是否同高同一水平线共同判定
    expect(shell?.className).toContain('ant-form-horizontal')

    const item = container.querySelector('.editor-form-shell .ant-form-item')
    const label = item?.querySelector('.ant-form-item-label')
    const control = item?.querySelector('.ant-form-item-control')
    expect(label?.textContent).toBe('物流商')
    // 全角空格补白（padLabel）会产生前导空格，横向布局下应已移除
    expect(label?.textContent?.startsWith('\u3000')).toBe(false)

    const labelRect = label?.getBoundingClientRect()
    const controlRect = control?.getBoundingClientRect()
    if (labelRect && controlRect) {
      const labelCenter = labelRect.top + labelRect.height / 2
      const controlCenter = controlRect.top + controlRect.height / 2
      expect(Math.abs(labelCenter - controlCenter)).toBeLessThan(10)
    }
  })

  it('结算方式是内容宽度的分段控件, 不被 block 拉满整格', async () => {
    await renderForm()
    const segmented = container.querySelector('.ant-segmented')
    expect(segmented, '分段控件应存在').not.toBeNull()
    // `block` 会给根节点加 ant-segmented-block 类，把两个短选项各撑到半个单元格
    expect(segmented?.className).not.toContain('ant-segmented-block')
    expect(
      [...container.querySelectorAll('.ant-segmented-item')].map((node) =>
        node.textContent?.trim(),
      ),
    ).toEqual(['按吨位结算', '固定运费'])
  })
})
