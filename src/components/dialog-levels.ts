/**
 * 嵌套弹窗（2 级 / 3 级）的层级规范 —— 系统里所有"弹窗里再开弹窗"都读这里，别各自写尺寸。
 *
 * <p>约定（与主数据表单排版规范同源，全部按 8 的倍数）：</p>
 * <ul>
 *   <li>1 级：主数据表单对话框 / 页面级弹层，宽 `min(1040px, 100% - 24px)`；</li>
 *   <li>2 级：弹窗里再开的普通对话框，比 1 级**明显小**（720），需要并排两栏的
 *       （品牌穿梭框）用宽版 820；遮罩加深一档，让 1 级退到后面；</li>
 *   <li>3 级：预览类（PDF / 图片预览），保持大画布（1104），遮罩再深一档。</li>
 * </ul>
 *
 * <p>宽度写在 Modal 的 `width` 上（antd 用内联样式），层级相关的圆角 / 阴影 / 遮罩
 * 由 `app-dialog--level-N` / `app-dialog-root--level-N` 两个类名落到
 * `styles/dialog-levels.css`；class 生成处只在这里，避免各处手写字符串拼错。</p>
 */
export const DIALOG_LEVEL_2_WIDTH = 720
/** 2 级里需要左右并排两栏的（表格穿梭框）：比普通 2 级宽 100，仍明显小于 1 级。 */
export const DIALOG_LEVEL_2_WIDE_WIDTH = 820
export const DIALOG_LEVEL_3_WIDTH = 1104

export type DialogLevel = 2 | 3

/**
 * 层级 class：`className` 落 `.ant-modal`，`rootClassName` 落 `.ant-modal-root`（遮罩在根节点里）。
 *
 * @param extraClassName 组件自带的视觉类（如预览层的 `modal-top-20`），与层级类合并，避免覆盖。
 */
export function dialogLevelProps(level: DialogLevel, extraClassName?: string) {
  return {
    className: [extraClassName, 'app-dialog', `app-dialog--level-${level}`]
      .filter(Boolean)
      .join(' '),
    rootClassName: `app-dialog-root app-dialog-root--level-${level}`,
  } as const
}
