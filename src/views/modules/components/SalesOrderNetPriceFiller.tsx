import {
  CheckCircleFilled,
  ExclamationCircleFilled,
  MinusCircleFilled,
  ThunderboltOutlined,
} from '@ant-design/icons'
import {
  Button,
  Divider,
  Modal,
  Select,
  Space,
  Tooltip,
  Typography,
} from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchPricingQuoteResolution } from '@/api/market/pricing-quote-resolutions'
import { fetchMaterialPriceMatches } from '@/api/market/steel-quotes'
import type { ProjectPriceRule } from '@/api/master/project-price-rules'
import { fetchProjectPriceRules } from '@/api/master/project-price-rules'
import { buildSalesOrderPricingSnapshot } from '@/config/business-pages/operations/sales-order-price-snapshot'
import type {
  ModuleItemsActionsContext,
  ModuleLineItem,
} from '@/types/module-page'
import { message, modal } from '@/utils/antd-app'
import { summarizeErrorMessage } from '@/utils/error-presentation'
import { formatAmount } from '@/utils/formatters'
import '@/styles/net-price-match.css'
import {
  applyNetPricesToItems,
  buildNetPriceIndex,
  evaluateNetPriceMatch,
  type NetPriceIndex,
  type NetPriceMatchEntry,
  type NetPriceRule,
  normalizeDateValue,
  summarizeNetPriceMatch,
} from '../net-price-fill'
import { useNetPriceMatchStore } from '../net-price-match-store'
import { NetPriceMatchChip } from './NetPriceMatchChip'
import { PricingQuoteResolutionOverrides } from './PricingQuoteResolutionOverrides'
import { PricingQuoteResolutionSummary } from './PricingQuoteResolutionSummary'
import { usePricingQuoteResolution } from './use-pricing-quote-resolution'

const { Text } = Typography

/** 交付核定状态（原「整单取网价」入口）。 */
const DELIVERY_VERIFICATION = '交付核定'
/** 草稿状态：本次新增的「整单去网价」入口。 */
const DRAFT = '草稿'

/** 空列表常量：派生回退时保持引用稳定，避免下游 memo 每次失效。 */
const EMPTY_RULES: ProjectPriceRule[] = []
/** 空核查结果常量：单号切换时的稳定回退引用。 */
const EMPTY_ENTRIES: Record<string, NetPriceMatchEntry> = {}

/** 取价快照字段：后端要求一起下发，不完整时宁可不带（见快照构造器）。 */
const SNAPSHOT_FIELDS = [
  ['priceTargetDate', 'priceTargetDate'],
  ['priceQuoteDate', 'priceQuoteDate'],
  ['priceQuotePeriod', 'priceQuotePeriod'],
  ['priceDateBasis', 'priceDateBasis'],
  ['priceDateOffsetDays', 'priceDateOffsetDays'],
  ['priceClosedSettlePrev', 'priceClosedSettlePrev'],
] as const

/**
 * 交付核定 / 草稿的「整单取网价（整单去网价）」入口。
 *
 * - 解析接口负责回答「取哪天、哪个时段」并说明回退原因，解析结果即取价入参；
 * - 人工可临时改基准/顺延交易日数/时段策略/时段/手工日期，改任一项即按覆盖值重新解析；
 * - 该日无行情（quoteAvailable=false）时不静默取价：提示并提供「采纳建议日期」；
 * - 价格规定单选互斥、不叠加；默认沿用项目上次使用的规定；
 * - 无网价的行保持原值并提示，由用户手填；
 * - **仅草稿与交付核定可用**：其余状态按钮置灰并用 tooltip 说明原因（不静默禁用）；
 * - 整单写入前二次确认（会改写多少行、其中多少行已有手工单价），取消则一行都不改；
 * - 写入后给出结果摘要，并可逐条定位到问题行；
 * - 同时提供「网价匹配」核查：行内标识 + 汇总提示 + 手动重查，整单取价后自动重查一次。
 */
