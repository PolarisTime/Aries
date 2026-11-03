import { SupplierQuoteBoard } from './SupplierQuoteBoard'

/**
 * 供应商报价表（比价一手价）页面入口。
 *
 * <p>交互实现见 {@link SupplierQuoteBoard}：以**供应商为主轴**的报价工作台
 * （一张表 = 一个供应商，行 = 商品规格，列 = 该供应商的经营品牌，敲完即存）。</p>
 */
export function SupplierQuotePage() {
  return <SupplierQuoteBoard />
}
