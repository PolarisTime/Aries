import type {
  Brand,
  PriceData,
  PriceRow,
  PriceSheet,
  SheetInputs,
  Variety,
} from './types'

export const CATEGORIES = ['螺纹钢', '盘螺', '高线', '圆钢']
export const SPECS: Record<string, number[]> = {
  螺纹钢: [10, 12, 14, 16, 18, 20, 22, 25, 28, 32],
  盘螺: [6, 8, 10],
  高线: [6, 8, 10],
  圆钢: [12, 14, 16, 18, 20, 22, 25, 28, 32],
}
export const LENGTHS: Record<string, string[]> = {
  螺纹钢: ['9米', '12米'],
  盘螺: ['-'],
  高线: ['9米', '12米'],
  圆钢: ['9米', '12米'],
}

/** 归一化时段为 上午/中午/下午。 */
export function normalizePeriod(value: string): string {
  const matched = /(上午|中午|下午)\s*$/.exec((value ?? '').trim())
  return matched ? matched[1] : (value ?? '')
}

/** 商品类别规范化: 默认相等, 仅 螺纹钢 与 直条 视为同一类别。 */
export function canonicalCategory(value: string): string {
  return value === '直条' ? '螺纹钢' : value
}

export const dataKeyOf = (row: PriceRow) =>
  row.category && row.material
    ? `${canonicalCategory(row.category)}|${row.material}`
    : ''

/** 现货价供应商下拉选项: 携带经营品牌用于按品牌列过滤。 */
export type SupplierSelectOption = {
  value: string
  label: string
  /** 经营品牌(商品品牌名称), 缺省视为未绑定任何品牌。 */
  brands?: string[]
}

/**
 * 按品牌列过滤供应商选项。
 *
 * - 品牌名称为空 → 返回全部(保持兼容)。
 * - 存在至少一个绑定该品牌的供应商 → 只返回绑定供应商。
 * - 无任何供应商绑定该品牌 → 回退返回全部(避免下拉为空)。
 */
export function filterSupplierOptionsByBrand(
  options: SupplierSelectOption[],
  brandName: string | undefined,
): SupplierSelectOption[] {
  if (!brandName) return options
  const bound = options.filter((option) => option.brands?.includes(brandName))
  return bound.length > 0 ? bound : options
}

/** 现货联动的商品键: 类别+材质+规格+长度 相同即视为同一商品。 */
export const productKeyOf = (row: PriceRow) =>
  row.category && row.material
    ? `${row.category}|${row.material}|${row.spec}|${row.length}`
    : ''

export function syncSpotInputs(
  rows: PriceRow[],
  inputs: SheetInputs,
  brandName: string,
  rowId: string,
  value: number | undefined,
): { inputs: SheetInputs; targets: PriceRow[] } {
  const source = rows.find((row) => row.id === rowId)
  if (!source) return { inputs, targets: [] }
  const key = productKeyOf(source)
  const targets = rows.filter(
    (row) => row.id === rowId || (key && productKeyOf(row) === key),
  )
  const next: SheetInputs = { ...inputs }
  for (const target of targets) {
    const inputKey = `${brandName}:${target.id}`
    next[inputKey] = { ...(next[inputKey] ?? {}), spot: value }
  }
  return { inputs: next, targets }
}

/**
 * 对账式现货联动：同批次内，若某行某品牌缺现货价，而同商品(类别+材质+规格+长度)的其它行已有现货价，
 * 则自动套用，避免同一商品在不同行重复输入。返回新 inputs；无变化时返回原对象。
 */
export function reconcileSpotInputs(
  rows: PriceRow[],
  inputs: SheetInputs,
  brandNames: string[],
): SheetInputs {
  const spotByProduct = new Map<string, number>()
  for (const row of rows) {
    const key = productKeyOf(row)
    if (!key) continue
    for (const brand of brandNames) {
      const spot = inputs[`${brand}:${row.id}`]?.spot
      if (spot !== undefined) spotByProduct.set(`${brand}\u0000${key}`, spot)
    }
  }

  let changed = false
  const next: SheetInputs = { ...inputs }
  for (const row of rows) {
    const key = productKeyOf(row)
    if (!key) continue
    for (const brand of brandNames) {
      const inputKey = `${brand}:${row.id}`
      if (next[inputKey]?.spot !== undefined) continue
      const spot = spotByProduct.get(`${brand}\u0000${key}`)
      if (spot !== undefined) {
        next[inputKey] = { ...(next[inputKey] ?? {}), spot }
        changed = true
      }
    }
  }
  return changed ? next : inputs
}

