import { SearchOutlined } from '@ant-design/icons'
import {
  Button,
  Empty,
  Input,
  Modal,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { formatWeight } from '@/utils/formatters'

interface Props {
  open: boolean
  /** 当前已关联明细行 id(用于高亮与清除)。 */
  selectedItemId?: string
  options: PurchaseOrderTonnageRecord[]
  loading: boolean
  /** 选中明细行(undefined 表示清除关联); 选择后由调用方关闭弹窗。 */
  onSelect: (purchaseOrderItemId: string | undefined) => void
  onClose: () => void
}

/**
 * 采购订单明细行选择弹窗: 关键字过滤 + 展示规格/订货/已开/剩余吨位。
 * 点击行即选中并关闭; 另提供"清除关联"与"取消"。
 */
export function PurchaseOrderPickerModal({
  open,
  selectedItemId,
  options,
  loading,
  onSelect,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')

  const filtered = useMemo(() => {
    const text = keyword.trim().toLowerCase()
    if (!text) return options
    return options.filter((option) =>
      `${option.orderNo} ${option.supplierName} ${option.category} ${option.material} ${option.spec} ${option.length}`
        .toLowerCase()
        .includes(text),
    )
  }, [options, keyword])

  const columns: ColumnsType<PurchaseOrderTonnageRecord> = [
    {
      title: t('priceCompare.sheet.columns.purchaseOrderNo'),
      dataIndex: 'orderNo',
      width: 140,
      ellipsis: true,
    },
    {
      title: t('priceCompare.sheet.columns.purchaseOrderSupplier'),
      dataIndex: 'supplierName',
      width: 120,
      ellipsis: true,
    },
    {
      title: t('priceCompare.sheet.columns.variety'),
      key: 'variety',
      width: 180,
      ellipsis: true,
      render: (_value, record) =>
        `${record.category} ${record.material} Φ${record.spec} ${record.length}`,
    },
    {
      title: t('priceCompare.sheet.columns.purchaseOrderOrdered'),
      dataIndex: 'orderedWeight',
      width: 96,
      align: 'right',
      render: (value: number) => formatWeight(value),
    },
    {
      title: t('priceCompare.sheet.columns.purchaseOrderIssued'),
      dataIndex: 'issuedWeight',
      width: 96,
      align: 'right',
      render: (value: number) => formatWeight(value),
    },
    {
      title: t('priceCompare.sheet.columns.purchaseOrderRemaining'),
      dataIndex: 'remainingWeight',
      width: 96,
      align: 'right',
      render: (value: number) => (
        <Typography.Text type={value < 0 ? 'danger' : undefined}>
          {formatWeight(value)}
        </Typography.Text>
      ),
    },
    {
      title: t('priceCompare.sheet.columns.purchaseOrderStatus'),
      dataIndex: 'status',
      width: 88,
      align: 'center',
      render: (value: string) => <Tag>{value}</Tag>,
    },
  ]

  return (
    <Modal
      title={t('priceCompare.sheet.purchaseOrderPickerTitle')}
      open={open}
      width={920}
      destroyOnHidden
      footer={
        <div className="price-compare-purchase-order-picker-footer">
          <Tooltip title={t('priceCompare.sheet.purchaseOrderPickerClearHint')}>
            <Button
              danger
              disabled={!selectedItemId}
              onClick={() => onSelect(undefined)}
            >
              {t('priceCompare.sheet.purchaseOrderPickerClear')}
            </Button>
          </Tooltip>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
        </div>
      }
      onCancel={onClose}
      styles={{ body: { paddingTop: 8 } }}
    >
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder={t('priceCompare.sheet.purchaseOrderPickerSearch')}
        value={keyword}
        onChange={(event) => setKeyword(event.currentTarget.value)}
        style={{ marginBottom: 12 }}
      />
      <Table<PurchaseOrderTonnageRecord>
        columns={columns}
        dataSource={filtered}
        rowKey="purchaseOrderItemId"
        loading={loading}
        size="small"
        pagination={{ pageSize: 8, size: 'small', showSizeChanger: false }}
        scroll={{ y: 320 }}
        locale={{
          emptyText: (
            <Empty
              description={t('priceCompare.sheet.purchaseOrderPickerEmpty')}
            />
          ),
        }}
        onRow={(record) => ({
          onClick: () => onSelect(record.purchaseOrderItemId),
          style: {
            cursor: 'pointer',
            background:
              record.purchaseOrderItemId === selectedItemId
                ? 'var(--ant-color-primary-bg, #e6f4ff)'
                : undefined,
          },
        })}
      />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {t('priceCompare.sheet.purchaseOrderPickerHint')}
      </Typography.Text>
    </Modal>
  )
}
