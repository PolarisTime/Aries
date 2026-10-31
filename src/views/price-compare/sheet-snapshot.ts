/**
 * 服务端快照、基线指纹与保存载荷（从 `useSheetsStore.ts` 抽出的独立职责）。
 *
 * <p>只处理「服务端记录 ↔ 本地单据」的纯函数：基线指纹、行/表头签名、差异保存载荷、
 * 未完成行合并、服务端记录归一化。不含 React 状态与网络，可直接单测；hook 对外导出
 * 的 `itemSignature` / `buildItemPayload` 仍从 `useSheetsStore` 再导出，调用方无需改动。</p>
 */
import type {
  QuoteSheetHeaderPayload,
  QuoteSheetItemPayload,
  QuoteSheetPayload,
  QuoteSheetRecord,
} from '@/api/market/quote-sheets'
import { isSeparatorRow } from './core'
import type {
  Brand,
  PriceRow,
  PriceSheet,
  ProjectConfig,
  SheetInput,
  SheetInputs,
} from './types'

/** 行是否具备完整商品信息(商品行后端要求 category/material/spec/length 非空)。 */
export function isCompleteRow(row: PriceRow): boolean {
  return Boolean(row.category && row.material && row.spec && row.length)
}

/** 服务端 id 形态: 雪花 id 的十进制字符串。 */
export function isServerId(id: string): boolean {
  return /^[1-9]\d*$/.test(id)
}

/** 行是否可落库: 隔断行总是可落库, 商品行需商品信息完整。 */
export function isPersistableRow(row: PriceRow): boolean {
  return isSeparatorRow(row) || isCompleteRow(row)
}

/**
 * 刷新合并行: 不完整商品行(未选商品的空行)不落库, 刷新时按本地位次保留;
 * 其余行(完整商品行与隔断行)以服务端为准(其他设备新增的行追加到末尾, 已删除的行丢弃)。
 *
 * 以本地绝对下标把不完整行插回服务端行列表: 兼容"本地新建单据的本地行 id 尚未
 * 与服务端对齐"的场景, 也能保持其相对完整行的原始位置。
 */
export function mergeRowsPreservingIncomplete(
  localRows: PriceRow[],
  serverRows: PriceRow[],
): PriceRow[] {
  const merged = [...serverRows]
  const emptyRows: { row: PriceRow; index: number }[] = []
  localRows.forEach((row, index) => {
    if (!isSeparatorRow(row) && !isCompleteRow(row))
      emptyRows.push({ row, index })
  })
  // 从后往前插入, 保证前面的插入不影响后面记录的下标
  for (let i = emptyRows.length - 1; i >= 0; i -= 1) {
    const { row, index } = emptyRows[i]
    merged.splice(Math.min(index, merged.length), 0, row)
  }
  return merged
}

/** 单据是否可持久化: 有品牌、有完整商品行、参照与报单日期齐备。 */
export function isPersistable(
  sheet: PriceSheet,
  config: ProjectConfig,
): boolean {
  if (!sheet.orderDate || !sheet.refDate || !sheet.refPeriod) return false
  if (!config.brands.length) return false
  return sheet.rows.some(isCompleteRow)
}

