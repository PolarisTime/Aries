import {
  ApartmentOutlined,
  PlusOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { Button, Flex, Typography } from 'antd'
import { useTranslation } from 'react-i18next'

interface PickupListSummaryProps {
  canGroup: boolean
  canRestore: boolean
  summaryItems: Array<[string, string | number]>
  onAddGroup: () => void
  onClose: () => void
  onGroupByWarehouse: () => void
  onRestore: () => void
}

export function PickupListSummary({
  canGroup,
  canRestore,
  summaryItems,
  onAddGroup,
  onClose,
  onGroupByWarehouse,
  onRestore,
}: PickupListSummaryProps) {
  const { t } = useTranslation()

  return (
    <Flex
      align="center"
      className="purchase-pickup-list-summary"
      gap={16}
      justify="space-between"
      wrap
    >
      <Flex
        align="center"
        className="purchase-pickup-list-summary-metrics"
        gap={24}
        wrap
      >
        {summaryItems.map(([label, value]) => (
          <span key={label} className="purchase-pickup-list-metric">
            <Typography.Text type="secondary">{label}：</Typography.Text>
            <Typography.Text strong>{value}</Typography.Text>
          </span>
        ))}
      </Flex>
      <Flex align="center" gap={12} wrap>
        <Button
          disabled={!canGroup}
          icon={<ApartmentOutlined />}
          onClick={onGroupByWarehouse}
        >
          {t('modules.purchasePickupList.groupByWarehouse')}
        </Button>
        <Button icon={<PlusOutlined />} onClick={onAddGroup}>
          {t('modules.purchasePickupList.addGroup')}
        </Button>
        <Button
          disabled={!canRestore}
          icon={<UndoOutlined />}
          onClick={onRestore}
        >
          {t('modules.purchasePickupList.restoreDefault')}
        </Button>
        <Button type="primary" onClick={onClose}>
          {t('common.close')}
        </Button>
      </Flex>
    </Flex>
  )
}
