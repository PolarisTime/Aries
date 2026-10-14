import type { ClientRect, UniqueIdentifier } from '@dnd-kit/core'
import {
  type Collision,
  type CollisionDetection,
  closestCenter,
} from '@dnd-kit/core'

/** 纵向中心: 列表落位只关心纵向。 */
function verticalCenter(rect: ClientRect): number {
  return rect.top + rect.height / 2
}

/**
 * 纵向列表的**落位判定** —— 变高行的落位口径。
 *
 * <p>dnd-kit 默认的 `closestCenter` 在**等高行**下没问题, 但它比的是"拖动项中心到各行
 * 中心"的直线距离。行高不一时这个口径会出错, 是社区已知的坑: 明细表里"备注换行、
 * 拆分预览展开、含多个标签"的行天然比别的行高, 拖动时会晚一格或早一格落位。
 * 例: 行高 20 / 100 / 20, 把末行上移 40px —— 它的中心(80)还没越过中间那行的中心(60)
 * 之外的任何中心线, 直线上却更靠近中间行, 于是被错误地插到中间。</p>
 *
 * <p>这里改成按**行序逐一比较中心线**的判定, 与行高无关:</p>
 * <ol>
 *   <li>把候选行按纵向位置排序(拖动项用拖动起始位置参与排序, 避免它跟着指针"漂"到别处);</li>
 *   <li>按拖动方向数出"已经越过的行数", 该数量在**移除拖动项后的序列**里就是目标下标
 *       (与 `arrayMove` 的语义一致);</li>
 *   <li>向下移动时用"越过(≤)"、向上移动时用"未越过(&lt;)" —— 正好压在中线上时,
 *       向下算越过、向上算没越过, 保证同一个位置只会有一个稳定落点。</li>
 * </ol>
 *
 * <p>拿不到拖动起始矩形(理论上只会在渲染的第一帧)时退回 dnd-kit 的默认判定, 不硬报错。</p>
 */
export const rowDragCollisionDetection: CollisionDetection = (args) => {
  const { active, collisionRect, droppableContainers, droppableRects } = args
  const initialRect =
    active.rect.current.initial ?? droppableRects.get(active.id)
  if (!collisionRect || !initialRect) return closestCenter(args)

  const rows: Array<{
    id: UniqueIdentifier
    rect: ClientRect
    container: (typeof droppableContainers)[number]
  }> = []
  for (const container of droppableContainers) {
    const measured = droppableRects.get(container.id)
    const rect =
      container.id === active.id ? initialRect : (measured ?? undefined)
    if (!rect) continue
    rows.push({ id: container.id, rect, container })
  }
  if (rows.length < 2) return closestCenter(args)

  rows.sort((a, b) => a.rect.top - b.rect.top)

  const center = verticalCenter(collisionRect)
  const origin = verticalCenter(initialRect)
  const target = resolveTargetRow(rows, active.id, center, origin)

  return orderCollisions(rows, target.id, center)
}

interface RowCandidate {
  id: UniqueIdentifier
  rect: ClientRect
  container: unknown
}

/**
 * 目标行 id: 数出"拖动项中心已越过的其它行数"(= 移除拖动项后的目标下标),
 * 再取其在该序列里的那个 id。返回拖动项自身表示落位不变。
 */
function resolveTargetRow(
  rows: RowCandidate[],
  activeId: UniqueIdentifier,
  center: number,
  origin: number,
): RowCandidate {
  const movingDown = center > origin
  const movingUp = center < origin
  if (!movingDown && !movingUp) {
    return rows.find((row) => row.id === activeId) ?? rows[0]
  }
  let passed = 0
  for (const row of rows) {
    if (row.id === activeId) continue
    const midpoint = verticalCenter(row.rect)
    if (movingDown ? midpoint <= center : midpoint < center) passed += 1
  }
  return rows[Math.min(passed, rows.length - 1)] ?? rows[0]
}

/** 目标行排第一(dnd-kit 只取首个 collision), 其余按到拖动项中心的距离补齐。 */
function orderCollisions(
  rows: RowCandidate[],
  targetId: UniqueIdentifier,
  center: number,
): Collision[] {
  const toCollision = (row: RowCandidate): Collision => ({
    id: row.id,
    data: {
      value: Math.abs(verticalCenter(row.rect) - center),
      rowRect: row.rect,
    },
  })
  const target = rows.find((row) => row.id === targetId)
  const rest = rows
    .filter((row) => row.id !== targetId)
    .sort(
      (a, b) =>
        Math.abs(verticalCenter(a.rect) - center) -
        Math.abs(verticalCenter(b.rect) - center),
    )
  return target
    ? [toCollision(target), ...rest.map(toCollision)]
    : rows.map(toCollision)
}
