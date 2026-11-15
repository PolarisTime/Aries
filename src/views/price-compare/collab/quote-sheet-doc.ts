import * as Y from 'yjs'
import { COLLAB_LOCAL_ORIGIN, COLLAB_SEED_ORIGIN } from './collab-doc'

/**
 * 报单比价（报价单）的协作文档模型（设计文档 §14.1 的「范围更小」版本）。
 *
 * <p>可协作的只有两列：**报单吨位（ton）与行备注（remark）**。价格（网价/现货价/差价）
 * 全部是实时派生且只读，**绝不进 CRDT** —— 它们由供应商价格表 + lowest-quotes 派生，
 * 进文档会造出第二份互相打架的真相源。</p>
 *
 * <p>结构固定为两层：</p>
 *
 * ```text
 * doc.getMap('meta')              // sheetId / version
 * doc.getMap<Y.Map>('items')      // key = itemId（行的稳定 id，字符串）
 *   └ Y.Map { ton?, remark? }     // 键存在才有值；"清空"= 删键
 * ```
 *
 * <p>行结构（增删行 / 改规格 / 排序）仍走 Java REST，本文件不提供任何结构操作。</p>
 */

const META_MAP_NAME = 'meta'
const ITEMS_MAP_NAME = 'items'

/** 一行在 CRDT 里的可协作值；字段缺省 = 该行没有吨位 / 没有备注。 */
export type QuoteSheetItemValue = {
  /** 报单吨位；`undefined` = 未填。 */
  ton?: number
  /** 行备注；`undefined` = 空。 */
  remark?: string
}

/** 写一行的补丁：`null` 表示删除该字段（等价于"清空输入框"）。 */
export type QuoteSheetItemPatch = {
  ton?: number | null
  remark?: string | null
}

/** 文档 meta。 */
export type QuoteSheetMeta = {
  sheetId: string
  version: number | null
}

/** 一次行值变化。 */
export type QuoteSheetItemChange = {
  itemId: string
  value: QuoteSheetItemValue
  /** 是否来自远端（provider 应用的其他人的 update）。 */
  remote: boolean
}

function itemsOf(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap<Y.Map<unknown>>(ITEMS_MAP_NAME)
}

/** 文档的 meta 表（只读用途）。 */
export function quoteSheetMetaOf(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap<unknown>(META_MAP_NAME)
}

function toFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function toOptionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

/** 读一行；`null` = 文档里还没有这一行（应回退到 REST/本地值）。 */
export function readQuoteSheetItem(
  doc: Y.Doc,
  itemId: string,
): QuoteSheetItemValue | null {
  const item = itemsOf(doc).get(itemId)
  if (!item) return null
  // 只返回有值的字段：让「没有这个值」与「值为空」在比较/序列化时保持同一个形状
  const value: QuoteSheetItemValue = {}
  const ton = toFiniteNumber(item.get('ton'))
  if (ton !== undefined) value.ton = ton
  const remark = toOptionalText(item.get('remark'))
  if (remark !== undefined) value.remark = remark
  return value
}

/** 文档里是否已有这一行。 */
export function hasQuoteSheetItem(doc: Y.Doc, itemId: string): boolean {
  return itemsOf(doc).has(itemId)
}

/**
 * 写一行（本地 origin）。
 *
 * <p>**整值语义**：`ton`/`remark` 各自独立，缺省字段保持现值；补丁里给 `null`
 * 表示删掉这个字段（清空输入框）。永远不写价格字段。</p>
 */
export function writeQuoteSheetItem(
  doc: Y.Doc,
  itemId: string,
  patch: QuoteSheetItemPatch,
): void {
  doc.transact(() => {
    const items = itemsOf(doc)
    let item = items.get(itemId)
    if (!item) {
      item = new Y.Map<unknown>()
      items.set(itemId, item)
    }
    if ('ton' in patch) {
      const ton = toFiniteNumber(patch.ton ?? undefined)
      if (ton === undefined) item.delete('ton')
      else item.set('ton', ton)
    }
    if ('remark' in patch) {
      const remark = toOptionalText(patch.remark ?? undefined)
      if (remark === undefined) item.delete('remark')
      else item.set('remark', remark)
    }
  }, COLLAB_LOCAL_ORIGIN)
}

