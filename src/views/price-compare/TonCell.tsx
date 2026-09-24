import { InfoCircleOutlined } from '@ant-design/icons'
import { Button, Input, Popover } from 'antd'
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
  /** 打开采购订单选择弹窗(由 SheetPanel 统一挂载)。 */
  onOpenPicker: () => void
  onMoveFocus: (delta: number) => void
}

function tonValueText(value: number) {
  return formatWeight(value)
}

/**
 * 吨位单元格: 报单吨位输入 + "已开 X" 数值 + 明细图标, 横向排布不换行。
 * 鼠标悬停明细图标显示订货/已开/剩余 popover, popover 内可打开选择弹窗。
 * 超额以警告色提示(不拦截保存)。
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
  onOpenPicker,
  onMoveFocus,
}: TonCellProps) {
  const { t } = useTranslation()
  const selectedId = row.purchaseOrderId
  const selected =
    linked ??
    options.find((option) => option.purchaseOrderId === selectedId) ??
    undefined
  // 已关联但订单已删除/不可见: 用保存时的订单号快照兜底展示。
  const missingSnapshot =
    selectedId !== undefined && selected === undefined
      ? (row.purchaseOrderNo ?? selectedId)
      : undefined
  // 服务端已开吨位已排除当前单据, 叠加本地未保存吨位后即为实时进度。
  const projectedIssued = selected
    ? selected.issuedWeight + localTonForOrder
    : 0
  const overLimit =
    selected !== undefined && projectedIssued > selected.orderedWeight

  const popoverContent = selected ? (
    <div className="price-compare-ton-popover">
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.purchaseOrderLabel')}</span>
        <strong>{selected.orderNo}</strong>
      </div>
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.columns.purchaseOrderSupplier')}</span>
        <span>{selected.supplierName}</span>
      </div>
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.columns.purchaseOrderStatus')}</span>
        <span>{selected.status}</span>
      </div>
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.columns.purchaseOrderOrdered')}</span>
        <span>{tonValueText(selected.orderedWeight)}</span>
      </div>
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.columns.purchaseOrderIssued')}</span>
        <span
          className={overLimit ? 'price-compare-ton-hint--over' : undefined}
        >
          {tonValueText(projectedIssued)}
        </span>
      </div>
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.columns.purchaseOrderRemaining')}</span>
        <span
          className={overLimit ? 'price-compare-ton-hint--over' : undefined}
        >
          {tonValueText(selected.orderedWeight - projectedIssued)}
        </span>
      </div>
      {overLimit ? (
        <div className="price-compare-ton-popover-over">
          {t('priceCompare.sheet.purchaseOrderOverLimitLong')}
        </div>
      ) : null}
      <div className="price-compare-ton-popover-basis">
        {t('priceCompare.sheet.purchaseOrderSavedBasis')}
      </div>
      <Button block size="small" type="primary" onClick={onOpenPicker}>
        {t('priceCompare.sheet.purchaseOrderPickerOpen')}
      </Button>
    </div>
  ) : (
    <div className="price-compare-ton-popover">
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.purchaseOrderLabel')}</span>
        <span>
          {missingSnapshot !== undefined
            ? t('priceCompare.sheet.purchaseOrderMissing', {
                orderNo: missingSnapshot,
              })
            : t('priceCompare.sheet.purchaseOrderUnlinked')}
        </span>
      </div>
      {missingSnapshot !== undefined ? (
        <div className="price-compare-ton-popover-over">
          {t('priceCompare.sheet.purchaseOrderMissingHint')}
        </div>
      ) : null}
      <Button block size="small" type="primary" onClick={onOpenPicker}>
        {t('priceCompare.sheet.purchaseOrderPickerOpen')}
      </Button>
    </div>
  )

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
      {selected ? (
        <span
          className={
            overLimit
              ? 'price-compare-ton-issued price-compare-ton-hint--over'
              : 'price-compare-ton-issued'
          }
          title={selected.orderNo}
        >
          {t('priceCompare.sheet.purchaseOrderIssuedShort', {
            issued: tonValueText(projectedIssued),
          })}
        </span>
      ) : null}
      <Popover
        content={popoverContent}
        placement="right"
        trigger="hover"
        mouseEnterDelay={0.15}
      >
        <span
          aria-label={t('priceCompare.sheet.purchaseOrderDetail')}
          className={`price-compare-ton-info${loading ? ' price-compare-ton-info--loading' : ''}`}
          role="img"
        >
          <InfoCircleOutlined />
        </span>
      </Popover>
    </div>
  )
}
