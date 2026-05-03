import type { ModuleColumnDefinition } from '@/types/module-page'

export function inferColumnAlign(column?: ModuleColumnDefinition): 'left' | 'center' | 'right' {
  if (column?.align) {
    return column.align
  }
  if (['unit', 'quantityUnit'].includes(String(column?.dataIndex || ''))) {
    return 'center'
  }
  if (column?.type === 'amount' || column?.type === 'weight' || column?.type === 'count') {
    return 'right'
  }
  if (column?.type === 'status' || column?.type === 'date') {
    return 'center'
  }
  return 'center'
}
