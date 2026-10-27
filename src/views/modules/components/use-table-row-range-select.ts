import type { TableProps } from 'antd'
import { type RefObject, useCallback, useRef, useState } from 'react'
import type { ModuleRecord } from '@/types/module-page'
import { shouldIgnoreRowInteraction } from '@/views/modules/components/business-grid-table-utils'
import { resolveRowRangeSelection } from '@/views/modules/components/table-row-range-selection'

/** 超过这个位移才算"拖拽"，否则仍是一次普通点选（手抖不误框选） */
const DRAG_THRESHOLD_PX = 4
/** 指针进入表体上下这个范围就开始自动滚动 */
const AUTO_SCROLL_EDGE_PX = 28
/** 自动滚动每帧步长（px） */
const AUTO_SCROLL_STEP_PX = 14
/**
 * 拖拽收尾的 click 抑制窗口（ms）。
 *
 * <p>必须是"时间窗"而不是一个布尔位：鼠标从 A 行拖到 B 行时，浏览器把 click 派发到两者
 * 的最近公共祖先（`tbody`），行级 `onClick` 根本收不到，标志位就永远挂着，
 * 于是**下一次真正的点选被吞掉**（实测：拖完再点一行，行没被选中）。</p>
 */
const CLICK_SUPPRESSION_MS = 300

interface Params {
  /** 表格外壳（`.module-table-shell`）：用来找表体滚动容器 */
  containerRef: RefObject<HTMLElement | null>
  dataSource: ModuleRecord[]
  rowSelection: TableProps<ModuleRecord>['rowSelection'] | undefined
}

export interface RowRangeSelectApi {
  /** 正在框选：外壳加 class，并抑制 drag 结束后那一次 click 的点选 */
  isRangeSelecting: boolean
  /** 挂到行的 `onPointerDown`（`onRow(record, index)` 里） */
  onRowPointerDown: (
    event: React.PointerEvent<HTMLElement>,
    index: number,
  ) => void
  /** 行 `onClick` 里先问一句：这次 click 是拖拽的尾巴吗 */
  consumeClickSuppression: () => boolean
}

/**
 * 表格行「按住拖拽 = 批量勾选」（Windows 资源管理器 / Excel 的框选）。
 *
 * <p>antd 的 `rowSelection` 只提供 `onChange` / `renderCell` 这类钩子，**没有**框选；
 * 这里用原生指针事件补上，结果走同一条 `onChange` 通道 —— 与勾选框、`Space` 键点选
 * 是同一个出口，勾选状态没有第二份实现。</p>
 *
 * <p>行为：</p>
 * <ul>
 *   <li>在行的非交互区域按下（主键）→ 记录起点；位移超过 4px 才算拖拽，并从这一刻起
 *     清掉浏览器已拉出的"划词"选区（表体本身已 `user-select: none`）；</li>
 *   <li>拖动中按「起点 ~ 当前行」勾选，向上向下都支持；按住 Ctrl/⌘ 时并入原勾选；</li>
 *   <li>指针贴到表体上下边缘自动滚动（否则大范围框选只能选到可见的那几行）；</li>
 *   <li>Escape 取消并恢复拖拽前的勾选；松手后抑制紧随的 click，避免起点行被反选一次。</li>
 * </ul>
 *
 * <p><b>已知副作用</b>：勾选从 0 变 1 的那一刻，「已选择 N 项」横幅会插进工具栏与表格之间，
 * 表格整体下移约 50px —— 框选开始时指针下的行会因此变一行。这是横幅布局的既有行为
 * （点选单行也一样），不是框选逻辑的 bug：后续的 pointermove 都会按新布局重新命中，
 * 松手时选区与指针下的行是一致的。</p>
 *
 * <p>**监听器在 pointerdown 里同步挂载**（而不是用 `useEffect` 跟着 state 挂）：
 * 拖动可能在下一帧就发生，等 effect 跑完再挂会丢掉最初的几个 `pointermove`，
 * 表现为"拖了没反应"（实测第一版就是这样）。</p>
 *
 * <p>触屏不参与（`pointerType === 'touch'` 直接返回）：触摸下的拖动要留给滚动。</p>
 */
