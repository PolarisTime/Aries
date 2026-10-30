import { ReloadOutlined } from '@ant-design/icons'
import { Alert, Button } from 'antd'
import type { ColumnsType, TableProps } from 'antd/es/table'
import { isEqual } from 'es-toolkit'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ColumnSettingsRequestContext } from '@/components/column-settings-request-context'
import type { RowContextMenuMap } from '@/components/row-context-menu'
import { buildScopedOverview } from '@/config/business-pages/shared/shared-overview'
import { isSelectionScopedToolbarAction } from '@/hooks/useModuleToolbarActions'
import type { SearchParams } from '@/types/api-raw'
import type {
  ModuleActionDefinition,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { BusinessGridTable } from '@/views/modules/components/BusinessGridTable'
import { ColumnSettingsPopover } from '@/views/modules/components/ColumnSettingsPopover'
import { ModuleFilterActiveSummary } from '@/views/modules/components/ModuleFilterActiveSummary'
import { ModuleFilterToolbar } from '@/views/modules/components/ModuleFilterToolbar'
import { ModuleTablePagination } from '@/views/modules/components/ModuleTablePagination'
import { ModuleTableToolbar } from '@/views/modules/components/ModuleTableToolbar'

interface Props {
  moduleKey: string
  config: ModulePageConfig
  filters: SearchParams
  defaultFilters: SearchParams
  submittedFilters: SearchParams
  loading: boolean
  /** 失败后正在自动重试的窗口（见 BusinessGridTable 的 isRetrying 说明） */
  isRetrying?: boolean
  hasLoadError: boolean
  loadErrorMessage: string
  exporting: boolean
  records: ModuleRecord[]
  selectedRows: ModuleRecord[]
  total: number
  currentPage: number
  pageSize: number
  columnVisibleKeys: string[]
  columnOrder: string[]
  columns: ColumnsType<ModuleRecord>
  components: TableProps<ModuleRecord>['components']
  /** 行右键菜单查找表(键为行 key); 由表格内部注入 Provider */
  rowContextMenus?: RowContextMenuMap
  rowSelection?: TableProps<ModuleRecord>['rowSelection']
  rowClassName: (record: ModuleRecord) => string
  onUpdateFilter: (key: string, value: unknown) => void
  onApplyFilters: (filters: SearchParams) => void
  /** 重置筛选: 清本地 state; 传了 `onClearRouteFilters` 时调用方已保证 URL 同步清掉 */
  onReset: () => void
  /**
   * 清掉 URL 里驱动筛选的参数(实现在路由层, 见 `consumeRouteFilterSearch`)。
   * 有值时「重置」会先清 URL 再清 state, 两者同一动作, 避免刷新后筛选静默复活。
   */
  onClearRouteFilters?: () => void
  onCreate: () => void
  onExport: () => void
  onRefresh: () => void
  onRetry: () => void
  onClearSelection: () => void
  onToggleColumn: (key: string) => void
  onColumnOrderChange: (order: string[]) => void
  onResetColumnSizes?: () => void
  onRowClick: (record: ModuleRecord) => void
  onRowDoubleClick: (record: ModuleRecord) => void
  expandable?: TableProps<ModuleRecord>['expandable']
  /** 明细按钮渲染器（口径在 useGridColumns）：渲染在首位身份列里，不再单独占一列 */
  renderRowDetailToggle?: (record: ModuleRecord) => React.ReactNode
  canCreate: boolean
  canExport: boolean
  toolbarActions: ModuleActionDefinition[]
  onAction: (action: ModuleActionDefinition) => void
  onPageChange: (page: number, pageSize: number) => void
  selectedCount: number
  printDropdown?: React.ReactNode
}

function hasNonDefaultFilters(
  submittedFilters: SearchParams,
  defaultFilters: SearchParams,
) {
  const submittedKeys = Object.keys(submittedFilters)
  const defaultEntries = Object.entries(defaultFilters)
  if (submittedKeys.length !== defaultEntries.length) return true
  return defaultEntries.some(
    ([key, value]) => !isEqual(submittedFilters[key], value),
  )
}

export function BusinessGridContent({
  moduleKey,
  config,
  filters,
  defaultFilters,
  submittedFilters,
  loading,
  isRetrying,
  hasLoadError,
  loadErrorMessage,
  exporting,
  records,
  selectedRows,
  total,
  currentPage,
  pageSize,
  columnVisibleKeys,
  columnOrder,
  columns,
  components,
  rowContextMenus,
  rowSelection,
  rowClassName,
  onUpdateFilter,
  onApplyFilters,
  onReset,
  onClearRouteFilters,
  onCreate,
  onExport,
  onRefresh,
  onRetry,
  onToggleColumn,
  onColumnOrderChange,
  onResetColumnSizes,
  onRowClick,
  onRowDoubleClick,
  expandable,
  renderRowDetailToggle,
  canCreate,
  canExport,
  toolbarActions,
  onAction,
  onPageChange,
  printDropdown,
}: Props) {
  const { t } = useTranslation()
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false)
  const hasActiveFilters = useMemo(
    () => hasNonDefaultFilters(submittedFilters, defaultFilters),
    [submittedFilters, defaultFilters],
  )
  /*
   * 「重置」= 清 URL 筛选参数 + 清本地筛选 state, 两者是同一个动作的两个出口。
   * 只清 state 会让 URL 里的 docNo 在刷新/切回页签/重挂载时被重新灌回界面
   * (实测: 清空后 30 条, 刷新后只剩 1 条)。URL 侧的清理实现与路由同步同源。
   */
  const handleResetFilters = () => {
    onClearRouteFilters?.()
    onReset()
  }
  /*
   * 汇总口径必须显式带标签: 勾选行后数据源会从"本页"换成"仅选中",
   * 静默换数会让「单据数量」在同一屏读出两个数(见 buildScopedOverview)。
   * 这里只把两批行交给唯一出口, 不在本组件里另写"选没选"的判断。
   */
  const overviewItems = useMemo(
    () =>
      buildScopedOverview({
        buildItems: config.buildOverview,
        pageRows: records,
        selectedRows,
      }),
    [config.buildOverview, records, selectedRows],
  )
  /*
   * 两批口径分两处渲染：勾选组合计进上方横幅，本页合计留在页脚。
   * 按 `scopeKey`（机器可读）拆分，不按 `scope` 文案匹配 —— 文案随 i18n 变。
   */
  const selectionOverviewItems = useMemo(
    () => overviewItems.filter((item) => item.scopeKey === 'selection'),
    [overviewItems],
  )
  const pageOverviewItems = useMemo(
    () => overviewItems.filter((item) => item.scopeKey !== 'selection'),
    [overviewItems],
  )
  /*
   * 动作按「是否只在勾选后才有意义」拆开：批量动作（导出选中/批量审核/反审核/删除）
   * 进横幅，页面动作（打印/附件/单据流…）留在工具栏。判据在
   * `isSelectionScopedToolbarAction` 一处，且这些动作本来就只有勾选后才生成。
   */
  const selectionActions = useMemo(
    () => toolbarActions.filter(isSelectionScopedToolbarAction),
    [toolbarActions],
  )
  const pageActions = useMemo(
    () =>
      toolbarActions.filter(
        (action) => !isSelectionScopedToolbarAction(action),
      ),
    [toolbarActions],
  )
  /*
   * 批量动作与页面动作合并到同一条工具栏。
   *
   * <p>原先批量动作（导出选中/批量审核/批量反审核/批量删除）渲染在表格上方的勾选横幅里，
   * 勾选一出现就横贯一行、整页高度跟着跳动，而且"按钮在下方、表格在上方"要来回找。
   * 现在统一进工具栏：这些动作只在勾选后才生成，未勾选时工具栏里不会多出禁用按钮。</p>
   */
  const toolbarActionList = useMemo(
    () => [...pageActions, ...selectionActions],
    [pageActions, selectionActions],
  )
  /*
   * 页脚合计 = 勾选口径 + 本页口径。
   *
   * <p>勾选合计（「已选 N 项 · 总重量 · 总金额」）原本单独渲染在横幅里，横幅移除后跟着
   * 本页合计一起落到表格下方的页脚，两组口径由 `ModuleTablePagination` 按 `scope` 自动分组，
   * 不会混成一个数。</p>
   */
  const overviewItemsForFooter = useMemo(
    () => [...selectionOverviewItems, ...pageOverviewItems],
    [selectionOverviewItems, pageOverviewItems],
  )

  /*
   * 稳定引用：内联 `() => setColumnSettingsOpen(true)` 每次渲染都是新函数，
   * 会让 ColumnSettingsRequestContext 的所有消费者跟着重渲染（react-doctor
   * `unstable-context-provider-value`）。
   */
  const openColumnSettings = useCallback(() => setColumnSettingsOpen(true), [])

  return (
    <section className="module-grid-workspace">
      <div className="module-grid-filter-region">
        <ModuleFilterToolbar
          config={config}
          filters={filters}
          defaultFilters={defaultFilters}
          submittedFilters={submittedFilters}
          onUpdateFilter={onUpdateFilter}
          onApplyFilters={onApplyFilters}
          onReset={handleResetFilters}
          /*
           * 重置留在筛选区尾部（默认 true）。
           *
           * <p>曾把它下移到工具行右侧与刷新并排，结果两个按钮都是圆形箭头图标
           * （刷新 ReloadOutlined / 重置 RedoOutlined），只靠「重置」二字区分，
           * 误点就会把用户设好的筛选条件清空。重置的语义是「改筛选条件」，
           * 归位到筛选区后与它作用的控件同排，工具栏右侧只留刷新。</p>
           */
          showResetButton
        />
      </div>

      <div className="module-grid-command-region">
        <ModuleTableToolbar
          canCreate={canCreate}
          canExport={canExport}
          loading={loading}
          exporting={exporting}
          onCreate={onCreate}
          onExport={onExport}
          onRefresh={onRefresh}
          toolbarActions={toolbarActionList}
          onAction={onAction}
          filterSummary={
            /* 筛选生效提示: 只显示与默认值不同的条件数, 0 项时不渲染 */
            <ModuleFilterActiveSummary
              submittedFilters={submittedFilters}
              defaultFilters={defaultFilters}
              onClear={handleResetFilters}
            />
          }
          extra={
            <>
              {printDropdown}
              <ColumnSettingsPopover
                columns={config.columns}
                orderedKeys={columnOrder}
                visibleKeys={columnVisibleKeys}
                onToggle={onToggleColumn}
                onOrderChange={onColumnOrderChange}
                onResetColumnSizes={onResetColumnSizes}
                open={columnSettingsOpen}
                onOpenChange={setColumnSettingsOpen}
              />
            </>
          }
        />
      </div>

      {hasLoadError ? (
        <Alert
          type="error"
          showIcon
          title={loadErrorMessage || t('api.loadFailed')}
          className="module-grid-warning"
          action={
            <Button
              size="small"
              type="primary"
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={onRetry}
            >
              {t('errorBoundary.retry')}
            </Button>
          }
        />
      ) : (
        <>
          {/* 列头右键菜单的「列设置…」复用工具栏这个弹层(开合状态在本组件) */}
          <ColumnSettingsRequestContext.Provider value={openColumnSettings}>
            <BusinessGridTable
              key={moduleKey}
              moduleKey={moduleKey}
              columns={columns}
              components={components}
              rowContextMenus={rowContextMenus}
              dataSource={records}
              loading={loading}
              isRetrying={isRetrying}
              /* 表格用途名（业务名，非内部 key）：读屏区分主表/明细表 */
              tableLabel={t('modules.table.gridLabel', { title: config.title })}
              currentPage={currentPage}
              pageSize={pageSize}
              rowSelection={rowSelection}
              rowClassName={rowClassName}
              onRowClick={onRowClick}
              onRowDoubleClick={onRowDoubleClick}
              expandable={expandable}
              renderRowDetailToggle={renderRowDetailToggle}
              emptyStateInput={{
                hasError: hasLoadError,
                hasFilters: hasActiveFilters,
                canCreate,
                onResetFilters: handleResetFilters,
                onCreate,
                onRetry,
              }}
            />
          </ColumnSettingsRequestContext.Provider>

          <ModuleTablePagination
            total={total}
            currentPage={currentPage}
            pageSize={pageSize}
            currentItemCount={records.length}
            /* 页脚同时承载「已选 N 项」与「本页合计」两组口径（勾选横幅已移除） */
            overviewItems={overviewItemsForFooter}
            onPageChange={onPageChange}
          />
        </>
      )}
    </section>
  )
}