/** 组装后端保存请求体; 不可持久化时返回 null。 */
export function buildPayload(
  sheet: PriceSheet,
  config: ProjectConfig,
): QuoteSheetPayload | null {
  if (!isPersistable(sheet, config)) return null
  const brands = config.brands
  return {
    name: sheet.name || '未命名批次',
    orderDate: sheet.orderDate,
    refDate: sheet.refDate,
    refPeriod: sheet.refPeriod,
    lengthPremium: sheet.lengthPremium,
    locked: Boolean(sheet.locked),
    specQuantityLocked: Boolean(sheet.specQuantityLocked),
    ...(sheet.projectId ? { projectId: sheet.projectId } : {}),
    ...(sheet.projectName ? { projectName: sheet.projectName } : {}),
    ...(sheet.status ? { status: sheet.status } : {}),
    ...(sheet.remark ? { remark: sheet.remark } : {}),
    brands: brands.map((brand, index) => ({
      brandName: brand.name,
      freight: brand.freight,
      sortOrder: index,
    })),
    items: sheet.rows.flatMap<QuoteSheetPayload['items'][number]>((row) => {
      if (!isPersistableRow(row)) return []
      if (isSeparatorRow(row)) return [{ rowType: 'SEPARATOR', prices: [] }]
      const prices = brands.flatMap<
        QuoteSheetPayload['items'][number]['prices'][number]
      >((brand) => {
        const input = sheet.inputs[`${brand.name}:${row.id}`]
        if (!input || (input.spot === undefined && !input.supplierId)) return []
        return [
          {
            brandName: brand.name,
            ...(input.spot !== undefined ? { spotPrice: input.spot } : {}),
            ...(input.supplierId ? { supplierId: input.supplierId } : {}),
          },
        ]
      })
      return [
        {
          rowType: 'PRODUCT',
          category: row.category,
          material: row.material,
          spec: Number(row.spec),
          length: row.length,
          ...(row.ton !== undefined ? { ton: row.ton } : {}),
          ...(row.remark ? { remark: row.remark } : {}),
          locked: Boolean(row.locked),
          ...(row.purchaseOrderId
            ? { purchaseOrderId: row.purchaseOrderId }
            : {}),
          ...(row.purchaseOrderItemId
            ? { purchaseOrderItemId: row.purchaseOrderItemId }
            : {}),
          prices,
        },
      ]
    }),
  }
}

/** 表头保存请求体(不含 brands/items)。 */
export function buildHeaderPayload(sheet: PriceSheet): QuoteSheetHeaderPayload {
  return {
    name: sheet.name || '未命名批次',
    orderDate: sheet.orderDate,
    refDate: sheet.refDate,
    refPeriod: sheet.refPeriod,
    lengthPremium: sheet.lengthPremium,
    locked: Boolean(sheet.locked),
    specQuantityLocked: Boolean(sheet.specQuantityLocked),
    ...(sheet.projectId ? { projectId: sheet.projectId } : {}),
    ...(sheet.projectName ? { projectName: sheet.projectName } : {}),
    ...(sheet.status ? { status: sheet.status } : {}),
    ...(sheet.remark ? { remark: sheet.remark } : {}),
  }
}

/**
 * 单行整行替换请求体; 商品行信息不完整且非隔断行时返回 null。
 *
 * <p>导出供行级关联载荷的用例直接断言(纯函数, 无副作用)。</p>
 */
export function buildItemPayload(
  sheet: PriceSheet,
  row: PriceRow,
  brands: Brand[],
): QuoteSheetItemPayload | null {
  if (isSeparatorRow(row)) return { rowType: 'SEPARATOR', prices: [] }
  if (!isCompleteRow(row)) return null
  const prices = brands.flatMap((brand) => {
    const input = sheet.inputs[`${brand.name}:${row.id}`]
    if (!input || (input.spot === undefined && !input.supplierId)) return []
    return [
      {
        brandName: brand.name,
        ...(input.spot !== undefined ? { spotPrice: input.spot } : {}),
        ...(input.supplierId ? { supplierId: input.supplierId } : {}),
        /*
         * 「按抗震牌号代取」的来源必须随保存一起下发，否则刷新后角标无从判定
         * （服务端只会回 null）。判据是**字段是否存在**而不是真假值：
         * `null` 是"曾经代取、已被手工覆盖"的有效载荷，必须原样带给服务端去清空；
         * 字段不存在才表示这一格从未涉及代取，继续省略。
         */
        ...(input.spotSourceMaterial !== undefined
          ? { sourceMaterial: input.spotSourceMaterial }
          : {}),
      },
    ]
  })
  return {
    rowType: 'PRODUCT',
    category: row.category,
    material: row.material,
    spec: Number(row.spec),
    length: row.length,
    ...(row.ton !== undefined ? { ton: row.ton } : {}),
    ...(row.remark ? { remark: row.remark } : {}),
    locked: Boolean(row.locked),
    ...(row.purchaseOrderId ? { purchaseOrderId: row.purchaseOrderId } : {}),
    ...(row.purchaseOrderItemId
      ? { purchaseOrderItemId: row.purchaseOrderItemId }
      : {}),
    /*
     * 多行关联整组下发; 服务端按第一条镜像旧三列。
     *
     * 判据是"字段是否存在"而不是"长度是否非空": 后端语义为「未携带 = 不改关联、
     * 显式 [] = 清空」, 只判长度会让"清除关联"的保存载荷省略该字段 ⇒ 旧关联被原样
     * 保留, 服务端随后还把旧关联镜像回三列(实测)。从未关联过的行保持 undefined,
     * 载荷继续省略该字段, 不把每行都塞一个空数组。
     */
    ...(row.purchaseOrderLinks
      ? {
          purchaseOrderLinks: row.purchaseOrderLinks.map((link) => ({
            purchaseOrderId: link.purchaseOrderId,
            purchaseOrderItemId: link.purchaseOrderItemId,
            allocatedTon: link.allocatedTon,
          })),
        }
      : {}),
    prices,
  }
}

