import { type RefObject, useLayoutEffect } from 'react'

/**
 * antd / `@rc-component/table` 为测量列宽渲染的隐藏行类名。
 *
 * <p>该行由 rc-table 的 `MeasureRow` 生成：`<tr aria-hidden="true" style="height:0">`，
 * 内容是把每一列的 `title` 原样 `cloneElement` 一份（见
 * `@rc-component/table/es/Body/MeasureRow.js`）。因此列头里所有可聚焦的东西
 * （列头右键菜单触发器、全选 checkbox）都会在这里出现第二次。</p>
 */
const MEASURE_ROW_SELECTOR = '.ant-table-measure-row'

/**
 * measure-row 内需要退出 Tab 序列的候选元素。
 *
 * <p>为什么用「属性选择器 + 原生控件」而不是 `querySelectorAll('[tabindex]')`：
 * rc-table 克隆出来的 checkbox `<input>` 本身没有 `tabindex` 属性（input 默认可聚焦），
 * 只匹配 `[tabindex]` 会漏掉它；而剩下的可聚焦元素必然带 `tabindex` 属性。</p>
 */
const MEASURE_ROW_FOCUS_CANDIDATE_SELECTOR = [
  '[tabindex]',
  'input',
  'button',
  'select',
  'textarea',
  'a[href]',
].join(', ')

/**
 * 把 antd 表格「测量行」里的可聚焦元素全部移出 Tab 序列。
 *
 * <p><b>缺陷</b>：`.ant-table-measure-row` 带 `aria-hidden="true"` 且高度为 0，
 * 但内部克隆了一份表头 —— 列头右键菜单触发器带 `tabIndex={0}`、全选 checkbox 天然可聚焦。
 * 键盘用户连续 Tab 时会掉进这块视觉不可见、读屏完全静默的区域（实测 `/sales-order`
 * 一轮 Tab 有 14 个停靠点落在里面），违反 WCAG 2.2 SC 2.4.3 Focus Order 与
 * SC 4.1.2 Name, Role, Value；axe 报 `aria-hidden-focus`（serious）。</p>
 *
 * <p><b>为什么需要 MutationObserver</b>：这类属性由上游组件自行渲染，且表格在列变化、
 * 数据加载、标签页重新激活（React 19 `Activity` 会重跑 effect）时都会重建测量行，
 * 只做一次性写入会被静默还原。因此沿用 `src/layouts/tabs/useTabAriaWiring.ts` 已经验证过的
 * 「先接管、再观察重夺」模式：写入前比对现值，避免自触发循环。</p>
 *
 * <p><b>为什么只能走 DOM 接管</b>：测量行里的可聚焦元素来源分散 —— 列头右键菜单触发器
 * 由本仓库渲染，全选 checkbox 由 antd 自己渲染。后者改不到源头；前者虽然理论上可以在
 * 组件里判「是否处于测量行」，但 antd 唯一可用的标记 `TableMeasureRowContext` 只有
 * default 导出，deep import 会被 `antd:lint` 判 performance 违规（antd 未在顶层导出它），
 * 因此源码级分叉不成立。两条宿主统一在本 hook 收口，避免出现两份实现。</p>
 *
 * <p><b>唯一来源</b>：measure-row 里可聚焦元素的接管只有这一个实现，
 * `BusinessGridTable` 与 `MasterDataTable` 两个表格宿主都只调用本 hook，不得各自复制一份。</p>
 *
 * @param hostRef 表格宿主元素（包含 `.ant-table` 的容器，通常就是 `.module-table-shell`）
 */
export function useMeasureRowA11y(
  hostRef: RefObject<HTMLElement | null>,
): void {
  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) {
      return
    }

    let frameId = 0

    /** 把当前所有测量行内的可聚焦元素置为 `tabindex="-1"`（幂等，写前比对）。 */
    const takeOver = () => {
      frameId = 0
      const rows = host.querySelectorAll<HTMLElement>(MEASURE_ROW_SELECTOR)
      if (rows.length === 0) {
        return
      }
      rows.forEach((row) => {
        const candidates = row.querySelectorAll<HTMLElement>(
          MEASURE_ROW_FOCUS_CANDIDATE_SELECTOR,
        )
        candidates.forEach((element) => {
          if (element.getAttribute('tabindex') === '-1') {
            return
          }
          element.setAttribute('tabindex', '-1')
        })
      })
    }

    /**
     * 观察器回调可能在一批 DOM 变更里被触发多次，用 rAF 合并成一次扫描，
     * 避免表格加载 30 行数据时对整棵子树反复 `querySelectorAll`。
     */
    const scheduleTakeOver = () => {
      if (frameId !== 0) {
        return
      }
      frameId = requestAnimationFrame(takeOver)
    }

    takeOver()

    const observer = new MutationObserver(scheduleTakeOver)
    observer.observe(host, {
      subtree: true,
      childList: true,
      // 只关心 tabindex 被改回去（rc-table 重建测量行时不会复用旧节点，但上游属性写入要重夺）
      attributes: true,
      attributeFilter: ['tabindex'],
    })

    return () => {
      observer.disconnect()
      if (frameId !== 0) {
        cancelAnimationFrame(frameId)
      }
    }
  }, [hostRef])
}
