import { PlusOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { useTranslation } from 'react-i18next'
import type { DocumentChargeItemDraft } from '@/views/modules/module-editor-draft-adapter'
import {
  ExpenseItemsSummaryBar,
  ModuleExpenseItemsTable,
} from './ModuleExpenseItemsTable'
import { ModuleItemsPanel } from './ModuleItemsPanel'

interface Props {
  expenseItems: DocumentChargeItemDraft[]
  expenseSelectedItemIds: string[]
  expenseMaterialOptions: Array<{
    label: string
    value: string
    unit?: string
    materialType?: string
  }>
  expenseTotalAmount: number
  saving: boolean
  onExpenseSelectedChange: (itemId: string, selected: boolean) => void
  onExpenseSelectAll: (selected: boolean) => void
  onExpenseChange: (
    index: number,
    patch: Partial<DocumentChargeItemDraft>,
  ) => void
  onCreateExpense: (name: string) => Promise<void>
  onExpenseAddItem: () => void
  onExpenseDelete: (index: number) => void
}

/** 编辑器“附加费用”Tab 内容：工具栏、汇总条与费用明细表。 */
export function ModuleEditorExpensePanel({
  expenseItems,
  expenseSelectedItemIds,
  expenseMaterialOptions,
  expenseTotalAmount,
  saving,
  onExpenseSelectedChange,
  onExpenseSelectAll,
  onExpenseChange,
  onCreateExpense,
  onExpenseAddItem,
  onExpenseDelete,
}: Props) {
  const { t } = useTranslation()

  return (
    <ModuleItemsPanel
      title={t('modules.itemsSection.expensePanelTitle')}
      actions={
        <>
          <Button
            type="primary"
            className="overlay-action-button"
            icon={<PlusOutlined />}
            disabled={saving}
            onClick={onExpenseAddItem}
          >
            {t('modules.itemsSection.addExpense')}
          </Button>
          {expenseSelectedItemIds.length ? (
            <button
              type="button"
              className="text-red-500 hover:text-red-700"
              onClick={() => {
                // 先建索引再删除，避免循环内反复线性查找费用项下标。
                const expenseItemIndexById = new Map(
                  expenseItems.map((item, index) => [item.id, index] as const),
                )
                for (const id of expenseSelectedItemIds) {
                  const index = expenseItemIndexById.get(id)
                  if (index != null) {
                    onExpenseDelete(index)
                  }
                }
                for (const id of expenseSelectedItemIds) {
                  onExpenseSelectedChange(id, false)
                }
              }}
            >
              {t('modules.expense.removeSelected')} (
              {expenseSelectedItemIds.length})
            </button>
          ) : null}
          <ExpenseItemsSummaryBar
            count={expenseItems.length}
            totalExpenseAmount={expenseTotalAmount}
          />
        </>
      }
    >
      <ModuleExpenseItemsTable
        expenseItems={expenseItems}
        materialOptions={expenseMaterialOptions}
        selectedItemIds={expenseSelectedItemIds}
        onSelectedChange={onExpenseSelectedChange}
        onSelectAll={onExpenseSelectAll}
        onChange={onExpenseChange}
        onCreateExpense={onCreateExpense}
        onDelete={onExpenseDelete}
      />
    </ModuleItemsPanel>
  )
}
