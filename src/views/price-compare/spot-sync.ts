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
}

export interface SpotSyncTargetPlan {
  sheetId: string
  sheetName: string
  changes: SpotSyncChange[]
  overwriteCount: number
  fillCount: number
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
        const value = source.get(`${brandName}\u0000${productKey}`)
        if (!value) continue
        const key = `${brandName}:${row.id}`
        const before = sheet.inputs[key]
        const after: SheetInput = { ...(before ?? {}), ...value }
        if (sameValue(before, after)) continue
        changes.push({
          brandName,
          rowId: row.id,
          ...(before ? { before } : {}),
          after,
          overwrite: !isEmptyValue(before) && !sameValue(before, after),
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