export function SalesOrderNetPriceFiller(props: ModuleItemsActionsContext) {
  const { t } = useTranslation()
  const {
    formValues,
    currentStatus,
    items,
    setItems,
    setFormValue,
    saving,
    projectOptions,
  } = props
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  /**
   * 已拉取的项目价格规定及其所属项目：项目被清空/切换时派生结果自动回退为空，
   * 不需要在 effect 里同步 setRules([])（同步 setState 会触发级联渲染）。
   */
  const [rulesState, setRulesState] = useState<{
    projectId: string
    rules: ProjectPriceRule[]
  } | null>(null)
  const [ruleId, setRuleId] = useState<string | undefined>()
  /** 网价核查：进行中 / 失败原因。 */
  const [checking, setChecking] = useState(false)
  /** 明细状态弹层(受控): 键盘可达、有焦点陷阱与焦点归还。 */
  const [problemsOpen, setProblemsOpen] = useState(false)
  /** 待定位的行: 弹层关闭后(焦点归还完成)再滚动/聚焦, 否则会被 Modal 的焦点归还抢走。 */
  const pendingJumpRef = useRef<string | null>(null)
  const [checkError, setCheckError] = useState<string | null>(null)
  /** 最近一次整单取价的结果摘要（成功 / 无网价 / 跳过）。 */
  const [applySummary, setApplySummary] = useState<{
    filled: number
    noPrice: string[]
    noPriceIds: string[]
    skipped: number
    /** 按抗震牌号替代取价的行: { 行id: 实际命中的牌号 }。 */
    substitutedIds: Record<string, string>
  } | null>(null)
  const mountedRef = useRef(true)

  const deliveryDate = normalizeDateValue(formValues.deliveryDate)
  // 报单日期：销售订单表单当前未注册该字段，存在则透传，缺失时由解析接口按基准给出 422 说明。
  const orderDate = normalizeDateValue(formValues.orderDate)
  const projectId = String(formValues.projectId || '').trim()
  const project = projectOptions.find((option) => option.id === projectId)
  // 数据源与地区取自项目配置: 西本按地区报价。
  const quoteSource = project?.quoteSource
  const quoteRegion = project?.quoteRegion
  const rules =
    rulesState && rulesState.projectId === projectId
      ? rulesState.rules
      : EMPTY_RULES
  /** 单据键：核查结果按单据隔离（新建单据回退到订单号）。 */
  const documentKey = String(formValues.id ?? formValues.orderNo ?? '')
  /*
   * 状态为空 = 新建单据尚未落库。
   *
   * <p>销售订单表单本身不含状态字段，`currentStatus` 取自记录；新建时记录还是空的(null)，
   * 于是状态是空串。空状态按「草稿」处理才有正确语义 —— 后端保存时也把新销售订单统一写成
   * 草稿(`SalesOrderService` 明确"新销售订单只能保存为草稿")，两者口径一致。</p>
   *
   * <p>不这样兜底时，新建单据打开后「整单取网价」会一直灰着并提示"仅草稿与交付核定状态可
   * 整单取网价"，而用户看到的状态下拉明明就是「草稿」，属于自相矛盾的死路(实测复现)。</p>
   */
  const status = currentStatus.trim() || DRAFT
  /** 仅草稿与交付核定可整单取网价：其余状态置灰并给出原因。 */
  const canApplyNetPrice = status === DRAFT || status === DELIVERY_VERIFICATION

  const {
    resolution,
    resolving,
    error: resolutionError,
    controls,
    updateControls,
    resetControls,
    adoptSuggestedDate,
  } = usePricingQuoteResolution({ open, projectId, orderDate, deliveryDate })

  // 切换单据时丢弃上一张单据的核查结果, 避免行内标识串单(同一单据重挂载时保留结果)。
  useEffect(() => {
    const state = useNetPriceMatchStore.getState()
    if (state.documentKey && state.documentKey !== documentKey) {
      state.clear()
    }
    setApplySummary(null)
    setCheckError(null)
  }, [documentKey])

  useEffect(
    () => () => {
      mountedRef.current = false
      useNetPriceMatchStore.getState().clear()
    },
    [],
  )

  // 打开弹层时拉取项目价格规定, 并默认选中"上次使用"(回退到唯一一条)。
  useEffect(() => {
    if (!open || !projectId) return undefined
    let active = true
    fetchProjectPriceRules(projectId)
      .then((list) => {
        if (!active) return
        setRulesState({ projectId, rules: list })
        setRuleId((current) =>
          pickDefaultRuleId(list, current, project?.lastPriceRuleId),
        )
      })
      .catch(() => {
        if (active) setRulesState({ projectId, rules: EMPTY_RULES })
      })
    return () => {
      active = false
    }
  }, [open, projectId, project?.lastPriceRuleId])

  const selectedRule = useMemo(
    () => rules.find((rule) => rule.id === ruleId),
    [rules, ruleId],
  )

  /** 核查结果：只认本单据的快照。 */
  const entries = useNetPriceMatchStore((state) =>
    state.documentKey === documentKey ? state.entries : EMPTY_ENTRIES,
  )
  const summary = useMemo(
    () => summarizeNetPriceMatch(items, entries),
    [items, entries],
  )
  const itemById = useMemo(() => {
    const map = new Map<string, ModuleLineItem>()
    for (const item of items) map.set(String(item.id), item)
    return map
  }, [items])

  /** 行可访问名：物料/品牌 + 规格，供定位提示与读屏。 */
  const itemLabelOf = useCallback(
    (itemId: string) => {
      const item = itemById.get(itemId)
      if (!item) return itemId
      const parts = [item.material, item.brand, item.spec, item.length]
        .map((value) => String(value ?? '').trim())
        .filter(Boolean)
      return parts.length > 0 ? parts.join(' ') : itemId
    },
    [itemById],
  )

  const openDialog = () => {
    // 每次打开都从项目配置重新解析, 不沿用上一次打开时的临时覆盖。
    resetControls()
    setOpen(true)
  }

  /** 按行 id 定位: 滚动到该行并把焦点交给行内第一个可聚焦控件(键盘可达)。 */
  const jumpToItem = useCallback((itemId: string) => {
    const row = document.querySelector<HTMLElement>(
      `[data-row-key="${CSS.escape(itemId)}"]`,
    )
    if (!row) return
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // jsdom 未实现 scrollIntoView: 有则滚动, 没有也不影响定位(焦点仍会落到该行)。
    row.scrollIntoView?.({
      block: 'center',
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
    /*
     * 优先把焦点交给该行的单价输入框(用户要改的就是它); 选择器里的 data 属性沿用
     * 明细行数值列的既有约定(见 module-editor-item-column-builders.tsx 的
     * NUMBER_COLUMN_DATA_ATTRIBUTE), 取不到时退回行内第一个可聚焦控件。
     */
    const unitPriceInput = row.querySelector<HTMLElement>(
      'input[data-module-editor-number-column="unitPrice"]:not(:disabled)',
    )
    const focusable =
      unitPriceInput ??
      row.querySelector<HTMLElement>(
        'input:not([type="hidden"]), select, textarea, button, [tabindex]:not([tabindex="-1"])',
      )
    ;(focusable ?? row).focus?.()
  }, [])

  /** 载入网价索引: 整单取价与匹配核查共用同一份查询与索引口径。 */
  const loadMatchIndex = useCallback(
    async (args: {
      quoteDate: string
      period: string
      signal?: AbortSignal
    }): Promise<NetPriceIndex> => {
      const rows = await fetchMaterialPriceMatches(
        args.quoteDate,
        args.period,
        { source: quoteSource, region: quoteRegion },
        args.signal,
      )
      return buildNetPriceIndex(rows)
    },
    [quoteSource, quoteRegion],
  )

  /**
   * 项目最近一次使用的价格规则 id。
   *
   * <p>先取出标量再进 useCallback：React Compiler 会把依赖推断成更粗粒度的 `project`，
   * 与手写的 `project?.lastPriceRuleId` 不一致时会跳过整个组件的编译（ESLint 报
   * 「Existing memoization could not be preserved」）。依赖口径收敛到这里的这一个变量，
   * 既保住原依赖粒度（只认这个字段），也让推断依赖与手写依赖一致。</p>
   */
  const projectLastPriceRuleId = project?.lastPriceRuleId

  /** 核查当前整单的网价匹配状态, 并把结果写入页面级快照(行内标识据此刷新)。 */
  const runMatchCheck = useCallback(
    async (checkItems?: ModuleLineItem[]) => {
      if (!projectId) {
        setCheckError(t('modules.pages.salesOrder.netPriceMatchNeedProject'))
        return
      }
      setChecking(true)
      setCheckError(null)
      try {
        const resolved = await fetchPricingQuoteResolution(projectId, {
          ...(orderDate ? { orderDate } : {}),
          ...(deliveryDate ? { deliveryDate } : {}),
        })
        const quoteDate = resolved.quoteDate ?? ''
        const period = resolved.period ?? ''
        // 无行情 / 无时段时没有可核查的网价: 说清原因, 不改动已有结果。
        if (!resolved.quoteAvailable || !quoteDate || !period) {
          setCheckError(t('modules.pages.salesOrder.netPriceNoQuote'))
          return
        }
        const list =
          rulesState && rulesState.projectId === projectId
            ? rulesState.rules
            : await fetchRulesSafely(projectId)
        if (!rulesState || rulesState.projectId !== projectId) {
          setRulesState({ projectId, rules: list })
        }
        const rule = pickEffectiveRule(list, [
          String(formValues.priceRuleId ?? ''),
          projectLastPriceRuleId,
        ])
        if (list.length > 0 && !rule) {
          setCheckError(t('modules.pages.salesOrder.netPricePickRule'))
          return
        }
        const index = await loadMatchIndex({ quoteDate, period })
        const next: Record<string, NetPriceMatchEntry> = {}
        // 整单取价刚写入的明细优先用调用方传入的新数组: useCallback 闭包里的 items 还是写入前的。
        for (const item of checkItems ?? items) {
          next[String(item.id)] = evaluateNetPriceMatch(item, index, rule)
        }
        if (!mountedRef.current) return
        useNetPriceMatchStore.getState().setResult(documentKey, next)
      } catch (cause: unknown) {
        if (!mountedRef.current) return
        setCheckError(
          summarizeErrorMessage(cause) ||
            t('modules.pages.salesOrder.netPriceMatchCheckFailed'),
        )
      } finally {
        if (mountedRef.current) setChecking(false)
      }
    },
    [
      projectId,
      orderDate,
      deliveryDate,
      rulesState,
      formValues.priceRuleId,
      projectLastPriceRuleId,
      loadMatchIndex,
      items,
      documentKey,
      t,
    ],
  )

  const applyNetPrices = async () => {
    // 未解析出取价入参时不允许静默取价: 先提示, 由用户调整覆盖值后重新解析。
    if (!resolution) {
      message.warning(t('modules.pages.salesOrder.netPricePickDate'))
      return
    }
    const quoteDate = resolution.quoteDate ?? ''
    const period = resolution.period ?? ''
    // 该日无行情时同样不取价: 提示并提供「采纳建议日期」, 由用户重新解析后再取。
    if (!resolution.quoteAvailable || !quoteDate || !period) {
      message.warning(t('modules.pages.salesOrder.netPriceNoQuote'))
      return
    }
    if (rules.length > 0 && !selectedRule) {
      message.warning(t('modules.pages.salesOrder.netPricePickRule'))
      return
    }
    setLoading(true)
    try {
      const index = await loadMatchIndex({ quoteDate, period })
      // 取价口径只有一份: 逐行写入与"会改写多少行"的预览都来自同一处计算。
      const rule: NetPriceRule = {
        mode: selectedRule?.mode,
        amount: selectedRule?.amount,
      }
      const outcome = applyNetPricesToItems(items, index, rule)
      /*
       * 会改写已有单价时必须二次确认(不静默覆盖手工填写的单价); 一行都不会被改写时
       * 没必要弹确认框, 直接给出结果摘要。取消则一行都不改。
       */
      if (outcome.overwrittenIds.length > 0) {
        const confirmed = await confirmApply(t, {
          total: items.length,
          overwrite: outcome.overwrittenIds.length,
          noPrice: outcome.noPrice.length,
        })
        if (!confirmed) return
      }

      if (outcome.filled > 0) {
        setItems(() => outcome.nextItems)
        // 记录所选价格规定, 保存在单据上(交付核定时快照)。
        setFormValue('priceRuleId', selectedRule?.id ?? null)
        // 取价快照随单据保存: 后端要求四项同时提供, 不完整时宁可不带(见快照构造器)。
        const snapshot = buildSalesOrderPricingSnapshot(resolution)
        if (snapshot) {
          for (const [field, key] of SNAPSHOT_FIELDS) {
            setFormValue(field, snapshot[key])
          }
        }
        message.success(
          t('modules.pages.salesOrder.netPriceFilled', {
            count: outcome.filled,
          }),
        )
      }
      if (outcome.noPrice.length > 0) {
        message.warning(
          t('modules.pages.salesOrder.netPriceNoPrice', {
            count: outcome.noPrice.length,
            items: outcome.noPrice.slice(0, 5).join('、'),
          }),
        )
      }
      /*
       * 按抗震牌号替代取价必须说出来: 用户报的是 HRB400, 系统按 HRB400E 的价填了单,
       * 不提示就是悄悄换了计价口径。条数进摘要, 具体行在内联标识里看得见。
       */
      const substitutedCount = Object.keys(outcome.substitutedIds).length
      if (substitutedCount > 0) {
        message.info(
          t('modules.pages.salesOrder.netPriceSubstituted', {
            count: substitutedCount,
          }),
        )
      }
      setApplySummary({
        filled: outcome.filled,
        noPrice: outcome.noPrice,
        noPriceIds: outcome.noPriceIds,
        skipped: outcome.skipped,
        substitutedIds: outcome.substitutedIds,
      })
      // 整单取价后自动重查一次: 行内标识与汇总提示立即反映新单价(用刚写入的明细)。
      if (mountedRef.current) void runMatchCheck(outcome.nextItems)
      setOpen(false)
    } catch {
      message.error(t('modules.pages.salesOrder.netPriceFailed'))
    }
    // 不用 try/finally: React Compiler 不支持该语法(react-hooks-js/todo), 命中后组件会失去自动记忆化;
    // 此处无提前 return, 清理语句跟在 try/catch 之后即可保持等价。
    setLoading(false)
  }

  const statusHint = t('modules.pages.salesOrder.netPriceStatusDisabled')
  /*
   * 非草稿/交付核定: 用 aria-disabled 而不是原生 disabled —— 原生禁用的按钮不可聚焦,
   * 键盘用户既拿不到禁用原因、也无法读到 tooltip; 视觉仍按禁用态置灰(见 net-price-match.css)。
   */
  const applyButton = (
    <Button
      /*
       * 只在确实不可用时输出 aria-disabled: 写成 `aria-disabled={!canApply}` 会渲染
       * `aria-disabled="false"`, 与同时存在的 `disabled`(saving) 一起形成
       * `aria-disabled="false" disabled=""` 的矛盾状态(SC 4.1.2)。可用时留空, 让
       * 原生 disabled 单独表达「保存中」。
       */
      aria-disabled={canApplyNetPrice ? undefined : true}
      className={
        canApplyNetPrice
          ? 'overlay-action-button'
          : 'overlay-action-button net-price-match-apply-disabled'
      }
      disabled={saving}
      icon={<ThunderboltOutlined />}
      onClick={canApplyNetPrice ? openDialog : undefined}
    >
      {t('modules.pages.salesOrder.netPriceFillAll')}
    </Button>
  )

  /** 问题行(不匹配 + 无网价, 按明细顺序去重): 汇总提示里给出数量, 逐条定位放在 portal 弹层里。 */
  const problemIds = [
    ...new Set([...summary.mismatchIds, ...(applySummary?.noPriceIds ?? [])]),
  ]
  /*
   * 取价结果按"只报非零项"拆开: 原文案把"无网价 0 行 · 跳过 0 行"也写出来, 正常取价(全部成功)
   * 时尾部挂着一串 0, 用户要读完才知道没事 —— 零值不是信息, 不显示。
   */
  const applyResultParts = applySummary
    ? [
        {
          key: 'filled',
          count: applySummary.filled,
          text: t('modules.pages.salesOrder.netPriceApplyFilled', {
            count: applySummary.filled,
          }),
          tone: 'success' as const,
        },
        {
          key: 'noPrice',
          count: applySummary.noPrice.length,
          text: t('modules.pages.salesOrder.netPriceApplyNoPrice', {
            count: applySummary.noPrice.length,
          }),
          tone: 'warning' as const,
        },
        {
          key: 'skipped',
          count: applySummary.skipped,
          text: t('modules.pages.salesOrder.netPriceApplySkipped', {
            count: applySummary.skipped,
          }),
          tone: 'muted' as const,
        },
        {
          // 替代取价单独成项: 用户必须能看到"有 N 行是按 400E 代取的"
          key: 'substituted',
          count: Object.keys(applySummary.substitutedIds).length,
          text: t('modules.pages.salesOrder.netPriceApplySubstituted', {
            count: Object.keys(applySummary.substitutedIds).length,
          }),
          tone: 'warning' as const,
        },
      ].filter((part) => part.count > 0)
    : []
  /*
   * 核查结论三态: 全一致(成功) / 有差异(需处理) / 未核查(中性)。
   * 图标 + 文案双通道, 不以颜色为唯一区分(WCAG 1.4.1); 结论在前, 明细数字在后。
   */
  const summaryTone: 'success' | 'warning' | 'muted' = checkError
    ? 'warning'
    : summary.total === 0 || summary.unchecked === summary.total
      ? 'muted'
      : summary.mismatch > 0
        ? 'warning'
        : 'success'
  /*
   * 结论图标是装饰(真值由后面的文案表达), 统一 aria-hidden —— 否则 antd 图标默认
   * role="img" + aria-label, 读屏会把结论念成"check-circle 本单 4 行…"。
   */
  const summaryIcon =
    summaryTone === 'success' ? (
      <CheckCircleFilled
        aria-hidden="true"
        className="net-price-summary-icon net-price-summary-icon--success"
      />
    ) : summaryTone === 'warning' ? (
      <ExclamationCircleFilled
        aria-hidden="true"
        className="net-price-summary-icon net-price-summary-icon--warning"
      />
    ) : (
      <MinusCircleFilled
        aria-hidden="true"
        className="net-price-summary-icon net-price-summary-icon--muted"
      />
    )

  return (
    <>
      {/*
       * 单行工具栏: 左侧动作组(全部 32px 同高、只有「整单取网价」一个强调层),
       * 右侧纯结论区(aria-live 只包文本, 不放可聚焦控件)。
       *
       * 重排前的问题: 动作组里主按钮 32px、次按钮 24px(size="small")、明细入口
       * 又是 24px 的 link 蓝字 —— 同一行三种控件高度/三种强调档位; 明细入口还嵌在
       * role="status" 里, 每次变更都会连按钮文案一起被播报。现在明细入口回到动作组,
       * 与「重新核查网价」同形, 结论区只剩文本。
       */}
      <div className="net-price-toolbar">
        <Space align="center" size={8} wrap>
          {/* 非草稿/交付核定: 禁用不静默, tooltip 说清可用状态 */}
          {canApplyNetPrice ? (
            applyButton
          ) : (
            <Tooltip title={statusHint} trigger={['hover', 'focus']}>
              {applyButton}
            </Tooltip>
          )}
          <Button
            disabled={saving || checking}
            loading={checking}
            onClick={() => void runMatchCheck()}
          >
            {t('modules.pages.salesOrder.netPriceMatchRecheck')}
          </Button>
          {/*
           * 明细入口: 条件是"有没有明细行"(没有明细就没有可看的清单), 不是"有没有问题行"。
           * 零值不在按钮上重复计数 —— 「0 行待处理」既不是信息, 又会让强调色指向"没事",
           * 且与左侧「N 行未核查」并排时容易被读成自相矛盾的两个数字。
           */}
          {items.length > 0 ? (
            <Button
              className="net-price-problems-entry"
              onClick={() => setProblemsOpen(true)}
            >
              {problemIds.length > 0
                ? t('modules.pages.salesOrder.netPriceMatchProblemsButton', {
                    count: problemIds.length,
                  })
                : t(
                    'modules.pages.salesOrder.netPriceMatchProblemsButtonEmpty',
                  )}
            </Button>
          ) : null}
        </Space>
        {/*
          结论区只放文本: `role="status"` 已隐含 aria-live=polite, 不必重复声明;
          内部不再有按钮, 读屏播报的就是结论本身。行内标识另有「网价匹配」列。
        */}
        <div className="net-price-summary" role="status">
          {checkError ? (
            <span className="net-price-summary-line">
              <ExclamationCircleFilled
                aria-hidden="true"
                className="net-price-summary-icon net-price-summary-icon--warning"
              />
              <Text type="danger">{checkError}</Text>
            </span>
          ) : (
            <span className="net-price-summary-line">
              {summaryIcon}
              <Text>{describeSummary(t, summary)}</Text>
            </span>
          )}
          {applyResultParts.length > 0 ? (
            <span className="net-price-apply-result">
              {/* antd 6: Divider 用 orientation 取代已废弃的 type(见 antd changelog) */}
              <Divider orientation="vertical" />
              <Text type="secondary" className="net-price-apply-result-title">
                {t('modules.pages.salesOrder.netPriceApplyResultTitle')}
              </Text>
              {applyResultParts.map((part) => (
                <Text
                  className={`net-price-apply-result-part net-price-apply-result-part--${part.tone}`}
                  key={part.key}
                >
                  {part.text}
                </Text>
              ))}
            </span>
          ) : null}
        </div>
      </div>
      <Modal
        afterClose={() => {
          const target = pendingJumpRef.current
          pendingJumpRef.current = null
          if (target) window.setTimeout(() => jumpToItem(target), 0)
        }}
        footer={null}
        onCancel={() => setProblemsOpen(false)}
        open={problemsOpen}
        title={t('modules.pages.salesOrder.netPriceMatchProblemsTitle')}
        width={480}
        destroyOnHidden
      >
        <ul className="net-price-problems">
          {problemRowsFirst(items, problemIds).map((item) => {
            const itemId = String(item.id)
            return (
              <li key={itemId}>
                {/* 每行的匹配状态: 图标 + 文字 + 差额, 不靠颜色区分(WCAG 1.4.1) */}
                <NetPriceMatchChip itemId={itemId} />
                <span className="net-price-problems-label">
                  {itemLabelOf(itemId)}
                </span>
                {/* 差额写在这里而不是只放在悬浮提示里: 键盘与读屏用户同样要看到"差在哪" */}
                <span className="net-price-problems-detail">
                  {describeProblem(t, entries[itemId])}
                </span>
                <Button
                  onClick={() => {
                    // 先关弹层, 等 afterClose(antd 归还焦点之后)再定位
                    pendingJumpRef.current = itemId
                    setProblemsOpen(false)
                  }}
                  size="small"
                  type="link"
                >
                  {t('modules.pages.salesOrder.netPriceMatchJump')}
                </Button>
              </li>
            )
          })}
        </ul>
      </Modal>
      <Modal
        open={open}
        title={t('modules.pages.salesOrder.netPriceTitle')}
        width={640}
        okText={t('modules.pages.salesOrder.netPriceApply')}
        confirmLoading={loading}
        onOk={() => void applyNetPrices()}
        onCancel={() => setOpen(false)}
        destroyOnHidden
      >
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Text type="secondary">
            {t('modules.pages.salesOrder.netPriceHint')}
          </Text>
          {rules.length > 0 ? (
            <Space orientation="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary">
                {t('modules.pages.salesOrder.netPriceRule')}
              </Text>
              <Select
                aria-label={t('modules.pages.salesOrder.netPriceRule')}
                style={{ width: '100%' }}
                value={ruleId}
                placeholder={t('modules.pages.salesOrder.netPriceRulePick')}
                options={rules.map((rule) => ({
                  label: `${rule.name}（${t(
                    rule.mode === 'SUBTRACT'
                      ? 'modules.pages.project.priceFloatSubtract'
                      : 'modules.pages.project.priceFloatAdd',
                  )} ${rule.amount}）`,
                  value: rule.id,
                }))}
                onChange={setRuleId}
              />
              {selectedRule ? (
                <Text type="secondary">
                  {selectedRule.remark
                    ? `${selectedRule.name} · ${selectedRule.remark}`
                    : selectedRule.name}
                </Text>
              ) : null}
            </Space>
          ) : null}
          <Divider style={{ margin: 0 }} />
          <PricingQuoteResolutionSummary
            resolution={resolution}
            resolving={resolving}
            error={resolutionError}
            onAdoptSuggestedDate={adoptSuggestedDate}
          />
          <Divider style={{ margin: 0 }} />
          <PricingQuoteResolutionOverrides
            resolution={resolution}
            controls={controls}
            onChange={updateControls}
            onReset={resetControls}
          />
        </Space>
      </Modal>
    </>
  )
}

/** 默认价格规定：优先保留当前选择，其次项目上次使用，最后唯一一条。 */
function pickDefaultRuleId(
  rules: readonly ProjectPriceRule[],
  current: string | undefined,
  lastPriceRuleId: string | undefined,
): string | undefined {
  if (current && rules.some((rule) => rule.id === current)) return current
  if (lastPriceRuleId && rules.some((rule) => rule.id === lastPriceRuleId)) {
    return lastPriceRuleId
  }
  return rules.length === 1 ? rules[0].id : undefined
}

/** 核查用的生效价格规定：按"单据已记录 → 项目上次使用 → 唯一一条"取。 */
export function pickEffectiveRule(
  rules: readonly ProjectPriceRule[],
  preferredIds: readonly (string | undefined)[],
): ProjectPriceRule | undefined {
  for (const id of preferredIds) {
    if (!id) continue
    const hit = rules.find((rule) => rule.id === id)
    if (hit) return hit
  }
  return rules.length === 1 ? rules[0] : undefined
}

/** 拉取价格规定；失败按"没有规定"处理（核查仍可给出网价匹配结果）。 */
async function fetchRulesSafely(
  projectId: string,
): Promise<ProjectPriceRule[]> {
  try {
    return await fetchProjectPriceRules(projectId)
  } catch {
    return EMPTY_RULES
  }
}

/** 汇总提示文案：未核查 / 全匹配 / 有差异三种说法，避免只报数字不说结论。 */
function describeSummary(
  t: (key: string, options?: Record<string, unknown>) => string,
  summary: {
    total: number
    matched: number
    mismatch: number
    noPrice: number
    unchecked: number
  },
): string {
  if (summary.total === 0) {
    return t('modules.pages.salesOrder.netPriceMatchEmpty')
  }
  if (summary.unchecked === summary.total) {
    return t('modules.pages.salesOrder.netPriceMatchSummaryUnchecked', {
      total: summary.total,
    })
  }
  if (summary.mismatch === 0) {
    // 一致但仍有"无网价"行时要说清: 不能只说"均一致", 否则手工填写的行被当成已核对。
    if (summary.noPrice > 0) {
      return t('modules.pages.salesOrder.netPriceMatchNoMismatchNoPrice', {
        total: summary.total,
        noPrice: summary.noPrice,
      })
    }
    return t('modules.pages.salesOrder.netPriceMatchAllMatched', {
      total: summary.total,
    })
  }
  return t('modules.pages.salesOrder.netPriceMatchSummary', {
    total: summary.total,
    mismatch: summary.mismatch,
  })
}

/** 问题行说明: 不匹配给出"应有价 vs 当前价", 无网价给出该手工填写的提示。 */
function describeProblem(
  t: (key: string, options?: Record<string, unknown>) => string,
  entry: NetPriceMatchEntry | undefined,
): string {
  if (!entry) return ''
  if (entry.state === 'MISMATCH' && entry.expectedPrice !== undefined) {
    return t('modules.pages.salesOrder.netPriceMatchMismatchDetail', {
      expected: formatAmount(entry.expectedPrice),
      current:
        entry.currentPrice === undefined
          ? t('modules.pages.salesOrder.netPriceMatchCurrentEmpty')
          : formatAmount(entry.currentPrice),
    })
  }
  if (entry.state === 'NO_PRICE') {
    return t('modules.pages.salesOrder.netPriceMatchNoPriceDetail')
  }
  return ''
}

/**
 * 弹层行序: 待处理行(不匹配 / 无网价)置顶, 其余按明细顺序跟在后面。
 *
 * <p>唯一来源: 按钮计数(`problemIds`)与弹层排序都用这一份 id 集合, 不再各算一遍 ——
 * 之前按钮写"N 行待处理"、弹层却按明细顺序列全部行, 用户点进去看不到"N"行在哪。</p>
 */
function problemRowsFirst(
  items: readonly ModuleLineItem[],
  problemIds: readonly string[],
): ModuleLineItem[] {
  const problemSet = new Set(problemIds)
  const problems: ModuleLineItem[] = []
  const others: ModuleLineItem[] = []
  for (const item of items) {
    if (problemSet.has(String(item.id))) problems.push(item)
    else others.push(item)
  }
  return [...problems, ...others]
}

/** 二次确认：说清会改写多少行（其中多少行原本没有网价），取消即不改写。 */
function confirmApply(
  t: (key: string, options?: Record<string, unknown>) => string,
  counts: { total: number; overwrite: number; noPrice: number },
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false
    const settle = (value: boolean) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    modal.confirm({
      title: t('modules.pages.salesOrder.netPriceConfirmTitle'),
      content: [
        t('modules.pages.salesOrder.netPriceConfirmOverwrite', {
          count: counts.overwrite,
          total: counts.total,
        }),
        counts.noPrice > 0
          ? t('modules.pages.salesOrder.netPriceConfirmNoPrice', {
              count: counts.noPrice,
            })
          : null,
      ]
        .filter(Boolean)
        .join(' '),
      okText: t('modules.pages.salesOrder.netPriceApply'),
      cancelText: t('common.cancel'),
      onOk: () => settle(true),
      onCancel: () => settle(false),
      afterClose: () => settle(false),
    })
  })
}
