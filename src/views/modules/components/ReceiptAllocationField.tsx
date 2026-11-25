import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Flex,
  Form,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { TFunction } from 'i18next'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { apiGet } from '@/api/core/client'
import {
  listAllocatableProjectOpeningBalances,
  type ProjectOpeningBalanceOption,
} from '@/api/finance/project-opening-balances'
import { QUERY_KEYS } from '@/constants/query-keys'
import { exactPageSchema, responseEntityIdSchema } from '@/shared/schemas/api'
import { responseDecimalSchema } from '@/shared/schemas/decimal'
import { formatAmount, formatDate } from '@/utils/formatters'
import { asString } from '@/utils/type-narrowing'

export type ReceiptAllocationSourceType = 'OPENING_BALANCE' | 'STATEMENT'

export interface ReceiptAllocationDraftRow {
  key: string
  id?: string
  sourceType: ReceiptAllocationSourceType
  sourceCustomerStatementId?: string
  sourceOpeningBalanceId?: string
  allocatedAmount?: number
}

const allocatableStatementSchema = z.object({
  id: responseEntityIdSchema,
  statementNo: z.string(),
  projectId: responseEntityIdSchema.nullish(),
  projectName: z.string().nullish(),
  endDate: z.string().nullish(),
  closingAmount: responseDecimalSchema,
})

const allocatableStatementPageSchema = exactPageSchema(
  allocatableStatementSchema,
)

type AllocatableStatementOption = z.output<typeof allocatableStatementSchema>

const EMPTY_OPENING_OPTIONS: ProjectOpeningBalanceOption[] = []
const EMPTY_STATEMENT_OPTIONS: AllocatableStatementOption[] = []
const EMPTY_ROWS: ReceiptAllocationDraftRow[] = []

function normalizeRows(value: unknown): ReceiptAllocationDraftRow[] {
  if (!Array.isArray(value)) {
    return EMPTY_ROWS
  }
  return value.map((item, index) => {
    const raw = (item ?? {}) as Record<string, unknown>
    const openingId = asString(raw.sourceOpeningBalanceId).trim()
    const statementId = asString(raw.sourceCustomerStatementId).trim()
    const sourceType: ReceiptAllocationSourceType =
      raw.sourceType === 'STATEMENT' || (!openingId && Boolean(statementId))
        ? 'STATEMENT'
        : 'OPENING_BALANCE'
    return {
      key:
        asString(raw.key).trim() || asString(raw.id).trim() || `alloc-${index}`,
      ...(asString(raw.id).trim() ? { id: asString(raw.id).trim() } : {}),
      sourceType,
      ...(statementId ? { sourceCustomerStatementId: statementId } : {}),
      ...(openingId ? { sourceOpeningBalanceId: openingId } : {}),
      allocatedAmount:
        typeof raw.allocatedAmount === 'number'
          ? raw.allocatedAmount
          : raw.allocatedAmount != null && raw.allocatedAmount !== ''
            ? Number(raw.allocatedAmount)
            : undefined,
    }
  })
}

function computeSuggestedAllocation(
  targetAvailable: number | undefined,
  receiptAmount: number,
  totalAllocated: number,
  currentRowAmount: number | undefined,
): number | undefined {
  if (targetAvailable === undefined) {
    return undefined
  }
  const unallocated = Math.max(
    0,
    Number(
      (receiptAmount - totalAllocated + (currentRowAmount ?? 0)).toFixed(2),
    ),
  )
  return unallocated > 0
    ? Math.min(targetAvailable, unallocated)
    : targetAvailable
}

function resolveRowMaxAmount(
  row: ReceiptAllocationDraftRow,
  openingById: Map<string, ProjectOpeningBalanceOption>,
  statementById: Map<string, AllocatableStatementOption>,
): number | undefined {
  if (row.sourceType === 'OPENING_BALANCE' && row.sourceOpeningBalanceId) {
    return openingById.get(row.sourceOpeningBalanceId)?.remainingAmount
  }
  if (row.sourceType === 'STATEMENT' && row.sourceCustomerStatementId) {
    return statementById.get(row.sourceCustomerStatementId)?.closingAmount
  }
  return undefined
}

