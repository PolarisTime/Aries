import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { DocumentReferencePopover } from '@/components/DocumentReferencePopover'
import { formatAmount, formatDate, formatWeight } from '@/utils/formatters'
import type {
  FreightStatementItemGroup,
  FreightStatementProjectGroup,
} from '@/views/modules/freight-statement-item-groups'

interface ItemGroupHeaderProps<Item extends Record<string, unknown>> {
  group: FreightStatementItemGroup<Item>
}

export function FreightStatementItemGroupHeader<
  Item extends Record<string, unknown>,
>({ group }: ItemGroupHeaderProps<Item>) {
  const { t } = useTranslation()
  return (
    <div className="module-items-group-title">
      <Typography.Text strong>
        {t('modules.itemsSection.freightBillGroupBillTime', {
          billTime: group.billTime ? formatDate(group.billTime) : '-',
        })}
      </Typography.Text>
      <Typography.Text strong>
        {t('modules.itemsSection.freightBillGroup', {
          sourceNo: '',
        })}
      </Typography.Text>
      <DocumentReferencePopover
        value={group.sourceNo}
        moduleKey="freight-bill"
        documentLabel="物流单"
      />
      <Typography.Text strong>
        {t('modules.itemsSection.freightBillGroupTotal', {
          quantity: group.totalQuantity,
          weight: formatWeight(group.totalWeightTon),
        })}
      </Typography.Text>
      <Typography.Text type="secondary">
        {t('modules.itemsSection.freightBillGroupUnitPrice', {
          unitPrice: formatAmount(group.unitPrice),
        })}
      </Typography.Text>
      <Typography.Text strong>
        {t('modules.itemsSection.freightBillGroupTotalFreight', {
          totalFreight: formatAmount(group.totalFreight),
        })}
      </Typography.Text>
    </div>
  )
}

interface ProjectGroupHeaderProps<Item extends Record<string, unknown>> {
  group: FreightStatementProjectGroup<Item>
  showSubtotal?: boolean
}

export function FreightStatementProjectGroupHeader<
  Item extends Record<string, unknown>,
>({ group, showSubtotal = true }: ProjectGroupHeaderProps<Item>) {
  const { t } = useTranslation()

  return (
    <div className="module-items-project-group-title">
      <Typography.Text strong>
        {t('modules.itemsSection.freightBillProjectGroupCustomer', {
          customerName: group.customerName || '-',
        })}
      </Typography.Text>
      <Typography.Text type="secondary">
        {t('modules.itemsSection.freightBillProjectGroup', {
          projectName: group.projectName || '-',
        })}
      </Typography.Text>
      {showSubtotal ? (
        <Typography.Text strong>
          {t('modules.itemsSection.freightBillProjectGroupTotal', {
            quantity: group.totalQuantity,
            weight: formatWeight(group.totalWeightTon),
          })}
        </Typography.Text>
      ) : null}
    </div>
  )
}
