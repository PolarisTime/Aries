import type { NamePath } from 'antd/es/form/interface'
import type { ReactNode } from 'react'

interface BuildLabeledFormItemProps {
  label: ReactNode
  htmlFor: string
}

export function buildLabeledFormItemProps({
  label,
  htmlFor,
}: BuildLabeledFormItemProps) {
  return {
    label,
    htmlFor,
  }
}

interface AntdFormValidationErrorField {
  name?: NamePath
}

export function readAntdFormValidationErrorFields(error: unknown) {
  if (error == null || typeof error !== 'object') {
    return null
  }
  const { errorFields } = error as { errorFields?: unknown }
  return Array.isArray(errorFields)
    ? (errorFields as AntdFormValidationErrorField[])
    : null
}

export function focusFirstInvalidField(
  form: { focusField?: (name: NamePath) => void },
  errorFields: ReadonlyArray<AntdFormValidationErrorField>,
) {
  const firstName = errorFields[0]?.name
  if (firstName !== undefined) {
    form.focusField?.(firstName)
  }
}
