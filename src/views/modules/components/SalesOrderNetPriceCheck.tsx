import type { ModuleRecord } from '@/types/module-page'
import { useSalesOrderNetPriceCheck } from './use-sales-order-net-price-check'

/**
 * 只读详情面的「网价匹配」核查挂载点（无 UI）。
 *
 * <p>「网价匹配」列的取值不在明细行上, 而是页面级快照; 只读详情面(详情弹窗 / 列表行「+」展开)
 * 没有取价工具栏, 所以在这里发起一次自动核查 —— 否则这一列永远显示「未核查」且提示语指向
 * 一个不存在的按钮。</p>
 *
 * <p>由模块配置的 `renderDetailExtras` 挂载(销售订单), 通用详情组件不需要知道"网价"这件事。</p>
 */
export function SalesOrderNetPriceCheck({
  record,
}: {
  record: ModuleRecord | null
}) {
  useSalesOrderNetPriceCheck(record)
  return null
}
