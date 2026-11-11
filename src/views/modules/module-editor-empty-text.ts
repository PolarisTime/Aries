/**
 * 明细表空态文案的唯一出口。
 *
 * <p>两种模块的"下一步"不一样，所以文案不能统一：</p>
 * <ul>
 *   <li>**允许手工新增行**的模块（采购订单等）：antd 默认「暂无数据」就够了 ——
 *       工具栏上的「新增明细」是显而易见的下一步，再写一句引导只是噪音。</li>
 *   <li>**只允许从上级单据导入**的模块（销售订单、采购入库、对账单等，行为配置
 *       `allowsManualLineItems: false`）：工具栏没有「新增明细」，只留「暂无数据」会让人
 *       以为"这里没法加行"。必须指出唯一入口，且要带上该模块自己的按钮名
 *       （销售订单是「导入采购订单明细」，采购入库是「导入采购订单」…）。</li>
 * </ul>
 *
 * <p>返回 `undefined` 表示"交给 antd 默认空态"（`Table` 的 `locale` 不传）。</p>
 */
export function resolveItemsEmptyText(options: {
  /** 当前单据是否允许手工新增明细行（`canAddManualItemsForCurrentRecord`）。 */
  canAddManualItems: boolean
  /** 该模块「导入上级单据」按钮的显示文案；没有导入能力时为 undefined。 */
  importActionLabel?: string
  /** 翻译函数（`t('modules.itemsSection.emptyImportOnlyHint', { action })`）。 */
  t: (key: string, options?: Record<string, unknown>) => string
}): string | undefined {
  const { canAddManualItems, importActionLabel, t } = options
  if (canAddManualItems) return undefined
  if (!importActionLabel) return t('modules.itemsSection.emptyNoManualHint')
  return t('modules.itemsSection.emptyImportOnlyHint', {
    action: importActionLabel,
  })
}
