/**
 * 报单比价表格的固定列宽常量。
 *
 * <p>「行操作」列只放一个 icon-only 的「更多」按钮(点击/右键共用同一份菜单),
 * 因此取 icon-only 最小值 28px: 单元格左右各留 2px 后内容区仍是 24px,
 * 满足 WCAG 2.5.8 的 24×24 命中区(热区由 `styles/touch-targets.css` 的
 * `::before` 进一步补足, 视觉尺寸不变)。</p>
 */
export const PRICE_COMPARE_ROW_ACTIONS_COLUMN_WIDTH = 28
