import { PlusOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { useTranslation } from 'react-i18next'
import type { CreatedExpenseMaterial } from '@/api/master/materials'
import type { MaterialSearchController } from '@/module-system/editor/module-editor-material-select'
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
  expenseMaterialSearch: MaterialSearchController
  expenseTotalAmount: number
  saving: boolean
  /**
   * 明细工具栏的保存组（取消 / 保存 / 保存并审核）。
   *
   * <p>「附加费用」页签没有货物专属动作（添加明细/导入/自动排序），但**必须有保存入口**：
   * 历史缺陷就是切到这个页签后整条工具栏被卸载、按钮一起消失。</p>
   */
  footerActions?: React.ReactNode
  onExpenseSelectedChange: (itemId: string, selected: boolean) => void
  onExpenseSelectAll: (selected: boolean) => void
  onExpenseChange: (
    index: number,
    patch: Partial<DocumentChargeItemDraft>,
  ) => void
  onCreateExpense: (name: string) => Promise<CreatedExpenseMaterial | undefined>
  onExpenseAddItem: () => void
  onExpenseDelete: (index: number) => void
  /** 附加费用行序变化(整行长按拖动 / 键盘 Alt+↑↓)。 */
  onExpenseReorder: (nextRowKeys: string[]) => void
  /** 附加费用行 key(顺序与 expenseItems 一致)。 */
  expenseRowKeys: string[]
}

/** 编辑器“附加费用”Tab 内容：工具栏、汇总条与费用明细表。 */
export function ModuleEditorExpensePanel({
  expenseItems,
  expenseSelectedItemIds,
  expenseMaterialOptions,
  expenseMaterialSearch,
  expenseTotalAmount,
  saving,
  onExpenseSelectedChange,
  onExpenseSelectAll,
  onExpenseChange,
  onCreateExpense,
  onExpenseAddItem,
  onExpenseDelete,
  onExpenseReorder,
  expenseRowKeys,
  footerActions,
}: Props) {
  const { t } = useTranslation()
  // 保存中不允许改行序: 与"保存期间的明细改动会被丢弃"同一口径
  const expenseReorder = saving ? undefined : onExpenseReorder

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
          {footerActions}
        </>
      }
    >
      <ModuleExpenseItemsTable
        expenseItems={expenseItems}
        rowKeys={expenseRowKeys}
        materialOptions={expenseMaterialOptions}
        materialSearch={expenseMaterialSearch}
        selectedItemIds={expenseSelectedItemIds}
        onSelectedChange={onExpenseSelectedChange}
        onSelectAll={onExpenseSelectAll}
        onChange={onExpenseChange}
        onCreateExpense={onCreateExpense}
        onDelete={onExpenseDelete}
        onReorder={expenseReorder}
      />
    </ModuleItemsPanel>
  )
}
