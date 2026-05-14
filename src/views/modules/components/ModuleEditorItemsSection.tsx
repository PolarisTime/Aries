import { DeleteOutlined, ImportOutlined, PlusOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import Button from 'antd/es/button'
import { useState } from 'react'
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
  canAddManualItems: boolean
  canImportParentItems: boolean
  parentImporting: boolean
  parentSelectorOpen: boolean
  itemColumns: TableColumnsType<ModuleLineItem>
  itemColumnOrder: string[]
  visibleItemColumnKeys: string[]
  canSave: boolean
  canAudit: boolean
  saving: boolean
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
  canAddManualItems,
  canImportParentItems,
  parentImporting,
  parentSelectorOpen,
  itemColumns,
  itemColumnOrder,
  visibleItemColumnKeys,
  canSave,
  canAudit,
  saving,
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
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false)

  if (!config.itemColumns?.length) {
    return null
  }

  return (
    <>
      <div className="mt-6">
        <ModuleItemsPanel
          items={items}
          actions={
            <>
              {canAddManualItems && (
                <Button
                  type="primary"
                  className="overlay-action-button"
                  icon={<PlusOutlined />}
                  onClick={onAddItem}
                >
                  新增明细
                </Button>
              )}
              {canImportParentItems && (
                <Button
                  className="overlay-action-button"
                  icon={<ImportOutlined />}
                  loading={parentImporting}
                  onClick={onOpenParentSelector}
                >
                  {config.parentImport?.buttonText ||
                    `导入${config.parentImport?.label || '上级单据'}明细`}
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
                  删除选中 ({selectedItemIds.length})
                </Button>
              )}
              <EditorFooterActions
                canSave={canSave}
                canAudit={canAudit}
                saving={saving}
                onCancel={onCancel}
                onSave={onSave}
              />
            </>
          }
        >
          <ModuleItemsTable
            columns={itemColumns}
            dataSource={items}
            emptyText={
              config.parentImport
                ? '当前没有明细，可手动新增或从上级单据导入'
                : '当前没有明细，可手动新增'
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

      {config.parentImport && (
        <ModuleParentSelectorOverlay
          open={parentSelectorOpen}
          parentModuleKey={config.parentImport.parentModuleKey}
          parentDisplayFieldKey={config.parentImport.parentDisplayFieldKey}
          allowMultipleSelection={config.parentImport.allowMultipleSelection}
          title={`选择${config.parentImport.label || '上级单据'}`}
          onSelect={onImportParentRecord}
          onClose={onCloseParentSelector}
        />
      )}
    </>
  )
}
