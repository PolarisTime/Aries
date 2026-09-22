import { ThunderboltOutlined } from '@ant-design/icons'
import { Button, DatePicker, Modal, Select, Space, Typography } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchMaterialPriceMatches,
  fetchSteelQuoteCalendars,
} from '@/api/market/steel-quotes'

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

/**
 * 交付核定「整单取网价」：按送货日期+时段匹配网价，叠加项目浮动约定后填入单价。
 * - 无网价的行保持原值并提示，由用户手填；
 * - 浮动方向与幅度取自项目资料（ADD加价 / SUBTRACT减价）。
 */
export function SalesOrderNetPriceFiller(props: ModuleItemsActionsContext) {
  const { t } = useTranslation()
  const { formValues, currentStatus, items, setItems, saving, projectOptions } =
    props
  const [open, setOpen] = useState(false)
  const [quoteDate, setQuoteDate] = useState('')
  const [period, setPeriod] = useState('')
  const [loading, setLoading] = useState(false)

  const deliveryDate = normalizeDateValue(formValues.deliveryDate)
  const projectId = String(formValues.projectId || '').trim()
  const project = projectOptions.find((option) => option.id === projectId)
  const floatMode = project?.priceFloatMode
  const floatValue = project?.priceFloatValue

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
    setLoading(true)
    try {
      const rows = await fetchMaterialPriceMatches(
        quoteDate,
        period || undefined,
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
          unitPrice: applyNetPriceFloat(price, floatMode, floatValue),
        })
      }

      if (filled > 0) setItems(() => nextItems)
      if (filled > 0) {
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
    } finally {
      setLoading(false)
    }
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
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="secondary">
            {t('modules.pages.salesOrder.netPriceHint')}
          </Text>
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
          {floatMode && Number.isFinite(floatValue) ? (
            <Text type="secondary">
              {t('modules.pages.salesOrder.netPriceFloatHint', {
                mode: t(
                  floatMode === 'SUBTRACT'
                    ? 'modules.pages.project.priceFloatSubtract'
                    : 'modules.pages.project.priceFloatAdd',
                ),
                value: floatValue,
              })}
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
  const [periods, setPeriods] = useState<string[]>([])

  useEffect(() => {
    if (!quoteDate) {
      setPeriods([])
      return
    }
    let active = true
    fetchSteelQuoteCalendars(quoteDate, quoteDate)
      .then((items) => {
        if (active) setPeriods(items[0]?.periods ?? [])
      })
      .catch(() => {
        if (active) setPeriods([])
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
