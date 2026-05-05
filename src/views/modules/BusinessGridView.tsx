import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useLocation } from '@tanstack/react-router'
import { Card, Pagination } from 'antd'
import { useBusinessQueries } from '@/hooks/useBusinessQueries'
import { useModuleFilters } from '@/hooks/useModuleFilters'
import { useModulePermissions } from '@/hooks/useModulePermissions'
import { useModuleQueryRefresh } from '@/hooks/useModuleQueryRefresh'
import { useModuleExportSupport } from '@/hooks/useModuleExportSupport'
import { useModuleRecordActions } from '@/hooks/useModuleRecordActions'
import { useDetailSupport } from '@/hooks/useDetailSupport'
import { useDataTable } from '@/hooks/useDataTable'
import { useGridColumns } from '@/hooks/useGridColumns'
import { DataTable } from '@/components/DataTable'
import { ModuleEditorWorkspace } from '@/views/modules/components/ModuleEditorWorkspace'
import { ModuleRecordDetailOverlay } from '@/views/modules/components/ModuleRecordDetailOverlay'
import { ModuleFilterToolbar } from '@/views/modules/components/ModuleFilterToolbar'
import { ModuleTableToolbar } from '@/views/modules/components/ModuleTableToolbar'
import { ColumnSettingsPopover } from '@/views/modules/components/ColumnSettingsPopover'
import { ModuleAttachmentModal } from '@/views/modules/components/ModuleAttachmentModal'
import { businessPageConfigs } from '@/config/business-pages'
import { getPageDefinition } from '@/config/page-registry'
import type { ModuleRecord } from '@/types/module-page'

