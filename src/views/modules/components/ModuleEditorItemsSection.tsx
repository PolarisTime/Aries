import type { TableColumnsType, TableProps } from 'antd'
import { Tabs } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CreatedExpenseMaterial } from '@/api/master/materials'
import type { RowContextMenuMap } from '@/components/row-context-menu'
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
import {
  type DocumentChargeItemDraft,
  sumChargeItemAmount,
} from '@/views/modules/module-editor-draft-adapter'
import { EditorFooterActions } from './EditorFooterActions'
import { ModuleEditorExpensePanel } from './ModuleEditorExpensePanel'
import {
  ModuleEditorItemsSummary,
  shouldAttachEditorDraftSummary,
} from './ModuleEditorItemsSummary'
import { ModuleItemGroupsView } from './ModuleItemGroupsView'
import { ModuleItemsPanel } from './ModuleItemsPanel'
import { ModuleItemsToolbarActions } from './ModuleItemsToolbarActions'
import { ModuleParentSelectorHost } from './ModuleParentSelectorHost'
import { buildModuleItemGroups } from './module-item-groups'

interface Props {
  config: ModulePageConfig
  items: ModuleLineItem[]
  expenseItems: DocumentChargeItemDraft[]
  expenseSelectedItemIds: string[]
  expenseMaterialOptions: Array<{
    label: string
    value: string
    unit?: string
    materialType?: string
  }>
  expenseMaterialSearch: MaterialSearchController
  supportsExpenseTab: boolean
  selectedItemIds: string[]
  parentImportVisible: boolean
  parentImporting: boolean
  parentSelectorDisplayFieldKey?: string
  parentSelectorFilters: SearchParams
  parentSelectorModuleKey?: string
  parentSelectorOpen: boolean
  itemColumns: TableColumnsType<ModuleLineItem>
  /** 行选择（antd `rowSelection`，与列表页同一套「身份列」）。 */
  itemRowSelection?: TableProps<ModuleLineItem>['rowSelection']
  /** 明细表空态文案；`undefined` = antd 默认空态。 */
  itemsEmptyText?: string
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
  /**
   * 是否在明细工具栏里渲染「取消 / 保存 / 保存并审核」。
   *
   * <p>为 true 时这两个页签（货物明细 / 附加费用）**都会渲染同一条工具栏**：货物页签是
   * 完整工具栏（添加明细 / 导入 / 自动排序 / 列设置 / 删除选中 + 保存组），费用页签只保留
   * 保存组（其余动作是货物专属，不适用）。这样按钮回到工具栏的同时，切页签也不会丢入口 ——
   * 历史缺陷正是「工具栏只挂在货物页签、切到费用页签就整条消失」。</p>
   *
   * <p>财务单据仍由 `WorkspaceOverlay` 的 footer 槽渲染，这里传 false。</p>
   */
  showFooterActions?: boolean
  /**
   * 是否渲染明细工具栏（新增明细 / 导入 / 列设置 / 自动排序 / 删除选中）。
   * 缺省 true；编辑器工作区把工具栏提到顶部操作栏后传 false。
   */
  showItemsToolbar?: boolean
  onAddItem: () => void
  onAutoSortItems: (mode?: FreightStatementSortMode) => void
  freightStatementSortDirection?: FreightStatementSortDirection
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
  onCancel: () => void
  onSave: (audit: boolean) => void
  onOpenParentSelector: () => void
  onCloseParentSelector: () => void
  onRemoveSelectedItems: () => void
  onImportParentRecord: (records: ModuleRecord[]) => void | Promise<void>
  onItemColumnOrderChange: (order: string[]) => void
  onToggleItemColumn: (key: string) => void
  /** 明细行序变化(整行长按拖动/键盘 Alt+↑↓ 落位): 新的 id 顺序即最终顺序; 不传=不可排序。 */
  onItemsReorder?: (nextIds: string[]) => void
  /** 明细工具栏附加操作（如销售订单交付核定的「整单取网价」）。 */
  extraActions?: React.ReactNode
}

/**
 * 编辑器明细区：货物/费用页签 + 明细工具栏 + 明细分组表 + 父单选择弹层。
 *
 * <p>本轮重构把两块分支密集的区块移出本组件：明细工具栏操作区拆到
 * ModuleItemsToolbarActions（按钮守卫 + 列设置临时状态），父单选择弹层拆到
 * ModuleParentSelectorHost（配置回退链）。原因是这些守卫内联后本函数控制流
 * 复杂度超出 react-doctor 阈值 (no-high-complexity-react-function)。
 * 页签结构、空态文案、分组表的 props 与父单弹层的挂载位置保持逐字不变。</p>
 */
