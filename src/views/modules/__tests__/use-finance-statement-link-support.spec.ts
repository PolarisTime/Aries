import { reactive, ref } from 'vue'
import { useFinanceStatementLinkSupport } from '@/views/modules/use-finance-statement-link-support'
import type { ModuleFormFieldDefinition, ModuleRecord } from '@/types/module-page'

const sourceStatementField: ModuleFormFieldDefinition = {
  key: 'sourceStatementId',
  label: '关联对账单',
  type: 'input',
}

describe('useFinanceStatementLinkSupport', () => {
  it('builds receipt statement field options from customer statements', () => {
    const moduleKey = ref('receipts')
    const editorForm = reactive<Record<string, unknown>>({
      customerName: '客户A',
      projectName: '项目A',
    })
    const support = useFinanceStatementLinkSupport({
      moduleKey,
      editorVisible: ref(true),
      editorForm,
      customerStatementRows: ref<ModuleRecord[]>([
        { id: '1', statementNo: 'CS-001', customerName: '客户A', projectName: '项目A', closingAmount: 120 },
        { id: '2', statementNo: 'CS-002', customerName: '客户B', projectName: '项目B', closingAmount: 80 },
      ]),
      supplierStatementRows: ref([]),
      freightStatementRows: ref([]),
      customerStatementRowsFetched: ref(true),
      supplierStatementRowsFetched: ref(false),
      freightStatementRowsFetched: ref(false),
    })

    const field = support.resolveSourceStatementField(sourceStatementField)
    expect(field).toMatchObject({
      type: 'select',
      label: '关联客户对账单',
      placeholder: '请选择关联客户对账单',
      disabled: false,
    })
    expect(field.options).toEqual([
      expect.objectContaining({ value: 1 }),
    ])
    expect(support.sourceStatementOptionsReady.value).toBe(true)
  })

  it('switches payment statement options by business type', () => {
    const moduleKey = ref('payments')
    const editorForm = reactive<Record<string, unknown>>({
      businessType: '供应商',
      counterpartyName: '供应商A',
    })
    const support = useFinanceStatementLinkSupport({
      moduleKey,
      editorVisible: ref(true),
      editorForm,
      customerStatementRows: ref([]),
      supplierStatementRows: ref<ModuleRecord[]>([
        { id: '11', statementNo: 'SS-001', supplierName: '供应商A', closingAmount: 200 },
      ]),
      freightStatementRows: ref<ModuleRecord[]>([
        { id: '21', statementNo: 'FS-001', carrierName: '物流A', unpaidAmount: 300 },
      ]),
      customerStatementRowsFetched: ref(false),
      supplierStatementRowsFetched: ref(true),
      freightStatementRowsFetched: ref(false),
    })

    expect(support.resolveSourceStatementField(sourceStatementField)).toMatchObject({
      label: '关联供应商对账单',
      disabled: false,
    })
    expect(support.sourceStatementOptions.value).toEqual([
      expect.objectContaining({ value: 11 }),
    ])
    expect(support.sourceStatementOptionsReady.value).toBe(true)

    editorForm.businessType = '物流商'
    editorForm.counterpartyName = '物流A'
    expect(support.resolveSourceStatementField(sourceStatementField)).toMatchObject({
      label: '关联物流对账单',
      disabled: false,
    })
    expect(support.sourceStatementOptions.value).toEqual([
      expect.objectContaining({ value: 21 }),
    ])
    expect(support.sourceStatementOptionsReady.value).toBe(false)
  })
})
