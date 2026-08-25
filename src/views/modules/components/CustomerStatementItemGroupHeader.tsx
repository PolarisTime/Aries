import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import {
  formatAmount,
  formatDate,
  formatInteger,
  formatWeight,
} from '@/utils/formatters'
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
      <div className="module-items-customer-statement-group-meta">
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
      <div className="module-items-customer-statement-group-summary">
        <span>
          <Typography.Text type="secondary">
            {t('modules.itemsSection.customerStatementTotalQuantity')}
          </Typography.Text>
          <Typography.Text strong>
            {formatInteger(group.totalQuantity)}
          </Typography.Text>
        </span>
        <span>
          <Typography.Text type="secondary">
            {t('modules.itemsSection.customerStatementTotalWeight')}
          </Typography.Text>
          <Typography.Text strong>
            {formatWeight(group.totalWeightTon)}
          </Typography.Text>
        </span>
        <span>
          <Typography.Text type="secondary">
            {t('modules.itemsSection.customerStatementTotalAmount')}
          </Typography.Text>
          <Typography.Text strong>
            {formatAmount(group.totalAmount)}
          </Typography.Text>
        </span>
      </div>
    </div>
  )
}
