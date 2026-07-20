import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { Button, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Key } from 'react'
import { StatusTag } from '@/components/StatusTag'
import type { SearchParams } from '@/types/api-raw'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { ModuleFilterToolbar } from './ModuleFilterToolbar'
import {
  buildSelectedRecordSummary,
  EMPTY_FIXED_FILTERS,
  getOverlayStatusMap,
  type ModuleParentSelectorOverlayContentProps,
  type ParentSelectorFormatCellValue,
  type ParentSelectorTranslator,
  useModuleParentSelectorOverlay,
} from './useModuleParentSelectorOverlay'
import { WorkspaceOverlay } from './WorkspaceOverlay'

interface Props extends ModuleParentSelectorOverlayContentProps {
  open: boolean
}

const PARENT_SELECTOR_ROW_EXCLUSION_SELECTOR =
  '.ant-table-selection-column, .parent-selector-selected-chip-remove'

interface ParentSelectorSelectedPanelProps {
  displayFieldKey: string
  formatCellValue: ParentSelectorFormatCellValue
  onClear: () => void
  onRemove: (recordId: string) => void
  parentModuleKey: string
  selectedRows: ModuleRecord[]
  t: ParentSelectorTranslator
}

function ParentSelectorSelectedPanel({
  displayFieldKey,
  formatCellValue,
  onClear,
  onRemove,
  parentModuleKey,
  selectedRows,
  t,
}: ParentSelectorSelectedPanelProps) {
  return (
    <div className="parent-selector-selected-panel">
      <div className="parent-selector-selected-header">
        <span className="parent-selector-selected-title">
          {t('modules.parentSelector.selectedDocuments')}
          <span className="parent-selector-selected-count">
            {t('modules.parentSelector.selectedDocumentsCount', {
              count: selectedRows.length,
            })}
          </span>
        </span>
        <Button disabled={!selectedRows.length} onClick={onClear}>
          {t('modules.parentSelector.clearSelected')}
        </Button>
      </div>
      {selectedRows.length ? (
        <div className="parent-selector-selected-list">
          {selectedRows.map((record) => {
            const recordId = String(record.id)
            const summary = buildSelectedRecordSummary(
              record,
              parentModuleKey,
              displayFieldKey,
              formatCellValue,
            )

            return (
              <div key={recordId} className="parent-selector-selected-chip">
                <div className="parent-selector-selected-chip-main">
                  <div className="parent-selector-selected-chip-top">
                    <span className="parent-selector-selected-chip-title">
                      {summary.primary}
                    </span>
                    {summary.status ? (
                      <StatusTag
                        status={summary.status}
                        statusMap={getOverlayStatusMap()}
                        fallback={summary.status}
                      />
                    ) : null}
                  </div>
                  {summary.meta.length ? (
                    <div className="parent-selector-selected-chip-meta">
                      {summary.meta.map((item) => (
                        <span
                          key={`${recordId}-${item}`}
                          className="parent-selector-selected-chip-desc"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="parent-selector-selected-chip-desc">
                      {t('modules.parentSelector.selectedDocuments')}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="parent-selector-selected-chip-remove"
                  onClick={() => onRemove(recordId)}
                  aria-label={t('modules.parentSelector.removeAriaLabel', {
                    name: summary.primary,
                  })}
                >
                  <CloseOutlined />
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="parent-selector-selected-empty">
          {t('modules.parentSelector.noSelectionHint')}
        </div>
      )}
    </div>
  )
}

interface ParentSelectorFooterProps {
  disabled: boolean
  onCancel: () => void
  onConfirm: () => void
  selectedCount: number
  t: ParentSelectorTranslator
}

function ParentSelectorFooter({
  disabled,
  onCancel,
  onConfirm,
  selectedCount,
  t,
}: ParentSelectorFooterProps) {
  return (
    <div className="flex justify-between items-center gap-12">
      <span className="text-secondary">
        {t('modules.parentSelector.selectedCount', {
          count: selectedCount,
        })}
      </span>
      <div className="flex gap-8">
        <Button onClick={onCancel}>{t('modules.parentSelector.cancel')}</Button>
        <Button
          type="primary"
          icon={<CheckOutlined />}
          disabled={disabled}
          onClick={onConfirm}
        >
          {t('modules.parentSelector.confirmImport')}
        </Button>
      </div>
    </div>
  )
}

interface ParentSelectorTopProps {
  allowMultipleSelection: boolean
  displayFieldKey: string
  draftFilters: SearchParams
  formatCellValue: ParentSelectorFormatCellValue
  submittedFilters: SearchParams
  onClearSelectedRecords: () => void
  onApplyFilters: (filters: SearchParams) => void
  onRemoveSelectedRecord: (recordId: string) => void
  onResetFilters: () => void
  onUpdateFilter: (key: string, value: unknown) => void
  overlayFilterConfig?: ModulePageConfig
  parentModuleKey: string
  selectedRows: ModuleRecord[]
  t: ParentSelectorTranslator
}

function ParentSelectorTop({
  allowMultipleSelection,
  displayFieldKey,
  draftFilters,
  formatCellValue,
  submittedFilters,
  onClearSelectedRecords,
  onApplyFilters,
  onRemoveSelectedRecord,
  onResetFilters,
  onUpdateFilter,
  overlayFilterConfig,
  parentModuleKey,
  selectedRows,
  t,
}: ParentSelectorTopProps) {
  return (
    <div className="parent-selector-top">
      {overlayFilterConfig ? (
        <ModuleFilterToolbar
          config={overlayFilterConfig}
          filters={draftFilters}
          defaultFilters={{}}
          submittedFilters={submittedFilters}
          onUpdateFilter={onUpdateFilter}
          onApplyFilters={onApplyFilters}
          onReset={onResetFilters}
        />
      ) : null}
      {allowMultipleSelection ? (
        <ParentSelectorSelectedPanel
          displayFieldKey={displayFieldKey}
          formatCellValue={formatCellValue}
          onClear={onClearSelectedRecords}
          onRemove={onRemoveSelectedRecord}
          parentModuleKey={parentModuleKey}
          selectedRows={selectedRows}
          t={t}
        />
      ) : null}
    </div>
  )
}

interface ParentSelectorTableProps {
  allowMultipleSelection: boolean
  columns: ColumnsType<ModuleRecord>
  loading: boolean
  onImportRecord: (record: ModuleRecord) => void
  onPageChange: (page: number, pageSize: number) => void
  onSelectedRowsChange: (keys: Key[], rows: ModuleRecord[]) => void
  onToggleRecordSelection: (record: ModuleRecord) => void
  page: number
  pageSize: number
  records: ModuleRecord[]
  selectedRowKeys: string[]
  t: ParentSelectorTranslator
  total: number
}

function ParentSelectorTable({
  allowMultipleSelection,
  columns,
  loading,
  onImportRecord,
  onPageChange,
  onSelectedRowsChange,
  onToggleRecordSelection,
  page,
  pageSize,
  records,
  selectedRowKeys,
  t,
  total,
}: ParentSelectorTableProps) {
  const shouldIgnoreRowInteraction = (target: EventTarget | null) =>
    target instanceof Element &&
    Boolean(target.closest(PARENT_SELECTOR_ROW_EXCLUSION_SELECTOR))

  const handleRowAction = (record: ModuleRecord) => {
    if (allowMultipleSelection) {
      onToggleRecordSelection(record)
      return
    }
    onImportRecord(record)
  }

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={records}
      loading={loading}
      scroll={{ x: 'max-content' }}
      rowSelection={
        allowMultipleSelection
          ? {
              preserveSelectedRowKeys: true,
              selectedRowKeys,
              onChange: onSelectedRowsChange,
            }
          : undefined
      }
      onRow={(record) => ({
        tabIndex: 0,
        'aria-keyshortcuts': allowMultipleSelection ? 'Enter Space' : 'Enter',
        title: allowMultipleSelection ? 'Space 选择，Enter 打开' : 'Enter 打开',
        'aria-selected': allowMultipleSelection
          ? selectedRowKeys.includes(String(record.id))
          : undefined,
        onClick: (event) => {
          if (shouldIgnoreRowInteraction(event.target)) return
          handleRowAction(record)
        },
        onKeyDown: (event) => {
          if (shouldIgnoreRowInteraction(event.target)) return
          if (event.key === ' ' || event.key === 'Spacebar') {
            if (!allowMultipleSelection) return
            event.preventDefault()
            onToggleRecordSelection(record)
            return
          }
          if (event.key === 'Enter') {
            event.preventDefault()
            handleRowAction(record)
          }
        },
        style: { cursor: 'pointer' },
      })}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        pageSizeOptions: ['15', '30', '50'],
        showTotal: (count) =>
          t('modules.parentSelector.paginationTotal', { count }),
        onChange: onPageChange,
      }}
    />
  )
}

export function ModuleParentSelectorOverlay({
  open,
  parentModuleKey,
  parentDisplayFieldKey,
  allowMultipleSelection = false,
  candidateStatementModuleKey,
  candidateQueryType,
  hiddenSelectorColumnKeys,
  fixedFilters = EMPTY_FIXED_FILTERS,
  title,
  onSelect,
  onClose,
}: Props) {
  if (!open) return null

  return (
    <ModuleParentSelectorOverlayContent
      key={`${parentModuleKey}:${parentDisplayFieldKey || ''}:${allowMultipleSelection ? 'multi' : 'single'}`}
      parentModuleKey={parentModuleKey}
      parentDisplayFieldKey={parentDisplayFieldKey}
      allowMultipleSelection={allowMultipleSelection}
      candidateStatementModuleKey={candidateStatementModuleKey}
      candidateQueryType={candidateQueryType}
      hiddenSelectorColumnKeys={hiddenSelectorColumnKeys}
      fixedFilters={fixedFilters}
      title={title}
      onSelect={onSelect}
      onClose={onClose}
    />
  )
}

function ModuleParentSelectorOverlayContent(
  props: ModuleParentSelectorOverlayContentProps,
) {
  const selector = useModuleParentSelectorOverlay(props)

  return (
    <WorkspaceOverlay
      title={selector.effectiveTitle}
      open
      onClose={selector.onClose}
      className="workspace-overlay-panel--parent-selector"
      footer={
        selector.allowMultipleSelection ? (
          <ParentSelectorFooter
            disabled={!selector.selectedRows.length}
            onCancel={selector.onClose}
            onConfirm={() => {
              void selector.handleImportRecords(selector.selectedRows)
            }}
            selectedCount={selector.selectedRows.length}
            t={selector.t}
          />
        ) : undefined
      }
      variant="workspace"
      width="100%"
      height="100%"
      zIndex={1100}
    >
      <ParentSelectorTop
        allowMultipleSelection={selector.allowMultipleSelection}
        displayFieldKey={selector.displayFieldKey}
        draftFilters={selector.draftFilters}
        formatCellValue={selector.formatCellValue}
        submittedFilters={selector.submittedFilters}
        onClearSelectedRecords={selector.handleClearSelectedRecords}
        onApplyFilters={selector.applyFilters}
        onRemoveSelectedRecord={selector.removeSelectedRecord}
        onResetFilters={selector.resetFilters}
        onUpdateFilter={selector.updateFilter}
        overlayFilterConfig={selector.overlayFilterConfig}
        parentModuleKey={selector.parentModuleKey}
        selectedRows={selector.selectedRows}
        t={selector.t}
      />
      <ParentSelectorTable
        allowMultipleSelection={selector.allowMultipleSelection}
        columns={selector.columns}
        loading={selector.isLoading}
        onImportRecord={(record) => {
          void selector.handleImportRecords([record])
        }}
        onPageChange={selector.handlePageChange}
        onSelectedRowsChange={selector.handleSelectedRowsChange}
        onToggleRecordSelection={selector.toggleRecordSelection}
        page={selector.page}
        pageSize={selector.pageSize}
        records={selector.records}
        selectedRowKeys={selector.selectedRowKeys}
        t={selector.t}
        total={selector.total}
      />
    </WorkspaceOverlay>
  )
}