/** 写 meta（建房时补一份文档头，物化器以它为准）。 */
export function writeQuoteSheetMeta(
  doc: Y.Doc,
  meta: Partial<QuoteSheetMeta>,
): void {
  doc.transact(() => {
    const map = quoteSheetMetaOf(doc)
    for (const [key, value] of Object.entries(meta)) {
      if (value !== undefined) map.set(key, value)
    }
  }, COLLAB_LOCAL_ORIGIN)
}

/** 读 meta。 */
export function readQuoteSheetMeta(doc: Y.Doc): QuoteSheetMeta {
  const map = quoteSheetMetaOf(doc)
  const version = map.get('version')
  return {
    sheetId:
      typeof map.get('sheetId') === 'string' ? String(map.get('sheetId')) : '',
    version:
      typeof version === 'number' && Number.isFinite(version) ? version : null,
  }
}

/** 文档里还没有任何行（= 新建房间，需要从当前 rows 播种）。 */
export function isQuoteSheetDocEmpty(doc: Y.Doc): boolean {
  return itemsOf(doc).size === 0
}

/**
 * 用当前 rows 的 ton/remark 播种。
 *
 * <p>`overwrite=false`（默认）只补缺失行：已经存在的行以文档为准，反向覆盖会把别人刚改的值
 * 打回去。播种使用 {@link COLLAB_SEED_ORIGIN}：不进撤销栈、也不算"远端改动"。</p>
 */
export function seedQuoteSheetItems(
  doc: Y.Doc,
  entries: Iterable<readonly [string, QuoteSheetItemValue]>,
  options: { overwrite?: boolean; origin?: unknown } = {},
): void {
  const overwrite = options.overwrite === true
  doc.transact(() => {
    const items = itemsOf(doc)
    for (const [itemId, value] of entries) {
      if (!overwrite && items.has(itemId)) continue
      let item = items.get(itemId)
      if (!item) {
        item = new Y.Map<unknown>()
        items.set(itemId, item)
      }
      const ton = toFiniteNumber(value.ton)
      if (ton === undefined) item.delete('ton')
      else item.set('ton', ton)
      const remark = toOptionalText(value.remark)
      if (remark === undefined) item.delete('remark')
      else item.set('remark', remark)
    }
  }, options.origin ?? COLLAB_SEED_ORIGIN)
}

/**
 * 只补文档里还没有的行（增行后调用）。
 *
 * <p>结构变更走 REST，文档里不会自动出现新行；这里按"缺哪行补哪行"补齐，
 * 不触碰已有行。</p>
 */
export function seedMissingQuoteSheetItems(
  doc: Y.Doc,
  entries: Iterable<readonly [string, QuoteSheetItemValue]>,
): void {
  const items = itemsOf(doc)
  const missing: Array<readonly [string, QuoteSheetItemValue]> = []
  for (const [itemId, value] of entries) {
    if (!items.has(itemId)) missing.push([itemId, value])
  }
  if (missing.length) seedQuoteSheetItems(doc, missing)
}

/**
 * 观察行值变化。
 *
 * <p>与供应商价格表的格子一样必须用 `observeDeep`：改已有行的 ton 触发的是内层表的变更，
 * 外层 `items` 表的 `observe` 收不到（只有新增/删除整行才有外层事件）。</p>
 */
export function observeQuoteSheetItems(
  doc: Y.Doc,
  listener: (changes: readonly QuoteSheetItemChange[]) => void,
): () => void {
  const handler = (
    events: Y.YEvent<Y.AbstractType<unknown>>[],
    transaction: Y.Transaction,
  ) => {
    // 播种既不是用户操作、也不是远端协作，按本地处理
    const remote =
      transaction.origin !== COLLAB_LOCAL_ORIGIN &&
      transaction.origin !== COLLAB_SEED_ORIGIN
    const itemIds = new Set<string>()
    for (const event of events) {
      const [pathRoot] = event.path
      if (typeof pathRoot === 'string') {
        itemIds.add(pathRoot)
        continue
      }
      if (event instanceof Y.YMapEvent) {
        for (const key of event.keysChanged) itemIds.add(key)
      }
    }
    const changes: QuoteSheetItemChange[] = [...itemIds].map((itemId) => ({
      itemId,
      value: readQuoteSheetItem(doc, itemId) ?? {},
      remote,
    }))
    if (changes.length) listener(changes)
  }
  const items = itemsOf(doc)
  items.observeDeep(handler)
  return () => items.unobserveDeep(handler)
}
