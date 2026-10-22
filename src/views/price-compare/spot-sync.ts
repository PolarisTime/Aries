import { substituteMaterialOf } from '@/utils/material-grade'
import { productKeyOf } from './core'
import type { PriceRow, PriceSheet, SheetInput, SheetInputs } from './types'

/**
 * 现货价同步的作用域。
 *
 * <p>三档与界面上三个按钮一一对应；「项目级」「全部」是「当前批次」的超集，
 * 因此当前批次**同时是数据源与目标**：以它为准向外推，也在自己内部补齐
 * （例如先填了价格、之后又把某行的规格改掉，自动联动不会再回头补，这里能补上）。</p>
 */
export type SpotSyncScope = 'sheet' | 'project' | 'all'

/** 同步的字段范围：只带现货价与来源供应商，**不带 ton(报单吨位)** —— 吨位是逐行业务数据。 */
export type SpotSyncValue = Pick<
  SheetInput,
  'spot' | 'supplierId' | 'supplierName'
>

export interface SpotSyncChange {
  brandName: string
  rowId: string
  /** 变更前该格的值（undefined 表示原本没有这一格） */
  before?: SheetInput
  /** 变更后该格的值 */
  after: SheetInput
  /** 本次是覆盖已有值（true）还是原本空缺、本次填入（false） */
  overwrite: boolean
  /**
   * 按抗震牌号代取时, 记下实际命中的牌号（如本行 HRB400、取的是 HRB400E 的价）。
   * 计价口径被替换必须可见, 不能悄悄换掉（与网价取价的告知口径一致）。
   */
  substitutedFrom?: string
}

export interface SpotSyncTargetPlan {
  sheetId: string
  sheetName: string
  changes: SpotSyncChange[]
  overwriteCount: number
  fillCount: number
  substitutedCount: number
}

/** 被跳过的批次：他人正在编辑（后端 `ensureWritable` 会以 409 拒绝写入）。 */
export interface SpotSyncSkip {
  sheetId: string
  sheetName: string
  reason: 'lockedByOther'
}

export interface SpotSyncPlan {
  sourceSheetId: string
  sourceSheetName: string
  targets: SpotSyncTargetPlan[]
  skipped: SpotSyncSkip[]
  totalChanges: number
  totalOverwrite: number
  totalFill: number
  /** 其中按抗震牌号代取的处数（HRB400 借用 HRB400E 的价）。 */
  totalSubstituted: number
}

/** 两个值是否都为空（用于判断"这一格本来就没内容"）。 */
function isEmptyValue(value: SheetInput | undefined): boolean {
  return (
    value === undefined ||
    (value.spot === undefined &&
      value.supplierId === undefined &&
      value.supplierName === undefined)
  )
}

function sameValue(left: SheetInput | undefined, right: SheetInput): boolean {
  return (
    left?.spot === right.spot &&
    left?.supplierId === right.supplierId &&
    left?.supplierName === right.supplierName
  )
}

/** 取一行里可参与同步的商品键；不完整行与隔断行返回空串。 */
function syncKeyOf(row: PriceRow): string {
  return row.rowType === 'PRODUCT' ? productKeyOf(row) : ''
}

/**
 * 汇总数据源的现货价/供应商：`品牌 + 商品键` → 值。
 *
 * <p>同一批次内同商品同品牌的价格本应一致（输入时自动联动），但存在两条会分叉的路径：
 * 先填价格再把某行规格改掉、或从服务端加载到历史脏数据。此时按**行序取第一个**，
 * 结果是确定的（不随对象键序或遍历顺序漂移），并且与界面上"靠上的那行"一致，便于用户预期。</p>
 */
export function buildSpotSyncSource(
  sheet: PriceSheet,
  brandNames: readonly string[],
): Map<string, SpotSyncValue> {
  const source = new Map<string, SpotSyncValue>()
  for (const row of sheet.rows) {
    const productKey = syncKeyOf(row)
    if (!productKey) continue
    for (const brandName of brandNames) {
      const input = sheet.inputs[`${brandName}:${row.id}`]
      if (!input) continue
      if (input.spot === undefined && input.supplierId === undefined) continue
      const key = `${brandName}\u0000${productKey}`
      if (source.has(key)) continue
      source.set(key, {
        ...(input.spot !== undefined ? { spot: input.spot } : {}),
        ...(input.supplierId !== undefined
          ? { supplierId: input.supplierId }
          : {}),
        ...(input.supplierName !== undefined
          ? { supplierName: input.supplierName }
          : {}),
      })
    }
  }
  return source
}

/**
 * 为某个目标格找出该同步进来的值 —— **同步取值的唯一出口**。
 *
 * <p>两级匹配, 顺序不能颠倒:</p>
 * <ol>
 *   <li><b>本行材质自己的价</b>: 与网价取价同一条优先级 —— 自己有就用自己;</li>
 *   <li><b>同强度抗震牌号的价</b>: 仅当本行材质自己没有价、且该格还没有任何值时才启用。</li>
 * </ol>
 *
 * <p>为什么必须加第二级: 业务上项目报 HRB400, 但现货/商品资料以 HRB400E 为主, 报 400 的行
 * 本来就取不到价。「网价取价」早已按抗震牌号代取(见 {@link substituteMaterialOf}),
 * 但现货同步此前只按 {@link productKeyOf} 的原始材质比对, 于是"在 HRB400E 行填的价、
 * HRB400 行同步不过来" —— 同一份数据在取价里能补到、在同步里补不到。</p>
 *
 * <p>为什么要求"该格还没有任何值": 代取是**兜底**, 不能覆盖用户已经手工填好的 400 价。
 * 这一条同时保证了单向下行 —— HRB400E 自身没有替代候选(已是抗震牌号), 不会反向借 400 的价。</p>
 */
