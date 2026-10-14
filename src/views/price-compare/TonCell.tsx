import { InfoCircleOutlined } from '@ant-design/icons'
import { Button, Input, Popover, Tooltip } from 'antd'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { formatWeight } from '@/utils/formatters'
import { linkedPurchaseOrderItemIds } from './core'
import {
  issuedBrandText,
  tonProgressTextParts,
  tonRemainingText,
} from './ton-progress-text'
import type { PriceRow } from './types'

/**
 * 吨位列气泡(Tooltip 与 ⓘ popover)共用的根类名。
 *
 * <p>antd 默认 Tooltip 用 `colorBgSpotlight`(`rgba(0, 0, 0, 0.85)`), 15% 的透明会让页面里的
 * 表头、按钮与表格文字透进气泡, 与「报单吨位 / 已开吨位(实际)」等文字叠成重影。类名把两者
 * 指向 `price-compare.css` 里同一套不透明气泡样式(底色 `--ant-color-bg-elevated` + 浮层阴影
 * + 圆角), 深浅色模式都跟随主题, 不在组件里写死色值。</p>
 */
export const TON_BUBBLE_CLASS = 'price-compare-ton-bubble'

/**
 * 报单吨位输入单元格的 props。
 *
 * <p>吨位信息已按业务要求拆成三列: 「报单吨位」(本组件, 手填输入框)、「已开吨位」与
 * 「未开吨位」(见 {@link IssuedTonCell} / {@link TonUnopenedCell})。</p>
 */
export interface TonCellProps {
  row: PriceRow
  rowId: string
  /** 单据级不可编辑(只读或被他人签出 / 锁定规格和数量)。 */
  disabled: boolean
  /** 该行已锁定(锁定该行 = 规格与吨位定稿): 吨位输入一并只读。 */
  rowLockDisabled: boolean
  /** 只读原因提示: 只读/全局锁/行锁时用于说明为什么不可编辑(不静默禁用)。 */
  lockReason?: string
  lockedClassName?: string
  onTonChange: (value: number | undefined, warnPositive: boolean) => void
  /** 在同一吨位列内移动焦点; 返回 false 表示已到边界。 */
  onMoveFocus: (delta: number) => boolean
}

/** 采购订单口径的两列(已开吨位 / 未开吨位)共用的 props。 */
export interface TonOrderCellProps {
  row: PriceRow
  /** 全部可选采购订单明细行(含订货/已开/剩余吨位)。 */
  options: PurchaseOrderTonnageRecord[]
  /** 当前关联明细行的吨位记录(可能为已不在选项列表中的行)。 */
  linked?: PurchaseOrderTonnageRecord
  /** 本单据内该明细行的报单吨位合计(悬浮明细里作为"本单报单"给出)。 */
  localTonForItem: number
  loading: boolean
  /**
   * 是否允许关联采购订单: 该行规格与吨位已定稿(行级锁 或 单据级「锁定规格和数量」)且非只读。
   *
   * <p>口径必须与吨位输入一致: 单据级锁定同样冻结了规格与吨位, 若这里只认行级锁,
   * 工具栏「锁定规格和数量」生效后弹层会一边禁用「选择采购订单」一边提示"请先锁定该行",
   * 而行菜单的「锁定该行」在全局锁下又是禁用的 —— 用户被卡在死路上。</p>
   */
  purchaseOrderLinkAllowed: boolean
  /** 关联被禁用的原因: 未提供时按"未定稿"口径给出兜底文案(禁用不静默)。 */
  purchaseOrderLinkBlockedReason?: string
  /** 打开采购订单明细选择弹窗(由 SheetPanel 统一挂载)。 */
  onOpenPicker: () => void
}

function tonValueText(value: number) {
  return formatWeight(value)
}

/** 规格展示: 材质 Φ规格 长度(与订单明细一致)。 */
function itemSpecText(record: PurchaseOrderTonnageRecord) {
  return [record.material, record.spec, record.length]
    .filter((value) => Boolean(value))
    .join(' ')
}

