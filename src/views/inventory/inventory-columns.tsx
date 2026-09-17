import type { TableColumnsType } from 'antd'
import type { TFunction } from 'i18next'
import type {
  InventoryBalance,
  InventoryTransaction,
} from '@/api/inventory/inventory'

export function displayText(value: unknown) {
  const text = String(value ?? '').trim()
  return text || '--'
}

export function sumColumnWidths(columns: { width?: unknown }[]): number {
  return columns.reduce(
    (total, column) =>
      total + (typeof column.width === 'number' ? column.width : 0),
    0,
  )
}

interface BalanceColumnOptions {
  t: TFunction
  formatCellValue: (value: unknown, columnType?: string) => string
  /** 字段级权限：无 inventory:read:cost 时不展示成本列。 */
  canViewCost: boolean
}

export function buildInventoryBalanceColumns({
  t,
  formatCellValue,
  canViewCost,
}: BalanceColumnOptions): TableColumnsType<InventoryBalance> {
  const formatNumber = (value: number) => formatCellValue(value, 'number')
  const formatAmount = (value: number) => formatCellValue(value, 'amount')
  return [
    {
      title: t('inventory.columns.materialCode'),
      dataIndex: 'materialCode',
      width: 150,
      fixed: 'left',
      ellipsis: true,
      render: displayText,
    },
    {
      title: t('inventory.columns.brand'),
      dataIndex: 'brand',
      width: 110,
      render: displayText,
    },
    {
      title: t('inventory.columns.material'),
      dataIndex: 'material',
      width: 120,
      render: displayText,
    },
    {
      title: t('inventory.columns.spec'),
      dataIndex: 'spec',
      width: 100,
      render: displayText,
    },
    {
      title: t('inventory.columns.length'),
      dataIndex: 'length',
      width: 90,
      render: displayText,
    },
    {
      title: t('inventory.columns.unit'),
      dataIndex: 'unit',
      width: 80,
      render: displayText,
    },
    {
      title: t('inventory.columns.warehouse'),
      dataIndex: 'warehouseName',
      width: 140,
      ellipsis: true,
      render: displayText,
    },
    {
      title: t('inventory.columns.batchNo'),
      dataIndex: 'batchNo',
      width: 130,
      ellipsis: true,
      render: displayText,
    },
    {
      title: t('inventory.columns.quantity'),
      dataIndex: 'quantity',
      width: 120,
      align: 'right',
      render: formatNumber,
    },
    ...(canViewCost
      ? [
          {
            title: t('inventory.columns.avgUnitCost'),
            dataIndex: 'avgUnitCost',
            width: 130,
            align: 'right' as const,
            render: formatAmount,
          },
          {
            title: t('inventory.columns.amount'),
            dataIndex: 'amount',
            width: 140,
            align: 'right' as const,
            render: formatAmount,
          },
        ]
      : []),
  ]
}

interface TransactionColumnOptions extends BalanceColumnOptions {
  transactionTypeLabel: (value: string) => string
}

export function buildInventoryTransactionColumns({
  t,
  formatCellValue,
  transactionTypeLabel,
  canViewCost,
}: TransactionColumnOptions): TableColumnsType<InventoryTransaction> {
  const formatNumber = (value: number) => formatCellValue(value, 'number')
  const formatAmount = (value: number) => formatCellValue(value, 'amount')
  const formatDateTime = (value: string) => formatCellValue(value, 'datetime')
  return [
    {
      title: t('inventory.columns.transactionNo'),
      dataIndex: 'transactionNo',
      width: 180,
      fixed: 'left',
      ellipsis: true,
      render: displayText,
    },
    {
      title: t('inventory.columns.transactionType'),
      dataIndex: 'transactionType',
      width: 120,
      render: (value: string) => transactionTypeLabel(value),
    },
    {
      title: t('inventory.columns.materialCode'),
      dataIndex: 'materialCode',
      width: 150,
      ellipsis: true,
      render: displayText,
    },
    {
      title: t('inventory.columns.brand'),
      dataIndex: 'brand',
      width: 110,
      render: displayText,
    },
    {
      title: t('inventory.columns.material'),
      dataIndex: 'material',
      width: 120,
      render: displayText,
    },
    {
      title: t('inventory.columns.spec'),
      dataIndex: 'spec',
      width: 100,
      render: displayText,
    },
    {
      title: t('inventory.columns.unit'),
      dataIndex: 'unit',
      width: 80,
      render: displayText,
    },
    {
      title: t('inventory.columns.warehouse'),
      dataIndex: 'warehouseName',
      width: 140,
      ellipsis: true,
      render: displayText,
    },
    {
      title: t('inventory.columns.batchNo'),
      dataIndex: 'batchNo',
      width: 130,
      ellipsis: true,
      render: displayText,
    },
    {
      title: t('inventory.columns.direction'),
      dataIndex: 'direction',
      width: 80,
      render: (value: number) =>
        value < 0 ? t('inventory.direction.out') : t('inventory.direction.in'),
    },
    {
      title: t('inventory.columns.quantity'),
      dataIndex: 'quantity',
      width: 120,
      align: 'right',
      render: formatNumber,
    },
    ...(canViewCost
      ? [
          {
            title: t('inventory.columns.unitCost'),
            dataIndex: 'unitCost',
            width: 120,
            align: 'right' as const,
            render: formatAmount,
          },
          {
            title: t('inventory.columns.amount'),
            dataIndex: 'amount',
            width: 140,
            align: 'right' as const,
            render: formatAmount,
          },
        ]
      : []),
    {
      title: t('inventory.columns.sourceDocumentNo'),
      dataIndex: 'sourceDocumentNo',
      width: 180,
      ellipsis: true,
      render: displayText,
    },
    {
      title: t('inventory.columns.occurredAt'),
      dataIndex: 'occurredAt',
      width: 170,
      render: formatDateTime,
    },
  ]
}
