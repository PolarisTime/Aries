import type { ReactNode } from 'react'
import { asString } from '@/utils/type-narrowing'

export function formatMasterValue(value: unknown): ReactNode {
  const text = asString(value).trim()
  return text || '-'
}
