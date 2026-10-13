import { InfoCircleOutlined } from '@ant-design/icons'
import { Button, Input, Popover, Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { formatWeight } from '@/utils/formatters'
import { issuedBrandText, tonProgressTextParts } from './ton-progress-text'
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

/** 数字格(已开吨位)的只读数值样式: 与未开吨位列同左起点, 便于整列竖向扫读。 */
function TonFigure({ value }: { value: number }) {
  return <span className="price-compare-ton-figure">{tonValueText(value)}</span>
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

function TonStateLabel({ state }: { state: keyof typeof TON_STATE_KEYS }) {
  const { t } = useTranslation()
  const { label, hint } = TON_STATE_KEYS[state]
  const labelText = t(label)
  const hintText = t(hint)
  return (
    <Tooltip classNames={{ root: TON_BUBBLE_CLASS }} title={hintText}>
      <span className="price-compare-ton-state">{labelText}</span>
    </Tooltip>
  )
}

/**
 * 「已开吨位」单元格: 服务端按**其他已保存报单**统计的已开吨位(不含本单据)。
 *
 * <p>只读数字, 保留三位小数(与明细一致): 用户要拿它与「报单吨位」「未开吨位」并排核对,
 * 因此不做 26.000 → 26 的紧凑化, 也不在这里做任何结论性标红。</p>
 */
export function IssuedTonCell({
  row,
  options,
  linked,
}: Pick<TonOrderCellProps, 'row' | 'options' | 'linked'>) {
  const { t } = useTranslation()
  const { selected, missingSnapshot } = resolveTonnageView(row, options, linked)
  return (
    <div className="price-compare-ton-cell price-compare-ton-cell--readonly">
      {selected ? (
        <Tooltip
          classNames={{ root: TON_BUBBLE_CLASS }}
          title={t('priceCompare.sheet.purchaseOrderSavedBasis')}
        >
          <TonFigure value={selected.issuedWeight} />
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
 * 「未开吨位」单元格: **未开吨位 = 订货吨位 − 已开吨位**, 并承载品牌与明细入口。
 *
 * <p>数字口径(业务确认): 订货吨位是该采购订单明细行锁定后的订货量, 已开吨位是其他已保存
 * 报单占用该明细行的量, 两者相减就是这条明细还没开的量 —— 订货量必须算进来。本单据这一行
 * 报了多少吨由相邻的「报单吨位」列给出, 两个数并排即可看出"报的量是否超过订单还没开的量",
 * 因此这里不再用一行文字下"超额/剩余"的结论。</p>
 *
 * <p>负值只可能来自"已开量超过订货量", 属于真正的异常, 此时数字转警告色并在悬浮明细里
 * 用两个具体数字说明; 品牌取所关联明细行的品牌, 列宽不足时品牌层先省略(数字是硬契约)。</p>
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

  const popoverContent = selected ? (
    <LinkedPurchaseOrderPopover
      selected={selected}
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

  // 未开吨位 = 锁定后的报单吨位 − 已开吨位(两个操作数就是左边两列已经显示的数)
  const unopened = localTonForItem - selected.issuedWeight
  // 报单还没填(<=0)时没有可减的基数: 显示短状态, 不显示负值误导
  const reportedMissing = localTonForItem <= 0
  // 已开量超过本单报的量: 唯一需要标红的情形
  const overReported = !reportedMissing && unopened < 0
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
        <span>{tonValueText(selected.issuedWeight)}</span>
      </div>
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.columns.unopenedTon')}</span>
        <span
          className={overReported ? 'price-compare-ton-hint--over' : undefined}
        >
          {tonValueText(unopened)}
        </span>
      </div>
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.columns.purchaseOrderOrdered')}</span>
        <span>{tonValueText(selected.orderedWeight)}</span>
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
            issued: tonValueText(selected.issuedWeight),
            reported: tonValueText(localTonForItem),
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
                {`${t('priceCompare.sheet.purchaseOrderSheetReported')} ${tonValueText(localTonForItem)} / ${t('priceCompare.sheet.purchaseOrderIssuedActual')} ${tonValueText(selected.issuedWeight)} / ${t('priceCompare.sheet.columns.unopenedTon')} ${tonValueText(unopened)} / ${t('priceCompare.sheet.columns.purchaseOrderOrdered')} ${tonValueText(selected.orderedWeight)}${brand ? ` / ${t('priceCompare.sheet.columns.brand')} ${brand}` : ''}${overReported ? ` / ${t('priceCompare.sheet.purchaseOrderOverIssuedLong', { issued: tonValueText(selected.issuedWeight), reported: tonValueText(localTonForItem) })}` : ''}`}
              </span>
              {primary}
            </span>
          )}
          {reportedMissing ? null : brand ? (
            <TonIssuedBrand brand={brand} over={overReported} />
          ) : null}
        </span>
      </Tooltip>
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

/** 已关联采购订单的明细弹层: 本单报单/已开(实际)/未开吨位/订货吨位/品牌 + 已开超报单提示。 */
function LinkedPurchaseOrderPopover({
  selected,
  localTonForItem,
  linkAllowed,
  linkBlockedReason,
  onOpenPicker,
}: {
  selected: PurchaseOrderTonnageRecord
  localTonForItem: number
  linkAllowed: boolean
  linkBlockedReason?: string
  onOpenPicker: () => void
}) {
  const { t } = useTranslation()
  // 口径必须与相邻的吨位列一致: 未开吨位 = 本单据该明细行报单吨位 − 已开吨位。
  // 早先这里按「订货吨位 − 已开吨位」算, 同一行的弹层与列会给出两个不同数字
  // (实测: 该明细行订货 10.24 / 报单 12, 列上显示 12.000 而弹层显示 10.240)。
  const reportedMissing = localTonForItem <= 0
  const unopened = localTonForItem - selected.issuedWeight
  const overOpened = !reportedMissing && unopened < 0
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
      {!reportedMissing ? (
        <div className="price-compare-ton-popover-row">
          <span>{t('priceCompare.sheet.purchaseOrderSheetReported')}</span>
          <span>{tonValueText(localTonForItem)}</span>
        </div>
      ) : null}
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.purchaseOrderIssuedActual')}</span>
        <span>{tonValueText(selected.issuedWeight)}</span>
      </div>
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.columns.unopenedTon')}</span>
        {reportedMissing ? (
          <span>{t('priceCompare.sheet.purchaseOrderMissingTonShort')}</span>
        ) : (
          <span
            className={overOpened ? 'price-compare-ton-hint--over' : undefined}
          >
            {tonValueText(unopened)}
          </span>
        )}
      </div>
      <div className="price-compare-ton-popover-row">
        <span>{t('priceCompare.sheet.columns.purchaseOrderOrdered')}</span>
        <span>{tonValueText(selected.orderedWeight)}</span>
      </div>
      {overOpened ? (
        <div className="price-compare-ton-popover-over">
          {t('priceCompare.sheet.purchaseOrderOverIssuedLong', {
            issued: tonValueText(selected.issuedWeight),
            reported: tonValueText(localTonForItem),
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
