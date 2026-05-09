import { DeleteOutlined, ImportOutlined, PlusOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button, Table, Typography } from 'antd'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { EditorFooterActions } from './EditorFooterActions'
import { EditorItemsSummary } from './EditorItemsSummary'
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
  canSave: boolean
  canAudit: boolean
  saving: boolean
  onAddItem: () => void
  onCancel: () => void
  onSave: (audit: boolean) => void
  onOpenParentSelector: () => void
  onCloseParentSelector: () => void
  onRemoveSelectedItems: () => void
  onImportParentRecord: (record: ModuleRecord) => void
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
  onRowDragOver,
}: Props) {
  if (!config.itemColumns?.length) {
    return null
  }

  const tableScrollX = itemColumns.reduce((sum, column) => {
    if (typeof column.width === 'number') {
      return sum + column.width
    }
    return sum + 140
  }, 48)

  return (
    <>
      <div style={{ marginTop: 24 }}>
        <div className="editor-items-head">
          <div className="editor-items-title-block editor-items-title-row">
            <Typography.Title level={5} className="detail-section-title">
              明细列表
            </Typography.Title>
            <div className="editor-items-actions">
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
            </div>
          </div>
          <EditorItemsSummary
            items={items}
            className="editor-items-summary-inline"
          />
        </div>
        <EditorItemsSummary
          items={items}
          className="editor-items-summary-mobile"
        />

        <Table
          rowKey="id"
          size="small"
          bordered
          className="module-detail-table"
          columns={itemColumns}
          dataSource={items}
          pagination={false}
          locale={{
            emptyText: config.parentImport
              ? '当前没有明细，可手动新增或从上级单据导入'
              : '当前没有明细，可手动新增',
          }}
          scroll={{ x: tableScrollX, y: 320 }}
          rowClassName={(record) =>
            selectedItemIds.includes(record.id) ? 'ant-table-row-selected' : ''
          }
          onRow={(record) => ({
            onDragOver: (e) => onRowDragOver(record.id, e),
          })}
        />
      </div>

      {config.parentImport && (
        <ModuleParentSelectorOverlay
          open={parentSelectorOpen}
          parentModuleKey={config.parentImport.parentModuleKey}
          parentDisplayFieldKey={config.parentImport.parentDisplayFieldKey}
          title={`选择${config.parentImport.label || '上级单据'}`}
          onSelect={onImportParentRecord}
          onClose={onCloseParentSelector}
        />
      )}
    </>
  )
}