/**
 * 批量填入同一供应商(仅改供应商简称, 不动现货价)。
 *
 * - 覆盖语义: 目标行已有供应商时改为新供应商, 便于换第 N 家重新报价。
 * - 只处理商品行; 隔断行忽略。
 * - 供应商置空时等价于清除简称, 与单格清除保持一致(无其它字段则删除该输入)。
 * 返回新 inputs; 无变化时返回原对象。
 */
export function fillSupplierInputs(
  rows: PriceRow[],
  inputs: SheetInputs,
  brandName: string,
  rowIds: string[],
  option: { value: string; label: string } | undefined,
): SheetInputs {
  const targets = new Set(rowIds)
  let changed = false
  const next: SheetInputs = { ...inputs }
  for (const row of rows) {
    if (!targets.has(row.id) || isSeparatorRow(row)) continue
    const key = `${brandName}:${row.id}`
    const prev = next[key] ?? {}
    if (option) {
      if (
        prev.supplierId === option.value &&
        prev.supplierName === option.label
      )
        continue
      next[key] = {
        ...prev,
        supplierId: option.value,
        supplierName: option.label,
      }
      changed = true
      continue
    }
    if (prev.supplierId === undefined && prev.supplierName === undefined)
      continue
    const {
      supplierId: _supplierId,
      supplierName: _supplierName,
      ...rest
    } = prev
    if (rest.spot === undefined && rest.ton === undefined) {
      delete next[key]
    } else {
      next[key] = rest
    }
    changed = true
  }
  return changed ? next : inputs
}

/** 12米加价生效的品种(业务规则) */
const LENGTH_PREMIUM_CATEGORIES = new Set(['螺纹钢'])
/** 现货价合理上限(元/吨), 超出提示 */
export const SPOT_PRICE_MAX = 20000
/** 默认 12 米加价(元/吨) */
export const DEFAULT_LENGTH_PREMIUM = 30

/**
 * 单据表格列宽基准。
 *
 * <p>这里记录的是**字号 14px 时的像素基准值**, 不是最终列宽。用户在个人设置里把
 * 字号调到 16/18 后, 文字变宽而列宽不变就会被裁断(「材质 / 规格 / 长度」与
 * 「供应商简称」最容易中招), 因此实际列宽一律由 {@link sheetColumnWidths}
 * 按当前字号等比换算。</p>
 */
export const SHEET_COLUMN_WIDTH = {
  remark: 140,
  category: 72,
  spec: 200,
  /**
   * 报单吨位列: 只放吨位输入框 + 单元格留白。
   *
   * <p>4.75em 输入框在基准字号下约 66px, 加左右留白 13px 后 84px 足够; 超出这个宽度
   * 的余量以前都花在"输入框右侧那句话"上, 现已拆成独立的已开/未开两列, 因此这里不再
   * 需要内容驱动的加宽。</p>
   */
  ton: 84,
  /**
   * 已开吨位列: 服务端已保存报单占用该订单明细行的吨位。
   *
   * <p>该列只放固定 11px 的只读数字, 因此列宽**按内容给**(见
   * {@link requiredIssuedTonColumnWidth}): 数字短时不白留空白, 长到 `8,884.500` 也裁不到。
   * 这里的 92 仅作为"无数据时的下限"。对。</p>
   */
  issuedTon: 92,
  /**
   * 未开吨位列: `锁定后的报单吨位 − 已开吨位`, 并承载品牌与明细图标。
   *
   * <p>该列内容(数字 + 品牌)固定 11px、不随个人字号缩放, 因此列宽**按内容给**(见
   * {@link requiredTonColumnWidth}): 内容短时不留空白, 品牌名一长(「中天钢铁」)也不会被
   * 省略号收尾。这里的 184 仅作为"无数据时的下限"。</p>
   */
  unopenedTon: 184,
  /** 网价列: 4 位数字(14px 下约 34px) + 单元格左右留白(12px), 60 已足够。 */
  net: 74,
  /**
   * 现货价列: 4 位数字 + 输入框左右内边距(antd small 各 7px) + 单元格左右留白(12px)。
   *
   * <p>14px 字号下 4 位数字约 34px, 输入框内容宽需要 34+14=48px; 原来 58 的列宽只能给出
   * 45px(实测 input.clientWidth), 末位数字被裁成 `353(`。72 留出约 11px 余量, 16/18 档
   * 按同一比例加宽后同样富余。</p>
   */
  spot: 72,
  /** 差价列: 4 位数字 + 角标左右内边距(各 4px) + 单元格左右留白(12px), 50 会让角标越出单元格。 */
  diff: 58,
  /**
   * 供应商简称列: 立约「4 个汉字完整可见」。
   *
   * <p>简称是汉字, 宽度恒为 1em, 4 字在 14px 下需要 56px 文本宽。列宽里还有一截固定开销
   * (单元格左右留白 + antd v6 Select 根节点左右内边距 + `.ant-select-content` 右外边距 +
   * 尾部箭头): 真机实测为 14px 档 47px、16px 档 49px、18px 档 52px, 因此下界是
   * 47 + 4×14 = 103px。</p>
   *
   * <p>真机实测(PingFang SC, 基准字号): 92px 列宽下简称单元格的 `.ant-select-content`
   * 只有 45px(clientWidth), 4 字(56px)被省略成「中天钢…」。108px 给出 61px 文本宽,
   * 余量 5px; 16/18 档按同一比例换算后余量分别约 10px / 15px。</p>
   */
  supplier: 108,
} as const

