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
import { ModuleMaterialImportDialogs } from '@/views/modules/components/ModuleMaterialImportDialogs'
import { ModuleFreightPickupListOverlay } from '@/views/modules/components/ModuleFreightPickupListOverlay'
import { getPageDefinition, type AppPageDefinition } from '@/config/page-registry'
import { deleteBusinessModule, generateBusinessPrimaryNo, getBusinessModuleDetail, listAllBusinessModuleRows, saveBusinessModule } from '@/api/business'
import { listAllStatementCandidates } from '@/api/statements'
import { getDefaultPrintTemplate } from '@/api/print-template'
import { renderPrintTemplate } from '@/utils/print-template-engine'
import { buildModulePrintHtml } from '@/utils/module-print'
import { execPrintCode, isCLodopCode, printHtml } from '@/utils/clodop'
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

  const { canViewRecords, canCreateRecord, canUpdateRecord, canDeleteRecord, canExportData, canAuditRecord, canPrintRecord } =
    useModulePermissions({ moduleKey, resourceKey: pageDef?.resourceKey })

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [selectedRowMap, setSelectedRowMap] = useState<Record<string, ModuleRecord>>({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<ModuleRecord | null>(null)
  const [attachOpen, setAttachOpen] = useState(false)
  const [attachRecordId, setAttachRecordId] = useState('')
  const [columnVisibleKeys, setColumnVisibleKeys] = useState<string[]>([])
  const autoOpenedRouteKeyRef = useRef('')

  // Statement generator state
  const [supplierStatementOpen, setSupplierStatementOpen] = useState(false)
  const [customerStatementOpen, setCustomerStatementOpen] = useState(false)
  const [freightStatementOpen, setFreightStatementOpen] = useState(false)

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

  const refreshAndClearSelection = useCallback(async () => {
    setSelectedRowKeys([])
    setSelectedRowMap({})
    await refreshModuleQueries()
  }, [refreshModuleQueries])

  const handleEdit = useCallback((record: ModuleRecord) => {
    setEditRecord(record)
    setEditorOpen(true)
  }, [])

  const handleOpenAttachment = useCallback((record: ModuleRecord) => {
    setAttachRecordId(String(record.id || ''))
    setAttachOpen(true)
  }, [])

  const { buildActions } = useModuleRecordActions({
    moduleKey, resourceKey: pageDef?.resourceKey,
    onEdit: handleEdit,
    onDetail: (r) => openDetail(String(r.id)),
    onAttach: handleOpenAttachment,
    onRefresh: refreshModuleQueries,
  })

  // Editor capabilities
  const formFields = useMemo(() => config.formFields || [], [config.formFields])
  const {
    canUseBulkAuditActions,
    canUseBulkDeleteActions,
    canUseBulkPrintActions,
    listAuditTarget,
    listReverseAuditTarget,
  } = useModuleEditorCapabilities({
    moduleKey,
    formFields,
    lineItemLockRelatedRows: [],
    canEditLineItems: canUpdateRecord,
    canSaveCurrentEditor: canCreateRecord || canUpdateRecord,
    canAuditRecords: canAuditRecord,
    canPrintRecords: canPrintRecord,
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
      handlePrintSelectedRecords: async (preview) => {
        if (!selectedRowKeys.length) {
          message.warning('请先选择记录')
          return
        }
        try {
          const templateResponse = await getDefaultPrintTemplate(moduleKey)
          const template = templateResponse.data
          const selectedDetails = await Promise.all(
            selectedRowKeys.map((id) => getBusinessModuleDetail(moduleKey, id)),
          )
          const selectedRecords = selectedDetails.map((detail) => detail.data)

          if (!selectedRecords.length) {
            message.warning('未找到可打印的选中记录')
            return
          }

          if (template?.templateHtml?.trim()) {
            const renderedTemplates = selectedRecords
              .map((record) =>
                renderPrintTemplate(
                  template.templateHtml,
                  record,
                  Array.isArray(record.items) ? record.items as Array<Record<string, unknown>> : [],
                ),
              )
            const renderedHtml = isCLodopCode(template.templateHtml)
              ? renderedTemplates.join('\nLODOP.NEWPAGEA();\n')
              : renderedTemplates.join('<div class="print-page"></div>')

            const success = isCLodopCode(template.templateHtml)
              ? execPrintCode(renderedHtml, {
                  preview,
                  title: template.templateName || config.title,
                })
              : printHtml(renderedHtml, {
                  preview,
                  title: template.templateName || config.title,
                })
            if (!success) {
              throw new Error('打印服务不可用，请检查 CLodop 或打印模板配置')
            }
            return
          }

          const renderedHtml = selectedRecords
            .map((record) => {
              const fields = (config.detailFields || []).map((field) => ({
                label: field.label,
                value: formatCellValue(record[field.key], field.type),
              }))
              const itemColumns = config.itemColumns || []
              const rows = Array.isArray(record.items)
                ? record.items.map((item) =>
                    itemColumns.map((column) => formatCellValue(item[column.dataIndex], column.type)),
                  )
                : []
              return buildModulePrintHtml({
                title: config.title,
                subtitle: String(record[config.primaryNoKey || 'id'] || ''),
                fields,
                columns: itemColumns.map((column) => ({
                  title: column.title,
                  align: column.align || 'left',
                })),
                rows,
              })
            })
            .join('<div class="print-page"></div>')
          const success = printHtml(renderedHtml, { preview, title: config.title })
          if (!success) {
            throw new Error('打印服务不可用，请检查 CLodop 环境')
          }
        } catch (err) {
          message.error(err instanceof Error ? err.message : '打印失败')
        }
      },
      handleSelectedAuditRecords: async () => {
        if (!selectedRowKeys.length) { message.warning('请先选择记录'); return }
        Modal.confirm({
          title: '批量审核',
          content: `确定审核选中的 ${selectedRowKeys.length} 条记录吗？`,
          onOk: async () => {
            try {
              if (!listAuditTarget) {
                message.warning('当前模块未配置批量审核状态')
                return
              }
              for (const id of selectedRowKeys) {
                const record = selectedRowMap[id]
                if (record) {
                  const detail = await getBusinessModuleDetail(moduleKey, id)
                  await saveBusinessModule(moduleKey, {
                    ...detail.data,
                    [listAuditTarget.key]: listAuditTarget.value,
                  })
                }
              }
              message.success('审核成功')
              await refreshAndClearSelection()
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
              await refreshAndClearSelection()
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
              if (!listReverseAuditTarget) {
                message.warning('当前模块未配置批量反审核状态')
                return
              }
              for (const id of selectedRowKeys) {
                const record = selectedRowMap[id]
                if (record) {
                  const detail = await getBusinessModuleDetail(moduleKey, id)
                  await saveBusinessModule(moduleKey, {
                    ...detail.data,
                    [listReverseAuditTarget.key]: listReverseAuditTarget.value,
                  })
                }
              }
              message.success('反审核成功')
              await refreshAndClearSelection()
            } catch (err) {
              message.error(err instanceof Error ? err.message : '反审核失败')
            }
          },
        })
      },
      markSelectedFreightDelivered: async () => {
        if (!selectedRowKeys.length) {
          message.warning('请先选择物流单')
          return
        }
        Modal.confirm({
          title: '批量标记送达',
          content: `确定将选中的 ${selectedRowKeys.length} 条物流单标记为已送达吗？`,
          onOk: async () => {
            try {
              for (const id of selectedRowKeys) {
                const record = selectedRowMap[id]
                if (!record) continue
                const detail = await getBusinessModuleDetail('freight-bills', String(record.id))
                await saveBusinessModule('freight-bills', {
                  ...detail.data,
                  deliveryStatus: '已送达',
                })
              }
              message.success('标记送达成功')
              await refreshAndClearSelection()
            } catch (err) {
              message.error(err instanceof Error ? err.message : '标记送达失败')
            }
          },
        })
      },
      navigateToRoleActionEditor: () => { window.location.href = '/role-action-editor' },
      openCreateEditor: async () => { setEditRecord(null); setEditorOpen(true) },
      openCustomerStatementGenerator: async () => { setCustomerStatementOpen(true) },
      openFreightPickupList: async () => { setFreightPickupOpen(true) },
      openFreightStatementGenerator: async () => { setFreightStatementOpen(true) },
      openFreightSummary: async () => {
        const rows = await listAllBusinessModuleRows('freight-statements', submittedFilters)
        if (!rows.length) {
          message.info('当前列表暂无物流对账单数据')
          return
        }
        const totalWeight = rows.reduce((sum, record) => sum + Number(record.totalWeight || 0), 0)
        const totalFreight = rows.reduce((sum, record) => sum + Number(record.totalFreight || 0), 0)
        const paidAmount = rows.reduce((sum, record) => sum + Number(record.paidAmount || 0), 0)
        const unpaidAmount = rows.reduce(
          (sum, record) => sum + Number(record.unpaidAmount || (Number(record.totalFreight || 0) - Number(record.paidAmount || 0))),
          0,
        )
        Modal.info({
          title: '运费对账汇总',
          width: 720,
          content: (
            <Flex vertical gap={12} style={{ marginTop: 12 }}>
              <Typography.Text>当前列表单据数：{rows.length}</Typography.Text>
              <Typography.Text>总重量（吨）：{formatCellValue(totalWeight, 'weight')}</Typography.Text>
              <Typography.Text>总运费：{formatCellValue(totalFreight, 'amount')}</Typography.Text>
              <Typography.Text>已付金额：{formatCellValue(paidAmount, 'amount')}</Typography.Text>
              <Typography.Text>未付金额：{formatCellValue(unpaidAmount, 'amount')}</Typography.Text>
            </Flex>
          ),
        })
      },
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
    const statementModuleKey = type === 'supplier'
      ? 'supplier-statements'
      : type === 'customer'
        ? 'customer-statements'
        : 'freight-statements'
    const sourceModuleKey = type === 'supplier'
      ? 'purchase-inbounds'
      : type === 'customer'
        ? 'sales-orders'
        : 'freight-bills'
    const candidateRows = await listAllStatementCandidates(statementModuleKey, '')
    const filteredCandidates = candidateRows.filter((candidate) => {
      const dateField = type === 'supplier'
        ? candidate.inboundDate
        : type === 'customer'
          ? candidate.deliveryDate
          : candidate.billTime
      const currentDate = String(dateField || '')
      if (!currentDate || currentDate < startDate || currentDate > endDate) {
        return false
      }

      if (type === 'supplier') {
        return String(candidate.supplierName || '') === counterpartyId
      }
      if (type === 'customer') {
        return String(candidate.customerName || '') === counterpartyId
      }
      return String(candidate.carrierName || '') === counterpartyId
    })

    if (!filteredCandidates.length) {
      throw new Error('当前筛选条件下没有可生成的候选单据')
    }

    const detailedRecords = await Promise.all(
      filteredCandidates.map((candidate) =>
        getBusinessModuleDetail(sourceModuleKey, String(candidate.id)),
      ),
    )
    const sourceRecords = detailedRecords.map((detail) => detail.data)

    if (type === 'customer') {
      const recordsByProject = new Map<string, ModuleRecord[]>()
      for (const record of sourceRecords) {
        const projectName = String(record.projectName || '')
        const current = recordsByProject.get(projectName) || []
        current.push(record)
        recordsByProject.set(projectName, current)
      }

      for (const [projectName, projectRecords] of recordsByProject) {
        const firstRecord = projectRecords[0]
        const items = projectRecords.flatMap((record) =>
          (Array.isArray(record.items) ? record.items : []).map((item, index) => ({
            id: `draft-customer-${record.id}-${index}`,
            sourceNo: String(record.orderNo || ''),
            materialCode: String(item.materialCode || ''),
            brand: String(item.brand || ''),
            category: String(item.category || ''),
            material: String(item.material || ''),
            spec: String(item.spec || ''),
            length: String(item.length || ''),
            unit: String(item.unit || ''),
            batchNo: String(item.batchNo || ''),
            quantity: Number(item.quantity || 0),
            quantityUnit: String(item.quantityUnit || ''),
            pieceWeightTon: Number(item.pieceWeightTon || 0),
            piecesPerBundle: Number(item.piecesPerBundle || 0),
            weightTon: Number(item.weightTon || 0),
            unitPrice: Number(item.unitPrice || 0),
            amount: Number(item.amount || 0),
          })),
        )
        const salesAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
        await saveBusinessModule('customer-statements', {
          id: '',
          statementNo: await generateBusinessPrimaryNo('customer-statements'),
          sourceOrderNos: projectRecords.map((record) => String(record.orderNo || '')).filter(Boolean).join(', '),
          customerName: String(firstRecord.customerName || ''),
          projectName,
          startDate,
          endDate,
          salesAmount,
          receiptAmount: 0,
          closingAmount: salesAmount,
          status: '待确认',
          remark: '',
          items,
        })
      }
    } else if (type === 'supplier') {
      const firstRecord = sourceRecords[0]
      const items = sourceRecords.flatMap((record) =>
        (Array.isArray(record.items) ? record.items : []).map((item, index) => ({
          id: `draft-supplier-${record.id}-${index}`,
          sourceNo: String(record.inboundNo || ''),
          materialCode: String(item.materialCode || ''),
          brand: String(item.brand || ''),
          category: String(item.category || ''),
          material: String(item.material || ''),
          spec: String(item.spec || ''),
          length: String(item.length || ''),
          unit: String(item.unit || ''),
          batchNo: String(item.batchNo || ''),
          quantity: Number(item.quantity || 0),
          quantityUnit: String(item.quantityUnit || ''),
          pieceWeightTon: Number(item.pieceWeightTon || 0),
          piecesPerBundle: Number(item.piecesPerBundle || 0),
          weightTon: Number(item.weightTon || 0),
          weighWeightTon: item.weighWeightTon,
          weightAdjustmentTon: item.weightAdjustmentTon,
          weightAdjustmentAmount: item.weightAdjustmentAmount,
          unitPrice: Number(item.unitPrice || 0),
          amount: Number(item.amount || 0),
        })),
      )
      const purchaseAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
      await saveBusinessModule('supplier-statements', {
        id: '',
        statementNo: await generateBusinessPrimaryNo('supplier-statements'),
        sourceInboundNos: sourceRecords.map((record) => String(record.inboundNo || '')).filter(Boolean).join(', '),
        supplierName: String(firstRecord.supplierName || ''),
        startDate,
        endDate,
        purchaseAmount,
        paymentAmount: 0,
        closingAmount: purchaseAmount,
        status: '待确认',
        remark: '',
        items,
      })
    } else {
      const firstRecord = sourceRecords[0]
      const items = sourceRecords.flatMap((record) =>
        (Array.isArray(record.items) ? record.items : []).map((item, index) => ({
          id: `draft-freight-${record.id}-${index}`,
          sourceNo: String(record.billNo || item.sourceNo || ''),
          customerName: String(item.customerName || record.customerName || ''),
          projectName: String(item.projectName || record.projectName || ''),
          materialCode: String(item.materialCode || ''),
          materialName: String(item.materialName || item.brand || ''),
          brand: String(item.brand || ''),
          category: String(item.category || ''),
          material: String(item.material || ''),
          spec: String(item.spec || ''),
          length: String(item.length || ''),
          quantity: Number(item.quantity || 0),
          quantityUnit: String(item.quantityUnit || ''),
          pieceWeightTon: Number(item.pieceWeightTon || 0),
          piecesPerBundle: Number(item.piecesPerBundle || 0),
          batchNo: String(item.batchNo || ''),
          weightTon: Number(item.weightTon || 0),
          warehouseName: String(item.warehouseName || ''),
        })),
      )
      await saveBusinessModule('freight-statements', {
        id: '',
        statementNo: await generateBusinessPrimaryNo('freight-statements'),
        sourceBillNos: sourceRecords.map((record) => String(record.billNo || '')).filter(Boolean).join(', '),
        carrierName: String(firstRecord.carrierName || ''),
        startDate,
        endDate,
        totalWeight: items.reduce((sum, item) => sum + Number(item.weightTon || 0), 0),
        totalFreight: sourceRecords.reduce((sum, record) => sum + Number(record.totalFreight || 0), 0),
        paidAmount: 0,
        unpaidAmount: sourceRecords.reduce((sum, record) => sum + Number(record.totalFreight || 0), 0),
        status: '待审核',
        signStatus: '未签署',
        remark: '',
        items,
      })
    }
    await refreshModuleQueries()
  }, [refreshModuleQueries])

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
          canSave={editRecord ? canUpdateRecord : canCreateRecord}
          canAudit={canAuditRecord}
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
        onClose={() => {
          setAttachOpen(false)
          setAttachRecordId('')
        }}
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
