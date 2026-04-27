import { watch, type Ref } from 'vue'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import { buildInvoiceIssueAllocation } from './invoice-issue-allocation'
import { findStatementRecordById } from './module-adapter-finance-links'

interface UseInvoiceSyncOptions {
  moduleKey: Ref<string>
  editorVisible: Ref<boolean>
  editorForm: Record<string, unknown>
  editorItems: Ref<ModuleLineItem[]>
  currentInvoiceTaxRate: Ref<number>
  customerStatementRows: Ref<ModuleRecord[]>
  supplierStatementRows: Ref<ModuleRecord[]>
  freightStatementRows: Ref<ModuleRecord[]>
  paymentBusinessType: Ref<string>
  sourceStatementOptions: Ref<{ value: unknown; label: string }[]>
  sourceStatementOptionsReady: Ref<boolean>
}

function toSafeNumber(value: unknown) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : 0
}

function roundNumber(value: unknown, precision: number) {
  return Number(toSafeNumber(value).toFixed(precision))
}

function updateDraftField(target: Record<string, unknown>, key: string, nextValue: unknown) {
  if (String(target[key] || '') !== String(nextValue)) {
    target[key] = nextValue
  }
}

function updateDraftNumberField(target: Record<string, unknown>, key: string, nextValue: number) {
  if (roundNumber(target[key], 6) !== roundNumber(nextValue, 6)) {
    target[key] = nextValue
  }
}

function updateItemNumberField(item: Record<string, unknown>, key: string, nextValue: number) {
  if (roundNumber(item[key], 6) !== roundNumber(nextValue, 6)) {
    item[key] = nextValue
  }
}

function sumEditorItemsAmount(items: ModuleLineItem[]) {
  return roundNumber(
    items.reduce((sum, item) => sum + toSafeNumber(item.amount), 0),
    2,
  )
}

function calculateInvoiceTaxAmount(amount: number, taxRate: number) {
  return roundNumber(amount * taxRate, 2)
}

