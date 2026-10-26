import i18next from 'i18next'
import { STATUS } from '@/constants/status-constants'
import type { ModuleOverviewItem, ModuleRecord } from '@/types/module-page'
import { formatAmount, formatInteger, formatWeight } from '@/utils/formatters'

export { formatInteger }

function sumBy(rows: ModuleRecord[], key: string) {
  return rows.reduce((sum, row) => sum + Number(row[key] || 0), 0)
}

function withUnit(value: string, unitKey: string) {
  return `${value} ${i18next.t(unitKey)}`
}

/**
 * 汇总口径。
 *
 * <p><b>为什么必须显式带口径</b>: 列表底部汇总原先只看"是否勾选"就静默换数据源 ——
 * 未勾选汇总本页 30 行、勾 2 行就变成只汇总那 2 行, 而标签仍写「单据数量」,
 * 同一屏还写着「共 88 条」。同一个标签能读出两个数, 用户会以为数据被改。</p>
 */
export type OverviewScope = 'page' | 'selection'

/**
 * 给汇总项打上口径标签 —— **汇总标签口径的唯一来源**(业务列表、主数据列表共用)。
 *
 * <p>为什么收敛在这里而不是各页的 `buildOverview`: 口径是"展示层用哪批行"的语义,
 * 而各页的 `buildOverview(rows)` 只该负责"这批行怎么算"。若让 12 个 rules 各自再实现
 * 一遍口径前缀, 就会出现本批次要修的同一类病 —— 同一个语义两处实现、迟早漂移。
 * 因此口径只在 {@link buildScopedOverview} 一处决定, 所有 `buildOverview`
 * 函数保持"纯计算、不认识选中态"。</p>
 *
 * <p>`page` 口径不加前缀: 未勾选时的汇总本来就是默认语义(本页合计),
 * 加「本页」会让 12 个页面的标签一律变长而无信息增益。`selection` 口径**必须**加,
 * 因为它是用户勾选后才出现的隐式切换。</p>
 *
 * <p><b>口径走 {@code scope} 字段, 不拼进 label</b>: 早期实现给每个指标都拼一遍前缀,
 * 勾选后一行里会出现「已选 15 项 · 单据数量：15 张 已选 15 项 · 总重量：… 已选 15 项 · 总金额：…」
 * —— 六个标签里同一个前缀重复三遍。改为打标后由渲染层「口径只写一次 + 组内平铺指标」,
 * 既短又不产生歧义(每个数值仍能看出属于哪个口径)。</p>
 */
function applyOverviewScope(
  items: ModuleOverviewItem[],
  scope: OverviewScope,
  selectedCount: number,
): ModuleOverviewItem[] {
  if (scope === 'page') return items
  const prefix = i18next.t('modules.overview.scopeSelection', {
    count: selectedCount,
  })
  /*
   * 勾选口径下丢掉「行数」类指标（单据数量 / 记录数量 / 对账单数量 …）：
   * 「已选 1 项」说的就是这个数，紧跟一句「单据数量：1 张」等于同一个数在同一行出现两次
   * （用户原话："重复了 已选 1 项 / 单据数量： / 1 张"）。标记由各 `build*Overview` 在
   * 生成指标时打（`countsRows`），口径判断只在这里做一次。
   *
   * 兜底：若某页面只汇总条数，丢掉后会只剩一个口径标签，此时保留原样 —— 宁可重复也不能
   * 让「已选 N 项」后面空着。
   */
  const deduped = items.filter((item) => !item.countsRows)
  const kept = deduped.length ? deduped : items
  return kept.map((item) => ({ ...item, scope: prefix, scopeKey: scope }))
}

/**
 * 生成底部汇总 —— 业务网格列表的**唯一出口**。
 *
 * <p>勾选态返回两组: 先「已选 N 项 · …」, 再「本页合计 · …」, 两个数字各自有名字,
 * 不再出现"同一标签两个数"。未勾选态只返回本页合计, 标签保持原样。</p>
 *
 * <p><b>两组在列表页分两处渲染</b>: 勾选组进表格上方的「已选择 N 项」横幅
 * (`ModuleSelectionAlert`), 本页组合计留在页脚 (`ModuleTablePagination`)。按 `scopeKey`
 * 拆分而不是按 `scope` 文案匹配 —— 文案会随 i18n 变，标识不会。</p>
 *
 * @param buildItems 页面配置里的纯计算函数(如 `buildAmountWeightOverview` 的偏应用)
 * @param pageRows   本页行
 * @param selectedRows 已勾选行(可见页内的部分)
 */