/**
 * 解析吨位相关单元格的采购订单视图(关联明细 + 快照兜底)。
 *
 * <p>「已开吨位」「未开吨位」两列与报单吨位格共用同一份解析, 避免三处各查一次选项列表
 * 后出现"某列认得关联、某列显示未关联"的漂移。</p>
 */
/**
 * 行级吨位合计: 一行可关联多张订单明细行, 订货量与「其他报单已开」都按**关联行合计**。
 *
 * <p>只有一条关联时合计等于该条, 历史行为完全不变; 未关联时 records 为空。</p>
 *
 * <p>关联的明细行已不可见(订单被删 / 换规格导致不在选项里)时不再静默少算: 这些 id 由
 * `missingItemIds` 返回, 由调用方给出「已删除」之类的可读状态, 否则用户看到的是一个
 * 少算了缺失明细行的合计而毫无提示。</p>
 */
export function resolveLinkedTonnageTotals(
  row: PriceRow,
  options: PurchaseOrderTonnageRecord[],
  linked: PurchaseOrderTonnageRecord | undefined,
) {
  // 按 id 建一次索引: 关联行数固定, 逐条 find 是 O(关联数 × 选项数), 明明只需扫一遍
  const optionByItemId = new Map(
    options.map((option) => [option.purchaseOrderItemId, option]),
  )
  const records: PurchaseOrderTonnageRecord[] = []
  const missingItemIds: string[] = []
  for (const itemId of linkedPurchaseOrderItemIds(row)) {
    const record =
      optionByItemId.get(itemId) ??
      (linked?.purchaseOrderItemId === itemId ? linked : undefined)
    if (record) records.push(record)
    else missingItemIds.push(itemId)
  }
  return {
    records,
    missingItemIds,
    orderedTotal: records.reduce(
      (sum, record) => sum + record.orderedWeight,
      0,
    ),
    otherIssuedTotal: records.reduce(
      (sum, record) => sum + record.issuedWeight,
      0,
    ),
  }
}

export function resolveTonnageView(
  row: PriceRow,
  options: PurchaseOrderTonnageRecord[],
  linked: PurchaseOrderTonnageRecord | undefined,
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
  return { selected, missingSnapshot }
}

/**
 * 没有口径可算时的短状态: 「未关联」(还没选订单明细行)、「已删除」(关联的订单没了)、
 * 「未填吨位」(已关联但报单吨位为 0, 没有可减的基数)。
 *
 * <p>不显示 `0.000` —— 没有关联不等于"已经开了 0 吨", 用明确的短状态给出原因; 完整说明在
 * 悬浮提示里(点 ⓘ 即可选择订单明细行)。</p>
 */
const TON_STATE_KEYS = {
  notLinked: {
    label: 'priceCompare.sheet.purchaseOrderNotLinkedShort',
    hint: 'priceCompare.sheet.purchaseOrderNotLinkedHint',
  },
  missing: {
    label: 'priceCompare.sheet.purchaseOrderMissingShort',
    hint: 'priceCompare.sheet.purchaseOrderMissingHint',
  },
  /** 已关联订单明细行, 但报单吨位还没填/为 0: 没有可减的基数。 */
  missingTon: {
    label: 'priceCompare.sheet.purchaseOrderMissingTonShort',
    hint: 'priceCompare.sheet.purchaseOrderMissingTonHint',
  },
} as const

/**
 * 短状态标签: 标签文字常驻可见, 完整说明在悬浮/聚焦气泡里。
 *
 * <p>纯键盘可达: 用原生 `button` 承担提示触发器(APG tooltip 模式的标准触发元素), 天然
 * 进入 Tab 序列; 并让 Tooltip 响应 `focus` —— antd Tooltip 默认只认 `hover`
 * (@rc-component/trigger 的 hover 动作不含 focus), 只把元素变可聚焦会让键盘用户 Tab 到
 * 一个气泡永不打开的位置。配套的可见焦点环见 `price-compare.css` 的
 * `.price-compare-ton-state:focus-visible`(WCAG 2.4.7)。</p>
 */