export function BusinessGridView() {
  const location = useLocation()
  const routeQuerySignature = JSON.stringify(
    (location as unknown as { search?: unknown }).search || {},
  )
  const pageDef = useMemo(() => {
    const key = location.pathname.replace(/^\//, '')
    return getPageDefinition(key)
  }, [location.pathname])

  const moduleKey = pageDef?.moduleKey || ''
  const config = businessPageConfigs[moduleKey]

  const { canViewRecords, canCreateRecord, canUpdateRecord, canExportData } =
    useModulePermissions({ moduleKey, resourceKey: pageDef?.resourceKey })

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<ModuleRecord | null>(null)
  const [attachOpen, setAttachOpen] = useState(false)
  const [attachRecordId] = useState('')
  const [columnVisibleKeys, setColumnVisibleKeys] = useState<string[]>([])
  const autoOpenedRouteKeyRef = useRef('')

  const {
    filters, submittedFilters, searchExpanded,
    handleSearch, handleReset, updateFilter, setSearchExpanded, setSubmittedFilters,
  } = useModuleFilters({ setCurrentPage: (p: number) => setPage(p) })

  const { records, total, isLoading } = useBusinessQueries({
    moduleKey, filters: submittedFilters, page, pageSize, enabled: canViewRecords && !!config,
  })

  const { refreshModuleQueries } = useModuleQueryRefresh(moduleKey)
  const { exporting, handleExport } = useModuleExportSupport(moduleKey)
  const { detailOpen, detailRecord, detailLoading, openDetail, closeDetail } = useDetailSupport(moduleKey)

  const handleEdit = useCallback((record: ModuleRecord) => {
    setEditRecord(record)
    setEditorOpen(true)
  }, [])

  const { buildActions } = useModuleRecordActions({
    moduleKey, resourceKey: pageDef?.resourceKey,
    onEdit: handleEdit, onDetail: (r) => openDetail(String(r.id)), onRefresh: refreshModuleQueries,
  })

  const { columns } = useGridColumns({
    config: config || { key: moduleKey, title: '', kicker: '', description: '', filters: [], columns: [], detailFields: [], data: [], buildOverview: () => [], actions: [] },
    selectedRowKeys, onSelectionChange: setSelectedRowKeys,
    rowActions: buildActions, canUpdate: canUpdateRecord,
  })

  useEffect(() => {
    setColumnVisibleKeys(columns.map((c) => c.id as string))
  }, [columns])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const params = new URLSearchParams(window.location.search)
    const routeKeyword = params.get('docNo') || params.get('trackId') || ''

    setPage(1)
    setSelectedRowKeys([])
    autoOpenedRouteKeyRef.current = ''

    if (!routeKeyword) {
      setSearchExpanded(false)
      updateFilter('keyword', '')
      setSubmittedFilters({})
      return
    }

    setSearchExpanded(true)
    updateFilter('keyword', routeKeyword)
    setSubmittedFilters({ keyword: routeKeyword })
  }, [location.pathname, routeQuerySignature, setSearchExpanded, setSubmittedFilters, updateFilter])

  useEffect(() => {
    if (!config || !records.length || typeof window === 'undefined') {
      return
    }

    const params = new URLSearchParams(window.location.search)
    if (params.get('openDetail') !== '1') {
      autoOpenedRouteKeyRef.current = ''
      return
    }

    const trackId = params.get('trackId') || ''
    const docNo = params.get('docNo') || ''
    const routeKey = trackId ? `track:${trackId}` : docNo ? `doc:${docNo}` : ''
    if (!routeKey || autoOpenedRouteKeyRef.current === routeKey) {
      return
    }

    const primaryNoKey = config.primaryNoKey || 'id'
    const matchedRecord = trackId
      ? records.find((record) => String(record.id || '') === trackId)
      : records.find((record) => String(record[primaryNoKey] || '') === docNo)

    autoOpenedRouteKeyRef.current = routeKey
    if (matchedRecord) {
      void openDetail(String(matchedRecord.id))
      return
    }

    if (trackId) {
      void openDetail(trackId)
    }
  }, [config, openDetail, records, routeQuerySignature])

  const { table } = useDataTable({
    data: records, columns, total,
    manualPagination: true, enableSorting: false, enableRowSelection: canUpdateRecord,
  })

  if (!config) {
    return (
      <div className="flex items-center justify-center p-16">
        <span className="text-gray-400">模块配置未找到: {moduleKey}</span>
      </div>
    )
  }

  return (
    <div className="page-stack flex flex-col gap-[var(--app-page-gap)]">
      <div className="module-page-header flex justify-between gap-4 pb-3 mb-3 border-b border-gray-100">
        <div>
          <h2 className="text-[#262626] text-[calc(var(--app-font-size)+4px)] font-medium">{config.title}</h2>
          <p className="mt-1.5 text-[#666] text-[var(--app-font-size)]">{config.description}</p>
        </div>
      </div>

      <Card className="module-panel-card flex flex-col flex-1">
        <ModuleFilterToolbar
          config={config}
          filters={filters}
          expanded={searchExpanded}
          onUpdateFilter={updateFilter}
          onSearch={handleSearch}
          onReset={handleReset}
          onToggleExpand={() => setSearchExpanded(!searchExpanded)}
        />

        <ModuleTableToolbar
          canCreate={canCreateRecord}
          canExport={canExportData}
          total={total}
          loading={isLoading}
          exporting={exporting}
          onCreate={() => { setEditRecord(null); setEditorOpen(true) }}
          onExport={handleExport}
          onRefresh={refreshModuleQueries}
        />

        <div className="module-table-shell flex flex-col flex-1 min-h-0">
          <DataTable table={table} loading={isLoading} bordered size="small" />
          <div className="flex justify-end pt-3">
            <Pagination
              current={page} pageSize={pageSize} total={total} showSizeChanger showQuickJumper
              showTotal={(t) => `共 ${t} 条`}
              onChange={(p, ps) => { setPage(p); setPageSize(ps) }}
              pageSizeOptions={[10, 20, 50, 100]}
            />
          </div>
        </div>
      </Card>

      {config && (
        <ModuleEditorWorkspace
          open={editorOpen} config={config} record={editRecord}
          moduleKey={moduleKey}
          onClose={() => { setEditorOpen(false); setEditRecord(null) }}
          onSaved={() => { setSelectedRowKeys([]) }}
        />
      )}

      <ModuleRecordDetailOverlay
        open={detailOpen} config={config} record={detailRecord}
        loading={detailLoading} onClose={closeDetail}
      />

      <ModuleAttachmentModal
        open={attachOpen} moduleKey={moduleKey} recordId={attachRecordId}
        onClose={() => setAttachOpen(false)}
      />

      <ColumnSettingsPopover
        columns={columns}
        visibleKeys={columnVisibleKeys}
        onToggle={(key) => setColumnVisibleKeys((prev) =>
          prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        )}
      />
    </div>
  )
}
