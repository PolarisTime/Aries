import type { FormItemProps } from 'antd'
import { Form } from 'antd'
import { type ReactNode, useEffect, useRef } from 'react'

interface AccessibleFormItemProps extends FormItemProps {
  children: ReactNode
}

export function AccessibleFormItem({
  children,
  ...formItemProps
}: AccessibleFormItemProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) {
      return
    }
    const syncExplainAlertRole = () => {
      const explain = wrapper.querySelector<HTMLElement>(
        '.ant-form-item-explain',
      )
      if (!explain) {
        return
      }
      if (explain.querySelector('.ant-form-item-explain-error')) {
        explain.setAttribute('role', 'alert')
      } else {
        explain.removeAttribute('role')
      }
    }
    syncExplainAlertRole()
    const observer = new MutationObserver(syncExplainAlertRole)
    observer.observe(wrapper, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={wrapperRef}>
      <Form.Item {...formItemProps}>{children}</Form.Item>
    </div>
  )
}
