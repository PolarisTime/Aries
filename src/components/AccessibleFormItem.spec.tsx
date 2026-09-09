// @vitest-environment jsdom

import { Form, Input } from 'antd'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AccessibleFormItem } from '@/components/AccessibleFormItem'
import { focusFirstInvalidField } from '@/utils/form-control-a11y'

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set?.bind(input)
  setter?.(value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function TestForm() {
  const [form] = Form.useForm<{ loginName: string; password: string }>()
  return (
    <Form
      form={form}
      onFinishFailed={({ errorFields }) =>
        focusFirstInvalidField(form, errorFields)
      }
    >
      <AccessibleFormItem
        name="loginName"
        label="登录名"
        rules={[{ required: true, message: '请输入登录名' }]}
      >
        <Input />
      </AccessibleFormItem>
      <AccessibleFormItem
        name="password"
        label="密码"
        rules={[{ required: true, message: '请输入密码' }]}
      >
        <Input.Password />
      </AccessibleFormItem>
      <button type="submit">提交</button>
    </Form>
  )
}

describe('AccessibleFormItem', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    if (!window.matchMedia) {
      window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })
    }
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => {
      root.render(createElement(TestForm))
    })
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const getLoginNameInput = () =>
    container.querySelector<HTMLInputElement>('input#loginName')
  const getPasswordInput = () =>
    container.querySelector<HTMLInputElement>('input#password')
  const getSubmitButton = () =>
    container.querySelector<HTMLButtonElement>('button[type="submit"]')

  const submitForm = async () => {
    act(() => {
      getSubmitButton()?.click()
    })
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0)
      })
    })
  }

  const waitForErrorAlert = async (errorId: string) => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const errorElement = document.getElementById(errorId)
      if (errorElement?.getAttribute('role') === 'alert') {
        return errorElement
      }
      await act(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 10)
        })
      })
    }
    return document.getElementById(errorId)
  }

  it('必填字段渲染 aria-required', () => {
    expect(getLoginNameInput()?.getAttribute('aria-required')).toBe('true')
    expect(getPasswordInput()?.getAttribute('aria-required')).toBe('true')
  })

  it('无错误时不渲染 aria-invalid 与 aria-describedby', () => {
    expect(getLoginNameInput()?.getAttribute('aria-invalid')).toBeNull()
    expect(getLoginNameInput()?.getAttribute('aria-describedby')).toBeNull()
  })

  it('验证失败时 aria-invalid 与 aria-describedby 指向 role=alert 的错误元素', async () => {
    await submitForm()

    const loginNameInput = getLoginNameInput()
    expect(loginNameInput?.getAttribute('aria-invalid')).toBe('true')
    expect(loginNameInput?.getAttribute('aria-describedby')).toBe(
      'loginName_help',
    )

    const errorElement = await waitForErrorAlert('loginName_help')
    expect(errorElement?.getAttribute('role')).toBe('alert')
    expect(errorElement?.textContent).toBe('请输入登录名')
    expect(getPasswordInput()?.getAttribute('aria-invalid')).toBe('true')
  })

  it('验证失败后焦点移动到第一个错误字段', async () => {
    await submitForm()
    expect(document.activeElement).toBe(getLoginNameInput())
  })

  it('修复错误后移除 aria-invalid、aria-describedby 与 role=alert', async () => {
    await submitForm()

    act(() => {
      setNativeInputValue(getLoginNameInput() as HTMLInputElement, 'admin')
    })
    await submitForm()

    const loginNameInput = getLoginNameInput()
    expect(loginNameInput?.getAttribute('aria-invalid')).toBeNull()
    expect(loginNameInput?.getAttribute('aria-describedby')).toBeNull()
  })
})
