import { ExclamationCircleFilled, InfoCircleOutlined } from '@ant-design/icons'
import { Button, Input, Popover, Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { formatWeight } from '@/utils/formatters'
import type { PriceRow } from './types'

interface TonCellProps {
  row: PriceRow
  rowId: string
  /** 全部可选采购订单明细行(含订货/已开/剩余吨位)。 */
  options: PurchaseOrderTonnageRecord[]
  /** 当前关联明细行的吨位记录(可能为已不在选项列表中的行)。 */
  linked?: PurchaseOrderTonnageRecord
  /** 本单据内该明细行的报单吨位合计(用于叠加判断超额)。 */
  localTonForItem: number
  /** 单据级不可编辑(只读或被他人签出 / 锁定规格和数量)。 */
  disabled: boolean
  /** 该行已锁定(锁定该行 = 规格与吨位定稿): 吨位输入一并只读。 */
  rowLockDisabled: boolean
  /** 只读原因提示: 只读/全局锁/行锁时用于说明为什么不可编辑(不静默禁用)。 */
  lockReason?: string
  /** 该行是否已锁定: 未锁定不可关联采购订单(按钮禁用并提示先锁定)。 */
  rowLocked: boolean
  loading: boolean
  lockedClassName?: string
  onTonChange: (value: number | undefined, warnPositive: boolean) => void
  /** 打开采购订单明细选择弹窗(由 SheetPanel 统一挂载)。 */
  onOpenPicker: () => void
  /** 在同一吨位列内移动焦点; 返回 false 表示已到边界。 */
  onMoveFocus: (delta: number) => boolean
}

function tonValueText(value: number) {
  return formatWeight(value)
}

/**
 * 紧凑吨位: 去掉无意义的小数尾零(`26.000` → `26`), 供单元格内的进度行扫读。
 * 明细(tooltip / popover)仍用 {@link tonValueText} 的精确值, 两种口径分工明确。
 */
function compactTonText(value: number) {
  return tonValueText(value).replace(/\.?0+$/, '')
}

/** 规格展示: 材质 Φ规格 长度(与订单明细一致)。 */
function itemSpecText(record: PurchaseOrderTonnageRecord) {
  return [record.material, record.spec, record.length]
    .filter((value) => Boolean(value))
    .join(' ')
}

/**
 * 该行「已开」涉及的品牌集合。
 *
 * <p>数据粒度是**采购订单明细行**: 一行报单只关联一个明细行, 因此集合通常只有一个元素;
 * 仍按集合去重并用 `、` 拼接, 上游若放宽到多明细行时展示层不必再改。</p>
 */
function issuedBrandText(record: PurchaseOrderTonnageRecord): string {
  return [...new Set([(record.brand ?? '').trim()].filter(Boolean))].join('、')
}

/**
 * 解析吨位单元格的采购订单视图。
 * 集中在一处: 关联明细、快照兜底、实时已开吨位与超额判定之间有先后依赖,
 * 散在组件里会让组件的控制流难以跟进。
 */
function resolveTonnageView(
  row: PriceRow,
  options: PurchaseOrderTonnageRecord[],
  linked: PurchaseOrderTonnageRecord | undefined,
  localTonForItem: number,
) {
  const selectedId = row.purchaseOrderItemId
  const selected =
    linked ??
    options.find((option) => option.purchaseOrderItemId === selectedId)
  // 已关联但明细行不可见: 用保存时的订单号快照兜底展示。
  const missingSnapshot =
    selectedId !== undefined && selected === undefined
      ? (row.purchaseOrderNo ?? selectedId)
      : undefined
  /*
   * 两个口径分工:
   * - actualIssued: 服务端按"已保存报单"统计的已开吨位(已排除本单据), 是进度行展示与
   *   "开了什么品牌"的权威数字;
   * - projectedIssued: 叠加本单据未保存吨位后的预计值, 只用于超额判定与 Tooltip 说明,
   *   不能当作"已开"展示, 否则用户会把草稿值误读成已开量。
   */
  const actualIssued = selected ? selected.issuedWeight : 0
  const projectedIssued = selected ? actualIssued + localTonForItem : 0
  const overLimit =
    selected !== undefined && projectedIssued > selected.orderedWeight
  return {
    selected,
    missingSnapshot,
    actualIssued,
    projectedIssued,
    overLimit,
  }
}

/**
 * 进度行: `已开 26/84 · 中天`, 超额时整行转警告色并补警告图标。
 *
 * <p>数字口径是**实际已开**(服务端已保存报单统计), 本单据未保存的吨位只出现在悬浮明细的
 * 「含未保存报单」行里; 超额仍按含未保存的预计值判定(与保存后的扣减口径一致), 因此可能
 * 出现"数字未超但整行标红"的情况, 由警告图标与 Tooltip 文案解释。</p>
 *
 * <p>品牌取所关联采购订单明细行的品牌字段, 直接回答"这一行已开的是什么品牌"; 列宽不足时
 * 按整格省略号收尾, 完整品牌与精确吨位由悬浮明细补齐(不留下半个字)。</p>
 */
function TonProgress({
  row,
  selected,
  actualIssued,
  projectedIssued,
  overLimit,
}: {
  row: PriceRow
  selected: PurchaseOrderTonnageRecord | undefined
  actualIssued: number
  projectedIssued: number
  overLimit: boolean
}) {
  const { t } = useTranslation()
  if (!selected) {
    // 未关联时保留占位: 关联行与未关联行高度一致, 表格不会高低不齐
    return (
      <span
        aria-hidden="true"
        className="price-compare-ton-meta price-compare-ton-meta--empty"
      >
        —
      </span>
    )
  }

  const remaining = selected.orderedWeight - projectedIssued
  const issuedText = compactTonText(actualIssued)
  const orderedText = compactTonText(selected.orderedWeight)
  const brand = issuedBrandText(selected)
  // 本单据未保存的吨位(>0 时才单独成行说明, 否则与实际已开完全一致, 徒增噪音)
  const unsavedTon = Math.max(projectedIssued - actualIssued, 0)
  const detail = (
    <div className="price-compare-ton-tooltip">
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.columns.ton')}</span>
        <span>{row.ton === undefined ? '—' : tonValueText(row.ton)}</span>
      </div>
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.columns.purchaseOrderOrdered')}</span>
        <span>{tonValueText(selected.orderedWeight)}</span>
      </div>
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.purchaseOrderIssuedActual')}</span>
        <span
          className={overLimit ? 'price-compare-ton-hint--over' : undefined}
        >
          {tonValueText(actualIssued)}
        </span>
      </div>
      {brand ? (
        <div className="price-compare-ton-popover-row">
          <span>{t('priceCompare.sheet.columns.brand')}</span>
          <span>{brand}</span>
        </div>
      ) : null}
      {unsavedTon > 0 ? (
        <div className="price-compare-ton-popover-row">
          <span>{t('priceCompare.sheet.purchaseOrderIssuedProjected')}</span>
          <span
            className={overLimit ? 'price-compare-ton-hint--over' : undefined}
          >
            {tonValueText(projectedIssued)}
          </span>
        </div>
      ) : null}
      <div className="price-compare-ton-popover-row">
        <span>
          {unsavedTon > 0
            ? t('priceCompare.sheet.purchaseOrderRemainingProjected')
            : t('priceCompare.sheet.columns.purchaseOrderRemaining')}
        </span>
        <span
          className={overLimit ? 'price-compare-ton-hint--over' : undefined}
        >
          {tonValueText(remaining)}
        </span>
      </div>
      {overLimit ? (
        <div className="price-compare-ton-popover-over">
          {t('priceCompare.sheet.purchaseOrderOverLimitLong')}
        </div>
      ) : null}
    </div>
  )

  return (
    <Tooltip placement="top" title={detail}>
      <span
        className={
          overLimit
            ? 'price-compare-ton-meta price-compare-ton-issued price-compare-ton-hint--over'
            : 'price-compare-ton-meta price-compare-ton-issued'
        }
      >
        {/*
          视觉上是紧凑的 `已开 35/40 · 中天`, 但对读屏要给出完整口径, 否则"35/40"读不出
          谁是已开谁是订货、也读不到品牌。aria-label 不能挂在无 role 的 span 上(biome a11y 规则),
          因此用项目通用的 .aries-sr-only 承载这句完整描述。
        */}
        <span className="aries-sr-only">
          {`${t('priceCompare.sheet.purchaseOrderIssuedActual')} ${tonValueText(actualIssued)} / ${t('priceCompare.sheet.columns.purchaseOrderOrdered')} ${tonValueText(selected.orderedWeight)}${unsavedTon > 0 ? ` / ${t('priceCompare.sheet.purchaseOrderIssuedProjected')} ${tonValueText(projectedIssued)}` : ''}${brand ? ` / ${t('priceCompare.sheet.columns.brand')} ${brand}` : ''}`}
        </span>
        {t('priceCompare.sheet.purchaseOrderIssuedShort', {
          issued: `${issuedText}/${orderedText}`,
        })}
        {brand ? (
          <>
            {/* 分隔符对读屏冗余(品牌已在上面的完整描述里读出来) */}
            <span aria-hidden="true" className="price-compare-ton-brand-sep">
              ·
            </span>
            <span className="price-compare-ton-brand" title={brand}>
              {brand}
            </span>
          </>
        ) : null}
        {overLimit ? (
          <ExclamationCircleFilled
            aria-hidden="true"
            className="price-compare-ton-over-icon"
          />
        ) : null}
      </span>
    </Tooltip>
  )
}

/**
 * 吨位单元格: 上行报单吨位输入(右对齐等宽数字), 下行「已开 / 订货」进度 + 明细入口。
 *
 * <p>拆两行的原因: 原本单行里输入框、`已开 X…`、明细图标互相挤占, 窄列时进度文本被
 * 截成 `已开 26…` 且对齐混乱; 改两行后数字上下对齐、进度完整可读, 超额另有警告色与图标。</p>
 *
 * <p>鼠标悬停进度行给出「报单 / 订货 / 已开 / 剩余」精确明细; 悬停明细图标显示该规格行
 * 订货/已开/剩余 popover, popover 内可打开选择弹窗, 超额不拦截保存。</p>
 */
export function TonCell({
  row,
  rowId,
  options,
  linked,
  localTonForItem,
  disabled,
  rowLockDisabled,
  lockReason,
  rowLocked,
  loading,
  lockedClassName,
  onTonChange,
  onOpenPicker,
  onMoveFocus,
}: TonCellProps) {
  const { t } = useTranslation()
  const {
    selected,
    missingSnapshot,
    actualIssued,
    projectedIssued,
    overLimit,
  } = resolveTonnageView(row, options, linked, localTonForItem)
  /** 单据不可编辑或该行已锁定: 吨位输入只读(与规格同一锁定口径)。 */
  const inputDisabled = disabled || rowLockDisabled

  const popoverContent = selected ? (
    <LinkedPurchaseOrderPopover
      selected={selected}
      projectedIssued={projectedIssued}
      overLimit={overLimit}
      rowLocked={rowLocked}
      onOpenPicker={onOpenPicker}
    />
  ) : (
    <UnlinkedPurchaseOrderPopover
      missingSnapshot={missingSnapshot}
      rowLocked={rowLocked}
      onOpenPicker={onOpenPicker}
    />
  )

  const tonInput = (
    <Input
      key={`ton:${rowId}:${row.ton ?? ''}`}
      aria-label={t('priceCompare.sheet.a11y.cell', {
        column: t('priceCompare.sheet.columns.ton'),
        row:
          [row.category, row.material, row.spec, row.length]
            .filter(Boolean)
            .join(' ') || t('priceCompare.sheet.a11y.emptyRow'),
      })}
      className={
        lockedClassName
          ? `price-compare-ton ${lockedClassName}`
          : 'price-compare-ton'
      }
      size="small"
      variant="borderless"
      inputMode="decimal"
      disabled={inputDisabled}
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
        if (event.key !== 'Tab') return
        // 只有真的在吨位列内移动了才拦截; 到列首/列尾放行默认 Tab,
        // 否则(单行单据时)焦点会被永久锁死在这一格。
        const moved = onMoveFocus(event.shiftKey ? -1 : 1)
        if (moved) event.preventDefault()
      }}
    />
  )

  return (
    <div className="price-compare-ton-cell">
      {/*
        锁定原因统一走外层 span: 禁用输入框不派发 mouseenter,
        Tooltip 直接挂在它上面会静默失效(实测), 用户只看到不可编辑却不知原因。
      */}
      <div className="price-compare-ton-value">
        {inputDisabled && lockReason ? (
          <Tooltip title={lockReason}>
            {/*
              title 与 Tooltip 双保险: 禁用输入框不派发 mouseenter, Tooltip 需要外层
              span 承接事件; 原生 title 同时让原因在焦点/测试路径下也稳定可读。
            */}
            <span className="price-compare-ton-lock-reason" title={lockReason}>
              {tonInput}
            </span>
          </Tooltip>
        ) : (
          tonInput
        )}
      </div>
      {/* 进度行与明细入口同一行: 输入独占上行, 数字纵向对齐便于扫读 */}
      <div className="price-compare-ton-meta-row">
        <TonProgress
          actualIssued={actualIssued}
          overLimit={overLimit}
          projectedIssued={projectedIssued}
          row={row}
          selected={selected}
        />
        <Popover
          content={popoverContent}
          placement="right"
          trigger={['hover', 'click']}
          mouseEnterDelay={0.15}
        >
          {/* 用原生 button 而非 span: 键盘可聚焦、Enter/Space 可打开弹层;
              弹层内的「选择采购订单」是关联订单的唯一入口, 原本 hover-only 对键盘不可达。 */}
          <button
            aria-label={t('priceCompare.sheet.purchaseOrderDetail')}
            className={`price-compare-ton-info${loading ? ' price-compare-ton-info--loading' : ''}`}
            type="button"
          >
            <InfoCircleOutlined />
          </button>
        </Popover>
      </div>
    </div>
  )
}

