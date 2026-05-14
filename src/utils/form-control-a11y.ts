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
