import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import { summarizeErrorMessage } from '@/utils/error-presentation'
import {
  buildNetPriceCheckContextKey,
  computeNetPriceEntries,
  netPriceRuleFromOrderSnapshot,
  pickEffectiveRule,
} from '../net-price-check'
import {
  fetchNetPriceCustomerProjects,
  fetchNetPricePriceRules,
  fetchNetPriceQuoteConfig,
  fetchNetPriceQuoteResolution,
  fetchNetPriceQuoteRows,
  readCachedNetPriceCustomerProjects,
  readCachedNetPricePriceRules,
  readCachedNetPriceQuoteConfig,
  readCachedNetPriceQuoteResolution,
  readCachedNetPriceQuoteRows,
} from '../net-price-check-cache'
import {
  buildNetPriceIndex,
  type NetPriceMatchEntry,
  type NetPriceRule,
  normalizeDateValue,
} from '../net-price-fill'
import { useNetPriceMatchStore } from '../net-price-match-store'

/**
 * 只读详情面（详情弹窗 / 列表行「+」展开）的网价匹配自动核查。
 *
 * <p><b>为什么需要它</b>: 「网价匹配」列的取值不在明细行上, 而是页面级快照
 * (`useNetPriceMatchStore`), 原先唯一写入方是编辑器的「取价」组件。只读详情面没有取价工具栏,
 * 于是这一列永远显示「未核查」, 提示语还让用户去点一个不存在的按钮 —— 列是死的。</p>
 *
 * <p><b>口径来源（与编辑器一致, 不另立一套）</b>:</p>
 * <ol>
 *   <li>取价日/时段: 优先用单据快照(`priceQuoteDate`/`priceQuotePeriod`, 交付核定写入) ——
 *       历史单据按当时的取价日核查, 不按今天的项目配置重算; 无快照时才调解析接口, 与编辑器同参。</li>
 *   <li>价格规定: 优先用单据快照(`priceFloatMode`/`priceFloatValue`); 无快照时按编辑器的
 *       同一条优先级「单据已记录 → 项目上次使用 → 唯一一条」挑; 存在多条却挑不出唯一一条时
 *       **不猜** —— 放弃核查并记录原因, 不给出看似确定的错误结论。</li>
 *   <li>逐行计算: 与编辑器共用 `computeNetPriceEntries`, 同一份口径只有一处实现。</li>
 * </ol>
 *
 * <p><b>不写业务数据</b>: 结果只写页面级快照, 不进明细行、不进保存载荷。同一张单可能同时被
 * 详情弹窗与行展开展示, 因此按"消费者计数"清理: 最后一个查看者离开才删结果。</p>
 */
