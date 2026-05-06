import { watch, type Ref } from 'vue'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import {
  buildCustomerStatementOptions,
  buildFreightStatementOptions,
  buildSupplierStatementOptions,
  findStatementRecordById,
} from './module-adapter-finance-links'

interface UseFinanceAllocationSyncOptions {
  moduleKey: Ref<string>
  editorVisible: Ref<boolean>
  editorForm: Record<string, unknown>
  editorItems: Ref<ModuleLineItem[]>
  customerStatementRows: Ref<ModuleRecord[]>
  supplierStatementRows: Ref<ModuleRecord[]>
  freightStatementRows: Ref<ModuleRecord[]>
  paymentBusinessType: Ref<string>
}

interface StatementOption {
  value: unknown
  label: string
}

function roundAmount(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0
}

function updateDraftField(target: Record<string, unknown>, key: string, nextValue: unknown) {
  if (String(target[key] || '') !== String(nextValue || '')) {
    target[key] = nextValue
    return true
  }
  return false
}

function updateDraftNumberField(target: Record<string, unknown>, key: string, nextValue: number) {
  if (roundAmount(target[key]) !== roundAmount(nextValue)) {
    target[key] = nextValue
    return true
  }
  return false
}

function normalizeOptionValue(value: unknown) {
  return String(value ?? '').trim()
}

function hasSameOptions(current: unknown, nextOptions: StatementOption[]) {
  if (!Array.isArray(current) || current.length !== nextOptions.length) {
    return false
  }
  return current.every((entry, index) => {
    const currentEntry = entry as StatementOption
    const nextEntry = nextOptions[index]
    return normalizeOptionValue(currentEntry.value) === normalizeOptionValue(nextEntry.value)
      && String(currentEntry.label || '') === String(nextEntry.label || '')
  })
}

function syncReceiptAllocationItems(options: UseFinanceAllocationSyncOptions) {
  let changed = false
  const customerName = String(options.editorForm.customerName || '').trim()
  const projectName = String(options.editorForm.projectName || '').trim()

  options.editorItems.value.forEach((item) => {
    const statementOptions = buildCustomerStatementOptions(options.customerStatementRows.value, {
      currentStatementId: Number(item.sourceStatementId || 0),
      customerName,
      projectName,
    })
    if (!hasSameOptions(item._statementOptions, statementOptions)) {
      item._statementOptions = statementOptions
      changed = true
    }

    const statement = findStatementRecordById(options.customerStatementRows.value, item.sourceStatementId)
    const availableIds = new Set(statementOptions.map((option) => Number(option.value)))
    const currentStatementId = Number(item.sourceStatementId || 0)
    if (currentStatementId > 0 && !availableIds.has(currentStatementId)) {
      changed = updateDraftField(item, 'sourceStatementId', '') || changed
    }

    if (!statement) {
      changed = updateDraftField(item, 'statementNo', '') || changed
      changed = updateDraftField(item, 'projectName', '') || changed
      changed = updateDraftNumberField(item, 'statementBalanceAmount', 0) || changed
      return
    }

    changed = updateDraftField(item, 'statementNo', String(statement.statementNo || '')) || changed
    changed = updateDraftField(item, 'projectName', String(statement.projectName || '')) || changed
    changed = updateDraftNumberField(item, 'statementBalanceAmount', Number(statement.closingAmount || 0)) || changed
    if (!customerName) {
      changed = updateDraftField(options.editorForm, 'customerName', String(statement.customerName || '')) || changed
    }
    if (!projectName) {
      changed = updateDraftField(options.editorForm, 'projectName', String(statement.projectName || '')) || changed
    }
  })

  if (changed) {
    options.editorForm.items = [...options.editorItems.value]
  }
}

function syncPaymentAllocationItems(options: UseFinanceAllocationSyncOptions) {
  let changed = false
  const counterpartyName = String(options.editorForm.counterpartyName || '').trim()

  options.editorItems.value.forEach((item) => {
    const isSupplier = options.paymentBusinessType.value === '供应商'
    const statementOptions = isSupplier
      ? buildSupplierStatementOptions(options.supplierStatementRows.value, {
        currentStatementId: Number(item.sourceStatementId || 0),
        counterpartyName,
      })
      : options.paymentBusinessType.value === '物流商'
        ? buildFreightStatementOptions(options.freightStatementRows.value, {
          currentStatementId: Number(item.sourceStatementId || 0),
          counterpartyName,
        })
        : []

    if (!hasSameOptions(item._statementOptions, statementOptions)) {
      item._statementOptions = statementOptions
      changed = true
    }

    const availableIds = new Set(statementOptions.map((option) => Number(option.value)))
    const currentStatementId = Number(item.sourceStatementId || 0)
    if (currentStatementId > 0 && !availableIds.has(currentStatementId)) {
      changed = updateDraftField(item, 'sourceStatementId', '') || changed
    }

    const statement = isSupplier
      ? findStatementRecordById(options.supplierStatementRows.value, item.sourceStatementId)
      : findStatementRecordById(options.freightStatementRows.value, item.sourceStatementId)

    if (!statement) {
      changed = updateDraftField(item, 'statementNo', '') || changed
      changed = updateDraftNumberField(item, 'statementBalanceAmount', 0) || changed
      return
    }

    changed = updateDraftField(item, 'statementNo', String(statement.statementNo || '')) || changed
    changed = updateDraftNumberField(
      item,
      'statementBalanceAmount',
      Number(isSupplier ? statement.closingAmount || 0 : statement.unpaidAmount || 0),
    ) || changed
    if (!counterpartyName) {
      changed = updateDraftField(
        options.editorForm,
        'counterpartyName',
        String(isSupplier ? statement.supplierName || '' : statement.carrierName || ''),
      ) || changed
    }
  })

  if (changed) {
    options.editorForm.items = [...options.editorItems.value]
  }
}

export function useFinanceAllocationSync(options: UseFinanceAllocationSyncOptions) {
  watch(
    () => [
      options.moduleKey.value,
      options.editorVisible.value,
      options.paymentBusinessType.value,
      String(options.editorForm.customerName || ''),
      String(options.editorForm.projectName || ''),
      String(options.editorForm.counterpartyName || ''),
      options.customerStatementRows.value.length,
      options.supplierStatementRows.value.length,
      options.freightStatementRows.value.length,
      JSON.stringify(options.editorItems.value.map((item) => ({
        id: String(item.id || ''),
        sourceStatementId: item.sourceStatementId,
      }))),
    ],
    () => {
      if (!options.editorVisible.value) {
        return
      }
      if (options.moduleKey.value === 'receipts') {
        syncReceiptAllocationItems(options)
      }
      if (options.moduleKey.value === 'payments') {
        syncPaymentAllocationItems(options)
      }
    },
    { immediate: true },
  )
}
