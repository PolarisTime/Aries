import { computed, type Ref } from 'vue'
import type { ModuleFormFieldDefinition, ModuleFormFieldOption, ModuleRecord } from '@/types/module-page'
import { getBehaviorValue } from './module-behavior-registry'
import {
  buildCustomerStatementOptions,
  buildFreightStatementOptions,
  buildSupplierStatementOptions,
} from './module-adapter-finance-links'

interface UseFinanceStatementLinkSupportOptions {
  moduleKey: Ref<string>
  editorVisible: Ref<boolean>
  editorForm: Record<string, unknown>
  customerStatementRows: Ref<ModuleRecord[]>
  supplierStatementRows: Ref<ModuleRecord[]>
  freightStatementRows: Ref<ModuleRecord[]>
  customerStatementRowsFetched: Ref<boolean>
  supplierStatementRowsFetched: Ref<boolean>
  freightStatementRowsFetched: Ref<boolean>
}

function withStatementSelectField(
  field: ModuleFormFieldDefinition,
  label: string,
  options: ModuleFormFieldOption[],
  placeholder: string,
) {
  return {
    ...field,
    type: 'select' as const,
    label,
    options,
    placeholder,
    disabled: Boolean(field.disabled) || !options.length,
  }
}

export function useFinanceStatementLinkSupport(options: UseFinanceStatementLinkSupportOptions) {
  const {
    moduleKey,
    editorVisible,
    editorForm,
    customerStatementRows,
    supplierStatementRows,
    freightStatementRows,
    customerStatementRowsFetched,
    supplierStatementRowsFetched,
    freightStatementRowsFetched,
  } = options

  const paymentBusinessType = computed(() => String(editorForm.businessType || '').trim())

  const receiptStatementOptions = computed(() =>
    buildCustomerStatementOptions(customerStatementRows.value, {
      currentStatementId: Number(editorForm.sourceStatementId || 0),
      customerName: String(editorForm.customerName || ''),
      projectName: String(editorForm.projectName || ''),
    }),
  )

  const paymentStatementOptions = computed(() => {
    if (paymentBusinessType.value === '供应商') {
      return buildSupplierStatementOptions(supplierStatementRows.value, {
        currentStatementId: Number(editorForm.sourceStatementId || 0),
        counterpartyName: String(editorForm.counterpartyName || ''),
      })
    }
    if (paymentBusinessType.value === '物流商') {
      return buildFreightStatementOptions(freightStatementRows.value, {
        currentStatementId: Number(editorForm.sourceStatementId || 0),
        counterpartyName: String(editorForm.counterpartyName || ''),
      })
    }
    return []
  })

  const paymentStatementFieldLabel = computed(() => {
    if (paymentBusinessType.value === '供应商') {
      return '关联供应商对账单'
    }
    if (paymentBusinessType.value === '物流商') {
      return '关联物流对账单'
    }
    return '关联对账单'
  })

  const receiptStatementFieldPlaceholder = computed(() => {
    if (!String(editorForm.customerName || '').trim() || !String(editorForm.projectName || '').trim()) {
      return '可先选择对账单，系统会自动回填客户和项目'
    }
    return receiptStatementOptions.value.length ? '请选择关联客户对账单' : '没有可选的客户对账单'
  })

  const paymentStatementFieldPlaceholder = computed(() => {
    if (!paymentBusinessType.value) {
      return '请先选择业务类型'
    }
    if (paymentBusinessType.value === '供应商' && !String(editorForm.counterpartyName || '').trim()) {
      return '可先选择供应商对账单，系统会自动回填往来单位'
    }
    if (paymentBusinessType.value === '物流商' && !String(editorForm.counterpartyName || '').trim()) {
      return '可先选择物流对账单，系统会自动回填往来单位'
    }
    return paymentStatementOptions.value.length
      ? `请选择${paymentStatementFieldLabel.value}`
      : `没有可选的${paymentStatementFieldLabel.value}`
  })

  const statementLinkType = computed(() => getBehaviorValue(moduleKey.value, 'supportsStatementLinking'))

  const sourceStatementOptions = computed(() => {
    if (statementLinkType.value === 'receipt') {
      return receiptStatementOptions.value
    }
    if (statementLinkType.value === 'payment') {
      return paymentStatementOptions.value
    }
    return []
  })

  const sourceStatementOptionsReady = computed(() => {
    if (!editorVisible.value) {
      return false
    }
    if (statementLinkType.value === 'receipt') {
      return customerStatementRowsFetched.value
    }
    if (statementLinkType.value === 'payment') {
      if (paymentBusinessType.value === '供应商') {
        return supplierStatementRowsFetched.value
      }
      if (paymentBusinessType.value === '物流商') {
        return freightStatementRowsFetched.value
      }
    }
    return false
  })

  function resolveSourceStatementField(field: ModuleFormFieldDefinition) {
    if (field.key !== 'sourceStatementId') {
      return field
    }
    if (statementLinkType.value === 'receipt') {
      return withStatementSelectField(
        field,
        '关联客户对账单',
        receiptStatementOptions.value,
        receiptStatementFieldPlaceholder.value,
      )
    }
    if (statementLinkType.value === 'payment') {
      return withStatementSelectField(
        field,
        paymentStatementFieldLabel.value,
        paymentStatementOptions.value,
        paymentStatementFieldPlaceholder.value,
      )
    }
    return field
  }

  return {
    paymentBusinessType,
    paymentStatementFieldLabel,
    paymentStatementOptions,
    paymentStatementFieldPlaceholder,
    receiptStatementOptions,
    receiptStatementFieldPlaceholder,
    resolveSourceStatementField,
    sourceStatementOptions,
    sourceStatementOptionsReady,
  }
}