interface AllocationColumnsContext {
  t: TFunction
  disabled?: boolean
  canLoadCandidates: boolean
  openingLoading: boolean
  statementLoading: boolean
  openingOptions: ProjectOpeningBalanceOption[]
  statementOptions: AllocatableStatementOption[]
  openingById: Map<string, ProjectOpeningBalanceOption>
  statementById: Map<string, AllocatableStatementOption>
  receiptAmount: number
  totalAllocated: number
  onUpdateRow: (
    index: number,
    patch: Partial<ReceiptAllocationDraftRow>,
  ) => void
  onRemoveRow: (index: number) => void
}

function buildAllocationColumns(
  ctx: AllocationColumnsContext,
): ColumnsType<ReceiptAllocationDraftRow> {
  const { t, disabled, canLoadCandidates } = ctx
  return [
    {
      title: t('openingBalance.allocationType'),
      dataIndex: 'sourceType',
      width: 145,
      render: (sourceType: ReceiptAllocationSourceType, _row, index) => (
        <Select
          value={sourceType}
          disabled={disabled}
          style={{ width: '100%' }}
          aria-label={t('openingBalance.allocationType')}
          options={[
            {
              label: t('openingBalance.allocationTypeOpening'),
              value: 'OPENING_BALANCE',
            },
            {
              label: t('openingBalance.allocationTypeStatement'),
              value: 'STATEMENT',
            },
          ]}
          onChange={(nextType: ReceiptAllocationSourceType) =>
            ctx.onUpdateRow(index, {
              sourceType: nextType,
              sourceCustomerStatementId: undefined,
              sourceOpeningBalanceId: undefined,
              allocatedAmount: undefined,
            })
          }
        />
      ),
    },
    {
      title: t('openingBalance.allocationSource'),
      key: 'source',
      render: (_value, row, index) => {
        if (row.sourceType === 'OPENING_BALANCE') {
          return (
            <Select
              allowClear
              showSearch={{ optionFilterProp: 'label' }}
              disabled={disabled || !canLoadCandidates}
              loading={ctx.openingLoading}
              style={{ width: '100%' }}
              placeholder={t('openingBalance.selectAllocatableOpening')}
              aria-label={t('openingBalance.selectAllocatableOpening')}
              value={row.sourceOpeningBalanceId}
              options={ctx.openingOptions.map((item) => ({
                label: `${item.balanceNo} · ${item.projectName} · ${formatDate(item.cutoffDate)}（待核销 ¥${formatAmount(item.remainingAmount)}）`,
                value: item.id,
              }))}
              onChange={(selectedId?: string) => {
                const target = selectedId
                  ? ctx.openingById.get(selectedId)
                  : undefined
                ctx.onUpdateRow(index, {
                  sourceOpeningBalanceId: selectedId || undefined,
                  sourceCustomerStatementId: undefined,
                  allocatedAmount: computeSuggestedAllocation(
                    target?.remainingAmount,
                    ctx.receiptAmount,
                    ctx.totalAllocated,
                    row.allocatedAmount,
                  ),
                })
              }}
            />
          )
        }
        return (
          <Select
            allowClear
            showSearch={{ optionFilterProp: 'label' }}
            disabled={disabled || !canLoadCandidates}
            loading={ctx.statementLoading}
            style={{ width: '100%' }}
            placeholder={t('openingBalance.selectAllocatableStatement')}
            aria-label={t('openingBalance.selectAllocatableStatement')}
            value={row.sourceCustomerStatementId}
            options={ctx.statementOptions.map((item) => ({
              label: `${item.statementNo} · ${item.projectName || '-'}（待收 ¥${formatAmount(item.closingAmount)}）`,
              value: item.id,
            }))}
            onChange={(selectedId?: string) => {
              const target = selectedId
                ? ctx.statementById.get(selectedId)
                : undefined
              ctx.onUpdateRow(index, {
                sourceCustomerStatementId: selectedId || undefined,
                sourceOpeningBalanceId: undefined,
                allocatedAmount: computeSuggestedAllocation(
                  target?.closingAmount,
                  ctx.receiptAmount,
                  ctx.totalAllocated,
                  row.allocatedAmount,
                ),
              })
            }}
          />
        )
      },
    },
    {
      title: t('openingBalance.allocatedAmount'),
      dataIndex: 'allocatedAmount',
      width: 165,
      render: (val: number | undefined, row, index) => (
        <InputNumber
          min={0.01}
          max={resolveRowMaxAmount(row, ctx.openingById, ctx.statementById)}
          precision={2}
          prefix="¥"
          disabled={disabled}
          style={{ width: '100%' }}
          aria-label={t('openingBalance.allocatedAmount')}
          value={val}
          onChange={(nextVal) =>
            ctx.onUpdateRow(index, {
              allocatedAmount:
                typeof nextVal === 'number' ? nextVal : undefined,
            })
          }
        />
      ),
    },
    {
      title: t('common.actions'),
      key: 'remove',
      width: 68,
      align: 'center',
      render: (_value, _row, index) => (
        <Button
          type="text"
          danger
          size="small"
          disabled={disabled}
          aria-label={t('common.delete')}
          icon={<DeleteOutlined />}
          onClick={() => ctx.onRemoveRow(index)}
        />
      ),
    },
  ]
}

