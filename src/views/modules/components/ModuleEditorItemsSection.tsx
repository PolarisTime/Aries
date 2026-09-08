import {
  DeleteOutlined,
  DownOutlined,
  ImportOutlined,
  PlusOutlined,
  SortAscendingOutlined,
} from '@ant-design/icons'
import type { MenuProps, TableColumnsType, TableProps } from 'antd'
import { Button, Dropdown, Tabs } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { ColumnSettingsPopover } from './ColumnSettingsPopover'
import { EditorFooterActions } from './EditorFooterActions'
import { ModuleEditorExpensePanel } from './ModuleEditorExpensePanel'
import { ModuleItemGroupsView } from './ModuleItemGroupsView'
import { ModuleItemsPanel } from './ModuleItemsPanel'
import { ModuleParentSelectorOverlay } from './ModuleParentSelectorOverlay'
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
  onAutoSortItems: (mode?: FreightStatementSortMode) => void
  freightStatementSortDirection?: FreightStatementSortDirection
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
  freightStatementSortDirection = 'asc',
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
  const freightStatementSortMenuItems: MenuProps['items'] = [
    {
      key: 'sourceNo',
      label: t('modules.itemsSection.autoSortBySourceNo'),
    },
    {
      key: 'billTime',
      label: t(
        freightStatementSortDirection === 'asc'
          ? 'modules.itemsSection.autoSortByBillTimeAscending'
          : 'modules.itemsSection.autoSortByBillTimeDescending',
      ),
    },
  ]
  const itemGroups = useMemo(
    () => buildModuleItemGroups(config.key, items),
    [config.key, items],
  )
  const selectedItemIdSet = useMemo(
    () => new Set(selectedItemIds),
    [selectedItemIds],
  )
  const rowClassName = (record: ModuleLineItem) =>
    selectedItemIdSet.has(record.id) ? 'ant-table-row-selected' : ''
  const emptyText = config.parentImport
    ? t('modules.itemsSection.emptyTextWithImport')
    : t('modules.itemsSection.emptyText')

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
          <ModuleEditorExpensePanel
            expenseItems={expenseItems}
            expenseSelectedItemIds={expenseSelectedItemIds}
            expenseMaterialOptions={expenseMaterialOptions}
            expenseTotalAmount={expenseTotalAmount}
            saving={saving}
            onExpenseSelectedChange={onExpenseSelectedChange}
            onExpenseSelectAll={onExpenseSelectAll}
            onExpenseChange={onExpenseChange}
            onCreateExpense={onCreateExpense}
            onExpenseAddItem={onExpenseAddItem}
            onExpenseDelete={onExpenseDelete}
          />
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
                {capabilities.autoSortItems &&
                  (config.key === 'freight-statement' ? (
                    <Dropdown
                      menu={{
                        items: freightStatementSortMenuItems,
                        onClick: ({ key }) =>
                          onAutoSortItems(key as FreightStatementSortMode),
                      }}
                      trigger={['click']}
                    >
                      <Button
                        className="overlay-action-button"
                        icon={<SortAscendingOutlined />}
                        disabled={saving}
                      >
                        {t('modules.itemsSection.autoSortItems')}
                        <DownOutlined />
                      </Button>
                    </Dropdown>
                  ) : (
                    <Button
                      className="overlay-action-button"
                      icon={<SortAscendingOutlined />}
                      disabled={saving}
                      onClick={() => onAutoSortItems()}
                    >
                      {t('modules.itemsSection.autoSortItems')}
                    </Button>
                  ))}
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
            <ModuleItemGroupsView
              groups={itemGroups}
              moduleKey={config.key}
              columns={itemColumns}
              components={itemTableComponents}
              emptyText={emptyText}
              rowClassName={rowClassName}
              onRowDragOver={onRowDragOver}
            />
          </ModuleItemsPanel>
        ) : null}
      </div>

      {parentSelector}
    </>
  )
}