function TonStateLabel({ state }: { state: keyof typeof TON_STATE_KEYS }) {
  const { t } = useTranslation()
  const { label, hint } = TON_STATE_KEYS[state]
  const labelText = t(label)
  const hintText = t(hint)
  return (
    <Tooltip
      classNames={{ root: TON_BUBBLE_CLASS }}
      title={hintText}
      trigger={['hover', 'focus']}
    >
      <button className="price-compare-ton-state" type="button">
        {labelText}
      </button>
    </Tooltip>
  )
}

/**
 * 「已开吨位」单元格: 服务端按**其他已保存报单**统计的已开吨位(不含本单据)。
 *
 * <p>显示「剩余未开吨位 = 订货吨位 − 已开吨位」, 保留紧凑写法(去尾零): 用户要拿它与
 * 「报单吨位」「已开吨位」并排核对。负值(被超开)转警告色 —— 这是这条明细行唯一需要
 * 干预的状态。</p>
 */
export function IssuedTonCell({
  row,
  options,
  linked,
  localTonForItem,
}: Pick<TonOrderCellProps, 'row' | 'options' | 'linked' | 'localTonForItem'>) {
  const { t } = useTranslation()
  const { selected, missingSnapshot } = resolveTonnageView(row, options, linked)
  // 剩余未开吨位 = 订货吨位 − 已开吨位(已开含本单据这一行报的量), 负值表示这条明细行被超开
  const totals = resolveLinkedTonnageTotals(row, options, linked)
  const remaining = selected
    ? totals.orderedTotal - (totals.otherIssuedTotal + localTonForItem)
    : 0
  const over = selected !== undefined && remaining < 0
  return (
    <div className="price-compare-ton-cell price-compare-ton-cell--readonly">
      {selected ? (
        <Tooltip
          classNames={{ root: TON_BUBBLE_CLASS }}
          title={t('priceCompare.sheet.purchaseOrderSavedBasis')}
        >
          <span
            className={
              over
                ? 'price-compare-ton-figure price-compare-ton-hint--over'
                : 'price-compare-ton-figure'
            }
          >
            {tonRemainingText(selected, localTonForItem)}
          </span>
        </Tooltip>
      ) : (
        <TonStateLabel
          state={missingSnapshot !== undefined ? 'missing' : 'notLinked'}
        />
      )}
    </div>
  )
}

/**
 * 「已开吨位」单元格: **已开吨位 = 本单据该明细行报单吨位 + 其他已保存报单占用**, 并承载
 * 品牌与明细入口。
 *
 * <p>口径(业务确认, 2026-10-14 修正): 关联了有效订单明细行之后, 这一列要回答的是"这条明细行
 * 开出了多少", 本单据自己报的量必须算进去; 服务端的 `issuedWeight` 只含**其他**报单, 所以这里
 * 再叠加本单据的报单合计。三列因此是:「报单吨位」(本行报了多少)、「剩余未开吨位」
 * (订货 − 已开)、「已开吨位」(已开合计)。</p>
 *
 * <p>需要标红的唯一情形是"已开合计 > 订货吨位"(超开), 此时数字转警告色并在悬浮明细里用两个
 * 具体数字说明; 品牌取所关联明细行的品牌, 列宽不足时品牌层先省略(数字是硬契约)。</p>
 */