/** {@link SHEET_COLUMN_WIDTH} 的基准字号(px), 也是个人设置未配置时的默认字号。 */
export const SHEET_WIDTH_BASE_FONT_SIZE = 14

/**
 * 按字号等比换算列宽。
 *
 * <p>等比而不是「只加固定留白」的理由: 列内文字宽度与字号成正比, 只有同样成正比
 * 的列宽才能让 14/16/18 三档下「文字宽 / 列宽」的比值保持不变, 从而保证基准字号
 * 下不截断的列在放大字号后依然不截断。</p>
 *
 * <p>非法字号(0/负数/NaN/Infinity)一律回落到基准字号, 避免出现 0 宽列。</p>
 */
export function scaleSheetColumnWidth(width: number, fontSize: number): number {
  return Math.round(
    (width * normalizeFontSize(fontSize)) / SHEET_WIDTH_BASE_FONT_SIZE,
  )
}

/** 非法字号(0/负数/NaN/Infinity)一律回落到基准字号, 避免出现 0 宽列。 */
function normalizeFontSize(fontSize: number): number {
  return Number.isFinite(fontSize) && fontSize > 0
    ? fontSize
    : SHEET_WIDTH_BASE_FONT_SIZE
}

/**
 * 报单吨位输入框宽度(em): 4.75em 在 14px 下约 66px, 扣掉 antd small 内边距后
 * 仍容得下「32.768」这类三位小数吨位。用 em 是为了随个人字号等比放大。
 */
export const TON_INPUT_WIDTH_EM = 4.75

/**
 * 吨位格内**不随个人字号缩放**的固定开销(px)。
 *
 * <p>等比换算只对文字宽度成立: 单元格左右留白(13)、输入框与进度/明细图标之间的两个
 * flex gap(8)、icon-only 的明细按钮(24, 由 24×24 命中区下限决定)都是固定尺寸。</p>
 */
export const TON_CELL_FIXED_CHROME = 13 + 8 + 24

/** 单元格左右留白(px): 只放数字的两列(已开吨位)用得上。 */
export const TON_CELL_PADDING = 13

/**
 * 未开吨位数字(如「10.19」「-1.81」)的宽度下界(px)。
 *
 * <p>数字是这一列的硬契约: 列宽不足时只允许省略品牌, 数字必须完整可读。真实宽度由
 * {@link tonProgressLineWidth} 按单据实际吨位算出并传入; 这个 51px 是**无数据时的兜底**
 * (沿用真机实测的「已开 0/26」宽度口径, 对「10.19」这类更短的数字同样安全)。</p>
 */
export const TON_PROGRESS_MIN_TEXT_WIDTH = 51

/** 取整与字体渲染差异的余量(px)。 */
const TON_WIDTH_SAFETY = 2

/** 吨位进度小字的字号(px): 固定值, 不随个人字号缩放。 */
export const TON_PROGRESS_FONT_SIZE = 11

/** 进度小字里主段层与品牌层之间的 flex gap(px)。 */
const TON_PROGRESS_GAP = 2

/** 品牌层内分隔符「·」两侧的 margin(px)。 */
const TON_BRAND_SEP_MARGIN = 4

/** 分隔符字面量: 与 TonIssuedBrand 里渲染的是同一个字符。 */
export const TON_BRAND_SEPARATOR = '·'

