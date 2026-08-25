import {
  DeleteOutlined,
  ImportOutlined,
  PlusOutlined,
  SortAscendingOutlined,
} from '@ant-design/icons'
import type { TableColumnsType, TableProps } from 'antd'
import { Button, Tabs } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SearchParams } from '@/types/api-raw'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import {
  type CustomerStatementItemGroup,
  groupCustomerStatementItems,
} from '@/views/modules/customer-statement-item-groups'
import { groupFreightStatementItems } from '@/views/modules/freight-statement-item-groups'
import type { DocumentChargeItemDraft } from '@/views/modules/module-editor-draft-adapter'
import { ColumnSettingsPopover } from './ColumnSettingsPopover'
import { CustomerStatementItemGroupHeader } from './CustomerStatementItemGroupHeader'
import { EditorFooterActions } from './EditorFooterActions'
import {
  FreightStatementItemGroupHeader,
  FreightStatementProjectGroupHeader,
} from './FreightStatementItemGroupHeader'
import {
  ExpenseItemsSummaryBar,
  ModuleExpenseItemsTable,
} from './ModuleExpenseItemsTable'
import { ModuleItemsPanel } from './ModuleItemsPanel'
import { ModuleItemsTable } from './ModuleItemsTable'
import { ModuleParentSelectorOverlay } from './ModuleParentSelectorOverlay'

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
  supportsExpenseTab: boolean
  selectedItemIds: string[]
  parentImportVisible: boolean
  parentImporting: boolean
  parentSelectorDisplayFieldKey?: string
  parentSelectorFilters: SearchParams
  parentSelectorModuleKey?: string
  parentSelectorOpen: boolean
  itemColumns: TableColumnsType<ModuleLineItem>
  itemTableComponents: TableProps<ModuleLineItem>['components']
  itemColumnOrder: string[]
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
  showFooterActions?: boolean
  onAddItem: () => void
  onAutoSortItems: () => void
  onExpenseSelectedChange: (itemId: string, selected: boolean) => void
  onExpenseSelectAll: (selected: boolean) => void
  onExpenseChange: (
    index: number,
    patch: Partial<DocumentChargeItemDraft>,
  ) => void
  onCreateExpense: (name: string) => Promise<void>
  onExpenseAddItem: () => void
  onExpenseDelete: (index: number) => void
  onCancel: () => void
  onSave: (audit: boolean) => void
  onOpenParentSelector: () => void
  onCloseParentSelector: () => void
  onRemoveSelectedItems: () => void
  onImportParentRecord: (records: ModuleRecord[]) => void
  onItemColumnOrderChange: (order: string[]) => void
  onToggleItemColumn: (key: string) => void
  onRowDragOver: (recordId: string, event: React.DragEvent) => void
}

