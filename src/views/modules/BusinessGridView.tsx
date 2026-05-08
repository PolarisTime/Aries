import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useLocation } from '@tanstack/react-router'
import { Card, Empty, Flex, Table, Typography, Modal, message } from 'antd'
import { useBusinessQueries } from '@/hooks/useBusinessQueries'
import { useModuleFilters } from '@/hooks/useModuleFilters'
import { useModulePermissions } from '@/hooks/useModulePermissions'
import { useModuleQueryRefresh } from '@/hooks/useModuleQueryRefresh'
import { useModuleExportSupport } from '@/hooks/useModuleExportSupport'
import { useModuleRecordActions } from '@/hooks/useModuleRecordActions'
import { useDetailSupport } from '@/hooks/useDetailSupport'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import { useModulePageConfig } from '@/hooks/useModulePageConfig'
import { useModuleRecordHelpers } from '@/hooks/useModuleRecordHelpers'
import { useModuleEditorCapabilities } from '@/hooks/useModuleEditorCapabilities'
import { useModuleToolbarActions } from '@/hooks/useModuleToolbarActions'
import { useMasterOptions } from '@/hooks/useMasterOptions'
import { TableActions } from '@/components/TableActions'
import { StatusTag } from '@/components/StatusTag'
import { ModuleEditorWorkspace } from '@/views/modules/components/ModuleEditorWorkspace'
import { ModuleRecordDetailOverlay } from '@/views/modules/components/ModuleRecordDetailOverlay'
import { ModuleFilterToolbar } from '@/views/modules/components/ModuleFilterToolbar'
import { ModuleTableToolbar } from '@/views/modules/components/ModuleTableToolbar'
import { ColumnSettingsPopover } from '@/views/modules/components/ColumnSettingsPopover'
import { ModuleAttachmentModal } from '@/views/modules/components/ModuleAttachmentModal'
import { ModuleStatementGenerator } from '@/views/modules/components/ModuleStatementGenerator'
import { ModuleParentSelectorOverlay } from '@/views/modules/components/ModuleParentSelectorOverlay'
import { ModuleMaterialImportDialogs } from '@/views/modules/components/ModuleMaterialImportDialogs'
import { ModuleFreightPickupListOverlay } from '@/views/modules/components/ModuleFreightPickupListOverlay'
import { getPageDefinition, type AppPageDefinition } from '@/config/page-registry'
import { deleteBusinessModule, saveBusinessModule } from '@/api/business'
import type { ModuleRecord } from '@/types/module-page'
import type { TableColumnsType, TableProps } from 'antd'

export function BusinessGridView() {
  const location = useLocation()
  const pageDef = useMemo(() => {
    return getPageDefinition(location.pathname)
  }, [location.pathname])

  if (!pageDef?.moduleKey) {
    return <Empty description="页面配置未找到" style={{ marginTop: 96 }} />
  }

  return <BusinessGridPage pageDef={pageDef} />
}