/** 表头指纹: 与服务端快照比较, 判断是否需要发头 PUT。 */
export function headerSignature(sheet: PriceSheet): string {
  return JSON.stringify(buildHeaderPayload(sheet))
}

/**
 * 行指纹: 行类型/商品字段/吨位/现货价/供应商任一变化即不同。
 *
 * <p>导出供脏检查用例直接断言(纯函数, 无副作用)。</p>
 */
export function itemSignature(row: PriceRow, inputs: SheetInputs): string {
  const suffix = `:${row.id}`
  const prices = Object.keys(inputs)
    .filter((key) => key.endsWith(suffix))
    .sort()
    .map((key) => [key, inputs[key] ?? {}])
  return JSON.stringify({
    rowType: row.rowType ?? 'PRODUCT',
    category: row.category,
    material: row.material,
    spec: row.spec,
    length: row.length,
    ton: row.ton ?? null,
    remark: row.remark ?? '',
    locked: Boolean(row.locked),
    purchaseOrderId: row.purchaseOrderId ?? null,
    purchaseOrderItemId: row.purchaseOrderItemId ?? null,
    // 关联集合参与指纹: 增删关联或改分配吨位都要触发保存
    purchaseOrderLinks: (row.purchaseOrderLinks ?? []).map((link) => ({
      purchaseOrderId: link.purchaseOrderId,
      purchaseOrderItemId: link.purchaseOrderItemId,
      allocatedTon: link.allocatedTon,
    })),
    prices,
  })
}

export type SheetBaseline = {
  header: string
  items: Map<string, string>
  /**
   * 服务端已知的行顺序(可落库行的 id 顺序)。
   * 行级差异保存只比对内容指纹, 拖动换位不改变任何行内容, 因此必须单独记录顺序,
   * 否则"本地已换序、服务端未换序", 刷新后会恢复旧顺序。
   */
  order: string
}

/**
 * 行顺序签名: 只统计可落库行(与服务端一致)。
 * 本地未完成行(未选商品)不在服务端, 不参与顺序比对。
 */
export function orderSignature(sheet: PriceSheet): string {
  return sheet.rows
    .filter(isPersistableRow)
    .map((row) => row.id)
    .join(',')
}

/** 单据内容指纹: 用于刷新时判断服务端内容是否已不同于本地待保存编辑。 */
export function sheetContentFingerprint(sheet: PriceSheet): string {
  return JSON.stringify({
    name: sheet.name,
    status: sheet.status,
    projectId: sheet.projectId,
    projectName: sheet.projectName,
    orderDate: sheet.orderDate,
    refDate: sheet.refDate,
    refPeriod: sheet.refPeriod,
    locked: Boolean(sheet.locked),
    specQuantityLocked: Boolean(sheet.specQuantityLocked),
    lengthPremium: sheet.lengthPremium,
    remark: sheet.remark ?? '',
    rows: sheet.rows,
    inputs: sheet.inputs,
  })
}

/**
 * 由服务端已保存单据构建基线(用于行级差异比对)。
 *
 * <p><b>只记可落库行</b>：基线的语义是「服务端已经有哪些行」，而
 * {@link buildItemPayload} 对不完整商品行返回 null、根本不会提交，服务端自然也不会有它们。
 * 若把 sheet.rows 里**所有**行都记进基线，本地新建批次自带的空行（id 来自
 * `makeRow()`，形如 `oj7n4e`）会被误标成「已保存」；等用户把它填完整、它变成可落库行时，
 * `baseline.items.has(row.id)` 命中本地临时 id，于是走 update 打到
 * `items/{本地临时 id}`，后端判 `itemId: 参数格式错误`（400）。
 * 这也是「新建批次后录入明细报保存商品行失败」的根因。</p>
 *
 * <p>为什么过滤是安全的：基线只在服务端往返之后（新建、改单、刷新、整单覆盖）重建，
 * 那些时刻本地行 id 已按服务端明细对齐；服务端返回的商品行必然是完整的
 * （`category`/`material`/`spec`/`length` 都有），所以过滤不会漏掉真正已存在的行。</p>
 */
