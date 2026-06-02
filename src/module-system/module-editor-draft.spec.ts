import { describe, expect, it } from 'vitest'
import { normalizeDraftRecordForModule } from './module-editor-draft'
import type { ModuleFormFieldDefinition } from '@/types/module-page'

const sumLineItemsBy = () => 0

describe('normalizeDraftRecordForModule', () => {
  it('applies form field default values to new drafts', () => {
    const formFields: ModuleFormFieldDefinition[] = [
      {
        key: 'status',
        label: '状态',
        type: 'select',
        defaultValue: '正常',
      },
      {
        key: 'sortOrder',
        label: '排序',
        type: 'number',
        defaultValue: 0,
      },
    ]
    const record = { id: '' }

    normalizeDraftRecordForModule({
      moduleKey: 'supplier',
      record,
      items: [],
      currentOperatorName: 'tester',
      sumLineItemsBy,
      formFields,
    })

    expect(record.status).toBe('正常')
    expect(record.sortOrder).toBe(0)
  })

  it('keeps explicit draft values before applying defaults', () => {
    const formFields: ModuleFormFieldDefinition[] = [
      {
        key: 'status',
        label: '状态',
        type: 'select',
        defaultValue: '正常',
      },
    ]
    const record = { id: '', status: '禁用' }

    normalizeDraftRecordForModule({
      moduleKey: 'supplier',
      record,
      items: [],
      currentOperatorName: 'tester',
      sumLineItemsBy,
      formFields,
    })

    expect(record.status).toBe('禁用')
  })
})
