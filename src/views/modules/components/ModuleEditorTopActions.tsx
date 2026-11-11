import type { ReactNode } from 'react'

interface Props {
  /** 表格工具类动作（新增明细 / 导入明细 / 列设置 / 自动排序…），贴左侧 */
  tools?: ReactNode
  /** 单据级动作（取消 / 保存 / 保存并审核），贴右侧右对齐 */
  actions?: ReactNode
}

/**
 * 编辑器顶部操作栏：**工具动作靠左、单据级动作靠右**。
 *
 * <p>放在表单与明细表之前（页面标题之下、第一个卡片之上），所以它既是"全局按钮的位置"，
 * 又不会随明细表滚动而消失。此前这两组按钮分别长在明细表头和弹层底部：
 * 整页编辑器往下滚就看不到保存组，弹层向导则是「上一步/下一步」与「取消/保存」两条
 * 右对齐的条，同层级出现两个作用域不同的动作区。</p>
 *
 * <p>两组之间用 `margin-inline-start: auto` 顶开（见 module-table.css 的
 * `.editor-top-actions-global`），因此工具按钮变多时只会在左侧折行，保存组永远贴右边界。</p>
 */
export function ModuleEditorTopActions({ tools, actions }: Props) {
  return (
    <div className="editor-top-actions">
      {tools ? <div className="editor-top-actions-tools">{tools}</div> : null}
      {actions ? (
        <div className="editor-top-actions-global">{actions}</div>
      ) : null}
    </div>
  )
}