/**
 * 单字符宽度系数(em), 用于估算表格小字宽度。
 *
 * <p>口径沿用本项目已有的真机实测值(PingFang SC + `tabular-nums`): 汉字恒为 1em,
 * 数字 0.6em, 空格约 0.25em; `/` 与 `.` 取偏保守的上界, 未列举字符按 0.7em 兜底。
 * 宁可略宽也不略窄 —— 估算偏窄会重新掉回"文字被省略号截断"的缺陷。</p>
 */
const CHAR_WIDTH_EM: Record<
  'cjk' | 'digit' | 'space' | 'slash' | 'dot' | 'sep' | 'other',
  number
> = {
  cjk: 1,
  digit: 0.6,
  space: 0.25,
  slash: 0.35,
  dot: 0.3,
  sep: 0.5,
  other: 0.7,
}

/** 单个字符的宽度分类。 */
function charWidthClass(char: string) {
  if (/[\u2e80-\u9fff\uf900-\ufaff\uff00-\uff60\u3000-\u303f]/.test(char)) {
    return 'cjk'
  }
  if (char >= '0' && char <= '9') return 'digit'
  if (char === ' ') return 'space'
  if (char === '/') return 'slash'
  if (char === '.' || char === ',') return 'dot'
  if (char === TON_BRAND_SEPARATOR || char === '、') return 'sep'
  return 'other'
}

/**
 * 估算一段表格文字在给定字号下的宽度(px, 向上取整且留 5% 余量)。
 *
 * <p>用途是**按单据实际内容**给吨位列定宽: 进度小字「已开 0/12 · 中天」的宽度取决于
 * 真实出现的吨位位数与品牌名长度, 只靠字号换算推不出来。返回的是渲染宽度的保守上界,
 * 因此不会因为估算偏窄而重新截断。</p>
 */
export function estimateSheetTextWidth(text: string, fontSize: number): number {
  const size = normalizeFontSize(fontSize)
  let em = 0
  for (const char of text) {
    em += CHAR_WIDTH_EM[charWidthClass(char)]
  }
  // 5% 余量吸收字距、字体回退与子像素取整的差异
  return Math.ceil(em * size * 1.05)
}

/**
 * 进度小字整行(主段 + 分隔符 + 品牌)的宽度(px)。
 *
 * <p>组成与 DOM 一致: 主段(「剩余 12」/「已开超 6.5」/「已开 3」) + 进度行的 flex gap +
 * 品牌层的分隔符(含其左右 margin) + 品牌文本。品牌为空时只剩主段。</p>
 */
export function tonProgressLineWidth(
  primaryText: string,
  brandText: string,
): number {
  const primary = estimateSheetTextWidth(primaryText, TON_PROGRESS_FONT_SIZE)
  if (!brandText) return primary
  return (
    primary +
    TON_PROGRESS_GAP +
    TON_BRAND_SEP_MARGIN +
    estimateSheetTextWidth(TON_BRAND_SEPARATOR, TON_PROGRESS_FONT_SIZE) +
    estimateSheetTextWidth(brandText, TON_PROGRESS_FONT_SIZE)
  )
}

/**
 * 进度小字宽度上限(px, ≈ 14 个汉字品牌 + 主段)。
 *
 * <p>品牌名是采购订单里的自由文本, 万一被填成公司全称, 列宽不能跟着无限膨胀 ——
 * 超出上限后该行退回省略号收尾, 完整值仍在悬浮明细与 ⓘ 弹层里。真实品牌(2~4 字)
 * 远低于这个上限, 因此不会影响"完整显示"的目标。</p>
 */
export const TON_PROGRESS_TEXT_MAX_WIDTH = 220

/**
 * 已开吨位列宽度: 单元格留白 + 数字 + 余量(该列没有明细图标)。
 *
 * <p>数字固定 11px、不随个人字号缩放, 因此不做等比换算 —— 列宽完全跟着内容走。</p>
 */
/**
 * 「已开吨位」列宽 = 单元格留白 + max(内容宽, 表头宽, 下限) + 安全余量。
 *
 * <p>表头(「已开吨位」4 个汉字)按当前个人字号渲染、内容数字固定 11px, 因此表头往往是
 * 更宽的一方 —— 不把表头算进来, 列头就会被折成两行或被省略号收尾。</p>
 */