export function TonUnopenedCell({
  row,
  options,
  linked,
  localTonForItem,
  loading,
  purchaseOrderLinkAllowed,
  purchaseOrderLinkBlockedReason,
  onOpenPicker,
}: TonOrderCellProps) {
  const { t } = useTranslation()
  const { selected, missingSnapshot } = resolveTonnageView(row, options, linked)
  // 合计口径只算一次: 弹层、气泡、列上数字与读屏文案全部取这一份, 避免多处各算一遍走偏
  const totals = resolveLinkedTonnageTotals(row, options, linked)
  /*
   * 每条关联明细行"本次开出"的分配吨位(弹层多行时逐条给出)。历史数据只有单值三列、
   * 没有 purchaseOrderLinks: 那时本行报单吨位就整体算在这一条上。
   */
  const allocatedTonByItemId = new Map<string, number>()
  for (const link of row.purchaseOrderLinks ?? []) {
    allocatedTonByItemId.set(link.purchaseOrderItemId, link.allocatedTon)
  }
  // 明细行已不可见时不能静默少算: 用「已删除」短状态明示, 合计里缺了哪一条
  const missingCount = totals.missingItemIds.length

  const popoverContent = selected ? (
    <LinkedPurchaseOrderPopover
      records={totals.records.length > 0 ? totals.records : [selected]}
      orderedTotal={totals.orderedTotal}
      otherIssuedTotal={totals.otherIssuedTotal}
      allocatedTonByItemId={allocatedTonByItemId}
      localTonForItem={localTonForItem}
      linkAllowed={purchaseOrderLinkAllowed}
      linkBlockedReason={purchaseOrderLinkBlockedReason}
      onOpenPicker={onOpenPicker}
    />
  ) : (
    <UnlinkedPurchaseOrderPopover
      missingSnapshot={missingSnapshot}
      linkAllowed={purchaseOrderLinkAllowed}
      linkBlockedReason={purchaseOrderLinkBlockedReason}
      onOpenPicker={onOpenPicker}
    />
  )

  /*
    用原生 button 而非 span: 键盘可聚焦、Enter/Space 可打开弹层;
    弹层内的「选择采购订单」是关联订单的唯一入口, 原本 hover-only 对键盘不可达。
  */
  const infoButton = (
    <Popover
      classNames={{ root: TON_BUBBLE_CLASS }}
      content={popoverContent}
      mouseEnterDelay={0.15}
      placement="right"
      trigger={['hover', 'click']}
    >
      <button
        aria-label={t('priceCompare.sheet.purchaseOrderDetail')}
        className={`price-compare-ton-info${loading ? ' price-compare-ton-info--loading' : ''}`}
        type="button"
      >
        <InfoCircleOutlined />
      </button>
    </Popover>
  )

  if (!selected) {
    return (
      <div className="price-compare-ton-cell price-compare-ton-cell--readonly">
        <span className="price-compare-ton-progress">
          <TonStateLabel
            state={missingSnapshot !== undefined ? 'missing' : 'notLinked'}
          />
        </span>
        {infoButton}
      </div>
    )
  }

  // 已开吨位 = 本单据该明细行报单合计 + 其他已保存报单占用(服务端只给"其他")
  const issuedTotal = totals.otherIssuedTotal + localTonForItem
  // 剩余未开吨位 = 订货吨位 − 已开吨位(负值表示这条明细行被超开)
  const remaining = totals.orderedTotal - issuedTotal
  // 报单还没填(<=0)时没有基数可言: 显示短状态, 不显示误导性的合计
  const reportedMissing = localTonForItem <= 0
  // 已开合计超过订货吨位: 唯一需要标红的情形
  const overReported =
    !reportedMissing &&
    totals.orderedTotal > 0 &&
    issuedTotal > totals.orderedTotal
  // 可见数字与列宽计算共用同一份口径(ton-progress-text), 避免两处漂移
  const { primary, brand } = tonProgressTextParts(selected, localTonForItem)
  const detail = (
    <div className="price-compare-ton-tooltip">
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.purchaseOrderSheetReported')}</span>
        <span>{tonValueText(localTonForItem)}</span>
      </div>
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.purchaseOrderIssuedActual')}</span>
        <span>{tonValueText(totals.otherIssuedTotal)}</span>
      </div>
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.columns.issuedTon')}</span>
        <span
          className={overReported ? 'price-compare-ton-hint--over' : undefined}
        >
          {tonValueText(issuedTotal)}
        </span>
      </div>
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.columns.unopenedTon')}</span>
        <span>{tonValueText(remaining)}</span>
      </div>
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.columns.purchaseOrderOrdered')}</span>
        <span>{tonValueText(totals.orderedTotal)}</span>
      </div>
      {brand ? (
        <div className="price-compare-ton-popover-row">
          <span>{t('priceCompare.sheet.columns.brand')}</span>
          <span>{brand}</span>
        </div>
      ) : null}
      {overReported ? (
        <div className="price-compare-ton-popover-over">
          {t('priceCompare.sheet.purchaseOrderOverIssuedLong', {
            issued: tonValueText(issuedTotal),
            ordered: tonValueText(totals.orderedTotal),
          })}
        </div>
      ) : null}
    </div>
  )

  return (
    <div className="price-compare-ton-cell price-compare-ton-cell--readonly">
      <Tooltip
        classNames={{ root: TON_BUBBLE_CLASS }}
        placement="top"
        title={detail}
      >
        {/*
          数字与品牌两层各自负责省略号: 列宽不足时品牌先让位, 数字必须完整可读。
          读屏口径把报单/已开/未开/订货量一次说清, 否则单看一个数字读不出是谁的口径。
        */}
        <span className="price-compare-ton-progress">
          {reportedMissing ? (
            <TonStateLabel state="missingTon" />
          ) : (
            <span
              className={
                overReported
                  ? 'price-compare-ton-meta price-compare-ton-issued price-compare-ton-hint--over'
                  : 'price-compare-ton-meta price-compare-ton-issued'
              }
            >
              <span className="aries-sr-only">
                {`${t('priceCompare.sheet.purchaseOrderSheetReported')} ${tonValueText(localTonForItem)} / ${t('priceCompare.sheet.purchaseOrderIssuedActual')} ${tonValueText(totals.otherIssuedTotal)} / ${t('priceCompare.sheet.columns.issuedTon')} ${tonValueText(issuedTotal)} / ${t('priceCompare.sheet.columns.unopenedTon')} ${tonValueText(remaining)} / ${t('priceCompare.sheet.columns.purchaseOrderOrdered')} ${tonValueText(totals.orderedTotal)}${brand ? ` / ${t('priceCompare.sheet.columns.brand')} ${brand}` : ''}${overReported ? ` / ${t('priceCompare.sheet.purchaseOrderOverIssuedLong', { issued: tonValueText(issuedTotal), ordered: tonValueText(totals.orderedTotal) })}` : ''}`}
              </span>
              {primary}
            </span>
          )}
          {reportedMissing ? null : brand ? (
            <TonIssuedBrand brand={brand} over={overReported} />
          ) : null}
        </span>
      </Tooltip>
      {/* 有关联明细行已不可见: 合计少算了哪一条必须当场说出来, 不能静默少算 */}
      {missingCount > 0 ? <TonStateLabel state="missing" /> : null}
      {infoButton}
    </div>
  )
}