export function ModuleEditorItemsSection({
  config,
  items,
  expenseItems,
  expenseSelectedItemIds,
  expenseMaterialOptions,
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
  visibleItemColumnKeys,
  capabilities,
  auditLabel,
  saving,
  showFooterActions = true,
  onAddItem,
  onAutoSortItems,
  onExpenseSelectedChange,
  onExpenseSelectAll,
  onExpenseChange,
  onCreateExpense,
  onExpenseAddItem,
  onExpenseDelete,
  onCancel,
  onSave,
  onOpenParentSelector,
  onCloseParentSelector,
  onRemoveSelectedItems,
  onImportParentRecord,
  onItemColumnOrderChange,
  onToggleItemColumn,
  onRowDragOver,
}: Props) {
  const { t } = useTranslation()
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false)
  const [activeItemTab, setActiveItemTab] = useState<'goods' | 'expenses'>(
    'goods',
  )
  const expenseTotalAmount = expenseItems.reduce(
    (sum, item) =>
      sum + (Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0),
    0,
  )
  const itemGroups =
    config.key === 'freight-statement'
      ? groupFreightStatementItems(items)
      : config.key === 'customer-statement'
        ? groupCustomerStatementItems(items)
        : [
            {
              key: 'all',
              sourceNo: '',
              customerName: '',
              projectName: '',
              totalQuantity: 0,
              totalWeightTon: 0,
              items,
            },
          ]
  const renderedItemGroups = itemGroups.length
    ? itemGroups
    : config.key === 'customer-statement'
      ? [
          {
            key: 'empty',
            groupNo: 1,
            sourceNo: '',
            deliveryDate: '',
            totalQuantity: 0,
            totalWeightTon: 0,
            totalAmount: 0,
            items: [],
          },
        ]
      : [
          {
            key: 'empty',
            sourceNo: '',
            customerName: '',
            projectName: '',
            totalQuantity: 0,
            totalWeightTon: 0,
            items: [],
          },
        ]

  const parentSelector = config.parentImport ? (
    <ModuleParentSelectorOverlay
      open={parentSelectorOpen}
      parentModuleKey={
        parentSelectorModuleKey || config.parentImport.parentModuleKey
      }
      parentDisplayFieldKey={
        parentSelectorDisplayFieldKey ||
        config.parentImport.parentDisplayFieldKey
      }
      allowMultipleSelection={config.parentImport.allowMultipleSelection}
      candidateStatementModuleKey={
        config.parentImport.candidateStatementModuleKey
      }
      candidateQueryType={config.parentImport.candidateQueryType}
      hiddenSelectorColumnKeys={config.parentImport.hiddenSelectorColumnKeys}
      fixedFilters={parentSelectorFilters}
      title={t('modules.itemsSection.selectParent', {
        label: config.parentImport.label || t('modules.itemsSection.parentDoc'),
      })}
      onSelect={onImportParentRecord}
      onClose={onCloseParentSelector}
    />
  ) : null

  if (!config.itemColumns?.length) {
    return parentSelector
  }

  return (
    <>
      <div className="mt-6">
        {supportsExpenseTab ? (
          <Tabs
            activeKey={activeItemTab}
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
        {supportsExpenseTab && activeItemTab === 'expenses' ? (
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
                      for (const id of expenseSelectedItemIds) {
                        const index = expenseItems.findIndex(
                          (item) => item.id === id,
                        )
                        if (index >= 0) {
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
        ) : null}
        {!supportsExpenseTab || activeItemTab === 'goods' ? (
          <ModuleItemsPanel
            items={items}
            itemColumns={config.itemColumns}
            expenseTotalAmount={
              supportsExpenseTab ? expenseTotalAmount : undefined
            }
            actions={
              <>
                {capabilities.addManualItems && (
                  <Button
                    type="primary"
                    className="overlay-action-button"
                    icon={<PlusOutlined />}
                    disabled={saving}
                    onClick={onAddItem}
                  >
                    {t('modules.itemsSection.addItem')}
                  </Button>
                )}
                {parentImportVisible && (
                  <Button
                    className="overlay-action-button"
                    icon={<ImportOutlined />}
                    loading={parentImporting}
                    disabled={saving || !capabilities.importParentItems}
                    onClick={onOpenParentSelector}
                  >
                    {config.parentImport?.buttonText ||
                      t('modules.itemsSection.importItems', {
                        label:
                          config.parentImport?.label ||
                          t('modules.itemsSection.parentDoc'),
                      })}
                  </Button>
                )}
                {capabilities.autoSortItems && (
                  <Button
                    className="overlay-action-button"
                    icon={<SortAscendingOutlined />}
                    disabled={saving}
                    onClick={onAutoSortItems}
                  >
                    {t('modules.itemsSection.autoSortItems')}
                  </Button>
                )}
                <ColumnSettingsPopover
                  columns={config.itemColumns}
                  orderedKeys={itemColumnOrder}
                  visibleKeys={visibleItemColumnKeys}
                  onToggle={onToggleItemColumn}
                  onOrderChange={onItemColumnOrderChange}
                  open={columnSettingsOpen}
                  onOpenChange={setColumnSettingsOpen}
                />
                {selectedItemIds.length > 0 && (
                  <Button
                    danger
                    className="overlay-action-button"
                    icon={<DeleteOutlined />}
                    disabled={saving}
                    onClick={onRemoveSelectedItems}
                  >
                    {t('modules.itemsSection.deleteSelected')} (
                    {selectedItemIds.length})
                  </Button>
                )}
                {showFooterActions ? (
                  <EditorFooterActions
                    canSave={capabilities.save}
                    canAudit={capabilities.audit}
                    auditLabel={auditLabel}
                    saving={saving}
                    onCancel={onCancel}
                    onSave={onSave}
                  />
                ) : null}
              </>
            }
          >
            <div className="module-items-groups">
              {renderedItemGroups.map((group) => (
                <div className="module-items-group" key={group.key}>
                  {'projectGroups' in group ? (
                    <>
                      <FreightStatementItemGroupHeader group={group} />
                      {group.projectGroups.map((projectGroup) => (
                        <div
                          className="module-items-project-group"
                          key={projectGroup.key}
                        >
                          <FreightStatementProjectGroupHeader
                            group={projectGroup}
                          />
                          <ModuleItemsTable
                            columns={itemColumns}
                            components={itemTableComponents}
                            dataSource={projectGroup.items}
                            emptyText={
                              config.parentImport
                                ? t('modules.itemsSection.emptyTextWithImport')
                                : t('modules.itemsSection.emptyText')
                            }
                            rowClassName={(record) =>
                              selectedItemIds.includes(record.id)
                                ? 'ant-table-row-selected'
                                : ''
                            }
                            onRow={(record) => ({
                              onDragOver: (event: React.DragEvent<Element>) =>
                                onRowDragOver(record.id, event),
                            })}
                          />
                        </div>
                      ))}
                    </>
                  ) : config.key === 'customer-statement' ? (
                    <>
                      <CustomerStatementItemGroupHeader
                        group={
                          group as CustomerStatementItemGroup<ModuleLineItem>
                        }
                      />
                      <ModuleItemsTable
                        columns={itemColumns}
                        components={itemTableComponents}
                        dataSource={group.items}
                        emptyText={
                          config.parentImport
                            ? t('modules.itemsSection.emptyTextWithImport')
                            : t('modules.itemsSection.emptyText')
                        }
                        rowClassName={(record) =>
                          selectedItemIds.includes(record.id)
                            ? 'ant-table-row-selected'
                            : ''
                        }
                        onRow={(record) => ({
                          onDragOver: (event: React.DragEvent<Element>) =>
                            onRowDragOver(record.id, event),
                        })}
                      />
                    </>
                  ) : (
                    <ModuleItemsTable
                      columns={itemColumns}
                      components={itemTableComponents}
                      dataSource={group.items}
                      emptyText={
                        config.parentImport
                          ? t('modules.itemsSection.emptyTextWithImport')
                          : t('modules.itemsSection.emptyText')
                      }
                      rowClassName={(record) =>
                        selectedItemIds.includes(record.id)
                          ? 'ant-table-row-selected'
                          : ''
                      }
                      onRow={(record) => ({
                        onDragOver: (event: React.DragEvent<Element>) =>
                          onRowDragOver(record.id, event),
                      })}
                    />
                  )}
                </div>
              ))}
            </div>
          </ModuleItemsPanel>
        ) : null}
      </div>

      {parentSelector}
    </>
  )
}