export function requiredIssuedTonColumnWidth(
  textWidth = 0,
  headerWidth = 0,
): number {
  return (
    TON_CELL_PADDING +
    Math.max(
      Math.min(Math.max(textWidth, headerWidth), TON_PROGRESS_TEXT_MAX_WIDTH),
      TON_PROGRESS_MIN_TEXT_WIDTH,
    ) +
    TON_WIDTH_SAFETY
  )
}

/**
 * 未开吨位列宽度: 单元格留白 + 明细图标 + 数字/品牌 + 余量。
 *
 * <p>该列没有输入框: 固定开销只有单元格左右留白(13)、数字与明细图标之间的 gap(8) 与
 * icon-only 明细按钮(24), 即 {@link TON_CELL_FIXED_CHROME}; 文字部分由
 * {@link tonProgressLineWidth} 按真实吨位与品牌估出(不传或比数字下界还窄时取
 * {@link TON_PROGRESS_MIN_TEXT_WIDTH}, 超过上限按 {@link TON_PROGRESS_TEXT_MAX_WIDTH} 取值)。</p>
 *
 * <p>只按字号等比换算会在两个方向上出错: 小字号(11/12/13px)时列宽被等比压小, 而明细图标、
 * 单元格留白与固定 11px 的数字都不一起变小; 品牌名较长时即便基准字号也放不下。因此取
 * 等比换算与该下界的较大值。</p>
 */
export function requiredTonColumnWidth(
  progressTextWidth = 0,
  headerWidth = 0,
): number {
  return (
    TON_CELL_FIXED_CHROME +
    Math.max(
      Math.min(
        Math.max(progressTextWidth, headerWidth),
        TON_PROGRESS_TEXT_MAX_WIDTH,
      ),
      TON_PROGRESS_MIN_TEXT_WIDTH,
    ) +
    TON_WIDTH_SAFETY
  )
}

/**
 * 按当前字号换算整张单据表格的列宽(键与 {@link SHEET_COLUMN_WIDTH} 一致)。
 *
 * <p>`tonTextWidths`: 本单据实际会出现的已开/未开两列内容宽度(px), 由
 * {@link maxRemainingTonTextWidth} 与 {@link maxTonProgressTextWidth} 按真实吨位与品牌算出;
 * 省略时两列按数字下界定宽。</p>
 */
export function sheetColumnWidths(
  fontSize: number,
  tonTextWidths: {
    issued?: number
    unopened?: number
    /** 两列表头在当前字号下的宽度: 表头比 11px 的内容更容易成为列宽下限。 */
    issuedHeader?: number
    unopenedHeader?: number
  } = {},
): Record<keyof typeof SHEET_COLUMN_WIDTH, number> {
  const {
    issued = 0,
    unopened = 0,
    issuedHeader = 0,
    unopenedHeader = 0,
  } = tonTextWidths
  const entries = Object.entries(SHEET_COLUMN_WIDTH) as [
    keyof typeof SHEET_COLUMN_WIDTH,
    number,
  ][]
  return Object.fromEntries(
    entries.map(([key, width]) => {
      /*
       * 已开/未开两列的内容是固定 11px 的只读文字(不随个人字号缩放), 因此列宽**按内容**给:
       * 内容短时不留空白, 长吨位/长品牌也裁不到。其余列仍按字号等比换算。
       */
      if (key === 'issuedTon')
        return [key, requiredIssuedTonColumnWidth(issued, issuedHeader)]
      if (key === 'unopenedTon') {
        return [key, requiredTonColumnWidth(unopened, unopenedHeader)]
      }
      return [key, scaleSheetColumnWidth(width, fontSize)]
    }),
  ) as Record<keyof typeof SHEET_COLUMN_WIDTH, number>
}

/** 网价: 参照日期+时段, 命中则返回并叠加 12 米加价。 */
export function netPrice(
  data: PriceData | null,
  refDate: string,
  refPeriod: string,
  brandName: string,
  row: PriceRow,
  lengthPremium: number,
): number | undefined {
  if (!data || row.spec === null || !row.material) return undefined
  const key = dataKeyOf(row)
  if (!key) return undefined
  const base =
    data[refDate]?.[refPeriod]?.[brandName]?.[key]?.[String(row.spec)]
  if (base === undefined) return undefined
  const premium =
    LENGTH_PREMIUM_CATEGORIES.has(canonicalCategory(row.category)) &&
    row.length === '12米'
      ? lengthPremium
      : 0
  return base + premium
}

/** HRB400 兜底材质 */
export const HRB400_FALLBACK_MATERIAL = 'HRB400E'

