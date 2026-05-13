import type { ReactNode } from 'react'

type BuildLabeledFormItemProps = {
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