export function useSalesOrderNetPriceCheck(
  record: ModuleRecord | null,
  enabled = true,
): void {
  const { t } = useTranslation()
  const documentKey = record ? String(record.id ?? '') : ''
  const projectId = record ? String(record.projectId ?? '') : ''
  const customerId = record ? String(record.customerId ?? '') : ''
  const orderDate = normalizeDateValue(record?.orderDate)
  const deliveryDate = normalizeDateValue(record?.deliveryDate)
  const quoteDateSnapshot = normalizeDateValue(record?.priceQuoteDate)
  const quotePeriodSnapshot = String(record?.priceQuotePeriod ?? '').trim()
  const priceRuleIdSnapshot = String(record?.priceRuleId ?? '').trim()
  const ruleSnapshot = record ? netPriceRuleFromOrderSnapshot(record) : null
  const snapshotRuleMode = ruleSnapshot?.mode
  const snapshotRuleAmount = ruleSnapshot?.amount
  /*
   * 明细行的引用来自记录本身(state 里稳定), 因此可以直接作为 effect 依赖;
   * 无记录时回退到模块级空数组(而不是每次渲染新建 `[]`), 否则 effect 会每次渲染都重跑。
   */
  const items: readonly ModuleLineItem[] = record?.items ?? EMPTY_ITEMS

  useEffect(() => {
    if (!enabled || !documentKey || !projectId) return
    if (items.length === 0) return
    /*
     * 金额字段被字段级权限脱敏时(unitPrice 全空), 逐行比较只会得到"整单不匹配",
     * 那是权限造成的假结论 —— 宁可不核查。
     */
    if (items.every((item) => isBlank(item.unitPrice))) return

    /*
     * 规则快照由标量重建(而不是直接用每次渲染新建的对象): effect 依赖只认
     * `snapshotRuleMode`/`snapshotRuleAmount` 两个标量, 否则对象身份变化会让核查重复触发。
     */
    const effectiveRuleSnapshot: NetPriceRule | null =
      snapshotRuleMode === undefined && snapshotRuleAmount === undefined
        ? null
        : {
            ...(snapshotRuleMode ? { mode: snapshotRuleMode } : {}),
            ...(snapshotRuleAmount === undefined
              ? {}
              : { amount: snapshotRuleAmount }),
          }
    /*
     * 口径指纹在发请求前就能确定(取价日/规则有快照就是终值, 没有则记 'auto'),
     * 用作"同一张单重复展示时不重复请求"的依据; 请求期间不变。
     */
    const contextKey = buildNetPriceCheckContextKey({
      projectId,
      quoteDate: quoteDateSnapshot || '@auto',
      period: quotePeriodSnapshot || '@auto',
      ...(effectiveRuleSnapshot ? { rule: effectiveRuleSnapshot } : {}),
      items,
    })

    retainDocument(documentKey)
    if (!useNetPriceMatchStore.getState().hasResult(documentKey, contextKey)) {
      /*
       * 先试"纯缓存命中"：同一取价日/时段下重新展开另一张单、或同一张单选完又展开，
       * 上游数据都已在缓存里 —— 这时直接现算结论，一次网络都不打，也不闪「核查中」。
       * 口径仍是同一个 `computeNetPriceEntries`，缓存只省掉取数。
       */
      const cachedEntries = computeEntriesFromCache({
        documentKey,
        projectId,
        customerId,
        items,
        orderDate,
        deliveryDate,
        quoteDateSnapshot,
        quotePeriodSnapshot,
        priceRuleIdSnapshot,
        ruleSnapshot: effectiveRuleSnapshot,
        contextKey,
        t,
      })
      if (cachedEntries) {
        useNetPriceMatchStore
          .getState()
          .setResult(documentKey, cachedEntries, contextKey)
        return () => releaseDocument(documentKey)
      }
      startNetPriceCheck({
        documentKey,
        projectId,
        customerId,
        items,
        orderDate,
        deliveryDate,
        quoteDateSnapshot,
        quotePeriodSnapshot,
        priceRuleIdSnapshot,
        ruleSnapshot: effectiveRuleSnapshot,
        contextKey,
        t,
      })
    }
    return () => releaseDocument(documentKey)
    // 依赖只放"会改变核查口径"的标量: 行内容用指纹、规则用快照标量。
  }, [
    enabled,
    documentKey,
    projectId,
    customerId,
    orderDate,
    deliveryDate,
    quoteDateSnapshot,
    quotePeriodSnapshot,
    priceRuleIdSnapshot,
    snapshotRuleMode,
    snapshotRuleAmount,
    items,
    t,
  ])
}

/** 稳定回退引用: 无记录时不要每次渲染新建数组。 */
const EMPTY_ITEMS: readonly ModuleLineItem[] = []

type Translate = (key: string) => string

interface NetPriceCheckInputs {
  documentKey: string
  projectId: string
  customerId: string
  items: readonly ModuleLineItem[]
  orderDate: string
  deliveryDate: string
  quoteDateSnapshot: string
  quotePeriodSnapshot: string
  priceRuleIdSnapshot: string
  ruleSnapshot: NetPriceRule | null
  contextKey: string
  t: Translate
}

/** 占位: 表示"有多条价格规定但无法确定唯一一条", 与"没有规定(无浮动)"区分。 */
const UNRESOLVED_RULE = Symbol('unresolved-net-price-rule')

/**
 * 同一张单的核查只跑一次(详情弹窗与行展开可能同时挂载)。
 *
 * <p>并发去重放在模块级: 第二个消费者进 effect 时直接复用第一个的在飞请求,
 * 不会各自再打一遍接口。</p>
 */
const inFlightChecks = new Map<
  string,
  { promise: Promise<void>; controller: AbortController }
>()

function startNetPriceCheck(inputs: NetPriceCheckInputs): void {
  const key = `${inputs.documentKey}|${inputs.contextKey}`
  if (inFlightChecks.has(key)) return
  const controller = new AbortController()
  const promise = runNetPriceCheck(inputs, controller.signal).finally(() => {
    const running = inFlightChecks.get(key)
    if (running?.controller === controller) inFlightChecks.delete(key)
  })
  inFlightChecks.set(key, { promise, controller })
}