/**
 * 已开品牌层: 与比值层分开的弹性项, 收缩优先级远高于比值层。
 *
 * <p>两者同层时省略号会先吃掉比值(11/12px 档实测「已开 0/12」被截成「已开 0/1…」),
 * 而"比值可读、只省略品牌"才是契约: 列宽不足时先省略品牌, 品牌被压到 0 之后比值层
 * 才退化为省略号(极端窄列兜底)。</p>
 *
 * <p>分隔符与品牌同处一个省略号层, 省略号作用于整串「· 中天」: 分隔符若独立成兄弟
 * 节点, 品牌被压没后会只剩一个悬空的「·」。已开超时整层一起转警告色。</p>
 */
function TonIssuedBrand({ brand, over }: { brand: string; over: boolean }) {
  return (
    <span
      className={
        over
          ? 'price-compare-ton-brand-group price-compare-ton-hint--over'
          : 'price-compare-ton-brand-group'
      }
    >
      <span className="price-compare-ton-brand" title={brand}>
        {/* 分隔符对读屏冗余(品牌已在比值层的完整描述里读出来) */}
        <span aria-hidden="true" className="price-compare-ton-brand-sep">
          ·
        </span>
        {brand}
      </span>
    </span>
  )
}

/**
 * 「报单吨位」单元格: 手填吨位输入框(右对齐等宽数字)。
 *
 * <p>吨位信息按业务要求拆成三列: 本列只放输入框, 「已开吨位」与「未开吨位」由
 * {@link IssuedTonCell} / {@link TonUnopenedCell} 两列承载 —— 三者并排后用户不必在
 * 一行小字里做心算, 也不会因为一行放不下而被省略号收尾。</p>
 *
 * <p>锁定原因统一走外层 span: 禁用输入框不派发 mouseenter, Tooltip 直接挂在输入框上会
 * 静默失效(实测), 用户只看到不可编辑却不知原因。</p>
 */
