import type { TableColumnsType, TableProps } from 'antd'
import type { CreatedExpenseMaterial } from '@/api/master/materials'
import type { ProjectOption } from '@/api/master/project-options'
import type { RowContextMenuMap } from '@/components/row-context-menu'
import type { ModuleKey } from '@/module-system/core/module-key'
import type { MaterialSearchController } from '@/module-system/editor/module-editor-material-select'
import type { SearchParams } from '@/types/api-raw'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import type {
  FreightStatementSortDirection,
  FreightStatementSortMode,
} from '@/views/modules/freight-statement-item-groups'
import type { DocumentChargeItemDraft } from '@/views/modules/module-editor-draft-adapter'
import { ModuleEditorItemsSection } from './ModuleEditorItemsSection'
import { buildModuleItemsActions } from './module-editor-items-actions'

interface ExpenseController {
  expenseSelectedItemIds: string[]
  expenseMaterialOptions: Array<{
    label: string
    value: string
    unit?: string
    materialType?: string
  }>
  expenseMaterialSearch: MaterialSearchController
  handleExpenseSelectedChange: (itemId: string, selected: boolean) => void
  handleExpenseSelectAll: (selected: boolean) => void
  handleExpenseChange: (
    index: number,
    patch: Partial<DocumentChargeItemDraft>,
  ) => void
  handleCreateExpense: (
    name: string,
  ) => Promise<CreatedExpenseMaterial | undefined>
  handleExpenseAddItem: () => void
  handleExpenseDelete: (index: number) => void
  /** 附加费用行序变化(整行长按拖动 / 键盘 Alt+↑↓)。 */
  handleExpenseReorder: (nextRowKeys: string[]) => void
  /** 附加费用行 key(顺序与 expenseItems 一致): 草稿行也有稳定 key。 */
  expenseRowKeys: string[]
}

interface Props {
  open: boolean
  moduleKey: ModuleKey
  config: ModulePageConfig
  items: ModuleLineItem[]
  expenseItems: DocumentChargeItemDraft[]
  expense: ExpenseController
  supportsExpenseTab: boolean
  selectedItemIds: string[]
  parentImportVisible: boolean
  parentImporting: boolean
  parentSelectorDisplayFieldKey?: string
  parentSelectorFilters: SearchParams
  parentSelectorModuleKey?: ModuleKey
  parentSelectorOpen: boolean
  itemColumns: TableColumnsType<ModuleLineItem>
  itemTableComponents: TableProps<ModuleLineItem>['components']
  itemColumnOrder: string[]
  itemRowMenus?: RowContextMenuMap
  visibleItemColumnKeys: string[]
  capabilities: {
    addManualItems: boolean
    importParentItems: boolean
    autoSortItems: boolean
    save: boolean
    audit: boolean
  }
  auditLabel?: string
  saving: boolean
  showFooterActions: boolean
  setFormValue: (key: string, value: unknown) => void
  currentStatus: string
  formValues: Record<string, unknown>
  projectOptions: ProjectOption[]
  setItems: (updater: (items: ModuleLineItem[]) => ModuleLineItem[]) => void
  freightStatementSortDirection?: FreightStatementSortDirection
  onAddItem: () => void
  onAutoSortItems: (mode?: FreightStatementSortMode) => void
  onCancel: () => void
  onSave: (audit: boolean) => void
  onOpenParentSelector: () => void
  onCloseParentSelector: () => void
  onRemoveSelectedItems: () => void
  onImportParentRecord: (records: ModuleRecord[]) => void
  onItemColumnOrderChange: (order: string[]) => void
  onToggleItemColumn: (key: string) => void
  /** 明细行序变化(整行长按拖动/键盘 Alt+↑↓ 落位): 新的 id 顺序即最终顺序; 不传=不可排序。 */
  onItemsReorder?: (nextIds: string[]) => void
}

/** 编辑器明细区（含费用页签与工具栏附加操作）：从工作区组件抽出以保持其精简。 */
export function ModuleEditorItemsArea({
  open,
  moduleKey,
  config,
  items,
  expenseItems,
  expense,
  supportsExpenseTab,
  selectedItemIds,
  parentImportVisible,
  parentImporting,
  parentSelectorDisplayFieldKey,
  parentSelectorFilters,
  parentSelectorModuleKey,
  parentSelectorOpen,
  itemColumns,
  itemTableComponents,
  itemColumnOrder,
  itemRowMenus,
  visibleItemColumnKeys,
  capabilities,
  auditLabel,
  saving,
  showFooterActions,
  setFormValue,
  currentStatus,
  formValues,
  projectOptions,
  setItems,
  freightStatementSortDirection,
  onAddItem,
  onAutoSortItems,
  onCancel,
  onSave,
  onOpenParentSelector,
  onCloseParentSelector,
  onRemoveSelectedItems,
  onImportParentRecord,
  onItemColumnOrderChange,
  onToggleItemColumn,
  onItemsReorder,
}: Props) {
  return (
    <ModuleEditorItemsSection
      config={config}
      items={items}
      expenseItems={expenseItems}
      expenseSelectedItemIds={expense.expenseSelectedItemIds}
      expenseMaterialOptions={expense.expenseMaterialOptions}
      expenseMaterialSearch={expense.expenseMaterialSearch}
      supportsExpenseTab={supportsExpenseTab}
      selectedItemIds={selectedItemIds}
      parentImportVisible={parentImportVisible}
      parentImporting={parentImporting}
      parentSelectorDisplayFieldKey={parentSelectorDisplayFieldKey}
      parentSelectorFilters={parentSelectorFilters}
      parentSelectorModuleKey={parentSelectorModuleKey}
      parentSelectorOpen={parentSelectorOpen}
      itemColumns={itemColumns}
      itemTableComponents={itemTableComponents}
      itemColumnOrder={itemColumnOrder}
      itemRowMenus={itemRowMenus}
      visibleItemColumnKeys={visibleItemColumnKeys}
      capabilities={capabilities}
      auditLabel={auditLabel}
      saving={saving}
      showFooterActions={showFooterActions}
      extraActions={buildModuleItemsActions({
        open,
        moduleKey,
        config,
        currentStatus,
        formValues,
        items,
        setItems,
        setFormValue,
        saving,
        projectOptions,
      })}
      onAddItem={onAddItem}
      onAutoSortItems={onAutoSortItems}
      freightStatementSortDirection={freightStatementSortDirection}
      onExpenseSelectedChange={expense.handleExpenseSelectedChange}
      onExpenseSelectAll={expense.handleExpenseSelectAll}
      onExpenseChange={expense.handleExpenseChange}
      onCreateExpense={expense.handleCreateExpense}
      onExpenseAddItem={expense.handleExpenseAddItem}
      onExpenseDelete={expense.handleExpenseDelete}
      onExpenseReorder={expense.handleExpenseReorder}
      expenseRowKeys={expense.expenseRowKeys}
      onCancel={onCancel}
      onSave={onSave}
      onOpenParentSelector={onOpenParentSelector}
      onCloseParentSelector={onCloseParentSelector}
      onRemoveSelectedItems={onRemoveSelectedItems}
      onImportParentRecord={onImportParentRecord}
      onItemColumnOrderChange={onItemColumnOrderChange}
      onToggleItemColumn={onToggleItemColumn}
      onItemsReorder={onItemsReorder}
    />
  )
}
