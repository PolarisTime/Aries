import { Input, Select, Tooltip, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { formatWeight } from '@/utils/formatters'
import type { PriceRow } from './types'

interface TonCellProps {
  row: PriceRow
  rowId: string
  /** 全部可选采购订单(含订货/已开/剩余吨位)。 */
  options: PurchaseOrderTonnageRecord[]
  /** 当前关联订单的吨位记录(可能为已不在选项列表中的订单)。 */
  linked?: PurchaseOrderTonnageRecord
  /** 本单据内该订单的报单吨位合计(用于叠加判断超额)。 */
  localTonForOrder: number
  disabled: boolean
  loading: boolean
  lockedClassName?: string
  onTonChange: (value: number | undefined, warnPositive: boolean) => void
  onPurchaseOrderChange: (purchaseOrderId: string | undefined) => void
  onMoveFocus: (delta: number) => void
}

function tonValueText(value: number) {
  return formatWeight(value)
}

/**
 * 吨位单元格: 上方为报单吨位输入, 下方为关联采购订单下拉与"已开/剩余"提示。
 * 超额仅以警告色提示(不拦截保存), 便于按实际业务口径微调。
 */
export function TonCell({
  row,
  rowId,
  options,
  linked,
  localTonForOrder,
  disabled,
  loading,
  lockedClassName,
  onTonChange,
  onPurchaseOrderChange,
  onMoveFocus,
}: TonCellProps) {
  const { t } = useTranslation()
  const selectedId = row.purchaseOrderId
  const selected =
    linked ??
    options.find((option) => option.purchaseOrderId === selectedId) ??
    undefined
  // 服务端已开吨位已排除当前单据, 叠加本地未保存吨位后即为实时进度。
  const projectedIssued = selected
    ? selected.issuedWeight + localTonForOrder
    : 0
  const overLimit =
    selected !== undefined && projectedIssued > selected.orderedWeight

  const selectOptions = options.map((option) => ({
    value: option.purchaseOrderId,
    label: `${option.orderNo} · ${option.supplierName}`,
    title: t('priceCompare.sheet.purchaseOrderOptionTitle', {
      orderNo: option.orderNo,
      supplier: option.supplierName,
      ordered: tonValueText(option.orderedWeight),
      remaining: tonValueText(option.remainingWeight),
    }),
  }))

  return (
    <div className="price-compare-ton-cell">
      <Input
        key={`ton:${rowId}:${row.ton ?? ''}`}
        className={
          lockedClassName
            ? `price-compare-ton ${lockedClassName}`
            : 'price-compare-ton'
        }
        size="small"
        variant="borderless"
        inputMode="decimal"
        disabled={disabled}
        data-ton={rowId}
        defaultValue={row.ton === undefined ? '' : String(row.ton)}
        onBlur={(event) => {
          const raw = event.target.value
          const value = Number(raw)
          onTonChange(
            raw === '' ? undefined : Number.isNaN(value) ? undefined : value,
            raw !== '' && (Number.isNaN(value) || value <= 0),
          )
        }}
        onPressEnter={(event) => {
          const raw = (event.target as HTMLInputElement).value
          const value = Number(raw)
          onTonChange(
            raw === '' || Number.isNaN(value) ? undefined : value,
            false,
          )
        }}
        onKeyDown={(event) => {
          if (event.key === 'Tab') {
            event.preventDefault()
            onMoveFocus(event.shiftKey ? -1 : 1)
          }
        }}
      />
      <Select
        allowClear
        aria-label={t('priceCompare.sheet.purchaseOrderLabel')}
        className="price-compare-purchase-order"
        disabled={disabled}
        loading={loading}
        options={selectOptions}
        placeholder={t('priceCompare.sheet.purchaseOrderPlaceholder')}
        showSearch={{ optionFilterProp: 'label' }}
        size="small"
        value={selectedId}
        onChange={(value) =>
          onPurchaseOrderChange(value ? String(value) : undefined)
        }
      />
      {selected ? (
        <Tooltip title={selected.orderNo}>
          <Typography.Text
            className={
              overLimit
                ? 'price-compare-ton-hint price-compare-ton-hint--over'
                : 'price-compare-ton-hint'
            }
            type={overLimit ? undefined : 'secondary'}
          >
            {t('priceCompare.sheet.purchaseOrderTonnageHint', {
              issued: tonValueText(projectedIssued),
              remaining: tonValueText(selected.orderedWeight - projectedIssued),
            })}
            {overLimit
              ? ` ${t('priceCompare.sheet.purchaseOrderOverLimit')}`
              : ''}
          </Typography.Text>
        </Tooltip>
      ) : (
        <span className="price-compare-ton-hint price-compare-ton-hint--empty" />
      )}
    </div>
  )
}
