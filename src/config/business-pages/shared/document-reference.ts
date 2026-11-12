import { createElement } from 'react'

/**
 * 单据编号列的唯一渲染出口（销售订单、采购订单，以及后续的入库/出库/退货/物流单）。
 *
 * <p>类名是**契约**：`document-reference-trigger` 供单据流弹层（`useDocumentFlow` 一类）
 * 在列表里找到可点击的单号，`document-reference-link` 提供链接态样式。两个类名写在
 * 样式与触发逻辑里，因此单号列不能各页各写一份 —— 一旦某页漏了外层类名，
 * 那一列的单号就点不出单据流，且没有任何报错。</p>
 *
 * <p>历史上单号后还追加过「下游引用状态图标」，已按产品要求整体下线（连同后端
 * `referencedBy*` 行级字段一起删除）。若将来要恢复，加在这个函数里，一处生效。</p>
 */
export function renderDocumentReferenceNo(value: unknown): React.ReactNode {
  return createElement(
    'span',
    { className: 'document-reference-trigger' },
    createElement(
      'span',
      { className: 'document-reference-link' },
      String(value ?? ''),
    ),
  )
}
