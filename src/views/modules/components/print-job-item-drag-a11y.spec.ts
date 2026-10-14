// @vitest-environment jsdom

import i18n from 'i18next'
import { beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import type { PrintRecordItem } from '@/api/system/print-template'
import {
  buildPrintJobDragAccessibility,
  printItemRowName,
  resolvePrintItemRowNumber,
} from './print-job-item-drag-a11y'

/**
 * 打印作业明细拖动排序的**读屏产物**契约。
 *
 * <p>两个必须守住的口径:</p>
 * <ol>
 *   <li>播报只含「第 N 行 + 类别/材质/规格 + 目标位次」——19 位雪花 id 一个字符都不能出现
 *       (dnd-kit 默认文案正是 `Picked up draggable item &lt;id&gt;`);</li>
 *   <li>行号在明细不在有序集合里时 `indexOf` 返回 -1, 必须兜底为 ≥1, 不能显示 0。</li>
 * </ol>
 *
 * <p>回退验证(实际改错跑过): 去掉 DndContext 的 announcements(即不传本模块产物)时,
 * 「播报含物料名与序号」整组变红; 把 {@link resolvePrintItemRowNumber} 换回
 * `indexOf(...) + 1` 时「行号兜底」两条变红。</p>
 */

/** 19 位雪花 id: 一旦被念出来, 用户会把两串数字听成同一行。 */
const SNOWFLAKE_A = '1834671234567890123'
const SNOWFLAKE_B = '1834671234567890456'

function buildItem(overrides: Partial<PrintRecordItem>): PrintRecordItem {
  return {
    id: SNOWFLAKE_A,
    recordId: '1',
    brand: '莱钢',
    category: '螺纹钢',
    material: 'HRB400E',
    spec: '12',
    length: '9',
    quantity: '2',
    pieceWeightTon: '0.1',
    weightTon: '0.2',
    unitPrice: '3800',
    amount: '7600',
    ...overrides,
  }
}

const ITEM_A = buildItem({})
const ITEM_B = buildItem({
  id: SNOWFLAKE_B,
  category: '盘螺',
  material: 'HPB300',
  spec: '8',
})

/** dnd-kit 的 active/over 对象在测试里只需 id, 其余字段与本契约无关。 */
const activeOf = (id: string) =>
  ({ id }) as unknown as Parameters<
    ReturnType<
      typeof buildPrintJobDragAccessibility
    >['announcements']['onDragStart']
  >[0]['active']
const overOf = (id: string) =>
  ({ id }) as unknown as NonNullable<
    Parameters<
      ReturnType<
        typeof buildPrintJobDragAccessibility
      >['announcements']['onDragEnd']
    >[0]['over']
  >

describe('打印明细行号兜底', () => {
  it('明细在有序集合里时取有序位次', () => {
    expect(
      resolvePrintItemRowNumber(
        [SNOWFLAKE_B, SNOWFLAKE_A],
        [ITEM_A],
        SNOWFLAKE_A,
        0,
      ),
    ).toBe(2)
  })

  it('明细不在有序集合里时退回明细原始位次, 不出现 0', () => {
    expect(
      resolvePrintItemRowNumber([], [ITEM_B, ITEM_A], SNOWFLAKE_A, 0),
    ).toBe(2)
    // 有序集合与明细里都找不到: 用表格行号兜底, 仍是 ≥1
    expect(
      resolvePrintItemRowNumber([SNOWFLAKE_B], [ITEM_B], SNOWFLAKE_A, 4),
    ).toBe(5)
    // 连表格行号都拿不到(理论上不该发生)时也不返回 0
    expect(resolvePrintItemRowNumber([], [], SNOWFLAKE_A, -1)).toBe(1)
  })
})

describe('打印明细读屏播报', () => {
  let t: typeof i18n.t

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    t = i18n.t.bind(i18n)
  })

  const build = () => buildPrintJobDragAccessibility([ITEM_A, ITEM_B], t)

  it('行名取类别/材质/规格, 全空时给固定文案而不是 id', () => {
    expect(printItemRowName(ITEM_A, t)).toBe('螺纹钢 HRB400E 12')
    expect(
      printItemRowName(buildItem({ category: '', material: '', spec: '' }), t),
    ).toBe('该明细行')
  })

  it('拾起时播报物料名与序号', () => {
    const { announcements } = build()
    const text = announcements.onDragStart({ active: activeOf(SNOWFLAKE_A) })
    expect(text).toContain('第 1 行')
    expect(text).toContain('HRB400E')
  })

  it('移动到目标行时播报物料名与位次', () => {
    const { announcements } = build()
    const text = announcements.onDragOver({
      active: activeOf(SNOWFLAKE_A),
      over: overOf(SNOWFLAKE_B),
    })
    expect(text).toContain('第 1 行')
    expect(text).toContain('HRB400E')
    expect(text).toContain('第 2 位')
  })

  it('落位与取消都带物料名; 悬停在明细外时不播报位次', () => {
    const { announcements } = build()
    expect(
      announcements.onDragEnd({
        active: activeOf(SNOWFLAKE_B),
        over: overOf(SNOWFLAKE_A),
      }),
    ).toContain('第 1 位')
    expect(
      announcements.onDragEnd({ active: activeOf(SNOWFLAKE_B), over: null }),
    ).toContain('HPB300')
    expect(
      announcements.onDragCancel({
        active: activeOf(SNOWFLAKE_A),
        over: null,
      }),
    ).toContain('HRB400E')
    // over 指向未知行(尚未进入有序集合)时不硬凑位次
    expect(
      announcements.onDragOver({
        active: activeOf(SNOWFLAKE_A),
        over: overOf('999'),
      }),
    ).toBeUndefined()
  })

  it('任何一次播报都不含纯数字雪花 id', () => {
    const { announcements } = build()
    const texts = [
      announcements.onDragStart({ active: activeOf(SNOWFLAKE_A) }),
      announcements.onDragOver({
        active: activeOf(SNOWFLAKE_A),
        over: overOf(SNOWFLAKE_B),
      }),
      announcements.onDragEnd({
        active: activeOf(SNOWFLAKE_A),
        over: overOf(SNOWFLAKE_B),
      }),
      announcements.onDragEnd({ active: activeOf(SNOWFLAKE_A), over: null }),
      announcements.onDragCancel({
        active: activeOf(SNOWFLAKE_A),
        over: null,
      }),
    ]
    for (const text of texts) {
      expect(text).toBeTruthy()
      expect(text).not.toContain(SNOWFLAKE_A)
      expect(text).not.toContain(SNOWFLAKE_B)
    }
  })

  it('操作说明是中文, 且同时给出拖动与「上移/下移」菜单两条路径', () => {
    const { screenReaderInstructions } = build()
    expect(screenReaderInstructions.draggable).toContain('空格')
    expect(screenReaderInstructions.draggable).toContain('Shift+F10')
    expect(screenReaderInstructions.draggable).toContain('上移')
    // 不能还是 dnd-kit 的英文默认文案
    expect(screenReaderInstructions.draggable).not.toContain('draggable item')
  })
})
