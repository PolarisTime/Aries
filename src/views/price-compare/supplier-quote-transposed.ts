import { type QuoteRow, quoteRowKey } from './supplier-price-list-model'
import { lengthRank } from './supplier-quote-grid'

/**
 * 规格横置（定尺进表头）：一个规格行 + 各定尺的格键。
 *
 * <p>布局对齐纸质/Excel 报价单：**行 = 规格，列 = 定尺**，材质作为列组表头横跨各定尺
 * （见下方 `材质 | HRB400E` + `规格 | 9米 | 12米` 两层表头）。</p>
 */
export type TransposedRow = {
  spec: number
  /** 定尺 → 该格的行键（`类别|材质|规格|定尺`）；该规格没有这个定尺时没有键，渲染为「—」。 */
  cells: Record<string, string>
}

/** 一个材质块：列 = 该材质出现过的定尺，行 = 规格升序。 */
export type TransposedBlock = {
  category: string
  material: string
  lengths: string[]
  rows: TransposedRow[]
}

/** 一个品牌分块：品牌下按品类拆开（不同品类的规格集合不同，不能共用同一组行）。 */
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

/**
 * 定尺列头：`9米` / `12米`；无定尺（卷材，`''` 或 `'-'`）显示为「—」。
 *
 * <p>没有定尺的商品（盘螺一类）只占一列，用「—」表示"这一列不是某个定尺"，
 * 而不是把 `'-'` 这种占位值直接摆到表头。</p>
 */
export function lengthHeader(length: string): string {
  return length === '' || length === '-' ? '—' : length
}

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
 * 品牌分块 → 品类块 → 材质块（材质名横跨定尺列）→ 行 = 规格，列 = 定尺。
 *
 * <p>为什么按品类再按材质分块：螺纹钢是 Φ12–Φ32、盘螺是 Φ6–Φ12、圆钢是 Φ40–Φ60，
 * 各品类规格集合不同；同一品类里 HRB400 / HRB400E / HPB300 的规格集合也可能不同。
 * 硬合并成一张表会出现大量空列 —— 真实报价单也是"每个材质一张小表"。</p>
 *
 * <p>顺序：品类按业务习惯（螺纹钢 → 直条 → 盘螺 → 线材 → 圆钢，未列出的按首次出现），
 * 材质按名称升序，定尺按报价习惯（9米 → 12米 → 无定尺），规格数值升序。</p>
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
    .flatMap(({ category, list }) => {
      const byMaterial = new Map<string, QuoteRow[]>()
      for (const row of list) {
        const materialRows = byMaterial.get(row.material)
        if (materialRows) materialRows.push(row)
        else byMaterial.set(row.material, [row])
      }
      return [...byMaterial.entries()]
        .map(([material, materialRows], order) => ({
          material,
          materialRows,
          order,
        }))
        .sort(
          (left, right) =>
            left.material.localeCompare(right.material, 'zh-Hans-CN') ||
            left.order - right.order,
        )
        .map(({ material, materialRows }) => {
          const lengths = [
            ...new Set(materialRows.map((row) => row.length)),
          ].sort((left, right) => lengthRank(left) - lengthRank(right))
          const specs = [...new Set(materialRows.map((row) => row.spec))].sort(
            (left, right) => left - right,
          )
          const transposedRows = specs.map<TransposedRow>((spec) => {
            const cells: Record<string, string> = {}
            for (const row of materialRows) {
              if (row.spec === spec) cells[row.length] = quoteRowKey(row)
            }
            return { spec, cells }
          })
          return { category, material, lengths, rows: transposedRows }
        })
    })

  return brandNames.map((brandName) => ({ brandName, blocks }))
}
