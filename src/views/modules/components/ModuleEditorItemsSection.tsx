import { DeleteOutlined, ImportOutlined, PlusOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SearchParams } from '@/types/api-raw'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { ColumnSettingsPopover } from './ColumnSettingsPopover'
import { EditorFooterActions } from './EditorFooterActions'
import { ModuleItemsPanel } from './ModuleItemsPanel'
import { ModuleItemsTable } from './ModuleItemsTable'
import { ModuleParentSelectorOverlay } from './ModuleParentSelectorOverlay'

interface Props {
  config: ModulePageConfig
  items: ModuleLineItem[]
  selectedItemIds: string[]
  parentImportVisible: boolean
  parentImporting: boolean
  parentSelectorDisplayFieldKey?: string
  parentSelectorFilters: SearchParams
  parentSelectorModuleKey?: string
  parentSelectorOpen: boolean
  itemColumns: TableColumnsType<ModuleLineItem>
  itemColumnOrder: string[]
  visibleItemColumnKeys: string[]
  capabilities: {
    addManualItems: boolean
    importParentItems: boolean
    save: boolean
    audit: boolean
  }
  auditLabel?: string
  saving: boolean
  showFooterActions?: boolean
  onAddItem: () => void
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
  selectedItemIds,
  parentImportVisible,
  parentImporting,
  parentSelectorDisplayFieldKey,
  parentSelectorFilters,
  parentSelectorModuleKey,
  parentSelectorOpen,
  itemColumns,
  itemColumnOrder,
  visibleItemColumnKeys,
  capabilities,
  auditLabel,
  saving,
  showFooterActions = true,
  onAddItem,
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
        <ModuleItemsPanel
          items={items}
          itemColumns={config.itemColumns}
          actions={
            <>
              {capabilities.addManualItems && (
                <Button
                  type="primary"
                  className="overlay-action-button"
                  icon={<PlusOutlined />}
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
                  disabled={!capabilities.importParentItems}
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
          <ModuleItemsTable
            columns={itemColumns}
            dataSource={items}
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
        </ModuleItemsPanel>
      </div>

      {parentSelector}
    </>
  )
}