/**
 * 取网价: 若 HRB400 无价且开启兜底, 使用 HRB400E 价格并标记 fallback。
 */
export function netPriceWithFallback(
  data: PriceData | null,
  refDate: string,
  refPeriod: string,
  brandName: string,
  row: PriceRow,
  lengthPremium: number,
  allowFallback: boolean,
): { value: number | undefined; fallback: boolean } {
  const direct = netPrice(
    data,
    refDate,
    refPeriod,
    brandName,
    row,
    lengthPremium,
  )
  if (direct !== undefined) return { value: direct, fallback: false }
  if (allowFallback && row.material === 'HRB400') {
    const alt = netPrice(
      data,
      refDate,
      refPeriod,
      brandName,
      { ...row, material: HRB400_FALLBACK_MATERIAL },
      lengthPremium,
    )
    if (alt !== undefined) return { value: alt, fallback: true }
  }
  return { value: undefined, fallback: false }
}

/** 解析单据有效参照(为空时回退到数据源最新日期/首个时段)。 */
export function resolveRef(
  data: PriceData | null,
  sheet: Pick<PriceSheet, 'refDate' | 'refPeriod'>,
): { refDate: string; refPeriod: string } {
  let refDate = sheet.refDate
  if (!refDate) {
    for (const date of Object.keys(data ?? {})) {
      if (!refDate || date > refDate) refDate = date
    }
    refDate = refDate ?? ''
  }
  const periods = Object.keys(data?.[refDate] ?? {})
  const wanted = normalizePeriod(sheet.refPeriod)
  const refPeriod =
    wanted && periods.includes(wanted) ? wanted : (periods[0] ?? wanted ?? '')
  return { refDate, refPeriod }
}

export type SheetSummary = {
  filled: number
}

export function computeSummary(
  data: PriceData | null,
  sheet: PriceSheet,
  rows: PriceRow[],
  brands: Brand[],
  lengthPremium: number,
): SheetSummary {
  let filled = 0
  for (const row of rows) {
    for (const brand of brands) {
      const auto = netPrice(
        data,
        sheet.refDate,
        sheet.refPeriod,
        brand.name,
        row,
        lengthPremium,
      )
      const spot = sheet.inputs[`${brand.name}:${row.id}`]?.spot
      if (auto === undefined || spot === undefined) continue
      filled += 1
    }
  }
  return { filled }
}

/** 统计"有网价但未填现货"的数量, 用于标签页角标。 */
export function countMissing(
  data: PriceData | null,
  sheet: PriceSheet,
  rows: PriceRow[],
  brands: Brand[],
): number {
  let missing = 0
  for (const row of rows) {
    for (const brand of brands) {
      const auto = netPrice(
        data,
        sheet.refDate,
        sheet.refPeriod,
        brand.name,
        row,
        0,
      )
      if (auto === undefined) continue
      const spot = sheet.inputs[`${brand.name}:${row.id}`]?.spot
      if (spot === undefined) missing += 1
    }
  }
  return missing
}

/** 将 from 位置的元素移动到 to 位置(用于品牌列拖拽排序)。 */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= list.length ||
    to >= list.length
  )
    return list
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

export type MaterialMatchLike = {
  brand?: string | null
  category?: string | null
  material?: string | null
  spec?: string | null
  status?: string | null
  quoteDate?: string | null
  period?: string | null
  basePrice?: string | number | null
}

/** 商品行情匹配结果 -> data[日期][时段][品牌][类别|材质][规格] = 网价(不含长度加价)。 */
export function matchesToData(rows: MaterialMatchLike[]): PriceData {
  const patch: PriceData = {}
  for (const row of rows) {
    if (row.status && row.status !== '匹配') continue
    if (
      !row.brand ||
      !row.category ||
      !row.material ||
      !row.spec ||
      !row.quoteDate ||
      !row.period ||
      row.basePrice === null ||
      row.basePrice === undefined
    )
      continue
    const category = canonicalCategory(row.category)
    const spec = String(Number(String(row.spec).replace(/[^0-9.]/g, '')))
    const price = Number(row.basePrice)
    if (!spec || Number.isNaN(price)) continue
    const key = `${category}|${row.material}`
    patch[row.quoteDate] ??= {}
    patch[row.quoteDate][row.period] ??= {}
    patch[row.quoteDate][row.period][row.brand] ??= {}
    patch[row.quoteDate][row.period][row.brand][key] ??= {}
    patch[row.quoteDate][row.period][row.brand][key][spec] = price
  }
  return patch
}