export function useTableRowRangeSelect({
  containerRef,
  dataSource,
  rowSelection,
}: Params): RowRangeSelectApi {
  const [dragging, setDragging] = useState(false)
  /** 抑制窗口的截止时间戳（0 = 不抑制） */
  const suppressClickUntilRef = useRef(0)

  const onRowPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>, index: number) => {
      if (!rowSelection?.onChange) return
      if (event.button !== 0) return
      // 触摸拖动留给滚动，点选行为不变
      if (event.pointerType === 'touch') return
      // 从按钮/复选框/输入框上按下 = 点那个控件，不是开始框选
      if (shouldIgnoreRowInteraction(event.target)) return

      // 新手势开始：上一次拖拽留下的抑制窗口作废
      suppressClickUntilRef.current = 0
      const onChange = rowSelection.onChange
      const baseKeys = (rowSelection.selectedRowKeys ?? []).map(String)
      const startX = event.clientX
      const startY = event.clientY
      let lastX = startX
      let lastY = startY
      let started = false
      let additive = event.ctrlKey || event.metaKey
      /** 上一次真正提交的 key：用它判重（外部 state 可能还没回流，不能拿来比） */
      let lastKeys: string[] = baseKeys
      let rafId: number | null = null
      let detached = false

      const focusIndexAt = (
        clientX: number,
        clientY: number,
      ): number | null => {
        const body = containerRef.current?.querySelector<HTMLElement>(
          '.ant-table-body, .ant-table-content',
        )
        if (!body) return null
        const rect = body.getBoundingClientRect()
        // 拖到表格外面继续扩选：夹到首/末行
        if (clientY < rect.top) return 0
        if (clientY > rect.bottom) return dataSource.length - 1
        const rowElement = document
          .elementFromPoint(clientX, clientY)
          ?.closest<HTMLElement>('tr[data-row-key]')
        const rowKey = rowElement?.dataset.rowKey
        if (!rowKey) return null
        const found = dataSource.findIndex((row) => String(row.id) === rowKey)
        return found >= 0 ? found : null
      }

      const applyRange = (focusIndex: number, merge: boolean) => {
        const { keys, rows } = resolveRowRangeSelection({
          dataSource,
          anchorIndex: index,
          focusIndex,
          baseKeys,
          additive: merge,
        })
        const unchanged =
          keys.length === lastKeys.length &&
          keys.every((key, at) => key === lastKeys[at])
        if (unchanged) return
        lastKeys = keys
        onChange(keys, rows, { type: 'multiple' })
      }

      const tickAutoScroll = () => {
        rafId = null
        if (detached) return
        const body =
          containerRef.current?.querySelector<HTMLElement>('.ant-table-body')
        if (body) {
          const rect = body.getBoundingClientRect()
          let delta = 0
          if (lastY < rect.top + AUTO_SCROLL_EDGE_PX) {
            delta = -AUTO_SCROLL_STEP_PX
          } else if (lastY > rect.bottom - AUTO_SCROLL_EDGE_PX) {
            delta = AUTO_SCROLL_STEP_PX
          }
          if (delta !== 0) {
            const before = body.scrollTop
            body.scrollTop = before + delta
            if (body.scrollTop !== before) {
              const focusIndex = focusIndexAt(lastX, lastY)
              if (focusIndex !== null) applyRange(focusIndex, additive)
            }
          }
        }
        rafId = requestAnimationFrame(tickAutoScroll)
      }

      const detach = () => {
        if (detached) return
        detached = true
        if (rafId !== null) cancelAnimationFrame(rafId)
        rafId = null
        window.removeEventListener('pointermove', handleMove)
        window.removeEventListener('pointerup', handleUp)
        window.removeEventListener('pointercancel', handleUp)
        window.removeEventListener('keydown', handleKeyDown)
        setDragging(false)
      }

      function handleMove(moveEvent: PointerEvent) {
        lastX = moveEvent.clientX
        lastY = moveEvent.clientY
        additive = moveEvent.ctrlKey || moveEvent.metaKey

        if (!started) {
          const moved =
            Math.abs(lastY - startY) >= DRAG_THRESHOLD_PX ||
            Math.abs(lastX - startX) >= DRAG_THRESHOLD_PX
          if (!moved) return
          started = true
          setDragging(true)
          // 拖拽一成立就清掉浏览器已经拉出的选区痕迹
          document.getSelection()?.removeAllRanges()
          rafId = requestAnimationFrame(tickAutoScroll)
        }

        const focusIndex = focusIndexAt(lastX, lastY)
        if (focusIndex !== null) applyRange(focusIndex, additive)
      }

      function handleUp() {
        // 拖拽的收尾 click 不该再把起点行反选一次
        if (started) {
          suppressClickUntilRef.current =
            performance.now() + CLICK_SUPPRESSION_MS
        }
        detach()
      }

      function handleKeyDown(keyEvent: KeyboardEvent) {
        if (keyEvent.key !== 'Escape') return
        if (started) {
          // 取消：恢复拖拽前的勾选
          const baseKeySet = new Set(baseKeys)
          onChange(
            [...baseKeys],
            dataSource.filter((row) => baseKeySet.has(String(row.id))),
            { type: 'multiple' },
          )
          suppressClickUntilRef.current =
            performance.now() + CLICK_SUPPRESSION_MS
        }
        detach()
      }

      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerup', handleUp)
      window.addEventListener('pointercancel', handleUp)
      window.addEventListener('keydown', handleKeyDown)
    },
    [containerRef, dataSource, rowSelection],
  )

  const consumeClickSuppression = useCallback(() => {
    if (performance.now() > suppressClickUntilRef.current) return false
    suppressClickUntilRef.current = 0
    return true
  }, [])

  return {
    isRangeSelecting: dragging,
    onRowPointerDown,
    consumeClickSuppression,
  }
}