async function runNetPriceCheck(
  inputs: NetPriceCheckInputs,
  signal: AbortSignal,
): Promise<void> {
  const { documentKey, items, t } = inputs
  useNetPriceMatchStore.getState().beginCheck(
    documentKey,
    inputs.contextKey,
    items.map((item) => String(item.id)),
  )
  /** 消费者都走了(或请求已取消)时不再写快照, 避免给没人看的单据留下结果。 */
  const isActive = () => !signal.aborted && isDocumentWatched(documentKey)
  const fail = (message: string) => {
    if (!isActive()) return
    useNetPriceMatchStore.getState().failCheck(documentKey, message)
  }

  try {
    const quote = await resolveQuote(inputs, signal)
    if (!isActive()) return
    if (!quote) {
      fail(t('modules.pages.salesOrder.netPriceNoQuote'))
      return
    }
    const rule = await resolveRule(inputs, signal)
    if (!isActive()) return
    if (rule === UNRESOLVED_RULE) {
      fail(t('modules.pages.salesOrder.netPricePickRule'))
      return
    }
    const quoteConfig = await fetchNetPriceQuoteConfig(inputs.projectId, signal)
    // 行情行按「取价日 + 时段 + 数据源 + 地区」缓存(2 分钟), 多张单共享同一份
    const quoteIndexArgs = {
      quoteDate: quote.quoteDate,
      ...(quote.period ? { period: quote.period } : {}),
      ...(quoteConfig.quoteSource ? { source: quoteConfig.quoteSource } : {}),
      ...(quoteConfig.quoteRegion ? { region: quoteConfig.quoteRegion } : {}),
    }
    const rows = await fetchNetPriceQuoteRows(quoteIndexArgs, signal)
    if (!isActive()) return
    const index = buildNetPriceIndex(rows)
    useNetPriceMatchStore
      .getState()
      .setResult(
        documentKey,
        computeNetPriceEntries(items, index, rule ?? undefined),
        inputs.contextKey,
      )
  } catch (cause: unknown) {
    fail(
      summarizeErrorMessage(cause) ||
        t('modules.pages.salesOrder.netPriceMatchCheckFailed'),
    )
  }
}

/** 取价日/时段: 单据快照优先(历史口径), 否则调解析接口(与编辑器同参)。 */
async function resolveQuote(
  inputs: NetPriceCheckInputs,
  signal: AbortSignal,
): Promise<{ quoteDate: string; period?: string } | null> {
  if (inputs.quoteDateSnapshot && inputs.quotePeriodSnapshot) {
    return {
      quoteDate: inputs.quoteDateSnapshot,
      period: inputs.quotePeriodSnapshot,
    }
  }
  const resolved = await fetchNetPriceQuoteResolution(
    {
      projectId: inputs.projectId,
      ...(inputs.orderDate ? { orderDate: inputs.orderDate } : {}),
      ...(inputs.deliveryDate ? { deliveryDate: inputs.deliveryDate } : {}),
    },
    signal,
  )
  if (!resolved.quoteAvailable || !resolved.quoteDate) return null
  return {
    quoteDate: resolved.quoteDate,
    ...(resolved.period ? { period: resolved.period } : {}),
  }
}

/**
 * 生效价格规定: 单据快照 → 项目上次使用 → 唯一一条。
 *
 * <p>返回 {@link UNRESOLVED_RULE} 表示"有多条规定但无法确定用哪条": 此时不猜,
 * 由调用方记录原因并保持「未核查」。</p>
 */
async function resolveRule(
  inputs: NetPriceCheckInputs,
  signal: AbortSignal,
): Promise<NetPriceRule | null | typeof UNRESOLVED_RULE> {
  if (inputs.ruleSnapshot) return inputs.ruleSnapshot
  const [rules, project] = await Promise.all([
    fetchNetPricePriceRules(inputs.projectId, signal).catch(() => []),
    inputs.customerId
      ? fetchNetPriceCustomerProjects(inputs.customerId)
          .then((list) => list.find((option) => option.id === inputs.projectId))
          .catch(() => undefined)
      : Promise.resolve(undefined),
  ])
  if (rules.length === 0) return null
  const picked = pickEffectiveRule(rules, [
    inputs.priceRuleIdSnapshot || undefined,
    project?.lastPriceRuleId,
  ])
  if (!picked) return UNRESOLVED_RULE
  return { mode: picked.mode, amount: picked.amount }
}

/**
 * 只用缓存里的上游数据现算结论；任一项没缓存就返回 `null`（交给网络路径去取）。
 *
 * <p>注意区分"没缓存"与"缓存里就是空"：`readCached*` 用 `undefined` 表示前者，
 * `[]` 表示后者 —— 例如"该项目一条价格规定都没有"是有效结论（按无浮动算），
 * 必须当成缓存命中，否则重新展开时又会白跑一遍接口。</p>
 */