export function buildBaseline(sheet: PriceSheet): SheetBaseline {
  const items = new Map<string, string>()
  for (const row of sheet.rows) {
    if (!isPersistableRow(row)) continue
    items.set(row.id, itemSignature(row, sheet.inputs))
  }
  return {
    header: headerSignature(sheet),
    items,
    order: orderSignature(sheet),
  }
}

/** 把 inputs 中指向某行的键从 fromId 迁移到 toId。 */
export function remapInputKeys(
  inputs: SheetInputs,
  fromId: string,
  toId: string,
): SheetInputs {
  const next: SheetInputs = {}
  for (const [key, value] of Object.entries(inputs)) {
    next[
      key.endsWith(`:${fromId}`)
        ? `${key.slice(0, -fromId.length)}${toId}`
        : key
    ] = value
  }
  return next
}

/** 服务端记录 -> 本地单据(行 id 用服务端 item id, 保证重新加载后稳定)。 */
export function toPriceSheet(record: QuoteSheetRecord): PriceSheet {
  const rows: PriceRow[] = record.items.map((item) => ({
    id: item.id,
    rowType: item.rowType === 'SEPARATOR' ? 'SEPARATOR' : 'PRODUCT',
    category: item.category,
    material: item.material,
    spec: item.spec ?? null,
    length: item.length,
    ...(item.ton !== undefined ? { ton: item.ton } : {}),
    ...(item.remark ? { remark: item.remark } : {}),
    ...(item.locked ? { locked: true } : {}),
    ...(item.purchaseOrderId ? { purchaseOrderId: item.purchaseOrderId } : {}),
    ...(item.purchaseOrderNo ? { purchaseOrderNo: item.purchaseOrderNo } : {}),
    ...(item.purchaseOrderItemId
      ? { purchaseOrderItemId: item.purchaseOrderItemId }
      : {}),
    // 多行关联原样带入本地模型(为空时不落字段, 保持"未关联"语义)
    ...(item.purchaseOrderLinks?.length
      ? { purchaseOrderLinks: item.purchaseOrderLinks }
      : {}),
  }))
  const inputs: SheetInputs = {}
  for (const item of record.items) {
    for (const price of item.prices) {
      const entry: SheetInput = {}
      if (price.spotPrice !== undefined) entry.spot = price.spotPrice
      if (price.supplierId) entry.supplierId = price.supplierId
      if (price.supplierName) entry.supplierName = price.supplierName
      /*
       * 服务端回来的代取来源（响应字段名 `spotSourceMaterial`）必须进本地模型，
       * 否则重开单据后 `resolveSpotSourceMaterial` 拿不到来源 —— 价格在、角标没了。
       * `null` 也要带（= 查过、确认没有代取），只有缺字段（undefined）才不落。
       */
      if (price.spotSourceMaterial !== undefined) {
        entry.spotSourceMaterial = price.spotSourceMaterial
      }
      if (Object.keys(entry).length > 0) {
        inputs[`${price.brandName}:${item.id}`] = entry
      }
    }
  }
  return {
    id: record.id,
    serverId: record.id,
    name: record.name,
    status: record.status ?? '报价',
    projectId: record.projectId ?? '',
    projectName: record.projectName ?? '',
    orderDate: record.orderDate,
    refDate: record.refDate,
    refPeriod: record.refPeriod,
    locked: record.locked,
    specQuantityLocked: record.specQuantityLocked,
    lengthPremium: record.lengthPremium,
    inputs,
    rows,
    brands: record.brands.map((brand) => ({
      name: brand.brandName,
      freight: brand.freight,
    })),
    ...(record.remark ? { remark: record.remark } : {}),
    ...(record.version ? { version: record.version } : {}),
    ...(record.updatedAt ? { savedAt: record.updatedAt } : {}),
  }
}
