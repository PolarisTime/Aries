import * as Y from 'yjs'

/**
 * 供应商价格表实时协作的**文档 schema**（设计文档 §4）。
 *
 * <p>结构固定为两层：</p>
 *
 * ```text
 * doc.getMap('meta')                    // listId / supplierId / brandName / quotedOn / warehouse / version
 * doc.getMap<Y.Map>('cells')            // key = cellKey
 *   └ Y.Map { price, priceStatus, remark }
 * ```
 *
 * <p>为什么一格是一个 `Y.Map` 而不是把三个字段拆成三张表：一次输入代表"这一格现在的完整状态"，
 * 拆字段会造出"价格更新了、状态没更新"的中间态；UI 上一个输入框就是一次整格提交。</p>
 *
 * <p>本文件只做**文档读写**，不碰网络、不碰 React：所有函数都是纯 Yjs 操作，可以在 Node
 * 环境里直接单测（见 `collab-doc.spec.ts` 的两客户端收敛用例）。</p>
 */

/** 顶层 meta 表名。 */
const META_MAP_NAME = 'meta'
/** 方格表名。 */
const CELLS_MAP_NAME = 'cells'

/**
 * 本地写入的 origin 标记。
 *
 * <p>`Y.UndoManager` 只追踪带这个 origin 的改动（设计文档 §8：撤销**只撤自己的**操作），
 * 远端（provider 应用）来的 update 不在此列。**所有本地写必须经过本模块的函数**，
 * 不要在别处直接 `doc.transact()`，否则撤销栈会漏掉这些操作。</p>
 */
export const COLLAB_LOCAL_ORIGIN = 'supplier-price-collab:local'

/**
 * 从 REST 快照播种时使用的 origin。
 *
 * <p>与 {@link COLLAB_LOCAL_ORIGIN} 分开是**必须的**：播种不属于用户操作，不能进撤销栈
 * （否则第一次 Ctrl+Z 会把整张表"撤"回空）；同时它也不算"远端改动"，不该触发冲突提示。</p>
 */
export const COLLAB_SEED_ORIGIN = 'supplier-price-collab:seed'

/** 格的默认价格状态（与后端条目默认值一致，见 `supplier-price-list-model.spec` 的既有口径）。 */
export const DEFAULT_COLLAB_PRICE_STATUS = 'NORMAL'

/**
 * cellKey 的分隔符。
 *
 * <p>用 `\u0000` 而不是 `|`：与 SQL 唯一索引 `uk_supplier_price_item_key` 对齐，
 * 且字段值里不可能出现 NUL，不会出现"材质名里带分隔符把键拼串"的情况。</p>
 */
export const COLLAB_CELL_KEY_SEPARATOR = '\u0000'

/** 一格在 CRDT 里的完整状态。 */
export type CollabCellValue = {
  /** `null` = 不报价（与 0 元严格区分）。 */
  price: number | null
  /** 价格状态：NORMAL / PENDING / BUNDLED / NEGOTIABLE / OUT_OF_STOCK …（后端字符串枚举，前端不硬编码全集）。 */
  priceStatus: string
  /** 备注。 */
  remark: string
}

/** 写入一格时允许只改其中几个字段。 */
export type CollabCellPatch = Partial<CollabCellValue>

/** 文档 meta 表里的字段（键名与后端契约一致）。 */
export type CollabMeta = {
  listId: string
  supplierId: string
  brandName: string
  quotedOn: string
  warehouse: string
  version: number | null
}

/** 生成 cellKey 的入参：与网格行键同构（类别 / 材质 / 规格 / 定尺）。 */
export type CollabCellParts = {
  category: string
  material: string
  spec: number | string
  length: string
}

/**
 * 网格行键 → CRDT 格键的**唯一转换处**。
 *
 * <p>REST 侧的行键是 `类别|材质|规格|定尺`（见 `quoteRowKey`），CRDT 侧要换成 NUL。
 * 两套键的字段顺序完全一致，但**不要**在调用方自己 replace —— 一旦哪天行键格式变了，
 * 这里改一处即可。</p>
 */