export function useInvoiceSync(options: UseInvoiceSyncOptions) {
  const {
    moduleKey,
    editorVisible,
    editorForm,
    editorItems,
    currentInvoiceTaxRate,
    customerStatementRows,
    supplierStatementRows,
    freightStatementRows,
    paymentBusinessType,
    sourceStatementOptions,
    sourceStatementOptionsReady,
  } = options

  function syncInvoiceReceiptEditorState() {
    if (!editorVisible.value || moduleKey.value !== 'invoice-receipts') {
      return
    }

    const amount = sumEditorItemsAmount(editorItems.value)
    updateDraftNumberField(editorForm, 'amount', amount)
    updateDraftNumberField(editorForm, 'taxRate', currentInvoiceTaxRate.value)
    updateDraftNumberField(editorForm, 'taxAmount', calculateInvoiceTaxAmount(amount, currentInvoiceTaxRate.value))

    const currentInvoiceTitle = String(editorForm.invoiceTitle || '').trim()
    const supplierName = String(editorForm.supplierName || '').trim()
    if (!currentInvoiceTitle && supplierName) {
      updateDraftField(editorForm, 'invoiceTitle', supplierName)
    }
  }

  function syncInvoiceIssueEditorState() {
    if (!editorVisible.value || moduleKey.value !== 'invoice-issues') {
      return
    }

    const allocation = buildInvoiceIssueAllocation(editorItems.value, roundNumber(editorForm.targetAmount, 2))
    allocation.patches.forEach((patch) => {
      const item = editorItems.value.find((entry) => String(entry.id || '') === patch.id)
      if (!item) {
        return
      }
      updateItemNumberField(item as Record<string, unknown>, 'quantity', patch.quantity)
      updateItemNumberField(item as Record<string, unknown>, 'weightTon', patch.weightTon)
      updateItemNumberField(item as Record<string, unknown>, 'amount', patch.amount)
    })

    if (roundNumber(editorForm.targetAmount, 2) > 0) {
      updateDraftNumberField(editorForm, 'targetAmount', allocation.normalizedTargetAmount)
    }

    updateDraftNumberField(editorForm, 'amount', allocation.appliedAmount)
    updateDraftNumberField(editorForm, 'taxRate', currentInvoiceTaxRate.value)
    updateDraftNumberField(editorForm, 'taxAmount', calculateInvoiceTaxAmount(allocation.appliedAmount, currentInvoiceTaxRate.value))
  }

  function syncLinkedStatementEditorState() {
    if (!editorVisible.value) {
      return
    }

    if (moduleKey.value === 'receipts') {
      const statement = findStatementRecordById(customerStatementRows.value, editorForm.sourceStatementId)
      if (!statement) {
        return
      }
      updateDraftField(editorForm, 'customerName', String(statement.customerName || ''))
      updateDraftField(editorForm, 'projectName', String(statement.projectName || ''))
      return
    }

    if (moduleKey.value === 'payments') {
      if (paymentBusinessType.value === '供应商') {
        const statement = findStatementRecordById(supplierStatementRows.value, editorForm.sourceStatementId)
        if (!statement) {
          return
        }
        updateDraftField(editorForm, 'counterpartyName', String(statement.supplierName || ''))
        return
      }
      if (paymentBusinessType.value === '物流商') {
        const statement = findStatementRecordById(freightStatementRows.value, editorForm.sourceStatementId)
        if (!statement) {
          return
        }
        updateDraftField(editorForm, 'counterpartyName', String(statement.carrierName || ''))
      }
    }
  }

  function clearInvalidLinkedStatementSelection() {
    if (!editorVisible.value || !sourceStatementOptionsReady.value) {
      return
    }
    const currentStatementId = Number(editorForm.sourceStatementId || 0)
    if (!Number.isFinite(currentStatementId) || currentStatementId <= 0) {
      return
    }
    const availableIds = new Set(sourceStatementOptions.value.map((option) => Number(option.value)))
    if (!availableIds.has(currentStatementId)) {
      editorForm.sourceStatementId = undefined
    }
  }

  // invoice receipt sync watcher
  watch(
    () => [
      moduleKey.value,
      editorVisible.value,
      currentInvoiceTaxRate.value,
      String(editorForm.supplierName || ''),
      JSON.stringify(editorItems.value.map((item) => ({
        id: String(item.id || ''),
        amount: roundNumber(item.amount, 2),
        weightTon: roundNumber(item.weightTon, 3),
      }))),
    ],
    () => {
      syncInvoiceReceiptEditorState()
    },
    { immediate: true },
  )

  // invoice issue sync watcher
  watch(
    () => [
      moduleKey.value,
      editorVisible.value,
      currentInvoiceTaxRate.value,
      roundNumber(editorForm.targetAmount, 2),
      JSON.stringify(editorItems.value.map((item) => ({
        id: String(item.id || ''),
        unitPrice: roundNumber(item.unitPrice, 2),
        amount: roundNumber(item.amount, 2),
        weightTon: roundNumber(item.weightTon, 3),
        maxAmount: roundNumber(item._maxImportAmount, 2),
        maxWeightTon: roundNumber(item._maxImportWeightTon, 3),
      }))),
    ],
    () => {
      syncInvoiceIssueEditorState()
    },
    { immediate: true },
  )

  // linked statement sync watcher
  watch(
    () => [
      moduleKey.value,
      editorVisible.value,
      Number(editorForm.sourceStatementId || 0),
      paymentBusinessType.value,
      customerStatementRows.value.length,
      supplierStatementRows.value.length,
      freightStatementRows.value.length,
    ],
    () => {
      syncLinkedStatementEditorState()
    },
    { immediate: true },
  )

  // clear invalid linked statement watcher
  watch(
    () => [
      moduleKey.value,
      editorVisible.value,
      paymentBusinessType.value,
      String(editorForm.customerName || ''),
      String(editorForm.projectName || ''),
      String(editorForm.counterpartyName || ''),
      JSON.stringify(sourceStatementOptions.value.map((option) => option.value)),
      sourceStatementOptionsReady.value,
    ],
    () => {
      clearInvalidLinkedStatementSelection()
    },
    { immediate: true },
  )
}
