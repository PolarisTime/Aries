import { ThunderboltOutlined } from '@ant-design/icons'
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
import type { ProjectPriceRule } from '@/api/master/project-price-rules'
import { fetchProjectPriceRules } from '@/api/master/project-price-rules'
import { buildSalesOrderPricingSnapshot } from '@/config/business-pages/operations/sales-order-price-snapshot'
import type {
  ModuleItemsActionsContext,
  ModuleLineItem,
} from '@/types/module-page'
import { message, modal } from '@/utils/antd-app'
import { summarizeErrorMessage } from '@/utils/error-presentation'
import '@/styles/net-price-match.css'
import {
  computeNetPriceEntries,
  loadNetPriceIndex,
  pickEffectiveRule,
} from '../net-price-check'
import {
  applyNetPricesToItems,
  type NetPriceRule,
  normalizeDateValue,
  summarizeNetPriceMatch,
} from '../net-price-fill'
import { useNetPriceMatchStore } from '../net-price-match-store'
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

/** 取价快照字段：后端要求一起下发，不完整时宁可不带（见快照构造器）。 */
const SNAPSHOT_FIELDS = [
  ['priceTargetDate', 'priceTargetDate'],
  ['priceQuoteDate', 'priceQuoteDate'],
  ['priceQuotePeriod', 'priceQuotePeriod'],
  ['priceDateBasis', 'priceDateBasis'],
  ['priceDateOffsetDays', 'priceDateOffsetDays'],
  ['priceClosedSettleDirection', 'priceClosedSettleDirection'],
  ['priceClosedSettleDays', 'priceClosedSettleDays'],
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

  // 挂载期间为 true：核查结果只有在组件还活着时才写快照。
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  /*
   * 切换单据/卸载时丢弃**这张单**的核查结果, 避免行内标识串单, 同时不动其它单据
   * (快照支持多张单据并存, 例如列表里同时展开多行)。
   *
   * <p>换单后「上一次整单取价的结果摘要」与「核查错误」不再适用, 必须清掉。
   * **这一步放在渲染期**: 它是由 prop 派生(`documentKey` 变化)的本地 state 重置。依据
   * react.dev《You Might Not Need an Effect》→「Adjusting some state when a prop changes」,
   * 用「记住上一次的 key + 渲染期 setState」代替 effect —— 否则会先提交一帧
   * 「新单 + 上一张单的取价摘要」的错误画面, 再多跑一次提交。
   *
   * <p>而清理快照**必须留在 effect**: `useNetPriceMatchStore.clearDocument` 写的是组件外的
   * zustand store, 且要在「卸载/换单」这一刻执行; 渲染期写外部 store 属于副作用, 会随渲染被
   * 丢弃或重放。这里用 effect 的 cleanup 拿"上一张单"的 key: cleanup 在依赖变化与卸载时都会
   * 执行, 闭包里的 documentKey 正是即将离开的那张单, 因此不需要在渲染期写 ref。
   */
  const [appliedDocumentKey, setAppliedDocumentKey] = useState(documentKey)
  if (appliedDocumentKey !== documentKey) {
    setAppliedDocumentKey(documentKey)
  }

  useEffect(
    () => () => {
      useNetPriceMatchStore.getState().clearDocument(documentKey)
    },
    [documentKey],
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

  const openDialog = () => {
    // 每次打开都从项目配置重新解析, 不沿用上一次打开时的临时覆盖。
    resetControls()
    setOpen(true)
  }

  // 取价索引与只读面共用 `loadNetPriceIndex`(同一处取数与建索引, 不各写一份)。
  const loadMatchIndex = useCallback(
    (args: { quoteDate: string; period: string; signal?: AbortSignal }) =>
      loadNetPriceIndex({
        ...args,
        ...(quoteSource ? { source: quoteSource } : {}),
        ...(quoteRegion ? { region: quoteRegion } : {}),
      }),
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

  /**
   * 核查当前整单的网价匹配状态, 并把结果写入页面级快照(行内标识据此刷新)。
   *
   * <p>**结论走弹通知**（沿用全站 `@/utils/antd-app` 的 message 出口），工具栏不再挂一行
   * 常驻文字：那行文字既占位置又随时间失效，用户扫一眼就走了，反倒让"成功 4 行"看起来
   * 像一条待处理提示。需要逐行核对时看明细表右侧的「网价匹配」列。</p>
   */
  const runMatchCheck = useCallback(
    async (checkItems?: ModuleLineItem[]) => {
      if (!projectId) {
        message.warning(t('modules.pages.salesOrder.netPriceMatchNeedProject'))
        return
      }
      try {
        const resolved = await fetchPricingQuoteResolution(projectId, {
          ...(orderDate ? { orderDate } : {}),
          ...(deliveryDate ? { deliveryDate } : {}),
        })
        const quoteDate = resolved.quoteDate ?? ''
        const period = resolved.period ?? ''
        // 无行情 / 无时段时没有可核查的网价: 说清原因, 不改动已有结果。
        if (!resolved.quoteAvailable || !quoteDate || !period) {
          message.warning(t('modules.pages.salesOrder.netPriceNoQuote'))
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
          message.warning(t('modules.pages.salesOrder.netPricePickRule'))
          return
        }
        const index = await loadMatchIndex({ quoteDate, period })
        // 逐行核查与只读面共用 `computeNetPriceEntries`: 口径只有一份。
        // 整单取价刚写入的明细优先用调用方传入的新数组: useCallback 闭包里的 items 还是写入前的。
        const next = computeNetPriceEntries(checkItems ?? items, index, rule)
        if (!mountedRef.current) return
        useNetPriceMatchStore.getState().setResult(documentKey, next)
        // 与「网价匹配」列同一份口径：有需要处理的行才提示，全部一致时不打扰。
        const verdict = describeSummary(
          t,
          summarizeNetPriceMatch(checkItems ?? items, next),
        )
        if (verdict) message.warning(verdict)
      } catch (cause: unknown) {
        if (!mountedRef.current) return
        message.error(
          summarizeErrorMessage(cause) ||
            t('modules.pages.salesOrder.netPriceMatchCheckFailed'),
        )
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
      /*
       * 空行（没有商品身份）被跳过的条数也要说一声：用户以为"整单都取到了"，
       * 结果有几行根本没参与取价 —— 这是唯一能解释"为什么这行单价还是空的"的地方。
       */
      if (outcome.skipped > 0) {
        message.info(
          t('modules.pages.salesOrder.netPriceApplySkipped', {
            count: outcome.skipped,
          }),
        )
      }
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

  return (
    <>
      {/*
       * 工具栏只剩一个动作按钮：结果与核查结论都改成弹通知（见 runMatchCheck 与
       * applyNetPrices 里的 message 调用），不再在按钮旁边挂一行常驻文字。
       *
       * <p>去掉「重新核查网价」图标按钮：核查本来就在每次取价后自动跑一遍，
       * 单独留一个没有可读文案的图标按钮只会让人猜它是"刷新页面"还是"重新取价"。</p>
       */}
      {canApplyNetPrice ? (
        applyButton
      ) : (
        <Tooltip title={statusHint} trigger={['hover', 'focus']}>
          {applyButton}
        </Tooltip>
      )}
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

/**
 * 结论行文案：**只在需要处理时返回文本**，否则返回 null（整行不渲染）。
 *
 * <p>为什么不再常驻：</p>
 * <ul>
 *   <li>「N 行未核查」是每张单打开时的**默认态**，默认态不是信息；表格的「网价匹配」列
 *       已经逐行标注，再在工具栏复述一遍是同一份信息的第二个出口。</li>
 *   <li>「均与网价一致」同理 —— 行内标识已经给出结论，成功不需要占一行常驻文案。</li>
 *   <li>留下的是**需要动手**的两类：与网价不一致、无网价需手工填写。</li>
 * </ul>
 *
 * <p>文案也不再带「网价匹配：」「本单 N 行，」这类前缀：结论区就在「整单取网价」旁边，
 * 上下文已经说明它是什么；前缀只会让一行变长却不增加信息。</p>
 */
function describeSummary(
  t: (key: string, options?: Record<string, unknown>) => string,
  summary: {
    total: number
    matched: number
    mismatch: number
    noPrice: number
    unchecked: number
  },
): string | null {
  if (summary.mismatch > 0) {
    return t('modules.pages.salesOrder.netPriceMatchSummary', {
      mismatch: summary.mismatch,
    })
  }
  if (summary.noPrice > 0) {
    return t('modules.pages.salesOrder.netPriceMatchNoPriceSummary', {
      noPrice: summary.noPrice,
    })
  }
  return null
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