export function collabCellKeyOf(parts: CollabCellParts): string {
  return [
    parts.category,
    parts.material,
    String(parts.spec),
    parts.length,
  ].join(COLLAB_CELL_KEY_SEPARATOR)
}

/**
 * REST 行键（`类别|材质|规格|定尺`）→ CRDT 格键。
 *
 * <p>仅用于「服务端已有的格子不许丢」这类从 REST 快照反向播种的场景；新代码请优先用
 * {@link collabCellKeyOf} 直接按字段拼，避免先拼再拆。</p>
 */
export function collabCellKeyOfRowKey(rowKey: string): string {
  return rowKey.split('|').join(COLLAB_CELL_KEY_SEPARATOR)
}

/** CRDT 格键 → REST 行键（反向转换，供播种/对账用）。 */
export function collabRowKeyOfCellKey(cellKey: string): string {
  return cellKey.split(COLLAB_CELL_KEY_SEPARATOR).join('|')
}

function cellsOf(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap<Y.Map<unknown>>(CELLS_MAP_NAME)
}

/** 文档的 meta 表（只读用途；写入请用 {@link writeCollabMeta}）。 */
export function collabMetaOf(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap<unknown>(META_MAP_NAME)
}

function toFinitePrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return null
}

function toText(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

/**
 * 读一格。
 *
 * <p>返回 `null` 表示**文档里没有这一格**（还没同步到 / 还没人填过），与"这一格显式为空格"
 * （`{ price: null }`）不是一回事 —— 前者应由调用方回退到 REST 快照，后者要渲染成空格。</p>
 */
export function readCollabCell(
  doc: Y.Doc,
  cellKey: string,
): CollabCellValue | null {
  const cell = cellsOf(doc).get(cellKey)
  if (!cell) return null
  return {
    price: toFinitePrice(cell.get('price')),
    priceStatus: toText(cell.get('priceStatus'), DEFAULT_COLLAB_PRICE_STATUS),
    remark: toText(cell.get('remark'), ''),
  }
}

/**
 * 读一格的价格：`undefined` = 文档里没有这一格；`null` = 明确不报价。
 *
 * <p>两个空值必须分开：`undefined` 让界面回退到 REST 值，`null` 才是"清空"。</p>
 */
export function readCollabPrice(
  doc: Y.Doc,
  cellKey: string,
): number | null | undefined {
  const cell = cellsOf(doc).get(cellKey)
  if (!cell) return undefined
  return toFinitePrice(cell.get('price'))
}

/**
 * 写一格（本地 origin）。
 *
 * <p>整格语义：只写补丁里出现的字段，未出现的字段保持文档里的现值；新格缺省为
 * `{ price: null, priceStatus: NORMAL, remark: '' }`。</p>
 */
export function writeCollabCell(
  doc: Y.Doc,
  cellKey: string,
  patch: CollabCellPatch,
): void {
  doc.transact(() => {
    const cells = cellsOf(doc)
    let cell = cells.get(cellKey)
    if (!cell) {
      cell = new Y.Map<unknown>()
      cells.set(cellKey, cell)
    }
    if ('price' in patch) {
      cell.set('price', toFinitePrice(patch.price))
    }
    if ('priceStatus' in patch) {
      cell.set(
        'priceStatus',
        toText(patch.priceStatus, DEFAULT_COLLAB_PRICE_STATUS),
      )
    }
    if ('remark' in patch) {
      cell.set('remark', toText(patch.remark, ''))
    }
  }, COLLAB_LOCAL_ORIGIN)
}

/** 写 meta（建房时由前端补一份文档头，物化器以它为准）。 */
export function writeCollabMeta(doc: Y.Doc, meta: Partial<CollabMeta>): void {
  doc.transact(() => {
    const map = collabMetaOf(doc)
    for (const [key, value] of Object.entries(meta)) {
      if (value !== undefined) map.set(key, value)
    }
  }, COLLAB_LOCAL_ORIGIN)
}

/** 读 meta（缺省字段给空串 / null，避免调用方各自判空）。 */
export function readCollabMeta(doc: Y.Doc): CollabMeta {
  const map = collabMetaOf(doc)
  const version = map.get('version')
  return {
    listId: toText(map.get('listId'), ''),
    supplierId: toText(map.get('supplierId'), ''),
    brandName: toText(map.get('brandName'), ''),
    quotedOn: toText(map.get('quotedOn'), ''),
    warehouse: toText(map.get('warehouse'), ''),
    version:
      typeof version === 'number' && Number.isFinite(version) ? version : null,
  }
}

/** 文档里还没有任何格子（= 房间是新建的，需要从 REST 快照播种）。 */
export function isCollabDocEmpty(doc: Y.Doc): boolean {
  return cellsOf(doc).size === 0
}

/**
 * 用 REST 快照播种文档。
 *
 * <p>只在文档为空时调用（{@link isCollabDocEmpty}）：已存在的房间以文档为准，
 * 反向覆盖会把别人刚改的值打回去。`overwrite=true` 仅供测试与"结构变更后重建"使用。</p>
 */
export function seedCollabCells(
  doc: Y.Doc,
  entries: Iterable<readonly [string, CollabCellValue]>,
  options: { overwrite?: boolean; origin?: unknown } = {},
): void {
  const overwrite = options.overwrite === true
  doc.transact(() => {
    const cells = cellsOf(doc)
    for (const [cellKey, value] of entries) {
      if (!overwrite && cells.has(cellKey)) continue
      let cell = cells.get(cellKey)
      if (!cell) {
        cell = new Y.Map<unknown>()
        cells.set(cellKey, cell)
      }
      cell.set('price', toFinitePrice(value.price))
      cell.set(
        'priceStatus',
        toText(value.priceStatus, DEFAULT_COLLAB_PRICE_STATUS),
      )
      cell.set('remark', toText(value.remark, ''))
    }
  }, options.origin ?? COLLAB_SEED_ORIGIN)
}

/** 一次格子变化。 */
export type CollabCellChange = {
  cellKey: string
  /** 变化后的整格状态；`null` 表示这一格被删除。 */
  value: CollabCellValue | null
  /** 是否来自远端（provider 应用的其他人的 update）。 */
  remote: boolean
}

/**
 * 观察格子变化。
 *
 * <p>回调里区分本地/远端：本地的改动不需要冲突提示，远端的才要（设计文档 §8）。
 * `remote` 用事务 origin 判定 —— 本模块所有本地写都带 {@link COLLAB_LOCAL_ORIGIN}，
 * 其余 origin（provider 实例、初始同步）一律视为远端。</p>
 *
 * <p>必须用 `observeDeep`：格是**嵌套**的 `Y.Map`，改一个已有格的价格触发的是内层表的变更，
 * 外层 `cells` 表的 `observe` 收不到（只有新增/删除整格才有外层事件）。早期版本用 `observe`，
 * 结果"第二次改同一格"不会被观察者看到。</p>
 */
export function observeCollabCells(
  doc: Y.Doc,
  listener: (changes: readonly CollabCellChange[]) => void,
): () => void {
  const handler = (
    events: Y.YEvent<Y.AbstractType<unknown>>[],
    transaction: Y.Transaction,
  ) => {
    // 播种既不是用户操作、也不是远端协作，按本地处理（见 COLLAB_SEED_ORIGIN）
    const remote =
      transaction.origin !== COLLAB_LOCAL_ORIGIN &&
      transaction.origin !== COLLAB_SEED_ORIGIN
    const cellKeys = new Set<string>()
    for (const event of events) {
      // 嵌套事件（改格内字段）：path[0] 就是 cells 表里的格键
      const [pathRoot] = event.path
      if (typeof pathRoot === 'string') {
        cellKeys.add(pathRoot)
        continue
      }
      // 外层事件（新增/删除整格）
      if (event instanceof Y.YMapEvent) {
        for (const key of event.keysChanged) cellKeys.add(key)
      }
    }
    const changes: CollabCellChange[] = [...cellKeys].map((cellKey) => ({
      cellKey,
      value: readCollabCell(doc, cellKey),
      remote,
    }))
    if (changes.length) listener(changes)
  }
  const cells = cellsOf(doc)
  cells.observeDeep(handler)
  return () => cells.unobserveDeep(handler)
}