export function TonCell({
  row,
  rowId,
  disabled,
  rowLockDisabled,
  lockReason,
  lockedClassName,
  onTonChange,
  onMoveFocus,
}: TonCellProps) {
  const { t } = useTranslation()
  /** 单据不可编辑或该行已锁定: 吨位输入只读(与规格同一锁定口径)。 */
  const inputDisabled = disabled || rowLockDisabled

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
          <Tooltip classNames={{ root: TON_BUBBLE_CLASS }} title={lockReason}>
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
    </div>
  )
}

/**
 * 已关联采购订单的明细弹层。
 *
 * <p>单条关联保持原样(订单号 / 供应商 / 规格 / 品牌 / 状态 + 吨位口径行)。多行关联时头部
 * 不再只报第一条 `selected` —— 那样会出现"订单号是第一条、数字却是合计"的两处打架:
 * 逐条列出订单号 / 规格 / 订货量 / 其他已开 / 本次开出, 再给出 Σ 口径的关联合计。</p>
 */
function LinkedPurchaseOrderPopover({
  records,
  orderedTotal,
  otherIssuedTotal,
  allocatedTonByItemId,
  localTonForItem,
  linkAllowed,
  linkBlockedReason,
  onOpenPicker,
}: {
  records: PurchaseOrderTonnageRecord[]
  /** 关联明细行的订货量合计(与相邻两列同源: 由 resolveLinkedTonnageTotals 给出)。 */
  orderedTotal: number
  /** 关联明细行的其他已保存报单占用合计(同上)。 */
  otherIssuedTotal: number
  /** 每条明细行"本次开出"的分配吨位(多行关联时逐条给出)。 */
  allocatedTonByItemId: Map<string, number>
  localTonForItem: number
  linkAllowed: boolean
  linkBlockedReason?: string
  onOpenPicker: () => void
}) {
  const { t } = useTranslation()
  const selected = records[0]
  const multi = records.length > 1
  // 口径必须与相邻两个吨位列逐字一致, 否则同一行会出现三个数字打架(实测踩过):
  //   已开吨位 = 本单据该明细行报单合计 + 其他已保存报单占用(服务端 issuedWeight 只含"其他")
  //   剩余未开吨位 = 订货吨位合计 − 已开吨位(负值 = 超开)
  const reportedMissing = localTonForItem <= 0
  const issuedTotal = otherIssuedTotal + localTonForItem
  const remaining = orderedTotal - issuedTotal
  const overOpened =
    !reportedMissing && orderedTotal > 0 && issuedTotal > orderedTotal
  const issuedMissing = reportedMissing
  const brand = issuedBrandText(selected)
  return (
    <div className="price-compare-ton-popover">
      {multi ? (
        <>
          <div className="price-compare-ton-popover-basis">
            {t('priceCompare.sheet.purchaseOrderLinkedLines', {
              count: records.length,
            })}
          </div>
          {records.map((record) => (
            <Fragment key={record.purchaseOrderItemId}>
              <div className="price-compare-ton-popover-row">
                <span>{t('priceCompare.sheet.purchaseOrderLabel')}</span>
                <strong>{record.orderNo}</strong>
              </div>
              <div className="price-compare-ton-popover-row">
                <span>{t('priceCompare.sheet.columns.variety')}</span>
                <span>
                  {record.category} {itemSpecText(record)}
                </span>
              </div>
              <div className="price-compare-ton-popover-row">
                <span>
                  {t('priceCompare.sheet.columns.purchaseOrderOrdered')}
                </span>
                <span>{tonValueText(record.orderedWeight)}</span>
              </div>
              <div className="price-compare-ton-popover-row">
                <span>{t('priceCompare.sheet.purchaseOrderIssuedActual')}</span>
                <span>{tonValueText(record.issuedWeight)}</span>
              </div>
              <div className="price-compare-ton-popover-row">
                <span>{t('priceCompare.sheet.purchaseOrderAllocatedTon')}</span>
                <span>
                  {tonValueText(
                    allocatedTonByItemId.get(record.purchaseOrderItemId) ?? 0,
                  )}
                </span>
              </div>
            </Fragment>
          ))}
          <div className="price-compare-ton-popover-basis">
            {t('priceCompare.sheet.purchaseOrderLinkedTotal')}
          </div>
        </>
      ) : (
        <>
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
          {!reportedMissing ? (
            <div className="price-compare-ton-popover-row">
              <span>{t('priceCompare.sheet.purchaseOrderSheetReported')}</span>
              <span>{tonValueText(localTonForItem)}</span>
            </div>
          ) : null}
          <div className="price-compare-ton-popover-row">
            <span>{t('priceCompare.sheet.purchaseOrderIssuedActual')}</span>
            <span>{tonValueText(otherIssuedTotal)}</span>
          </div>
        </>
      )}
      {multi && !reportedMissing ? (
        <div className="price-compare-ton-popover-row">
          <span>{t('priceCompare.sheet.purchaseOrderSheetReported')}</span>
          <span>{tonValueText(localTonForItem)}</span>
        </div>
      ) : null}
      {multi ? (
        <div className="price-compare-ton-popover-row">
          <span>{t('priceCompare.sheet.purchaseOrderIssuedActual')}</span>
          <span>{tonValueText(otherIssuedTotal)}</span>
        </div>
      ) : null}
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.columns.issuedTon')}</span>
        {issuedMissing ? (
          <span>{t('priceCompare.sheet.purchaseOrderMissingTonShort')}</span>
        ) : (
          <span
            className={overOpened ? 'price-compare-ton-hint--over' : undefined}
          >
            {tonValueText(issuedTotal)}
          </span>
        )}
      </div>
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.columns.unopenedTon')}</span>
        <span>{tonValueText(remaining)}</span>
      </div>
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.columns.purchaseOrderOrdered')}</span>
        <span>{tonValueText(orderedTotal)}</span>
      </div>
      {multi && brand ? (
        <div className="price-compare-ton-popover-row">
          <span>{t('priceCompare.sheet.columns.brand')}</span>
          <span>{brand}</span>
        </div>
      ) : null}
      {overOpened ? (
        <div className="price-compare-ton-popover-over">
          {t('priceCompare.sheet.purchaseOrderOverIssuedLong', {
            issued: tonValueText(issuedTotal),
            ordered: tonValueText(orderedTotal),
          })}
        </div>
      ) : null}
      <div className="price-compare-ton-popover-basis">
        {t('priceCompare.sheet.purchaseOrderSavedBasis')}
      </div>
      <PurchaseOrderLinkAction
        linkAllowed={linkAllowed}
        linkBlockedReason={linkBlockedReason}
        onOpenPicker={onOpenPicker}
      />
    </div>
  )
}

