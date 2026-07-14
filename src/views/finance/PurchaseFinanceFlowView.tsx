import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  type DescriptionsProps,
  Empty,
  Input,
  Select,
  Table,
  type TableColumnsType,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import {
  exportPurchaseFinanceDocumentFlow,
  getPurchaseFinanceDocumentFlow,
  type PurchaseFinanceFlowFilter,
  type PurchaseFinanceFlowLine,
  type PurchaseFinanceFlowQuery,
  type PurchaseFinanceFlowSummary,
} from '@/api/purchase-finance-flow'
import { StatusTag } from '@/components/StatusTag'
import { statusMap } from '@/config/business-pages/shared/shared-status'
import { getPageDefinition, getPageRoutePath } from '@/config/page-registry'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useMasterOptions } from '@/hooks/useMasterOptions'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import { usePermissionStore } from '@/stores/permissionStore'
import { type EntityId, parseEntityId } from '@/types/entity-id'
import { message } from '@/utils/antd-app'

const DEFAULT_PAGE_SIZE = 20

const DOCUMENT_TYPE_OPTIONS = [
  '采购订单',
  '采购入库单',
  '供应商对账单',
  '采购收票单',
  '采购付款单',
  '收款单',
  '付款冲销单',
  '收款冲销单',
  '历史台账调整单',
].map((value) => ({ value, label: value }))

const FLOW_STATUS_OPTIONS = [
  '草稿',
  '完成采购',
  '已审核',
  '完成入库',
  '已确认',
  '已收票',
].map((value) => ({ value, label: statusMap[value]?.text || value }))

const DOCUMENT_MODULE_KEYS: Record<string, string> = {
  采购订单: 'purchase-order',
  采购入库单: 'purchase-inbound',
  供应商对账单: 'supplier-statement',
  采购收票单: 'invoice-receipt',
  采购付款单: 'payment',
  收款单: 'receipt',
  付款冲销单: 'cash-reversal',
  收款冲销单: 'cash-reversal',
}

function requestErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback
}

function sourceReference(record: PurchaseFinanceFlowLine) {
  const sourceNo = record.sourceDocumentNo.trim()
  if (!sourceNo) {
    return '--'
  }
  return record.sourceLineNo ? `${sourceNo}/${record.sourceLineNo}` : sourceNo
}

function materialText(record: PurchaseFinanceFlowLine) {
  return (
    [record.materialCode, record.materialName]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(' / ') || '--'
  )
}

