import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { formatWeight } from '@/utils/formatters'
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
        {t('modules.itemsSection.freightBillGroup', {
          sourceNo: group.sourceNo || '-',
        })}
      </Typography.Text>
      <Typography.Text strong>
        {t('modules.itemsSection.freightBillGroupTotal', {
          quantity: group.totalQuantity,
          weight: formatWeight(group.totalWeightTon),
        })}
      </Typography.Text>
    </div>
  )
}

interface ProjectGroupHeaderProps<Item extends Record<string, unknown>> {
  group: FreightStatementProjectGroup<Item>
}

export function FreightStatementProjectGroupHeader<
  Item extends Record<string, unknown>,
>({ group }: ProjectGroupHeaderProps<Item>) {
  const { t } = useTranslation()

  return (
    <div className="module-items-project-group-title">
      <Typography.Text strong>
        {t('modules.itemsSection.freightBillProjectGroup', {
          projectName: group.projectName || '-',
        })}
      </Typography.Text>
      <Typography.Text type="secondary">
        {t('modules.itemsSection.freightBillProjectGroupCustomer', {
          customerName: group.customerName || '-',
        })}
      </Typography.Text>
      <Typography.Text strong>
        {t('modules.itemsSection.freightBillProjectGroupTotal', {
          quantity: group.totalQuantity,
          weight: formatWeight(group.totalWeightTon),
        })}
      </Typography.Text>
    </div>
  )
}
