import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { formatDocumentReferenceText } from '@/components/document-reference/document-reference-utils'
import { formatAmount, formatDate, formatWeight } from '@/utils/formatters'
import type {
  FreightStatementItemGroup,
  FreightStatementProjectGroup,
} from '@/views/modules/freight-statement-item-groups'

/**
 * 分组卡片里的一个「标签 + 值」单元。
 *
 * <p>物流对账单详情原来把日期、单号、合计、运费单价、运费总价塞进同一行文本，
 * 十来个字段连成一句，扫读时找不到重点；拆成卡片头部的字段单元后，
 * 标签左、值右、数值统一 tabular-nums 对齐。</p>
 */
function GroupField({
  label,
  strong,
  value,
  valueClassName,
}: {
  label: string
  strong?: boolean
  value: React.ReactNode
  valueClassName?: string
}) {
  const valueNode = <span className={valueClassName}>{value}</span>
  return (
    <span className="module-items-group-field">
      <span className="module-items-group-label">{label}</span>
      {strong ? (
        <Typography.Text strong>{valueNode}</Typography.Text>
      ) : (
        valueNode
      )}
    </span>
  )
}

interface ItemGroupHeaderProps<Item extends Record<string, unknown>> {
  group: FreightStatementItemGroup<Item>
}

/**
 * 物流对账单里「一张来源物流单」的卡片头：左侧单号与日期，右侧合计与运费。
 *
 * <p>日期取自明细上的 `sourceFreightBillTime`（由后端随明细持久化并回填历史数据）；
 * 早期没有该字段的单据显示「-」，而不是把整个「单据日期」字段藏起来——
 * 用户需要知道这张卡到底有没有日期，藏字段会让不同卡片的字段数量不一致。</p>
 */
export function FreightStatementItemGroupHeader<
  Item extends Record<string, unknown>,
>({ group }: ItemGroupHeaderProps<Item>) {
  const { t } = useTranslation()
  const sourceNo = formatDocumentReferenceText(group.sourceNo).trim()

  return (
    <div className="module-items-group-title module-items-freight-group-title">
      <div className="module-items-freight-group-identity">
        <GroupField
          label={t('modules.itemsSection.freightGroupSourceLabel')}
          strong
          value={sourceNo || '-'}
          valueClassName="module-items-freight-group-no"
        />
        <GroupField
          label={t('modules.itemsSection.freightGroupBillTimeLabel')}
          value={group.billTime ? formatDate(group.billTime) : '-'}
        />
      </div>
      <div className="module-items-freight-group-metrics">
        <GroupField
          label={t('modules.itemsSection.freightGroupQuantityLabel')}
          strong
          value={group.totalQuantity}
          valueClassName="module-items-group-number"
        />
        <GroupField
          label={t('modules.itemsSection.freightGroupWeightLabel')}
          strong
          value={t('modules.itemsSection.freightGroupWeightValue', {
            weight: formatWeight(group.totalWeightTon),
          })}
          valueClassName="module-items-group-number"
        />
        <GroupField
          label={t('modules.itemsSection.freightGroupUnitPriceLabel')}
          value={t('modules.itemsSection.freightGroupUnitPriceValue', {
            unitPrice: formatAmount(group.unitPrice),
          })}
          valueClassName="module-items-group-number module-items-group-number--muted"
        />
        <GroupField
          label={t('modules.itemsSection.freightGroupTotalFreightLabel')}
          strong
          value={t('modules.itemsSection.freightGroupTotalFreightValue', {
            totalFreight: formatAmount(group.totalFreight),
          })}
          valueClassName="module-items-group-number"
        />
      </div>
    </div>
  )
}

interface ProjectGroupHeaderProps<Item extends Record<string, unknown>> {
  group: FreightStatementProjectGroup<Item>
  showSubtotal?: boolean
}

/** 卡片内「项目」小节头：客户与项目左对齐、小计右对齐，项目名超长省略并可悬停查看全称。 */
export function FreightStatementProjectGroupHeader<
  Item extends Record<string, unknown>,
>({ group, showSubtotal = true }: ProjectGroupHeaderProps<Item>) {
  const { t } = useTranslation()
  const customerName = group.customerName?.trim() || '-'
  const projectName = group.projectName?.trim() || '-'

  return (
    <div className="module-items-project-group-title">
      <div className="module-items-project-group-meta">
        <GroupField
          label={t('modules.itemsSection.freightProjectCustomerLabel')}
          strong
          value={customerName}
        />
        <GroupField
          label={t('modules.itemsSection.freightProjectNameLabel')}
          value={
            <span
              className="module-items-project-group-project"
              title={projectName}
            >
              {projectName}
            </span>
          }
        />
      </div>
      {showSubtotal ? (
        <div className="module-items-project-group-summary">
          <span className="module-items-group-label">
            {t('modules.itemsSection.freightProjectSubtotalLabel')}
          </span>
          <span className="module-items-group-number">
            {t('modules.itemsSection.freightProjectSubtotalValue', {
              quantity: group.totalQuantity,
              weight: formatWeight(group.totalWeightTon),
            })}
          </span>
        </div>
      ) : null}
    </div>
  )
}