function resolveSyncValue(
  source: Map<string, SpotSyncValue>,
  brandName: string,
  productKey: string,
  row: PriceRow,
  before: SheetInput | undefined,
): { value: SpotSyncValue; substitutedFrom?: string } | undefined {
  const own = source.get(`${brandName}\u0000${productKey}`)
  if (own) return { value: own }
  if (!isEmptyValue(before)) return undefined
  const substitute = substituteMaterialOf(row.material)
  if (!substitute) return undefined
  const substituted = source.get(
    `${brandName}\u0000${productKeyOf({ ...row, material: substitute })}`,
  )
  if (!substituted) return undefined
  return { value: substituted, substitutedFrom: substitute }
}

/** 作用域选出的目标批次集合（含当前批次自身）。 */
export function selectSpotSyncSheets(
  sheets: readonly PriceSheet[],
  activeSheetId: string,
  scope: SpotSyncScope,
): PriceSheet[] {
  const active = sheets.find((sheet) => sheet.id === activeSheetId)
  if (!active) return []
  if (scope === 'sheet') return [active]
  if (scope === 'project') {
    // 项目为空的批次(尚未归属)只在自己那一档里处理, 不跨到别的项目去
    if (!active.projectId) return [active]
    return sheets.filter((sheet) => sheet.projectId === active.projectId)
  }
  return [...sheets]
}

export interface PlanSpotSyncOptions {
  sheets: readonly PriceSheet[]
  activeSheetId: string
  scope: SpotSyncScope
  /** 解析某个批次参与同步的品牌名（不同项目配置的品牌可能不同）。 */
  resolveBrands: (sheet: PriceSheet) => readonly string[]
  /** 他人已签出的批次 id（本地 id 或 serverId 都要能被识别）。 */
  lockedSheetIds?: ReadonlySet<string>
}

/**
 * 计算同步计划：**只计算、不写入**。
 *
 * <p>拆成纯函数是为了两件事：① 确认弹窗要在写入前把影响面（会覆盖多少处已有值）
 * 如实列出来；② 这段判定能被单测直接锁定，不必渲染界面。</p>
 */
export function planSpotSync({
  sheets,
  activeSheetId,
  scope,
  resolveBrands,
  lockedSheetIds,
}: PlanSpotSyncOptions): SpotSyncPlan {
  const active = sheets.find((sheet) => sheet.id === activeSheetId)
  const source = active
    ? buildSpotSyncSource(active, resolveBrands(active))
    : new Map<string, SpotSyncValue>()

  const targets: SpotSyncTargetPlan[] = []
  const skipped: SpotSyncSkip[] = []

  for (const sheet of selectSpotSyncSheets(sheets, activeSheetId, scope)) {
    if (
      lockedSheetIds?.has(sheet.id) ||
      (sheet.serverId ? lockedSheetIds?.has(sheet.serverId) : false)
    ) {
      skipped.push({
        sheetId: sheet.id,
        sheetName: sheet.name,
        reason: 'lockedByOther',
      })
      continue
    }

    const brandNames = resolveBrands(sheet)
    const changes: SpotSyncChange[] = []
    for (const row of sheet.rows) {
      const productKey = syncKeyOf(row)
      if (!productKey) continue
      for (const brandName of brandNames) {
        const key = `${brandName}:${row.id}`
        const before = sheet.inputs[key]
        const hit = resolveSyncValue(source, brandName, productKey, row, before)
        if (!hit) continue
        const after: SheetInput = { ...(before ?? {}), ...hit.value }
        if (sameValue(before, after)) continue
        changes.push({
          brandName,
          rowId: row.id,
          ...(before ? { before } : {}),
          after,
          overwrite: !isEmptyValue(before) && !sameValue(before, after),
          ...(hit.substitutedFrom
            ? { substitutedFrom: hit.substitutedFrom }
            : {}),
        })
      }
    }

    if (!changes.length) continue
    targets.push({
      sheetId: sheet.id,
      sheetName: sheet.name,
      changes,
      overwriteCount: changes.filter((change) => change.overwrite).length,
      fillCount: changes.filter((change) => !change.overwrite).length,
      substitutedCount: changes.filter((change) => change.substitutedFrom)
        .length,
    })
  }

  return {
    sourceSheetId: activeSheetId,
    sourceSheetName: active?.name ?? '',
    targets,
    skipped,
    totalChanges: targets.reduce(
      (sum, target) => sum + target.changes.length,
      0,
    ),
    totalOverwrite: targets.reduce(
      (sum, target) => sum + target.overwriteCount,
      0,
    ),
    totalFill: targets.reduce((sum, target) => sum + target.fillCount, 0),
    totalSubstituted: targets.reduce(
      (sum, target) => sum + target.substitutedCount,
      0,
    ),
  }
}

/** 把一个批次的变更合并进它的 inputs（不改原对象；无变化时返回原对象）。 */
export function applySpotSyncChanges(
  inputs: SheetInputs,
  changes: readonly SpotSyncChange[],
): SheetInputs {
  if (!changes.length) return inputs
  const next: SheetInputs = { ...inputs }
  for (const change of changes) {
    next[`${change.brandName}:${change.rowId}`] = change.after
  }
  return next
}
