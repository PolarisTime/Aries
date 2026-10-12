import { ThunderboltOutlined } from '@ant-design/icons'
import { Button, DatePicker, Modal, Select, Space, Typography } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchMaterialPriceMatches,
  fetchSteelQuoteCalendars,
} from '@/api/market/steel-quotes'
import type { ProjectPriceRule } from '@/api/master/project-price-rules'
import { fetchProjectPriceRules } from '@/api/master/project-price-rules'
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

const { Text } = Typography

/** 交付核定状态（仅此状态显示「整单取网价」）。 */
const DELIVERY_VERIFICATION = '交付核定'

/** 空列表常量：派生回退时保持引用稳定，避免下游 memo 每次失效。 */
const EMPTY_RULES: ProjectPriceRule[] = []
const EMPTY_PERIODS: string[] = []

/**
 * 交付核定「整单取网价」：选择价格规定 + 日期/时段匹配网价，按规定加/减后填入单价。
 * - 价格规定单选互斥、不叠加；默认沿用项目上次使用的规定；
 * - 项目有多条规定时必须选择一条；未配置规定时不浮动；
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
  const [quoteDate, setQuoteDate] = useState('')
  const [period, setPeriod] = useState('')
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
  const projectId = String(formValues.projectId || '').trim()
  const project = projectOptions.find((option) => option.id === projectId)
  // 数据源与地区取自项目配置: 西本按地区报价。
  const quoteSource = project?.quoteSource
  const quoteRegion = project?.quoteRegion
  const rules =
    rulesState && rulesState.projectId === projectId
      ? rulesState.rules
      : EMPTY_RULES

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
    setQuoteDate(deliveryDate || dayjs().format('YYYY-MM-DD'))
    setPeriod('')
    setOpen(true)
  }

  const applyNetPrices = async () => {
    if (!quoteDate) {
      message.warning(t('modules.pages.salesOrder.netPricePickDate'))
      return
    }
    if (rules.length > 0 && !selectedRule) {
      message.warning(t('modules.pages.salesOrder.netPricePickRule'))
      return
    }
    setLoading(true)
    try {
      const rows = await fetchMaterialPriceMatches(
        quoteDate,
        period || undefined,
        { source: quoteSource, region: quoteRegion },
      )
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
          <Space>
            <Text>{t('modules.pages.salesOrder.netPriceDate')}</Text>
            <DatePicker
              value={quoteDate ? dayjs(quoteDate) : null}
              allowClear={false}
              onChange={(value) =>
                setQuoteDate(value ? value.format('YYYY-MM-DD') : '')
              }
            />
          </Space>
          <Space>
            <Text>{t('modules.pages.salesOrder.netPricePeriod')}</Text>
            <PeriodSelect
              quoteDate={quoteDate}
              value={period}
              onChange={setPeriod}
            />
          </Space>
          {selectedRule ? (
            <Text type="secondary">
              {selectedRule.remark
                ? `${selectedRule.name} · ${selectedRule.remark}`
                : selectedRule.name}
            </Text>
          ) : null}
        </Space>
      </Modal>
    </>
  )
}

/** 时段下拉：按所选日期拉取可用时段。 */
function PeriodSelect({
  quoteDate,
  value,
  onChange,
}: {
  quoteDate: string
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useTranslation()
  /**
   * 已拉取到的时段：日期被清空时派生回退为空，
   * 不需要在 effect 里同步 setPeriods([])（同步 setState 会触发级联渲染）。
   */
  const [loadedPeriods, setLoadedPeriods] = useState<string[]>([])
  const periods = quoteDate ? loadedPeriods : EMPTY_PERIODS

  useEffect(() => {
    if (!quoteDate) return undefined
    let active = true
    fetchSteelQuoteCalendars(quoteDate, quoteDate)
      .then((items) => {
        if (active) setLoadedPeriods(items[0]?.periods ?? [])
      })
      .catch(() => {
        if (active) setLoadedPeriods(EMPTY_PERIODS)
      })
    return () => {
      active = false
    }
  }, [quoteDate])

  const options = useMemo(
    () => periods.map((p) => ({ label: p, value: p })),
    [periods],
  )

  return (
    <Select
      style={{ width: 160 }}
      placeholder={t('modules.pages.salesOrder.netPricePeriodAll')}
      value={value || undefined}
      options={options}
      onChange={onChange}
      allowClear
    />
  )
}
