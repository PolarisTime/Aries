import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { formatDate } from '@/utils/formatters'
import type { CustomerStatementItemGroup } from '@/views/modules/customer-statement-item-groups'

interface Props<Item extends Record<string, unknown>> {
  group: CustomerStatementItemGroup<Item>
}

export function CustomerStatementItemGroupHeader<
  Item extends Record<string, unknown>,
>({ group }: Props<Item>) {
  const { t } = useTranslation()

  return (
    <div className="module-items-customer-statement-group-title">
      <span>
        <Typography.Text type="secondary">
          {t('modules.itemsSection.customerStatementGroupNo')}
        </Typography.Text>
        <Typography.Text strong>{group.groupNo}</Typography.Text>
      </span>
      <span>
        <Typography.Text type="secondary">
          {t('modules.itemsSection.customerStatementSalesOrderNo')}
        </Typography.Text>
        <Typography.Text strong>{group.sourceNo || '-'}</Typography.Text>
      </span>
      <span>
        <Typography.Text type="secondary">
          {t('modules.itemsSection.customerStatementDeliveryDate')}
        </Typography.Text>
        <Typography.Text strong>
          {group.deliveryDate ? formatDate(group.deliveryDate) : '-'}
        </Typography.Text>
      </span>
    </div>
  )
}