export function PurchaseFinanceFlowView() {
  const navigate = useNavigate()
  const can = usePermissionStore((state) => state.can)
  const [settlementCompanyId, setSettlementCompanyId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [documentType, setDocumentType] = useState<string>()
  const [status, setStatus] = useState<string>()
  const [startDate, setStartDate] = useState<string>()
  const [endDate, setEndDate] = useState<string>()
  const [materialKeywordInput, setMaterialKeywordInput] = useState('')
  const [materialKeyword, setMaterialKeyword] = useState<string>()
  const [purchaseOrderIdInput, setPurchaseOrderIdInput] = useState('')
  const [purchaseOrderId, setPurchaseOrderId] = useState<EntityId>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const { formatCellValue } = useModuleDisplaySupport()
  const {
    settlementCompanies,
    suppliers,
    isLoading: optionsLoading,
  } = useMasterOptions({
    settlementCompanies: true,
    suppliers: true,
  })
  const queryEnabled = Boolean(settlementCompanyId && supplierId)
  const canExport = can('receivable-payable', 'export')
  const flowFilter = useMemo<PurchaseFinanceFlowFilter>(
    () => ({
      settlementCompanyId,
      supplierId,
      documentType,
      status,
      startDate,
      endDate,
      materialKeyword,
      purchaseOrderId,
    }),
    [
      documentType,
      endDate,
      materialKeyword,
      purchaseOrderId,
      settlementCompanyId,
      startDate,
      status,
      supplierId,
    ],
  )
  const flowQueryParams = useMemo<PurchaseFinanceFlowQuery>(
    () => ({ ...flowFilter, page: page - 1, size: pageSize }),
    [flowFilter, page, pageSize],
  )
  const dateRangeValue = useMemo<[Dayjs, Dayjs] | null>(
    () => (startDate && endDate ? [dayjs(startDate), dayjs(endDate)] : null),
    [endDate, startDate],
  )
  const flowQuery = useQuery({
    queryKey: QUERY_KEYS.purchaseFinanceFlow(flowQueryParams),
    queryFn: ({ signal }) =>
      getPurchaseFinanceDocumentFlow(flowQueryParams, signal),
    enabled: queryEnabled,
    placeholderData: keepPreviousData,
  })
  const exportMutation = useMutation({
    mutationFn: exportPurchaseFinanceDocumentFlow,
    onSuccess: () => message.success('采购财务单据流已导出'),
    onError: (error) =>
      message.error(requestErrorMessage(error, '导出采购财务单据流失败')),
  })

  const commitMaterialKeyword = (value: string) => {
    const normalized = value.trim()
    setMaterialKeywordInput(value)
    setMaterialKeyword(normalized || undefined)
    setPage(1)
  }

  const commitPurchaseOrderId = (value: string) => {
    const normalized = value.trim()
    setPurchaseOrderIdInput(value)
    if (!normalized) {
      setPurchaseOrderId(undefined)
      setPage(1)
      return
    }
    try {
      setPurchaseOrderId(parseEntityId(normalized, 'purchaseOrderId'))
      setPage(1)
    } catch {
      setPurchaseOrderId(undefined)
      setPage(1)
      message.error('采购订单 ID 必须是有效的正整数')
    }
  }

  const handleRefresh = async () => {
    const result = await flowQuery.refetch()
    if (result.isError) {
      message.error(requestErrorMessage(result.error, '刷新采购财务单据流失败'))
    }
  }

  const openDocument = (record: PurchaseFinanceFlowLine) => {
    const moduleKey = DOCUMENT_MODULE_KEYS[record.documentType]
    const targetPage = moduleKey ? getPageDefinition(moduleKey) : undefined
    if (!moduleKey || !targetPage || !record.documentNo.trim()) {
      message.warning('该历史单据暂无可打开的业务详情')
      return
    }
    if (!can(moduleKey, 'read')) {
      message.warning('无权查看该单据详情')
      return
    }
    const query = new URLSearchParams({
      docNo: record.documentNo,
      trackId: record.documentId,
      openDetail: '1',
    })
    void navigate({
      to: `/${getPageRoutePath(targetPage)}?${query.toString()}` as '/',
    })
  }

  const formatAmount = (value: number | undefined) =>
    value == null ? '--' : formatCellValue(value, 'amount')
  const formatWeight = (value: number | undefined) =>
    value == null ? '--' : `${formatCellValue(value, 'weight')} 吨`

  const summaryItems = (
    summary: PurchaseFinanceFlowSummary,
  ): DescriptionsProps['items'] => [
    {
      key: 'purchasePlanAmount',
      label: '计划采购',
      children: formatAmount(summary.purchasePlanAmount),
    },
    {
      key: 'inboundSettlementAmount',
      label: '入库结算',
      children: formatAmount(summary.inboundSettlementAmount),
    },
    {
      key: 'reconciledAmount',
      label: '已对账',
      children: formatAmount(summary.reconciledAmount),
    },
    {
      key: 'invoicedAmount',
      label: '已收票',
      children: formatAmount(summary.invoicedAmount),
    },
    {
      key: 'expenseAmount',
      label: '资金支出',
      children: formatAmount(summary.expenseAmount),
    },
    {
      key: 'incomeAmount',
      label: '资金收入',
      children: formatAmount(summary.incomeAmount),
    },
    {
      key: 'netCashExpense',
      label: '净支出',
      children: formatAmount(summary.netCashExpense),
    },
    {
      key: 'historicalAdjustmentAmount',
      label: '历史调整',
      children: formatAmount(summary.historicalAdjustmentAmount),
    },
    {
      key: 'payableBalance',
      label: '应付余额',
      children: formatAmount(summary.payableBalance),
    },
    {
      key: 'prepaymentBalance',
      label: '预付款余额',
      children: formatAmount(summary.prepaymentBalance),
    },
  ]

  const columns: TableColumnsType<PurchaseFinanceFlowLine> = [
    {
      title: '流转序号',
      dataIndex: 'flowSequence',
      width: 90,
      fixed: 'left',
      align: 'center',
    },
    {
      title: '单据类型',
      dataIndex: 'documentType',
      width: 130,
      fixed: 'left',
    },
    {
      title: '单号',
      dataIndex: 'documentNo',
      width: 180,
      fixed: 'left',
      ellipsis: true,
      render: (value, record) => {
        const documentNo = String(value || '').trim()
        if (!documentNo || !DOCUMENT_MODULE_KEYS[record.documentType]) {
          return documentNo || '--'
        }
        return (
          <Button
            type="link"
            size="small"
            className="purchase-finance-flow-document-link"
            aria-label={`打开单据 ${documentNo}`}
            onClick={() => openDocument(record)}
          >
            {documentNo}
          </Button>
        )
      },
    },
    {
      title: '行号',
      dataIndex: 'lineNo',
      width: 70,
      fixed: 'left',
      align: 'center',
      render: (value) => value ?? '--',
    },
    {
      title: '业务日期',
      dataIndex: 'businessDate',
      width: 110,
      render: (value) => formatCellValue(value, 'date'),
    },
    {
      title: '来源单号/行号',
      key: 'source',
      width: 190,
      ellipsis: true,
      render: (_, record) => sourceReference(record),
    },
    {
      title: '物料',
      key: 'material',
      width: 240,
      ellipsis: true,
      render: (_, record) => materialText(record),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      width: 100,
      align: 'right',
      render: (value, record) =>
        value == null
          ? '--'
          : `${formatCellValue(value, 'integer')} ${record.quantityUnit}`.trim(),
    },
    {
      title: '实际重量',
      dataIndex: 'actualWeightTon',
      width: 120,
      align: 'right',
      render: formatWeight,
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      width: 120,
      align: 'right',
      render: formatAmount,
    },
    {
      title: '行金额',
      dataIndex: 'lineAmount',
      width: 130,
      align: 'right',
      render: formatAmount,
    },
    {
      title: '支出',
      dataIndex: 'expenseAmount',
      width: 130,
      align: 'right',
      render: formatAmount,
    },
    {
      title: '收入',
      dataIndex: 'incomeAmount',
      width: 130,
      align: 'right',
      render: formatAmount,
    },
    {
      title: '调整方向',
      dataIndex: 'adjustmentDirection',
      width: 110,
      align: 'center',
      render: (value) => String(value || '--'),
    },
    {
      title: '余额影响',
      dataIndex: 'adjustmentEffect',
      width: 110,
      align: 'center',
      render: (value) => String(value || '--'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      align: 'center',
      render: (value) => (
        <StatusTag
          status={String(value || '')}
          statusMap={statusMap}
          fallback={String(value || '--')}
        />
      ),
    },
    {
      title: '生效',
      dataIndex: 'effective',
      width: 90,
      align: 'center',
      render: (effective) =>
        effective ? <Tag color="success">已生效</Tag> : <Tag>未生效</Tag>,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 220,
      ellipsis: true,
      render: (value) => String(value || '--'),
    },
  ]

  const visibleFlowData = queryEnabled ? flowQuery.data : undefined
  const rows = visibleFlowData?.items.content || []
  const total = visibleFlowData?.items.totalElements || 0

  return (
    <div className="module-page-stack purchase-finance-flow-page">
      <div className="module-grid-workspace">
        <header className="module-workspace-header">
          <div className="module-workspace-heading">
            <div className="module-workspace-title-row">
              <span className="module-workspace-kicker">Finance</span>
              <h1 className="module-workspace-title">采购财务单据流</h1>
            </div>
          </div>
          <div className="purchase-finance-flow-actions">
            <Tooltip title={canExport ? '导出当前筛选结果' : '无导出权限'}>
              <span>
                <Button
                  icon={<DownloadOutlined />}
                  loading={exportMutation.isPending}
                  disabled={
                    !queryEnabled ||
                    !canExport ||
                    flowQuery.isFetching ||
                    exportMutation.isPending
                  }
                  onClick={() => exportMutation.mutate(flowFilter)}
                >
                  导出
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="刷新">
              <span>
                <Button
                  aria-label="刷新采购财务单据流"
                  icon={<ReloadOutlined />}
                  loading={flowQuery.isFetching}
                  disabled={
                    !queryEnabled ||
                    exportMutation.isPending ||
                    flowQuery.isFetching
                  }
                  onClick={() => void handleRefresh()}
                />
              </span>
            </Tooltip>
          </div>
        </header>

        <section className="purchase-finance-flow-filters">
          <div className="purchase-finance-flow-filter">
            <Typography.Text type="secondary">结算主体</Typography.Text>
            <Select
              aria-label="结算主体"
              value={settlementCompanyId || undefined}
              options={settlementCompanies}
              loading={optionsLoading}
              showSearch={{ optionFilterProp: 'label' }}
              allowClear
              placeholder="选择结算主体"
              onChange={(value) => {
                setSettlementCompanyId(value ? String(value) : '')
                setPage(1)
              }}
            />
          </div>
          <div className="purchase-finance-flow-filter">
            <Typography.Text type="secondary">供应商</Typography.Text>
            <Select
              aria-label="供应商"
              value={supplierId || undefined}
              options={suppliers}
              loading={optionsLoading}
              showSearch={{ optionFilterProp: 'label' }}
              allowClear
              placeholder="选择供应商"
              onChange={(value) => {
                setSupplierId(value ? String(value) : '')
                setPage(1)
              }}
            />
          </div>
          <div className="purchase-finance-flow-filter">
            <Typography.Text type="secondary">单据类型</Typography.Text>
            <Select
              aria-label="单据类型"
              value={documentType}
              options={DOCUMENT_TYPE_OPTIONS}
              allowClear
              placeholder="全部单据类型"
              onChange={(value) => {
                setDocumentType(value)
                setPage(1)
              }}
            />
          </div>
          <div className="purchase-finance-flow-filter">
            <Typography.Text type="secondary">单据状态</Typography.Text>
            <Select
              aria-label="单据状态"
              value={status}
              options={FLOW_STATUS_OPTIONS}
              allowClear
              placeholder="全部单据状态"
              onChange={(value) => {
                setStatus(value)
                setPage(1)
              }}
            />
          </div>
          <div className="purchase-finance-flow-filter">
            <Typography.Text type="secondary">业务日期</Typography.Text>
            <DatePicker.RangePicker
              aria-label="业务日期"
              value={dateRangeValue}
              onChange={(_, dateStrings) => {
                setStartDate(dateStrings[0] || undefined)
                setEndDate(dateStrings[1] || undefined)
                setPage(1)
              }}
            />
          </div>
          <div className="purchase-finance-flow-filter">
            <Typography.Text type="secondary">物料关键字</Typography.Text>
            <Input
              aria-label="物料关键字"
              value={materialKeywordInput}
              allowClear
              placeholder="物料编码、品牌、名称或规格"
              onChange={(event) => {
                const value = event.target.value
                setMaterialKeywordInput(value)
                if (!value) commitMaterialKeyword('')
              }}
              onBlur={(event) => commitMaterialKeyword(event.target.value)}
              onPressEnter={(event) =>
                commitMaterialKeyword(event.currentTarget.value)
              }
            />
          </div>
          <div className="purchase-finance-flow-filter">
            <Typography.Text type="secondary">采购订单 ID</Typography.Text>
            <Input
              aria-label="采购订单 ID"
              value={purchaseOrderIdInput}
              allowClear
              inputMode="numeric"
              placeholder="精确筛选根采购订单"
              onChange={(event) => {
                const value = event.target.value
                setPurchaseOrderIdInput(value)
                if (!value) commitPurchaseOrderId('')
              }}
              onBlur={(event) => commitPurchaseOrderId(event.target.value)}
              onPressEnter={(event) =>
                commitPurchaseOrderId(event.currentTarget.value)
              }
            />
          </div>
        </section>

        {flowQuery.isError ? (
          <Alert
            type="error"
            showIcon
            title="加载采购财务单据流失败"
            description={
              flowQuery.error instanceof Error
                ? flowQuery.error.message
                : '请稍后重试'
            }
          />
        ) : null}

        {visibleFlowData ? (
          <section className="purchase-finance-flow-summary">
            <Descriptions
              size="small"
              bordered
              column={{ xs: 2, sm: 3, md: 5 }}
              items={summaryItems(visibleFlowData.summary)}
            />
          </section>
        ) : null}

        <section className="purchase-finance-flow-table">
          <Table
            rowKey="key"
            size="small"
            columns={columns}
            dataSource={rows}
            loading={queryEnabled && flowQuery.isFetching}
            scroll={{ x: 2430, y: 'calc(100vh - 430px)' }}
            locale={{
              emptyText: queryEnabled ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无单据流"
                />
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="请选择结算主体和供应商"
                />
              ),
            }}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showTotal: (count) => `共 ${count} 行`,
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPageSize === pageSize ? nextPage : 1)
                setPageSize(nextPageSize)
              },
            }}
          />
        </section>
      </div>
    </div>
  )
}
