import { substituteMaterialOf } from '@/utils/material-grade'
import type {
  Brand,
  PriceData,
  PriceRow,
  PriceSheet,
  SheetInput,
  SheetInputs,
  Variety,
} from './types'

/** 归一化时段为 上午/中午/下午。 */
export function normalizePeriod(value: string): string {
  const matched = /(上午|中午|下午)\s*$/.exec((value ?? '').trim())
  return matched ? matched[1] : (value ?? '')
}

/** 商品类别规范化: 默认相等, 仅 螺纹钢 与 直条 视为同一类别。 */
export function canonicalCategory(value: string): string {
  return value === '直条' ? '螺纹钢' : value
}

/**
 * 「数据里出现过的类别」—— 类别清单的**唯一派生出口**，替代原来写死的 CATEGORIES。
 *
 * <p>为什么不再维护常量：类别在业务上由商品数据决定（后端行情/品种参考数据 + 值别名
 * {@link canonicalCategory}）。写死一份等于同一份事实存两处 —— 数据里新增「H型钢」时
 * 下拉与分组不会自动出现，而人工补常量的时机永远是滞后的。这里按数据首次出现顺序去重，
 * 既自动包含新类别，又保持展示顺序稳定（不受集合迭代顺序影响）。</p>
 */
export function categoriesOf(varieties: readonly Variety[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of varieties) {
    if (!item.category) continue
    const category = canonicalCategory(item.category)
    if (seen.has(category)) continue
    seen.add(category)
    result.push(category)
  }
  return result
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

/**
 * 现货联动的商品键: 类别+材质+规格+长度 相同即视为同一商品。
 *
 * <p>入参只要求这四属性（不是完整 {@link PriceRow}）：价格表报价、选单快照等"非行对象"也要
 * 用同一口径生成键，若为了类型匹配在外面另写一遍模板串，两处口径必然分叉。</p>
 */
export const productKeyOf = (
  row: Pick<PriceRow, 'category' | 'material' | 'spec' | 'length'>,
) =>
  row.category && row.material
    ? `${canonicalCategory(row.category)}|${row.material}|${row.spec}|${row.length}`
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
    const current = next[inputKey]
    // 数值真的被改写了吗（仅失焦、没改数不算）
    const spotChanged = current?.spot !== value
    next[inputKey] = {
      ...(current ?? {}),
      spot: value,
      /*
       * 手工改价后「按抗震牌号代取」的来源不再成立：这一格的价格已由人判定。
       * 显式写 `null`（而不是删字段）表示"曾经代取、已被手工覆盖"——与后端
       * `spotSourceMaterial` 的 null 语义一致（= 查过、确认没有代取），
       * 这样保存载荷能把它带给服务端清掉，刷新后角标不会继续撒谎。
       */
      ...(spotChanged && current?.spotSourceMaterial
        ? { spotSourceMaterial: null }
        : {}),
    }
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

/**
 * 旧口径「12 米加价只对螺纹钢生效」的品种门禁。
 *
 * <p><b>仅供迁移兜底使用</b>：定尺主数据（`md_length_premium`）为空时，
 * {@link lengthPremiumOf} 会回退到这套旧规则。主数据落地后应删除本常量与该分支 ——
 * 加价属于业务数据，不该由代码里的类别/名称清单决定。</p>
 */
const LENGTH_PREMIUM_CATEGORIES = new Set(['螺纹钢'])
/** 现货价合理上限(元/吨), 超出提示 */
export const SPOT_PRICE_MAX = 20000
/**
 * 默认定尺加价(元/吨)。
 *
 * <p>历史口径是「默认 12 米加价」；现在只作为**迁移兜底**的缺省值（定尺主数据为空时使用），
 * 不是任何定尺的实际加价来源。</p>
 */
export const DEFAULT_LENGTH_PREMIUM = 30

/**
 * 单据表格列宽基准。
 *
 * <p>这里记录的是**字号 14px 时的像素基准值**, 不是最终列宽。用户在个人设置里把
 * 字号调到 16/18 后, 文字变宽而列宽不变就会被裁断(「材质 / 规格 / 长度」与
 * 「供应商简称」最容易中招), 因此实际列宽一律由 {@link sheetColumnWidths}
 * 按当前字号等比换算。</p>
 */
/**
 * 比价表格里「可显隐列」的稳定 key。
 *
 * <p>列设置弹层、品牌列头的「隐藏该列」、以及用户偏好持久化必须共用同一份 key ——
 * 任一处另起一套字符串, 就会出现「勾选状态与列的实际显隐对不上」, 且刷新后必然分叉。</p>
 */
export const SHEET_HIDEABLE_COLUMN = {
  remark: 'remark',
  /** 品牌列是动态列(随项目配置变化), key 带品牌名后缀。 */
  brand: (name: string) => `brand:${name}`,
} as const

/**
 * 列显示偏好的页面 key。
 *
 * <p>与模块表格的列设置走同一套机制(本地立即写入 + 云端漫游同步), 因此同一用户在多台
 * 设备上看到的列显隐一致; 换用户或未登录时只落本地。</p>
 */
export const PRICE_COMPARE_COLUMN_SETTINGS_KEY = 'price-compare-sheet'

export const SHEET_COLUMN_WIDTH = {
  remark: 140,
  category: 72,
  spec: 200,
  /**
   * 报单吨位列: 只放吨位输入框 + 单元格留白。
   *
   * <p>4.75em 输入框在基准字号下约 66px, 加左右留白 13px 后 84px 足够; 该列只承载吨位
   * 输入本身, 不再有「已开 / 未开」等派生列, 因此无需按内容加宽。</p>
   */
  ton: 84,
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
 * 按当前字号换算整张单据表格的列宽(键与 {@link SHEET_COLUMN_WIDTH} 一致)。
 *
 * <p>所有列一律按字号等比换算 —— 吨位列只剩一个输入框, 不再有按内容定宽的派生列。</p>
 */
export function sheetColumnWidths(
  fontSize: number,
): Record<keyof typeof SHEET_COLUMN_WIDTH, number> {
  const entries = Object.entries(SHEET_COLUMN_WIDTH) as [
    keyof typeof SHEET_COLUMN_WIDTH,
    number,
  ][]
  return Object.fromEntries(
    entries.map(([key, width]) => [
      key,
      scaleSheetColumnWidth(width, fontSize),
    ]),
  ) as Record<keyof typeof SHEET_COLUMN_WIDTH, number>
}

/**
 * 「定尺名称 → 每吨加价」的空表。
 *
 * <p>用它表示**定尺主数据为空**（未加载/尚未维护），此时 {@link lengthPremiumOf} 走迁移兜底；
 * 用稳定的冻结空对象而不是每次 `{}`，避免调用方每次渲染产生新引用。
 */
export const EMPTY_LENGTH_PREMIUMS: Readonly<Record<string, number>> =
  Object.freeze({})

/**
 * 一格网价的定尺加价：**唯一计算出口**。
 *
 * <p><b>主数据驱动</b>：`lengthPremiums` 是「定尺名称 → 每吨加价」，`row.length` 命中即加、
 * 未命中为 0。不再有「仅螺纹钢 12 米」这类写死的类别/名称门禁 —— 加价是业务数据
 * （`md_length_premium`），不是代码常量；新增 10 米定尺不需要改前端。</p>
 *
 * <p><b>迁移兜底</b>：主数据为空时回退旧行为 —— 只有螺纹钢的「12米」按单据/项目级
 * `legacyPremium` 加价。这是**迁移兜底、不是业务来源**：定尺主数据一旦有值，这个分支就
 * 不会生效；待主数据在全部环境落地后应当删除本分支与 {@link LENGTH_PREMIUM_CATEGORIES}。</p>
 */
function lengthPremiumOf(
  row: Pick<PriceRow, 'category' | 'length'>,
  lengthPremiums: Readonly<Record<string, number>>,
  legacyPremium: number,
): number {
  if (Object.keys(lengthPremiums).length > 0) {
    return lengthPremiums[row.length] ?? 0
  }
  // 迁移兜底（见上）：定尺主数据为空时保持旧口径。
  return LENGTH_PREMIUM_CATEGORIES.has(canonicalCategory(row.category)) &&
    row.length === '12米'
    ? legacyPremium
    : 0
}

/**
 * 网价: 参照日期+时段, 命中则返回并叠加定尺加价。
 *
 * @param lengthPremiums 定尺名称 → 每吨加价（来自定尺主数据）；空表时走迁移兜底。
 * @param legacyPremium 迁移兜底用的旧「项目级 12 米加价」，仅在主数据为空时可能生效。
 */
export function netPrice(
  data: PriceData | null,
  refDate: string,
  refPeriod: string,
  brandName: string,
  row: PriceRow,
  lengthPremiums: Readonly<Record<string, number>>,
  legacyPremium: number = DEFAULT_LENGTH_PREMIUM,
): number | undefined {
  if (!data || row.spec === null || !row.material) return undefined
  const key = dataKeyOf(row)
  if (!key) return undefined
  const base =
    data[refDate]?.[refPeriod]?.[brandName]?.[key]?.[String(row.spec)]
  if (base === undefined) return undefined
  return base + lengthPremiumOf(row, lengthPremiums, legacyPremium)
}

/**
 * 允许「按替代牌号代取」的材质白名单。
 *
 * <p><b>初值刻意只有一个 `HRB400`</b>：这与引入白名单之前的硬编码行为**完全一致**
 * （旧代码是 `row.material === 'HRB400'`），所以这次只是把散落的字面量收敛成唯一判据，
 * **不是新功能、也不扩范围**。</p>
 *
 * <p><b>扩容（HRB500 / HRBF400 / HRB335 …）必须经产品确认，不要顺手加。</b>
 * 每加一个材质，「报单比价」与「从价格表带价」都会多出一批原本空白的格子被代取价填上，
 * 而这里的价格是业务员的判断结果 —— 属于业务口径变更，不是重构。</p>
 */
export const SUBSTITUTABLE_MATERIALS: readonly string[] = ['HRB400']

/**
 * 该材质是否允许代取。
 *
 * <p>**唯一判据出口**：上层（`netPriceWithFallback` / `applyLowestQuotes`）都要调它，
 * 不要各自再写 `material === 'HRB400'` —— 那会重新变成两份事实。</p>
 */
export function isSubstitutableMaterial(material: unknown): boolean {
  return (
    typeof material === 'string' && SUBSTITUTABLE_MATERIALS.includes(material)
  )
}

/**
 * 现货价「按替代牌号代取」角标的**唯一判据出口**。
 *
 * <p>两条来源必须都走这里，否则会出现"系统带出的有角标、手工勾选行没有"这种半截实现：</p>
 * <ol>
 *   <li><b>系统带出</b>：{@code applyLowestQuotes} 写入的 {@code input.spotSourceMaterial}
 *       （已落库，重新打开单据后仍能显示）；</li>
 *   <li><b>手工勾选行</b>：行级开关 {@code row.hrb400eFallback}，且仍需单据头授权。</li>
 * </ol>
 *
 * @returns 代取所用的材质（渲染 `E` 角标与 tooltip 都用它）；未代取返回 undefined
 */
/**
 * 网价列角标要显示的替代材质（`netPriceWithFallback` 命中兜底时用）。
 *
 * <p>与代取同一来源：`substituteMaterialOf`。**不要在 JSX 里写死 `'HRB400E'`** ——
 * 那会成为同一口径的第二份事实，将来白名单扩容时会漏改。</p>
 */
export function fallbackBadgeMaterial(material: unknown): string | undefined {
  return substituteMaterialOf(material) ?? undefined
}

export function resolveSpotSourceMaterial(args: {
  input?: SheetInput
  row: Pick<PriceRow, 'material' | 'hrb400eFallback'>
  allowHrb400eFallback: boolean
}): string | undefined {
  const { input, row, allowHrb400eFallback } = args
  // 系统带出优先：来源已落库，与本次会话的开关状态无关
  if (input?.spotSourceMaterial) return input.spotSourceMaterial
  // 手工勾选行：格子必须有价、单据头放行、行开关打开、且材质在白名单内
  if (input?.spot === undefined) return undefined
  if (!allowHrb400eFallback) return undefined
  if (row.hrb400eFallback !== true) return undefined
  if (!isSubstitutableMaterial(row.material)) return undefined
  return substituteMaterialOf(row.material) ?? undefined
}

/**
 * 取网价: 精确材质无价且开启兜底时, 用 `substituteMaterialOf` 给出的替代牌号再查一次,
 * 命中则标记 `fallback`。仅有白名单内的材质会代取。
 *
 * @param lengthPremiums 定尺名称 → 每吨加价（来自定尺主数据）；空表时走迁移兜底。
 * @param allowFallback 是否允许按替代牌号代取。
 * @param legacyPremium 迁移兜底用的旧「项目级 12 米加价」，仅在主数据为空时可能生效。
 */
export function netPriceWithFallback(
  data: PriceData | null,
  refDate: string,
  refPeriod: string,
  brandName: string,
  row: PriceRow,
  lengthPremiums: Readonly<Record<string, number>>,
  allowFallback: boolean,
  legacyPremium: number = DEFAULT_LENGTH_PREMIUM,
): { value: number | undefined; fallback: boolean } {
  const direct = netPrice(
    data,
    refDate,
    refPeriod,
    brandName,
    row,
    lengthPremiums,
    legacyPremium,
  )
  if (direct !== undefined) return { value: direct, fallback: false }
  if (allowFallback && isSubstitutableMaterial(row.material)) {
    // 「哪些材质允许代取」由 SUBSTITUTABLE_MATERIALS 白名单决定；
    // 「代取成什么材质」由 substituteMaterialOf 算（唯一实现，不在此另写加 E 规则）。
    const fallbackMaterial = substituteMaterialOf(row.material)
    if (fallbackMaterial) {
      const alt = netPrice(
        data,
        refDate,
        refPeriod,
        brandName,
        { ...row, material: fallbackMaterial },
        lengthPremiums,
        legacyPremium,
      )
      if (alt !== undefined) return { value: alt, fallback: true }
    }
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

/**
 * 统计已填格数（网价与现货都有的格子）。
 *
 * @param lengthPremiums 定尺名称 → 每吨加价（来自定尺主数据）；空表时走迁移兜底，
 * 兜底的旧「项目级 12 米加价」取自 `sheet.lengthPremium`（唯一来源，不另加参数）。
 */
export function computeSummary(
  data: PriceData | null,
  sheet: PriceSheet,
  rows: PriceRow[],
  brands: Brand[],
  lengthPremiums: Readonly<Record<string, number>>,
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
        lengthPremiums,
        sheet.lengthPremium,
      )
      const spot = sheet.inputs[`${brand.name}:${row.id}`]?.spot
      if (auto === undefined || spot === undefined) continue
      filled += 1
    }
  }
  return { filled }
}

/**
 * 统计"有网价但未填现货"的数量, 用于标签页角标。
 *
 * <p>只关心「有没有网价」，加价不影响 `undefined` 判定，因此这里固定传空表 + 0：
 * 不引入定尺主数据参数，避免调用方以为角标受加价配置影响。</p>
 */
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
        EMPTY_LENGTH_PREMIUMS,
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

/** 按类别把商品组织为分组下拉选项(类别来自数据, 新类别自动成组)。 */
export function buildVarietyOptions(varieties: Variety[]) {
  return categoriesOf(varieties).reduce<
    { label: string; options: { value: string; label: string }[] }[]
  >((groups, category) => {
    const options: { value: string; label: string }[] = []
    for (const item of varieties) {
      if (canonicalCategory(item.category) === category)
        options.push({ value: varietyKeyOf(item), label: varietyDisplay(item) })
    }
    if (options.length) groups.push({ label: category, options })
    return groups
  }, [])
}

/**
 * 过滤可选商品: 保留启用类别内的商品; 项目配置了可选商品白名单时仅保留白名单项。
 *
 * <p>「未配置过品种的品牌」默认值 = **数据里出现过的类别全选**（{@link categoriesOf}），
 * 不再套写死的四类 —— 否则数据新增类别时这些品牌会默认把它排除掉。</p>
 */
export function filterVarieties(
  varieties: Variety[],
  brands: Brand[],
  allowedProducts: readonly string[] | undefined,
): Variety[] {
  const categories = categoriesOf(varieties)
  const enabledCategories = new Set<string>()
  if (!brands.length) {
    for (const category of categories) enabledCategories.add(category)
  } else {
    for (const brand of brands) {
      const list = brand.categories?.length ? brand.categories : categories
      for (const category of list) enabledCategories.add(category)
    }
  }
  const allowedProductSet = new Set(allowedProducts)
  return varieties.filter(
    (item) =>
      enabledCategories.has(canonicalCategory(item.category)) &&
      (allowedProductSet.size === 0 ||
        allowedProductSet.has(varietyKeyOf(item))),
  )
}

/**
 * 定尺排序：**定尺主数据 sortOrder 优先**，其次按名称里的米数升序，`''` / `'-'` 永远最后。
 *
 * <p>为什么不能用字符串排序：`"12米" < "9米"` 会颠倒；`'-'` 混在中间也会让「无定尺」
 * 排到定尺列之间。为什么优先用主数据：定尺是业务主数据（可增删、可调排序号），
 * 排序号就是业务给的展示/匹配顺序（9米=1、12米=2…），代码里不应再维护第二份顺序。</p>
 *
 * <p>参数 `sortOrderOf` 缺失（主数据未加载/为空）时退化为按名称里的数字排序 —— 这是
 * **兜底**而非业务来源，保证主数据异常时表格仍然稳定可读。</p>
 */
const LENGTH_RANK_FALLBACK_BASE = 10
const LENGTH_RANK_NON_NUMERIC = 50
const LENGTH_RANK_EMPTY = 1000
const LENGTH_RANK_DASH = 1001

export function lengthRank(
  length: string,
  sortOrderOf?: Readonly<Record<string, number>>,
): number {
  // '' / '-' 表示「没有定尺」（卷材），不是某一种定尺：无论主数据怎么写都排最后。
  if (length === '') return LENGTH_RANK_EMPTY
  if (length === '-') return LENGTH_RANK_DASH
  const masterSortOrder = sortOrderOf?.[length]
  if (masterSortOrder !== undefined) return masterSortOrder
  const numeric = Number(length.replace(/[^\d.]/g, ''))
  return Number.isFinite(numeric) && numeric > 0
    ? LENGTH_RANK_FALLBACK_BASE + numeric
    : LENGTH_RANK_NON_NUMERIC
}

/**
 * 在给定商品清单中查找指定行的「另一个定尺」对应商品（长度互切）。
 *
 * <p>**不再写死 9米/12米**：候选来自商品清单里**实际存在**的其它长度 ——
 * 同类别/材质/规格下、长度不同于当前行的项；多个候选时按 {@link lengthRank} 确定性排序
 * 取第一个（定尺主数据 sortOrder 优先 → 名称里的米数 → `''`/`'-'` 最后），
 * 与报价单定尺列顺序一致，不依赖数组里的偶然顺序。</p>
 *
 * <p>找不到其它长度（如盘螺只有 `'-'`、Φ25 只有 9米）或规格为空时返回 undefined。</p>
 */
export function findAlternateLengthVariety(
  varieties: Variety[],
  row: Pick<PriceRow, 'category' | 'material' | 'spec' | 'length'>,
  sortOrderOf?: Readonly<Record<string, number>>,
): Variety | undefined {
  if (row.spec === null) return undefined
  const candidates = varieties.filter(
    (item) =>
      item.category === row.category &&
      item.material === row.material &&
      item.spec === row.spec &&
      item.length !== row.length,
  )
  if (candidates.length === 0) return undefined
  return candidates.reduce((best, item) => {
    const bestRank = lengthRank(best.length, sortOrderOf)
    const itemRank = lengthRank(item.length, sortOrderOf)
    if (itemRank !== bestRank) return itemRank < bestRank ? item : best
    // 同档位时按名称定序，避免结果随数组顺序漂移。
    return item.length.localeCompare(best.length, 'zh-Hans-CN') < 0
      ? item
      : best
  })
}

/**
 * 切换行级锁定。
 *
 * <p>行锁是**纯编辑保护**: 只冻结该行的规格与吨位, 防止误改。它不再与任何采购/销售
 * 单据关联联动 —— 解锁只把 `locked` 置回 `false`, 不清除任何其它字段。</p>
 */
export function applyRowLock(row: PriceRow, locked: boolean): PriceRow {
  return { ...row, locked }
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
 *       只冻结该行的规格与吨位(纯编辑保护, 不与任何业务单据联动);</li>
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

/**
 * 差价并列判定的容差(元)。
 *
 * <p>差价是"网价 - 现货价 - 运费"的相减结果, 参与方都是两位小数, 因此真正的并列误差远小于
 * 分; 取半分钱, 既能吸收浮点末位误差, 又不会把 0.001 元的真实价差误判成并列。</p>
 */
export const PRICE_TIE_EPSILON = 0.005

/**
 * 差价最优: 在给定候选里选出"差价最高"的**全部**品牌。
 *
 * <p>为什么不返回单个品牌: 「差价最优」是并列概念, 多家的差价完全相同时都是最优报价。
 * 原实现用 `diff > bestVal` 逐个比较并只记一个品牌, 相同差价下只有遍历到的第一个品牌被
 * 记住, 其余并列的都被丢掉 —— 用户看到的是"明明一样便宜, 却只有一家标蓝"。</p>
 *
 * <p>浮点差价先按 {@link PRICE_TIE_EPSILON} 归一档位再比较: 差价由
 * `网价 - 现货价 - 运费` 相减得出, 数学上相等的两组值可能差在末位误差上(如 20 与
 * 20.000000000000004), 直接比大小会破坏并列判定。</p>
 *
 * @param cands 候选品牌及其差价; 差价为 undefined 表示该品牌本行无有效报价, 不参与比较
 * @returns 差价最高的一批品牌名(可能多个); 无有效候选时为空数组
 */
export function pickBestDiffBrands(
  cands: readonly { brand: string; diff: number | undefined }[],
): string[] {
  let bestVal = Number.NEGATIVE_INFINITY
  let best: string[] = []
  for (const cand of cands) {
    const { diff } = cand
    if (diff === undefined || !Number.isFinite(diff)) continue
    if (best.length === 0 || diff > bestVal + PRICE_TIE_EPSILON) {
      // 严格更高: 开新一批
      bestVal = diff
      best = [cand.brand]
      continue
    }
    if (Math.abs(diff - bestVal) <= PRICE_TIE_EPSILON) {
      // 与当前最优并列: 追加而不是替换, 也不因"先到"而丢弃后来者
      best.push(cand.brand)
    }
  }
  return best
}