/** 深合并两份行情数据。 */
export function mergePriceData(base: PriceData, patch: PriceData): PriceData {
  const next: PriceData = { ...base }
  for (const [date, periods] of Object.entries(patch)) {
    next[date] = { ...(next[date] ?? {}) }
    for (const [period, brands] of Object.entries(periods)) {
      next[date][period] = { ...(next[date][period] ?? {}) }
      for (const [brand, keys] of Object.entries(brands)) {
        next[date][period][brand] = { ...(next[date][period][brand] ?? {}) }
        for (const [key, specs] of Object.entries(keys)) {
          next[date][period][brand][key] = {
            ...(next[date][period][brand][key] ?? {}),
            ...specs,
          }
        }
      }
    }
  }
  return next
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 8)
}

export function makeRow(): PriceRow {
  return {
    id: makeId(),
    rowType: 'PRODUCT',
    category: '',
    material: '',
    spec: null,
    length: '',
  }
}

/** 隔断行: 仅作视觉分组, 不携带商品信息。 */
export function makeSeparatorRow(): PriceRow {
  return {
    id: makeId(),
    rowType: 'SEPARATOR',
    category: '',
    material: '',
    spec: null,
    length: '',
  }
}

/** 是否隔断行(缺省 rowType 视为商品行)。 */
export function isSeparatorRow(row: Pick<PriceRow, 'rowType'>): boolean {
  return row.rowType === 'SEPARATOR'
}

/**
 * 商品行是否已采购: 由是否关联采购订单推导(隔断行恒为 false)。
 * 不再有独立布尔标记, 避免"反标记后刷新又变回已采购"的状态不一致。
 */
export function isPurchasedRow(row: PriceRow): boolean {
  return !isSeparatorRow(row) && Boolean(row.purchaseOrderId)
}

/**
 * 汇总各采购订单明细行在当前单据内的报单吨位(隔断行/未关联明细行不计)。
 * 用于在前端取"本单据该明细行报单吨位合计", 与已开吨位相减得到剩余吨位(按规格)。
 */
export function sumTonByPurchaseOrderItem(
  rows: PriceRow[],
): Map<string, number> {
  const totals = new Map<string, number>()
  for (const row of rows) {
    if (isSeparatorRow(row) || !row.purchaseOrderItemId) continue
    const ton = row.ton ?? 0
    if (!Number.isFinite(ton) || ton <= 0) continue
    totals.set(
      row.purchaseOrderItemId,
      (totals.get(row.purchaseOrderItemId) ?? 0) + ton,
    )
  }
  return totals
}

export const DEFAULT_STATUS = '报价'

/** 新建单据默认空行数(由用户自行选择商品)。 */
const DEFAULT_ROW_COUNT = 1

export function defaultSheetRows(): PriceRow[] {
  return Array.from({ length: DEFAULT_ROW_COUNT }, () => makeRow())
}

export function makeSheet(
  name: string,
  projectId: string,
  projectName: string,
  orderDate: string,
  refDate: string,
  refPeriod: string,
): PriceSheet {
  return {
    id: makeId(),
    name,
    status: DEFAULT_STATUS,
    projectId,
    projectName,
    orderDate,
    refDate,
    refPeriod,
    lengthPremium: DEFAULT_LENGTH_PREMIUM,
    inputs: {},
    rows: defaultSheetRows(),
  }
}

/** 商品唯一键: 类别|材质|规格|长度。 */
export function varietyKeyOf(item: Variety): string {
  return `${item.category}|${item.material}|${item.spec}|${item.length}`
}

/** 精简展示: 选项只显示 材质/规格/长度(类别单列展示)。 */
export function varietyDisplay(item: Variety): string {
  return [item.material, item.spec, item.length === '-' ? '' : item.length]
    .filter(Boolean)
    .join(' ')
}

/** 按类别把商品组织为分组下拉选项。 */
export function buildVarietyOptions(varieties: Variety[]) {
  return CATEGORIES.reduce<
    { label: string; options: { value: string; label: string }[] }[]
  >((groups, category) => {
    const options: { value: string; label: string }[] = []
    for (const item of varieties) {
      if (item.category === category)
        options.push({ value: varietyKeyOf(item), label: varietyDisplay(item) })
    }
    if (options.length) groups.push({ label: category, options })
    return groups
  }, [])
}

/**
 * 过滤可选商品: 保留启用类别内的商品; 项目配置了可选商品白名单时仅保留白名单项。
 */