/**
 * 弹层内的采购订单入口: 未定稿(或只读)时禁用, 并给出被拒原因。
 *
 * <p>两个弹层共用同一份渲染, 避免"禁用条件 / 原因文案"两处各写一遍后走偏 —— 这次
 * 的缺陷正是入口条件与吨位输入口径不一致造成的。</p>
 */
function PurchaseOrderLinkAction({
  linkAllowed,
  linkBlockedReason,
  onOpenPicker,
}: {
  linkAllowed: boolean
  linkBlockedReason?: string
  onOpenPicker: () => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <Button
        block
        disabled={!linkAllowed}
        size="small"
        type="primary"
        onClick={onOpenPicker}
      >
        {t('priceCompare.sheet.purchaseOrderPickerOpen')}
      </Button>
      {linkAllowed ? null : (
        <div className="price-compare-ton-popover-basis">
          {linkBlockedReason ?? t('priceCompare.sheet.purchaseOrderLockFirst')}
        </div>
      )}
    </>
  )
}

/** 未关联(或明细已不可见)时的弹层: 说明当前关联状态并提供选择入口。 */
function UnlinkedPurchaseOrderPopover({
  missingSnapshot,
  linkAllowed,
  linkBlockedReason,
  onOpenPicker,
}: {
  missingSnapshot?: string
  linkAllowed: boolean
  linkBlockedReason?: string
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
      <PurchaseOrderLinkAction
        linkAllowed={linkAllowed}
        linkBlockedReason={linkBlockedReason}
        onOpenPicker={onOpenPicker}
      />
    </div>
  )
}