export function ModuleEditorItemsSection({
  config,
  items,
  expenseItems,
  expenseSelectedItemIds,
  expenseMaterialOptions,
  expenseMaterialSearch,
  supportsExpenseTab,
  selectedItemIds,
  parentImportVisible,
  parentImporting,
  parentSelectorDisplayFieldKey,
  parentSelectorFilters,
  parentSelectorModuleKey,
  parentSelectorOpen,
  itemColumns,
  itemRowSelection,
  itemsEmptyText,
  itemTableComponents,
  itemColumnOrder,
  itemRowMenus,
  visibleItemColumnKeys,
  capabilities,
  auditLabel,
  saving,
  showFooterActions = false,
  showItemsToolbar = true,
  onAddItem,
  onAutoSortItems,
  freightStatementSortDirection = 'asc',
  onExpenseSelectedChange,
  onExpenseSelectAll,
  onExpenseChange,
  onCreateExpense,
  onExpenseAddItem,
  onExpenseDelete,
  onExpenseReorder,
  expenseRowKeys,
  onCancel,
  onSave,
  onOpenParentSelector,
  onCloseParentSelector,
  onRemoveSelectedItems,
  onImportParentRecord,
  onItemColumnOrderChange,
  onToggleItemColumn,
  onItemsReorder,
  extraActions,
}: Props) {
  const { t } = useTranslation()
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false)
  const [activeItemTab, setActiveItemTab] = useState<'goods' | 'expenses'>(
    'goods',
  )
  // 附加费用合计只有一个出口：sumChargeItemAmount（保存载荷、列表列、本处都取它）。
  const expenseTotalAmount = sumChargeItemAmount(expenseItems)
  const itemGroups = useMemo(
    () => buildModuleItemGroups(config.key, items),
    [config.key, items],
  )
  const selectedItemIdSet = useMemo(
    () => new Set(selectedItemIds),
    [selectedItemIds],
  )
  /*
   * 明细表底部的「草稿实时合计行」。
   *
   * <p>只有单分组时才挂：分组视图（`ModuleItemGroupsView`）会把同一份 `summary`
   * 原样透传给**每个分组下的表格**，多分组时整单合计会在每组底部重复一遍；
   * 分组小计要另做（改共享组件），不在本任务范围。</p>
   *
   * <p>合计口径全部来自 `ModuleEditorItemsSummary`（内部只调 `computeDraftTotals` +
   * `sumLineItemsBy`），本组件不重复计算。行随 `items` 变化重渲染，因此是实时的。</p>
   */
  const renderItemSummary = useMemo(() => {
    if (
      !shouldAttachEditorDraftSummary(itemGroups.length, itemColumns.length)
    ) {
      return undefined
    }
    /*
     * 合计文字要横跨整行：`ModuleItemGroupsView` 会在数据列之后追加「顺序」操作列，
     * 所以列数 = 数据列 + (可拖拽排序 ? 1 : 0)。少数一列，文字右端就离表格右边界差一截。
     */
    const colSpan = itemColumns.length + (onItemsReorder ? 1 : 0)
    return () => (
      <ModuleEditorItemsSummary
        moduleKey={config.key}
        items={items}
        chargeTotal={expenseTotalAmount}
        colSpan={colSpan}
      />
    )
  }, [
    config.key,
    expenseTotalAmount,
    itemColumns,
    itemGroups.length,
    items,
    onItemsReorder,
  ])
  const rowClassName = (record: ModuleLineItem) =>
    selectedItemIdSet.has(record.id) ? 'ant-table-row-selected' : ''

  const parentSelector = (
    <ModuleParentSelectorHost
      config={config}
      open={parentSelectorOpen}
      parentSelectorDisplayFieldKey={parentSelectorDisplayFieldKey}
      parentSelectorFilters={parentSelectorFilters}
      parentSelectorModuleKey={parentSelectorModuleKey}
      onImportParentRecord={onImportParentRecord}
      onCloseParentSelector={onCloseParentSelector}
    />
  )

  if (!config.itemColumns?.length) {
    return parentSelector
  }

  /*
   * 「取消 / 保存 / 保存并审核」在明细工具栏里的**唯一构建处**：两个页签共用同一份节点，
   * 所以切「货物明细 / 附加费用」都不会丢保存入口。
   * 两个页签都通过「行末槽」摆放（ModuleItemsPanel / ModuleEditorExpensePanel 的
   * footerActions）：工具按钮在左、单据动作贴右，两者作用域不同，不混在同一序列里。
   */
  const footerActions = showFooterActions ? (
    <EditorFooterActions
      canSave={capabilities.save}
      canAudit={capabilities.audit}
      auditLabel={auditLabel}
      saving={saving}
      onCancel={onCancel}
      onSave={onSave}
    />
  ) : null

  return (
    <>
      <div className="mt-3">
        {supportsExpenseTab ? (
          /*
           * 书签式（文件夹式）页签：选中页签与下方明细卡连成一片。
           * 结构上仍是 antd `Tabs`（保留 tablist/tab 语义与方向键切换），
           * 只把视觉改成「文件夹页签」——指示线由 CSS 去掉，这里显式把 ink bar 收成 0。
           */
          <Tabs
            className="editor-items-tabs"
            activeKey={activeItemTab}
            indicator={{ size: 0 }}
            onChange={(key) => setActiveItemTab(key as 'goods' | 'expenses')}
            items={[
              {
                key: 'goods',
                label: `${t('modules.itemsSection.goodsTab')} (${items.length})`,
              },
              {
                key: 'expenses',
                label: `${t('modules.itemsSection.expenseTab')} (${expenseItems.length})`,
              },
            ]}
          />
        ) : null}
        <div className="editor-items-tabs-body">
          {supportsExpenseTab && activeItemTab === 'expenses' ? (
            <ModuleEditorExpensePanel
              expenseItems={expenseItems}
              expenseSelectedItemIds={expenseSelectedItemIds}
              expenseMaterialOptions={expenseMaterialOptions}
              expenseMaterialSearch={expenseMaterialSearch}
              expenseTotalAmount={expenseTotalAmount}
              saving={saving}
              /* 费用页签也渲染同一条工具栏的保存组：切页签不丢保存入口。 */
              footerActions={showItemsToolbar ? footerActions : null}
              onExpenseSelectedChange={onExpenseSelectedChange}
              onExpenseSelectAll={onExpenseSelectAll}
              onExpenseChange={onExpenseChange}
              onCreateExpense={onCreateExpense}
              onExpenseAddItem={onExpenseAddItem}
              onExpenseDelete={onExpenseDelete}
              onExpenseReorder={onExpenseReorder}
              expenseRowKeys={expenseRowKeys}
            />
          ) : null}
          {!supportsExpenseTab || activeItemTab === 'goods' ? (
            <ModuleItemsPanel
              items={items}
              itemColumns={config.itemColumns}
              // 表尾草稿合计行已挂上时，标题行的内联合计关掉，避免同一份合计出现两次。
              showSummary={!renderItemSummary}
              expenseTotalAmount={
                supportsExpenseTab ? expenseTotalAmount : undefined
              }
              footerActions={showItemsToolbar ? footerActions : null}
              actions={
                showItemsToolbar ? (
                  <ModuleItemsToolbarActions
                    capabilities={capabilities}
                    columnSettingsOpen={columnSettingsOpen}
                    config={config}
                    extraActions={extraActions}
                    freightStatementSortDirection={
                      freightStatementSortDirection
                    }
                    itemColumnOrder={itemColumnOrder}
                    onAddItem={onAddItem}
                    onAutoSortItems={onAutoSortItems}
                    onColumnSettingsOpenChange={setColumnSettingsOpen}
                    onItemColumnOrderChange={onItemColumnOrderChange}
                    onOpenParentSelector={onOpenParentSelector}
                    onRemoveSelectedItems={onRemoveSelectedItems}
                    onToggleItemColumn={onToggleItemColumn}
                    parentImportVisible={parentImportVisible}
                    parentImporting={parentImporting}
                    saving={saving}
                    selectedItemCount={selectedItemIds.length}
                    visibleItemColumnKeys={visibleItemColumnKeys}
                  />
                ) : null
              }
            >
              <ModuleItemGroupsView
                groups={itemGroups}
                moduleKey={config.key}
                columns={itemColumns}
                rowSelection={itemRowSelection}
                emptyText={itemsEmptyText}
                components={itemTableComponents}
                rowClassName={rowClassName}
                itemRowMenus={itemRowMenus}
                summary={renderItemSummary}
                onItemsReorder={onItemsReorder}
              />
            </ModuleItemsPanel>
          ) : null}
        </div>
      </div>

      {parentSelector}
    </>
  )
}
