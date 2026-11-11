import { Input, Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'
import type { PriceRow } from './types'

/**
 * 吨位气泡(Tooltip)的根类名。
 *
 * <p>antd 默认 Tooltip 用 `colorBgSpotlight`(`rgba(0, 0, 0, 0.85)`), 15% 的透明会让页面里的
 * 表头、按钮与表格文字透进气泡, 与锁定原因文字叠成重影。类名把气泡指向
 * `price-compare.css` 里同一套不透明气泡样式(底色 `--ant-color-bg-elevated` + 浮层阴影
 * + 圆角), 深浅色模式都跟随主题, 不在组件里写死色值。</p>
 */
export const TON_BUBBLE_CLASS = 'price-compare-ton-bubble'

/**
 * 报单吨位输入单元格的 props。
 *
 * <p>报单吨位是比价页里唯一的吨位字段(手填输入框); 已开/未开等采购进度口径随采购订单
 * 解耦一并移除, 本组件不再读取任何采购数据。</p>
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

/** 吨位输入的可访问名: 列名 + 该行的商品文案(空行给占位说明)。 */
function tonCellLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  row: PriceRow,
) {
  return t('priceCompare.sheet.a11y.cell', {
    column: t('priceCompare.sheet.columns.ton'),
    row:
      [row.category, row.material, row.spec, row.length]
        .filter(Boolean)
        .join(' ') || t('priceCompare.sheet.a11y.emptyRow'),
  })
}

/**
 * 吨位输入解析: 空串/非法/非正数一律视为"无有效吨位"。
 *
 * <p>`warnPositive` 只在**失焦**时给出(回车提交时不再重复告警): 用户还在输入中间态
 * (`-`、`0`)时不该弹提示, 但离开这一格时值没存上必须有反馈。</p>
 */
function parseTonInput(raw: string): {
  value: number | undefined
  warnPositive: boolean
} {
  if (raw === '') return { value: undefined, warnPositive: false }
  const value = Number(raw)
  if (Number.isNaN(value)) return { value: undefined, warnPositive: true }
  return { value, warnPositive: value <= 0 }
}

/**
 * 「报单吨位」单元格: 手填输入框 + 锁定原因提示。
 *
 * <p>只读原因走外层 `span`, 不直接挂在禁用的 `Input` 上: 禁用控件不派发 mouseenter,
 * Tooltip 会静默失效(实测), 用户只看到不可编辑却不知原因。同时保留原生 `title`,
 * 让原因在键盘焦点与测试路径下也稳定可读。</p>
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
      aria-label={tonCellLabel(t, row)}
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
        const parsed = parseTonInput(event.target.value)
        onTonChange(parsed.value, parsed.warnPositive)
      }}
      onPressEnter={(event) => {
        const parsed = parseTonInput((event.target as HTMLInputElement).value)
        onTonChange(parsed.value, false)
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
      <div className="price-compare-ton-value">
        {inputDisabled && lockReason ? (
          <Tooltip classNames={{ root: TON_BUBBLE_CLASS }} title={lockReason}>
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
