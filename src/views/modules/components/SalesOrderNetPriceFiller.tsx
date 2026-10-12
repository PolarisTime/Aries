import { ThunderboltOutlined } from '@ant-design/icons'
import { Button, Modal, Select, Space, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchMaterialPriceMatches } from '@/api/market/steel-quotes'
import type { ProjectPriceRule } from '@/api/master/project-price-rules'
import { fetchProjectPriceRules } from '@/api/master/project-price-rules'
import { buildSalesOrderPricingSnapshot } from '@/config/business-pages/operations/sales-order-price-snapshot'
import type {
  ModuleItemsActionsContext,
  ModuleLineItem,
} from '@/types/module-page'
import { message } from '@/utils/antd-app'
import {
  applyNetPriceFloat,
  buildNetPriceIndex,
  normalizeDateValue,
  resolveNetPrice,
} from '../net-price-fill'
import { PricingQuoteResolutionOverrides } from './PricingQuoteResolutionOverrides'
import { PricingQuoteResolutionSummary } from './PricingQuoteResolutionSummary'
import { usePricingQuoteResolution } from './use-pricing-quote-resolution'

const { Text } = Typography

/** 交付核定状态（仅此状态显示「整单取网价」）。 */
const DELIVERY_VERIFICATION = '交付核定'

/** 空列表常量：派生回退时保持引用稳定，避免下游 memo 每次失效。 */
const EMPTY_RULES: ProjectPriceRule[] = []

/**
 * 交付核定「整单取网价」：先按项目配置（或本次单据级覆盖）解析取价基准，
 * 再按规定加/减后填入单价。
 *
 * - 解析接口负责回答「取哪天、哪个时段」并说明回退原因，解析结果即取价入参；
 * - 人工可临时改基准/顺延交易日数/时段策略/时段/手工日期，改任一项即按覆盖值重新解析；
 * - 该日无行情（quoteAvailable=false）时不静默取价：提示并提供「采纳建议日期」；
 * - 价格规定单选互斥、不叠加；默认沿用项目上次使用的规定；
 * - 无网价的行保持原值并提示，由用户手填。
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

  const {
    resolution,
    resolving,
    error: resolutionError,
    controls,
    updateControls,
    resetControls,
    adoptSuggestedDate,
  } = usePricingQuoteResolution({ open, projectId, orderDate, deliveryDate })

  // 打开弹层时拉取项目价格规定, 并默认选中"上次使用"(回退到唯一一条)。
  useEffect(() => {
    if (!open || !projectId) return undefined
    let active = true
    fetchProjectPriceRules(projectId)
      .then((list) => {
        if (!active) return
        setRulesState({ projectId, rules: list })
        setRuleId((current) => {
          if (current && list.some((rule) => rule.id === current))
            return current
          const last = project?.lastPriceRuleId
          if (last && list.some((rule) => rule.id === last)) return last
          return list.length === 1 ? list[0].id : undefined
        })
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
      const rows = await fetchMaterialPriceMatches(quoteDate, period, {
        source: quoteSource,
        region: quoteRegion,
      })
      const index = buildNetPriceIndex(rows)

      const nextItems: ModuleLineItem[] = []
      const noPrice: string[] = []
      let filled = 0
      for (const item of items) {
        const price = resolveNetPrice(item, index)
        if (price === undefined) {
          noPrice.push(String(item.material || item.brand || item.id))
          nextItems.push(item)
          continue
        }
        filled += 1
        nextItems.push({
          ...item,
          unitPrice: applyNetPriceFloat(
            price,
            selectedRule?.mode,
            selectedRule?.amount,
          ),
        })
      }

      if (filled > 0) {
        setItems(() => nextItems)
        // 记录所选价格规定, 保存在单据上(交付核定时快照)。
        setFormValue('priceRuleId', selectedRule?.id ?? null)
        // 取价快照随单据保存: 后端要求四项同时提供, 不完整时宁可不带(见快照构造器)。
        const snapshot = buildSalesOrderPricingSnapshot(resolution)
        if (snapshot) {
          setFormValue('priceTargetDate', snapshot.priceTargetDate)
          setFormValue('priceQuoteDate', snapshot.priceQuoteDate)
          setFormValue('priceQuotePeriod', snapshot.priceQuotePeriod)
          setFormValue('priceDateBasis', snapshot.priceDateBasis)
          setFormValue('priceDateOffsetDays', snapshot.priceDateOffsetDays)
          setFormValue('priceClosedSettlePrev', snapshot.priceClosedSettlePrev)
        }
        message.success(
          t('modules.pages.salesOrder.netPriceFilled', { count: filled }),
        )
      }
      if (noPrice.length > 0) {
        message.warning(
          t('modules.pages.salesOrder.netPriceNoPrice', {
            count: noPrice.length,
            items: noPrice.slice(0, 5).join('、'),
          }),
        )
      }
      setOpen(false)
    } catch {
      message.error(t('modules.pages.salesOrder.netPriceFailed'))
    }
    // 不用 try/finally: React Compiler 不支持该语法(react-hooks-js/todo), 命中后组件会失去自动记忆化;
    // 此处无提前 return, 清理语句跟在 try/catch 之后即可保持等价。
    setLoading(false)
  }

  if (currentStatus.trim() !== DELIVERY_VERIFICATION) return null

  return (
    <>
      <Button
        className="overlay-action-button"
        icon={<ThunderboltOutlined />}
        disabled={saving}
        onClick={openDialog}
      >
        {t('modules.pages.salesOrder.netPriceFillAll')}
      </Button>
      <Modal
        open={open}
        title={t('modules.pages.salesOrder.netPriceTitle')}
        okText={t('modules.pages.salesOrder.netPriceApply')}
        confirmLoading={loading}
        onOk={() => void applyNetPrices()}
        onCancel={() => setOpen(false)}
        destroyOnHidden
      >
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Text type="secondary">
            {t('modules.pages.salesOrder.netPriceHint')}
          </Text>
          {rules.length > 0 ? (
            <Space>
              <Text>{t('modules.pages.salesOrder.netPriceRule')}</Text>
              <Select
                aria-label={t('modules.pages.salesOrder.netPriceRule')}
                style={{ width: 200 }}
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
            </Space>
          ) : null}
          {selectedRule ? (
            <Text type="secondary">
              {selectedRule.remark
                ? `${selectedRule.name} · ${selectedRule.remark}`
                : selectedRule.name}
            </Text>
          ) : null}
          <PricingQuoteResolutionSummary
            resolution={resolution}
            resolving={resolving}
            error={resolutionError}
            onAdoptSuggestedDate={adoptSuggestedDate}
          />
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