/** 已关联采购订单的明细弹层: 品牌/订货/已开(实际)/含未保存/剩余 + 超额提示。 */
function LinkedPurchaseOrderPopover({
  selected,
  projectedIssued,
  overLimit,
  rowLocked,
  onOpenPicker,
}: {
  selected: PurchaseOrderTonnageRecord
  projectedIssued: number
  overLimit: boolean
  rowLocked: boolean
  onOpenPicker: () => void
}) {
  const { t } = useTranslation()
  // 实际已开(服务端已保存口径)与含未保存的预计值分开呈现, 避免把草稿值读成已开量。
  const actualIssued = selected.issuedWeight
  const unsavedTon = Math.max(projectedIssued - actualIssued, 0)
  const brand = issuedBrandText(selected)
  return (
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
        <span>{t('priceCompare.sheet.columns.variety')}</span>
        <span>
          {selected.category} {itemSpecText(selected)}
        </span>
      </div>
      {brand ? (
        <div className="price-compare-ton-popover-row">
          <span>{t('priceCompare.sheet.columns.brand')}</span>
          <span>{brand}</span>
        </div>
      ) : null}
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.columns.purchaseOrderStatus')}</span>
        <span>{selected.status}</span>
      </div>
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.columns.purchaseOrderOrdered')}</span>
        <span>{tonValueText(selected.orderedWeight)}</span>
      </div>
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.purchaseOrderIssuedActual')}</span>
        <span
          className={overLimit ? 'price-compare-ton-hint--over' : undefined}
        >
          {tonValueText(actualIssued)}
        </span>
      </div>
      {unsavedTon > 0 ? (
        <div className="price-compare-ton-popover-row">
          <span>{t('priceCompare.sheet.purchaseOrderIssuedProjected')}</span>
          <span
            className={overLimit ? 'price-compare-ton-hint--over' : undefined}
          >
            {tonValueText(projectedIssued)}
          </span>
        </div>
      ) : null}
      <div className="price-compare-ton-popover-row">
        <span>
          {unsavedTon > 0
            ? t('priceCompare.sheet.purchaseOrderRemainingProjected')
            : t('priceCompare.sheet.columns.purchaseOrderRemaining')}
        </span>
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
      <Button
        block
        disabled={!rowLocked}
        size="small"
        type="primary"
        onClick={onOpenPicker}
      >
        {t('priceCompare.sheet.purchaseOrderPickerOpen')}
      </Button>
      {!rowLocked ? (
        <div className="price-compare-ton-popover-basis">
          {t('priceCompare.sheet.purchaseOrderLockFirst')}
        </div>
      ) : null}
    </div>
  )
}

/** 未关联(或明细已不可见)时的弹层: 说明当前关联状态并提供选择入口。 */
function UnlinkedPurchaseOrderPopover({
  missingSnapshot,
  rowLocked,
  onOpenPicker,
}: {
  missingSnapshot?: string
  rowLocked: boolean
  onOpenPicker: () => void
}) {
  const { t } = useTranslation()
  return (
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
      <Button
        block
        disabled={!rowLocked}
        size="small"
        type="primary"
        onClick={onOpenPicker}
      >
        {t('priceCompare.sheet.purchaseOrderPickerOpen')}
      </Button>
      {!rowLocked ? (
        <div className="price-compare-ton-popover-basis">
          {t('priceCompare.sheet.purchaseOrderLockFirst')}
        </div>
      ) : null}
    </div>
  )
}