function computeEntriesFromCache(
  inputs: NetPriceCheckInputs,
): Record<string, NetPriceMatchEntry> | null {
  const quote = resolveQuoteFromCache(inputs)
  if (!quote) return null
  const rule = resolveRuleFromCache(inputs)
  // `undefined`（缓存不全）与 `UNRESOLVED_RULE`（多条规定挑不出唯一一条）都交给网络路径处理
  if (rule === undefined || rule === UNRESOLVED_RULE) return null
  const quoteConfig = readCachedNetPriceQuoteConfig(inputs.projectId)
  if (!quoteConfig) return null
  const rows = readCachedNetPriceQuoteRows({
    quoteDate: quote.quoteDate,
    ...(quote.period ? { period: quote.period } : {}),
    ...(quoteConfig.quoteSource ? { source: quoteConfig.quoteSource } : {}),
    ...(quoteConfig.quoteRegion ? { region: quoteConfig.quoteRegion } : {}),
  })
  if (!rows) return null
  return computeNetPriceEntries(
    inputs.items,
    buildNetPriceIndex(rows),
    rule ?? undefined,
  )
}

/** 取价日/时段：单据快照优先，否则读解析缓存。返回 `null` = 无法确定。 */
function resolveQuoteFromCache(
  inputs: NetPriceCheckInputs,
): { quoteDate: string; period?: string } | null {
  if (inputs.quoteDateSnapshot && inputs.quotePeriodSnapshot) {
    return {
      quoteDate: inputs.quoteDateSnapshot,
      period: inputs.quotePeriodSnapshot,
    }
  }
  const resolved = readCachedNetPriceQuoteResolution({
    projectId: inputs.projectId,
    ...(inputs.orderDate ? { orderDate: inputs.orderDate } : {}),
    ...(inputs.deliveryDate ? { deliveryDate: inputs.deliveryDate } : {}),
  })
  if (!resolved || !resolved.quoteAvailable || !resolved.quoteDate) return null
  return {
    quoteDate: resolved.quoteDate,
    ...(resolved.period ? { period: resolved.period } : {}),
  }
}

/**
 * 生效价格规定：单据快照优先，否则用缓存里的价格规定 + 项目上次使用挑。
 *
 * <p>返回三态：`undefined` = 所需缓存不全（交网络路径）；`UNRESOLVED_RULE` 同样交网络路径，
 * 由那里记录"多条规定挑不出唯一一条"的原因；`null` = 确认无规定；对象 = 已确定。</p>
 */
function resolveRuleFromCache(
  inputs: NetPriceCheckInputs,
): NetPriceRule | null | typeof UNRESOLVED_RULE | undefined {
  if (inputs.ruleSnapshot) return inputs.ruleSnapshot
  const rules = readCachedNetPricePriceRules(inputs.projectId)
  if (!rules) return undefined
  const project = inputs.customerId
    ? readCachedNetPriceCustomerProjects(inputs.customerId)?.find(
        (option) => option.id === inputs.projectId,
      )
    : undefined
  if (inputs.customerId && !project) {
    // 客户项目列表还没缓存时，"上次使用的规定"可能就在里面，不能贸然当成无规定
    const cachedProjects = readCachedNetPriceCustomerProjects(inputs.customerId)
    if (!cachedProjects) return undefined
  }
  if (rules.length === 0) return null
  const picked = pickEffectiveRule(rules, [
    inputs.priceRuleIdSnapshot || undefined,
    project?.lastPriceRuleId,
  ])
  if (!picked) return UNRESOLVED_RULE
  return { mode: picked.mode, amount: picked.amount }
}

/**
 * 正在看某张单的消费者计数(详情弹窗与行展开可能同时打开同一张单)。
 *
 * <p>结果挂在页面级快照上: 若某处卸载就把整张单清掉, 另一处还在看的标识会突然退回
 * 「未核查」。因此只在最后一个消费者离开时才清理, 并取消仍在飞的请求。</p>
 */
const activeDocumentConsumers = new Map<string, number>()

function isDocumentWatched(documentKey: string): boolean {
  return (activeDocumentConsumers.get(documentKey) ?? 0) > 0
}

function retainDocument(documentKey: string): void {
  activeDocumentConsumers.set(
    documentKey,
    (activeDocumentConsumers.get(documentKey) ?? 0) + 1,
  )
}

function releaseDocument(documentKey: string): void {
  const remaining = (activeDocumentConsumers.get(documentKey) ?? 1) - 1
  if (remaining > 0) {
    activeDocumentConsumers.set(documentKey, remaining)
    return
  }
  activeDocumentConsumers.delete(documentKey)
  useNetPriceMatchStore.getState().clearDocument(documentKey)
  for (const [key, entry] of inFlightChecks) {
    if (key.startsWith(`${documentKey}|`)) {
      entry.controller.abort()
      inFlightChecks.delete(key)
    }
  }
}

/** 仅供测试: 清空消费者计数与在飞请求登记(模拟所有查看者都已卸载)。 */
export function resetNetPriceCheckState(): void {
  for (const entry of inFlightChecks.values()) {
    entry.controller.abort()
  }
  inFlightChecks.clear()
  activeDocumentConsumers.clear()
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === ''
}