export function filterVarieties(
  varieties: Variety[],
  brands: Brand[],
  allowedProducts: readonly string[] | undefined,
): Variety[] {
  const enabledCategories = new Set<string>()
  if (!brands.length) {
    for (const category of CATEGORIES) enabledCategories.add(category)
  } else {
    for (const brand of brands) {
      const list = brand.categories?.length ? brand.categories : CATEGORIES
      for (const category of list) enabledCategories.add(category)
    }
  }
  const allowedProductSet = new Set(allowedProducts)
  return varieties.filter(
    (item) =>
      enabledCategories.has(item.category) &&
      (allowedProductSet.size === 0 ||
        allowedProductSet.has(varietyKeyOf(item))),
  )
}

/** 可互切的双长度(9米/12米)。 */
export const ALT_LENGTHS: readonly [string, string] = ['9米', '12米']

/**
 * 在给定商品清单中查找指定行的另一长度对应商品。
 * <p>仅当同类别/材质/规格下同时存在 9米 与 12米 时返回对方长度对应的商品,
 * 否则返回 undefined(如盘螺长度为 '-', 不参与切换)。</p>
 */
export function findAlternateLengthVariety(
  varieties: Variety[],
  row: Pick<PriceRow, 'category' | 'material' | 'spec' | 'length'>,
): Variety | undefined {
  if (row.spec === null || !ALT_LENGTHS.includes(row.length)) return undefined
  const targetLength =
    row.length === ALT_LENGTHS[0] ? ALT_LENGTHS[1] : ALT_LENGTHS[0]
  return varieties.find(
    (item) =>
      item.category === row.category &&
      item.material === row.material &&
      item.spec === row.spec &&
      item.length === targetLength,
  )
}

/**
 * 切换行级锁定: 解锁时按流程规范强制清除该行采购订单关联与快照。
 * <p>锁定表示规格与吨位定稿; 未锁定不可关联采购订单, 已关联的解锁即解除关联。</p>
 */
export function applyRowLock(row: PriceRow, locked: boolean): PriceRow {
  if (locked) {
    return { ...row, locked: true }
  }
  return {
    ...row,
    locked: false,
    purchaseOrderId: undefined,
    purchaseOrderNo: undefined,
    purchaseOrderItemId: undefined,
  }
}

/* --------------------------------------------------------------- 锁定层级 */

/**
 * 锁定层级: 单据(全局) > 行 > 单元格。
 *
 * <p>三层锁定作用域不同、优先级严格递减, 高优先级只读覆盖低优先级:</p>
 * <ol>
 *   <li>`sheet`: `specQuantityLocked`(工具栏「锁定规格和数量」), 冻结整张单据的
 *       商品规格、报单吨位, 以及会间接改变规格/数量顺序的行增删与拖拽重排;</li>
 *   <li>`row`: `row.locked`(行操作菜单「锁定该行」), 表示该行规格与吨位定稿,
 *       只冻结该行的规格与吨位; 未锁定不可关联采购订单, 解锁会清除关联;</li>
 *   <li>`cell`: 单元格自身的锁(`LockableField`, 如项目备注信息), 只冻结该字段。</li>
 * </ol>
 *
 * <p>改为只读的控件必须能说明原因(层级 → i18n key), 不允许静默禁用。</p>
 */
export type LockLevel = 'sheet' | 'row' | 'cell'

export interface LockResolution {
  locked: boolean
  /** 决定该字段只读的层级(优先级最高者); 未锁定时为 undefined。 */
  level?: LockLevel
}

/** 各层级锁定的原因文案 key(禁用提示统一从这里取, 保证口径一致)。 */
export const LOCK_REASON_KEYS: Record<LockLevel, string> = {
  sheet: 'priceCompare.sheet.specQuantityLockedHint',
  row: 'priceCompare.sheet.rowLockedHint',
  cell: 'priceCompare.sheet.cellLockedHint',
}

/**
 * 解析字段的有效锁定状态: 按 单据 > 行 > 单元格 的优先级取最高层级。
 * <p>三层同时命中时只返回最高层级的 `level`, 提示文案据此保持单一口径。</p>
 */
export function resolveLock(levels: {
  sheet?: boolean
  row?: boolean
  cell?: boolean
}): LockResolution {
  if (levels.sheet) return { locked: true, level: 'sheet' }
  if (levels.row) return { locked: true, level: 'row' }
  if (levels.cell) return { locked: true, level: 'cell' }
  return { locked: false }
}
