import { type QuoteRow, quoteRowKey } from './supplier-price-list-model'
import { lengthRank } from './supplier-quote-grid'

/** 规格横置：一行的单元格（规格 → 该格的行键，方便直接写草稿）。 */
export type TransposedRow = {
  material: string
  length: string
  cells: Record<number, string>
}

/** 一个品类块：自己的规格列表 + 该品类下的行（材质 + 定尺）。 */
export type TransposedBlock = {
  category: string
  specs: number[]
  rows: TransposedRow[]
}

/** 一个品牌分块：品牌下按品类拆分（不同品类的规格集合不同，不能共用同一组列）。 */
export type TransposedSection = {
  brandName: string
  blocks: TransposedBlock[]
}

/**
 * 列头：`12`。
 *
 * <p>不写直径符号 Φ：报表与录入习惯里规格就是数字，Φ 只是图纸/材质标注的写法，
 * 在密集表头里还会多占一个字符宽度（用户明确要求去掉）。</p>
 */
export function specHeader(spec: number): string {
  return String(spec)
}

const pairKeyOf = (row: Pick<QuoteRow, 'material' | 'length'>) =>
  `${row.material}\u0000${row.length}`

/** 品类展示顺序（与纸质报价单一致）；未列出的品类排在后面，按首次出现顺序。 */
const CATEGORY_RANK: Record<string, number> = {
  螺纹钢: 0,
  直条: 1,
  盘螺: 2,
  线材: 3,
  圆钢: 4,
}

const categoryRankOf = (category: string) => CATEGORY_RANK[category] ?? 50

/**
 * 把「一行一个规格 + 定尺」的扁平数据重组为**规格横置**布局：
 * 品牌分块 → 品类块（规格成为列）→ 行 = 材质 + 定尺。
 *
 * <p>为什么按品类分块：螺纹钢是 Φ12–Φ32、盘螺是 Φ6–Φ12、圆钢是 Φ40–Φ60，
 * 各品类规格集合不同；硬合并成一张表会出现大量空列（真实报价单也是每个品类一块）。</p>
 *
 * <p>行顺序：材质升序 + 定尺按报价习惯（9米 → 12米 → 无定尺），与现有网格一致；
 * 品类顺序按数据里首次出现的顺序（螺纹钢 → 盘螺 → 线材 → 圆钢）。</p>
 */
export function buildTransposedSections(
  rows: readonly QuoteRow[],
  brandNames: readonly string[],
): TransposedSection[] {
  const byCategory = new Map<string, QuoteRow[]>()
  for (const row of rows) {
    const list = byCategory.get(row.category)
    if (list) list.push(row)
    else byCategory.set(row.category, [row])
  }

  const blocks: TransposedBlock[] = [...byCategory.entries()]
    .map(([category, list], order) => ({ category, list, order }))
    .sort(
      (left, right) =>
        categoryRankOf(left.category) - categoryRankOf(right.category) ||
        left.order - right.order,
    )
    .map(({ category, list }) => {
      const specs = [...new Set(list.map((row) => row.spec))].sort(
        (left, right) => left - right,
      )
      const pairs = new Map<string, { material: string; length: string }>()
      for (const row of list) {
        const key = pairKeyOf(row)
        if (!pairs.has(key)) {
          pairs.set(key, { material: row.material, length: row.length })
        }
      }
      const ordered = [...pairs.values()].sort(
        (left, right) =>
          left.material.localeCompare(right.material, 'zh-Hans-CN') ||
          lengthRank(left.length) - lengthRank(right.length),
      )
      const transposedRows = ordered.map<TransposedRow>((pair) => {
        const cells: Record<number, string> = {}
        for (const row of list) {
          if (row.material === pair.material && row.length === pair.length) {
            cells[row.spec] = quoteRowKey(row)
          }
        }
        return { ...pair, cells }
      })
      return { category, specs, rows: transposedRows }
    })

  return brandNames.map((brandName) => ({ brandName, blocks }))
}