function BusinessGridPage({ pageDef }: { pageDef: AppPageDefinition }) {
  const location = useLocation()
  const routeQuerySignature = JSON.stringify(
    (location as unknown as { search?: unknown }).search || {},
  )
  const moduleKey = pageDef.moduleKey as string
  const { config } = useModulePageConfig({ moduleKey })

  const { canViewRecords, canCreateRecord, canUpdateRecord, canDeleteRecord, canExportData, canAuditRecord } =
    useModulePermissions({ moduleKey, resourceKey: pageDef?.resourceKey })

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [selectedRowMap, setSelectedRowMap] = useState<Record<string, ModuleRecord>>({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<ModuleRecord | null>(null)
  const [attachOpen, setAttachOpen] = useState(false)
  const [attachRecordId] = useState('')
  const [columnVisibleKeys, setColumnVisibleKeys] = useState<string[]>([])
  const autoOpenedRouteKeyRef = useRef('')

  // Statement generator state
  const [supplierStatementOpen, setSupplierStatementOpen] = useState(false)
  const [customerStatementOpen, setCustomerStatementOpen] = useState(false)
  const [freightStatementOpen, setFreightStatementOpen] = useState(false)

  // Parent import state
  const [parentSelectorOpen, setParentSelectorOpen] = useState(false)

  // Material import state
  const [materialImportOpen, setMaterialImportOpen] = useState(false)

  // Freight pickup list state
  const [freightPickupOpen, setFreightPickupOpen] = useState(false)

  const { formatCellValue } = useModuleDisplaySupport()
  useMasterOptions()

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

  const { getRowClassName } = useModuleRecordHelpers({ moduleKey, config })

  const handleEdit = useCallback((record: ModuleRecord) => {
    setEditRecord(record)
    setEditorOpen(true)
  }, [])

  const { buildActions } = useModuleRecordActions({
    moduleKey, resourceKey: pageDef?.resourceKey,
    onEdit: handleEdit, onDetail: (r) => openDetail(String(r.id)), onRefresh: refreshModuleQueries,
  })

  // Editor capabilities
  const formFields = useMemo(() => config.formFields || [], [config.formFields])
  const {
    canUseBulkAuditActions,
    canUseBulkDeleteActions,
    canUseBulkPrintActions,
  } = useModuleEditorCapabilities({
    moduleKey,
    formFields,
    lineItemLockRelatedRows: [],
    canEditLineItems: canUpdateRecord,
    canSaveCurrentEditor: canCreateRecord || canUpdateRecord,
    canAuditRecords: canAuditRecord,
    canPrintRecords: false,
    canDeleteRecords: canDeleteRecord,
    isReadOnly: Boolean(config.readOnly),
    resolveModuleStatusOptions: (statusField) => {
      if (!statusField?.options) return []
      return (statusField.options as Array<{ value: string }>).map((o) => o.value)
    },
  })

  // Toolbar actions
  const { visibleToolbarActions, handleAction } = useModuleToolbarActions({
    moduleKey,
    config,
    formFields,
    isMaterialModule: false,
    selectedRowCount: selectedRowKeys.length,
    canUseBulkAuditActions,
    canUseBulkDeleteActions,
    canUseBulkPrintActions,
    detailPrintLoading: false,
    hasAnyModuleAction: (codes) => codes.some((code) => {
      if (code === 'create') return canCreateRecord
      if (code === 'update') return canUpdateRecord
      if (code === 'delete') return canDeleteRecord
      if (code === 'audit') return canAuditRecord
      if (code === 'export') return canExportData
      return false
    }),
    handlers: {
      exportMaterialRows: async () => { await handleExport() },
      exportRows: async () => { await handleExport() },
      handlePrintSelectedRecords: async () => { message.info('打印功能开发中') },
      handleSelectedAuditRecords: async () => {
        if (!selectedRowKeys.length) { message.warning('请先选择记录'); return }
        Modal.confirm({
          title: '批量审核',
          content: `确定审核选中的 ${selectedRowKeys.length} 条记录吗？`,
          onOk: async () => {
            try {
              for (const id of selectedRowKeys) {
                const record = selectedRowMap[id]
                if (record) {
                  await saveBusinessModule(moduleKey, { ...record, status: '已审核' })
                }
              }
              message.success('审核成功')
              setSelectedRowKeys([])
              await refreshModuleQueries()
            } catch (err) {
              message.error(err instanceof Error ? err.message : '审核失败')
            }
          },
        })
      },
      handleSelectedDeleteRecords: () => {
        if (!selectedRowKeys.length) { message.warning('请先选择记录'); return }
        Modal.confirm({
          title: '批量删除',
          content: `确定删除选中的 ${selectedRowKeys.length} 条记录吗？此操作不可恢复。`,
          okButtonProps: { danger: true },
          onOk: async () => {
            try {
              for (const id of selectedRowKeys) {
                await deleteBusinessModule(moduleKey, id)
              }
              message.success('删除成功')
              setSelectedRowKeys([])
              await refreshModuleQueries()
            } catch (err) {
              message.error(err instanceof Error ? err.message : '删除失败')
            }
          },
        })
      },
      handleSelectedReverseAuditRecords: async () => {
        if (!selectedRowKeys.length) { message.warning('请先选择记录'); return }
        Modal.confirm({
          title: '批量反审核',
          content: `确定反审核选中的 ${selectedRowKeys.length} 条记录吗？`,
          onOk: async () => {
            try {
              for (const id of selectedRowKeys) {
                const record = selectedRowMap[id]
                if (record) {
                  await saveBusinessModule(moduleKey, { ...record, status: '草稿' })
                }
              }
              message.success('反审核成功')
              setSelectedRowKeys([])
              await refreshModuleQueries()
            } catch (err) {
              message.error(err instanceof Error ? err.message : '反审核失败')
            }
          },
        })
      },
      markSelectedFreightDelivered: async () => { message.info('标记送达功能开发中') },
      navigateToRoleActionEditor: () => { window.location.href = '/role-action-editor' },
      openCreateEditor: async () => { setEditRecord(null); setEditorOpen(true) },
      openCustomerStatementGenerator: async () => { setCustomerStatementOpen(true) },
      openFreightPickupList: async () => { setFreightPickupOpen(true) },
      openFreightStatementGenerator: async () => { setFreightStatementOpen(true) },
      openFreightSummary: async () => { message.info('运费汇总功能开发中') },
      openSupplierStatementGenerator: async () => { setSupplierStatementOpen(true) },
    },
  })

  useEffect(() => {
    setColumnVisibleKeys((config?.columns || []).map((column) => column.dataIndex))
  }, [moduleKey, config])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const routeKeyword = params.get('docNo') || params.get('trackId') || ''
    setPage(1)
    setSelectedRowKeys([])
    setSelectedRowMap({})
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
    if (!config || !records.length || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('openDetail') !== '1') { autoOpenedRouteKeyRef.current = ''; return }
    const trackId = params.get('trackId') || ''
    const docNo = params.get('docNo') || ''
    const routeKey = trackId ? `track:${trackId}` : docNo ? `doc:${docNo}` : ''
    if (!routeKey || autoOpenedRouteKeyRef.current === routeKey) return
    const primaryNoKey = config.primaryNoKey || 'id'
    const matchedRecord = trackId
      ? records.find((record) => String(record.id || '') === trackId)
      : records.find((record) => String(record[primaryNoKey] || '') === docNo)
    autoOpenedRouteKeyRef.current = routeKey
    if (matchedRecord) { void openDetail(String(matchedRecord.id)); return }
    if (trackId) { void openDetail(trackId) }
  }, [config, openDetail, records, routeQuerySignature])

  const tableColumns = useMemo<TableColumnsType<ModuleRecord>>(() => {
    if (!config) return []
    const visibleColumnKeySet = new Set(columnVisibleKeys)
    const dataColumns = config.columns
      .filter((column) => visibleColumnKeySet.has(column.dataIndex))
      .map<TableColumnsType<ModuleRecord>[number]>((column) => ({
        title: column.title,
        dataIndex: column.dataIndex,
        key: column.dataIndex,
        width: column.width,
        align: column.align || 'center',
        ellipsis: true,
        render: (value: unknown) => {
          if (column.type === 'status' && config.statusMap) {
            return <StatusTag status={String(value || '')} statusMap={config.statusMap} />
          }
          return formatCellValue(value, column.type)
        },
      }))
    if (canUpdateRecord) {
      dataColumns.push({
        title: '操作',
        key: 'actions',
        width: 180,
        fixed: 'right',
        align: 'center',
        render: (_value, record) => <TableActions items={buildActions(record)} />,
      })
    }
    return dataColumns
  }, [buildActions, canUpdateRecord, columnVisibleKeys, config, formatCellValue])

  const rowSelection = useMemo<TableProps<ModuleRecord>['rowSelection']>(() => {
    if (!canUpdateRecord) return undefined
    return {
      selectedRowKeys,
      onChange: (keys, rows) => {
        setSelectedRowKeys(keys.map(String))
        const newMap: Record<string, ModuleRecord> = {}
        for (const row of rows) {
          newMap[String(row.id)] = row
        }
        setSelectedRowMap(newMap)
      },
      preserveSelectedRowKeys: true,
    }
  }, [canUpdateRecord, selectedRowKeys])

  const handleStatementGenerate = useCallback(async (
    type: 'supplier' | 'customer' | 'freight',
    counterpartyId: string,
    startDate: string,
    endDate: string,
  ) => {
    message.info(`${type} 对账单生成功能开发中: ${counterpartyId}, ${startDate} - ${endDate}`)
  }, [])

  if (!config) {
    return <Empty description={`模块配置未找到: ${moduleKey}`} style={{ marginTop: 96 }} />
  }

  return (
    <Flex vertical gap="middle">
      {!config.hidePageHeader && (
        <Flex vertical gap={4}>
          <Typography.Title level={3} style={{ margin: 0 }}>{config.title}</Typography.Title>
          <Typography.Text type="secondary">{config.description}</Typography.Text>
        </Flex>
      )}

      <Card>
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
          toolbarActions={visibleToolbarActions}
          onAction={handleAction}
          extra={
            <ColumnSettingsPopover
              columns={config.columns}
              visibleKeys={columnVisibleKeys}
              onToggle={(key) => setColumnVisibleKeys((prev) =>
                prev.includes(key) ? prev.filter((columnKey) => columnKey !== key) : [...prev, key]
              )}
            />
          }
        />

        <Table
          rowKey="id"
          bordered
          size="small"
          loading={isLoading}
          columns={tableColumns}
          dataSource={records}
          rowSelection={rowSelection}
          scroll={{ x: 'max-content' }}
          rowClassName={(record) => getRowClassName(record)}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" /> }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (count) => `共 ${count} 条`,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage)
              setPageSize(nextPageSize)
            },
          }}
        />
      </Card>

      {/* Editor workspace */}
      {config && (
        <ModuleEditorWorkspace
          open={editorOpen} config={config} record={editRecord}
          moduleKey={moduleKey}
          onClose={() => { setEditorOpen(false); setEditRecord(null) }}
          onSaved={() => { setSelectedRowKeys([]); setSelectedRowMap({}) }}
        />
      )}

      {/* Detail overlay */}
      <ModuleRecordDetailOverlay
        open={detailOpen} config={config} record={detailRecord}
        loading={detailLoading} onClose={closeDetail}
      />

      {/* Attachment modal */}
      <ModuleAttachmentModal
        open={attachOpen} moduleKey={moduleKey} recordId={attachRecordId}
        onClose={() => setAttachOpen(false)}
      />

      {/* Statement generators */}
      <ModuleStatementGenerator
        open={supplierStatementOpen}
        statementType="supplier"
        counterpartyModuleKey="suppliers"
        onClose={() => setSupplierStatementOpen(false)}
        onGenerate={(id, start, end) => handleStatementGenerate('supplier', id, start, end)}
      />
      <ModuleStatementGenerator
        open={customerStatementOpen}
        statementType="customer"
        counterpartyModuleKey="customers"
        onClose={() => setCustomerStatementOpen(false)}
        onGenerate={(id, start, end) => handleStatementGenerate('customer', id, start, end)}
      />
      <ModuleStatementGenerator
        open={freightStatementOpen}
        statementType="freight"
        counterpartyModuleKey="carriers"
        onClose={() => setFreightStatementOpen(false)}
        onGenerate={(id, start, end) => handleStatementGenerate('freight', id, start, end)}
      />

      {/* Parent selector */}
      {config.parentImport && (
        <ModuleParentSelectorOverlay
          open={parentSelectorOpen}
          parentModuleKey={config.parentImport.parentModuleKey}
          title={`选择${config.parentImport.label || '上级单据'}`}
          onSelect={() => {
            // Handle parent import
            setParentSelectorOpen(false)
            message.info('上级单据导入功能已触发')
          }}
          onClose={() => setParentSelectorOpen(false)}
        />
      )}

      {/* Material import */}
      <ModuleMaterialImportDialogs
        open={materialImportOpen}
        onClose={() => setMaterialImportOpen(false)}
      />

      {/* Freight pickup list */}
      <ModuleFreightPickupListOverlay
        open={freightPickupOpen}
        moduleKey={moduleKey}
        onClose={() => setFreightPickupOpen(false)}
      />
    </Flex>
  )
}
