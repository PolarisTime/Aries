import { CloseOutlined } from '@ant-design/icons'
import { Button, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import i18next from 'i18next'
import type { Key, ReactNode } from 'react'
import { StatusTag } from '@/components/StatusTag'
import { statusMap } from '@/config/business-pages/shared/shared-status'
import type { SearchParams } from '@/types/api-raw'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { ModuleFilterToolbar } from './ModuleFilterToolbar'
import { ParentSelectorFooter } from './parent-selector/ParentSelectorFooter'
import {
  buildSelectedRecordSummary,
  EMPTY_FIXED_FILTERS,
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

function shouldIgnoreRowInteraction(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest(PARENT_SELECTOR_ROW_EXCLUSION_SELECTOR))
  )
}

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
                        statusMap={statusMap}
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

interface ParentSelectorTopProps {
  allowMultipleSelection: boolean
  displayFieldKey: string
  draftFilters: SearchParams
  /**
   * 动作区（已选摘要 + 取消 / 确认导入），渲染在吸顶工具行的最右侧。
   *
   * <p>它的节点本身是 {@code ParentSelectorFooter}，由内容组件传入而不是在这里另写一份，
   * 保证 {@code onConfirm} / {@code confirmDisabled} 只有**一个**出口。</p>
   */
  footerActions?: ReactNode
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
  footerActions,
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
          showSubmitButton
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
      {footerActions ? (
        <div className="parent-selector-top-actions">{footerActions}</div>
      ) : null}
    </div>
  )
}

interface ParentSelectorTableProps {
  allowMultipleSelection: boolean
  columns: ColumnsType<ModuleRecord>
  detailExpandedRowKeys: string[]
  loading: boolean
  onPageChange: (page: number, pageSize: number) => void
  onSelectedRowsChange: (keys: Key[], rows: ModuleRecord[]) => void
  onSelectSingleRecord: (record: ModuleRecord) => void
  onToggleDetail: (record: ModuleRecord) => void
  onToggleRecordSelection: (record: ModuleRecord) => void
  /**
   * 双击某一行直接导入这一张上游单据。
   *
   * <p>与「勾选后点确认导入」是同一执行器（{@code handleImportRecords([record])}），
   * 区别只是跳过勾选步骤：多选模式下双击不会改动已选集合，避免"我只是想打开看看"却把别的单据一起带进来。</p>
   */
  onQuickImportRecord: (record: ModuleRecord) => void
  page: number
  pageSize: number
  records: ModuleRecord[]
  renderDetail: (record: ModuleRecord) => ReactNode
  selectedRowKeys: string[]
  t: ParentSelectorTranslator
  total: number
}

function ParentSelectorTable({
  allowMultipleSelection,
  columns,
  detailExpandedRowKeys,
  loading,
  onPageChange,
  onQuickImportRecord,
  onSelectedRowsChange,
  onSelectSingleRecord,
  onToggleDetail,
  onToggleRecordSelection,
  page,
  pageSize,
  records,
  renderDetail,
  selectedRowKeys,
  t,
  total,
}: ParentSelectorTableProps) {
  const handleRowAction = (record: ModuleRecord) => {
    if (allowMultipleSelection) {
      onToggleRecordSelection(record)
      return
    }
    onSelectSingleRecord(record)
  }

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={records}
      loading={loading}
      scroll={{ x: 'max-content' }}
      rowSelection={{
        type: allowMultipleSelection ? 'checkbox' : 'radio',
        preserveSelectedRowKeys: true,
        selectedRowKeys,
        onChange: onSelectedRowsChange,
      }}
      expandable={{
        expandedRowKeys: detailExpandedRowKeys,
        expandedRowRender: renderDetail,
        onExpand: (expanded, record) => {
          const isExpanded = detailExpandedRowKeys.includes(String(record.id))
          if (expanded !== isExpanded) {
            onToggleDetail(record)
          }
        },
        // 明细入口为行首折叠按钮，避免额外的原生展开列造成重复入口。
        showExpandColumn: false,
      }}
      rowClassName={(record) =>
        detailExpandedRowKeys.includes(String(record.id))
          ? 'parent-selector-row--expanded'
          : ''
      }
      onRow={(record) => ({
        tabIndex: 0,
        'aria-keyshortcuts': 'Enter Space',
        title: i18next.t('moduleSelector.spaceEnterOrDoubleClickHint'),
        'aria-selected': selectedRowKeys.includes(String(record.id)),
        onClick: (event) => {
          if (shouldIgnoreRowInteraction(event.target)) return
          handleRowAction(record)
        },
        onDoubleClick: (event) => {
          // 行内的按钮/输入框（如明细折叠、搜索框）双击时不该触发导入
          if (shouldIgnoreRowInteraction(event.target)) return
          onQuickImportRecord(record)
        },
        onKeyDown: (event) => {
          if (shouldIgnoreRowInteraction(event.target)) return
          if (event.key === ' ' || event.key === 'Spacebar') {
            event.preventDefault()
            handleRowAction(record)
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

  /**
   * 动作区节点只构造**一次**，交给顶部工具行渲染。
   *
   * <p>从 `WorkspaceOverlay` 的 footer 槽搬到这里：节点与 props 完全不变，
   * `onConfirm` 仍然只有这一处，不存在两份按钮各自的回调。</p>
   */
  const footerActions = (
    <ParentSelectorFooter
      confirmDisabled={!selector.selectedRows.length}
      onCancel={selector.onClose}
      onConfirm={() => {
        void selector.handleImportRecords(selector.selectedRows)
      }}
      summary={selector.selectedSummary}
      t={selector.t}
    />
  )

  return (
    <WorkspaceOverlay
      title={selector.effectiveTitle}
      open
      onClose={selector.onClose}
      className="workspace-overlay-panel--parent-selector"
      variant="workspace"
      width="100%"
      height="100%"
      zIndex={1100}
    >
      <ParentSelectorTop
        allowMultipleSelection={selector.allowMultipleSelection}
        displayFieldKey={selector.displayFieldKey}
        draftFilters={selector.draftFilters}
        footerActions={footerActions}
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
        detailExpandedRowKeys={selector.detailExpandedRowKeys}
        loading={selector.isLoading}
        onPageChange={selector.handlePageChange}
        onQuickImportRecord={(record) => {
          void selector.handleImportRecords([record])
        }}
        onSelectedRowsChange={selector.handleSelectedRowsChange}
        onSelectSingleRecord={selector.selectSingleRecord}
        onToggleDetail={selector.toggleDetail}
        onToggleRecordSelection={selector.toggleRecordSelection}
        page={selector.page}
        pageSize={selector.pageSize}
        records={selector.records}
        renderDetail={selector.renderDetail}
        selectedRowKeys={selector.selectedRowKeys}
        t={selector.t}
        total={selector.total}
      />
    </WorkspaceOverlay>
  )
}