function AllocationStatusTag({
  rowCount,
  receiptAmount,
  totalAllocated,
}: {
  rowCount: number
  receiptAmount: number
  totalAllocated: number
}) {
  const { t } = useTranslation()
  if (rowCount === 0 || receiptAmount <= 0) {
    return null
  }
  const diff = Number((totalAllocated - receiptAmount).toFixed(2))
  if (diff > 0) {
    return (
      <Tag color="error">{t('openingBalance.allocationExceedsReceipt')}</Tag>
    )
  }
  if (Math.abs(diff) < 0.005) {
    return <Tag color="success">{t('openingBalance.allocationMatched')}</Tag>
  }
  return (
    <Tag color="warning">
      {t('openingBalance.allocationUnmatched', {
        diff: formatAmount(receiptAmount - totalAllocated),
      })}
    </Tag>
  )
}

export function ReceiptAllocationField({
  value,
  onChange,
  disabled,
}: {
  value?: ReceiptAllocationDraftRow[]
  onChange?: (next: ReceiptAllocationDraftRow[]) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const form = Form.useFormInstance()
  const counterpartyType = Form.useWatch('counterpartyType', form) as
    | string
    | undefined
  const counterpartyId = asString(Form.useWatch('counterpartyId', form)).trim()
  const projectId = asString(Form.useWatch('projectId', form)).trim()
  const settlementCompanyId = asString(
    Form.useWatch('settlementCompanyId', form),
  ).trim()
  const receiptAmount = Number(Form.useWatch('amount', form) ?? 0)

  const rows = useMemo(() => normalizeRows(value), [value])
  const isCustomer = counterpartyType !== '供应商'
  const canLoadCandidates = isCustomer && Boolean(counterpartyId)
  const openingFilter = useMemo(
    () => ({
      ...(projectId ? { projectId } : {}),
      ...(counterpartyId ? { customerId: counterpartyId } : {}),
      ...(settlementCompanyId ? { settlementCompanyId } : {}),
    }),
    [counterpartyId, projectId, settlementCompanyId],
  )

  const openingQuery = useQuery({
    queryKey: QUERY_KEYS.projectOpeningBalanceAllocatable(openingFilter),
    queryFn: ({ signal }) =>
      listAllocatableProjectOpeningBalances(openingFilter, signal),
    enabled: canLoadCandidates,
  })

  const statementQuery = useQuery({
    queryKey: [
      'receipt-allocatable-statements',
      counterpartyId,
      projectId,
      settlementCompanyId,
    ] as const,
    queryFn: ({ signal }) =>
      apiGet('/customer-statements', allocatableStatementPageSchema, {
        params: {
          customerId: counterpartyId,
          ...(projectId ? { projectId } : {}),
          ...(settlementCompanyId ? { settlementCompanyId } : {}),
          status: 'CONFIRMED',
          billDirection: '蓝字',
          page: 0,
          size: 100,
        },
        signal,
      }),
    enabled: canLoadCandidates,
  })

  const openingOptions = openingQuery.data ?? EMPTY_OPENING_OPTIONS
  const statementOptions = useMemo(
    () =>
      (statementQuery.data?.content ?? EMPTY_STATEMENT_OPTIONS).filter(
        (item) => item.closingAmount > 0,
      ),
    [statementQuery.data?.content],
  )
  const openingById = useMemo(
    () => new Map(openingOptions.map((item) => [item.id, item])),
    [openingOptions],
  )
  const statementById = useMemo(
    () => new Map(statementOptions.map((item) => [item.id, item])),
    [statementOptions],
  )
  const totalAllocated = useMemo(
    () =>
      rows.reduce(
        (sum, row) =>
          sum +
          (Number.isFinite(row.allocatedAmount)
            ? Number(row.allocatedAmount)
            : 0),
        0,
      ),
    [rows],
  )

  if (!isCustomer) {
    return null
  }

  const handleUpdateRow = (
    index: number,
    patch: Partial<ReceiptAllocationDraftRow>,
  ) => {
    onChange?.(
      rows.map((row, idx) => (idx === index ? { ...row, ...patch } : row)),
    )
  }

  const handleAddRow = (sourceType: ReceiptAllocationSourceType) => {
    onChange?.([
      ...rows,
      { key: `alloc-${Date.now()}-${rows.length}`, sourceType },
    ])
  }

  const handleRemoveRow = (index: number) => {
    onChange?.(rows.filter((_row, idx) => idx !== index))
  }

  const columns = buildAllocationColumns({
    t,
    disabled,
    canLoadCandidates,
    openingLoading: openingQuery.isLoading,
    statementLoading: statementQuery.isLoading,
    openingOptions,
    statementOptions,
    openingById,
    statementById,
    receiptAmount,
    totalAllocated,
    onUpdateRow: handleUpdateRow,
    onRemoveRow: handleRemoveRow,
  })

  return (
    <Flex vertical gap={8} style={{ width: '100%' }}>
      {canLoadCandidates ? null : (
        <Alert
          type="info"
          showIcon
          title={t('openingBalance.allocationNeedCustomerHint')}
        />
      )}
      <Flex justify="space-between" align="center" wrap gap={8}>
        <Space size={8}>
          <Button
            size="small"
            icon={<PlusOutlined />}
            disabled={disabled || !canLoadCandidates}
            onClick={() => handleAddRow('OPENING_BALANCE')}
          >
            {t('openingBalance.addOpeningAllocation')}
          </Button>
          <Button
            size="small"
            icon={<PlusOutlined />}
            disabled={disabled || !canLoadCandidates}
            onClick={() => handleAddRow('STATEMENT')}
          >
            {t('openingBalance.addStatementAllocation')}
          </Button>
        </Space>
        <Space size={8}>
          <Typography.Text type="secondary">
            {t('openingBalance.allocationTotalLabel', {
              amount: formatAmount(totalAllocated),
            })}
          </Typography.Text>
          <AllocationStatusTag
            rowCount={rows.length}
            receiptAmount={receiptAmount}
            totalAllocated={totalAllocated}
          />
        </Space>
      </Flex>
      {rows.length > 0 ? (
        <Table<ReceiptAllocationDraftRow>
          size="small"
          rowKey="key"
          pagination={false}
          columns={columns}
          dataSource={rows}
        />
      ) : (
        <Typography.Text type="secondary">
          {t('openingBalance.allocationEmptyHint')}
        </Typography.Text>
      )}
    </Flex>
  )
}