export function buildScopedOverview({
  buildItems,
  pageRows,
  selectedRows,
}: {
  buildItems: (rows: ModuleRecord[]) => ModuleOverviewItem[]
  pageRows: ModuleRecord[]
  selectedRows: ModuleRecord[]
}): ModuleOverviewItem[] {
  const pageItems = buildItems(pageRows)
  if (!selectedRows.length) return pageItems

  const selectedItems = applyOverviewScope(
    buildItems(selectedRows),
    'selection',
    selectedRows.length,
  )
  const pagePrefix = i18next.t('modules.overview.scopePage')
  return [
    ...selectedItems,
    ...pageItems.map((item) => ({
      ...item,
      scope: pagePrefix,
      scopeKey: 'page' as const,
    })),
  ]
}

export function buildAmountWeightOverview(
  rows: ModuleRecord[],
  amountKey: string,
  weightKey = 'totalWeight',
): ModuleOverviewItem[] {
  return [
    {
      label: i18next.t('modules.overview.documentCount'),
      value: withUnit(
        formatInteger(rows.length),
        'modules.units.documentSheet',
      ),
      /* 条数口径：勾选态下与「已选 N 项」是同一个数，由 buildScopedOverview 去重 */
      countsRows: true,
    },
    {
      label: i18next.t('modules.overview.totalWeight'),
      value: withUnit(
        formatWeight(sumBy(rows, weightKey)),
        'modules.units.ton',
      ),
    },
    {
      label: i18next.t('modules.overview.totalAmount'),
      value: withUnit(
        formatAmount(sumBy(rows, amountKey)),
        'modules.units.yuan',
      ),
    },
  ]
}

export function buildWeightOverview(
  rows: ModuleRecord[],
  weightKey = 'totalWeight',
): ModuleOverviewItem[] {
  return [
    {
      label: i18next.t('modules.overview.recordCount'),
      value: formatInteger(rows.length),
      countsRows: true,
    },
    {
      label: i18next.t('modules.overview.totalWeight'),
      value: formatWeight(sumBy(rows, weightKey)),
    },
  ]
}

export function buildStatementOverview(
  rows: ModuleRecord[],
  businessKey: string,
  paidKey: string,
  balanceKey: string,
): ModuleOverviewItem[] {
  return [
    {
      label: i18next.t('modules.overview.statementCount'),
      value: formatInteger(rows.length),
      countsRows: true,
    },
    {
      label: i18next.t('modules.overview.currentAmount'),
      value: formatAmount(sumBy(rows, businessKey)),
    },
    {
      label: i18next.t('modules.overview.settledAmount'),
      value: formatAmount(sumBy(rows, paidKey)),
    },
    {
      label: i18next.t('modules.overview.balance'),
      value: formatAmount(sumBy(rows, balanceKey)),
    },
  ]
}

export function buildFinanceOverview(
  rows: ModuleRecord[],
  amountKey: string,
): ModuleOverviewItem[] {
  return [
    {
      label: i18next.t('modules.overview.documentCount'),
      value: formatInteger(rows.length),
      countsRows: true,
    },
    {
      label: i18next.t('modules.overview.totalAmount'),
      value: formatAmount(sumBy(rows, amountKey)),
    },
  ]
}

export function buildMasterOverview(
  rows: ModuleRecord[],
  activeKey = 'status',
  activeValue = STATUS.NORMAL,
): ModuleOverviewItem[] {
  return [
    {
      label: i18next.t('modules.overview.masterDataCount'),
      value: formatInteger(rows.length),
      countsRows: true,
    },
    {
      label: i18next.t('modules.overview.normalCount'),
      value: formatInteger(
        rows.filter((row) => row[activeKey] === activeValue).length,
      ),
    },
  ]
}
