import { useQuery } from '@tanstack/react-query'
import { Alert, Descriptions, Spin, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import {
  fetchSupplierPriceList,
  type SupplierPriceListItem,
} from '@/api/master/supplier-price-lists'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_REALTIME } from '@/constants/query-policies'
import type { EntityId } from '@/types/entity-id'
import { WorkspaceOverlay } from '@/views/modules/components/WorkspaceOverlay'
import {
  describePriceRow,
  PRICE_ITEM_STATUS_I18N_KEYS,
} from './supplier-price-list-editor-model'

interface Props {
  open: boolean
  listId: EntityId | null
  onClose: () => void
}

/** 只读查看版本（含条目全量）。 */
export function SupplierPriceListDetailOverlay({
  open,
  listId,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const detailQuery = useQuery({
    queryKey: QUERY_KEYS.supplierPriceList(listId ?? ''),
    queryFn: ({ signal }) => fetchSupplierPriceList(listId as EntityId, signal),
    enabled: open && Boolean(listId),
    staleTime: STALE_REALTIME,
  })
  const detail = detailQuery.data

  const columns: ColumnsType<SupplierPriceListItem> = [
    {
      title: t('supplierPriceList.columns.category'),
      dataIndex: 'category',
      width: 110,
    },
    {
      title: t('supplierPriceList.columns.material'),
      dataIndex: 'material',
      width: 150,
    },
    {
      title: t('supplierPriceList.columns.spec'),
      dataIndex: 'spec',
      width: 100,
      align: 'right',
      render: (spec: number) => `Φ${spec}`,
    },
    {
      title: t('supplierPriceList.columns.length'),
      dataIndex: 'length',
      width: 100,
    },
    {
      title: t('supplierPriceList.columns.price'),
      dataIndex: 'price',
      width: 120,
      align: 'right',
      render: (price: number | null) =>
        price === null ? (
          <Tag color="default">{t('supplierPriceList.noQuote')}</Tag>
        ) : (
          price.toFixed(2)
        ),
    },
    {
      title: t('supplierPriceList.columns.priceStatus'),
      dataIndex: 'priceStatus',
      width: 130,
      render: (status: SupplierPriceListItem['priceStatus']) =>
        t(PRICE_ITEM_STATUS_I18N_KEYS[status]),
    },
    {
      title: t('supplierPriceList.columns.remark'),
      dataIndex: 'remark',
      ellipsis: true,
      render: (remark: string | null) => remark || '-',
    },
  ]

  return (
    <WorkspaceOverlay
      open={open}
      title={t('supplierPriceList.detail.title')}
      width={1080}
      onClose={onClose}
    >
      {detailQuery.error ? (
        <Alert
          type="error"
          showIcon
          title={
            detailQuery.error instanceof Error
              ? detailQuery.error.message
              : t('api.loadFailed')
          }
        />
      ) : null}
      <Spin spinning={detailQuery.isLoading}>
        {detail ? (
          <>
            <Descriptions
              size="small"
              column={3}
              items={[
                {
                  key: 'supplier',
                  label: t('supplierPriceList.header.supplier'),
                  children: detail.supplierName || `#${detail.supplierId}`,
                },
                {
                  key: 'brand',
                  label: t('supplierPriceList.header.brand'),
                  children: detail.brandName,
                },
                {
                  key: 'releasedAt',
                  label: t('supplierPriceList.header.releasedAt'),
                  children: detail.releasedAt,
                },
                {
                  key: 'effective',
                  label: t('supplierPriceList.columns.effectiveRange'),
                  children: `${detail.effectiveFrom} ~ ${
                    detail.effectiveTo ??
                    t('supplierPriceList.columns.effectiveToForever')
                  }`,
                },
                {
                  key: 'status',
                  label: t('common.status'),
                  children: t(
                    detail.status === 'ARCHIVED'
                      ? 'supplierPriceList.status.archived'
                      : 'supplierPriceList.status.active',
                  ),
                },
                {
                  key: 'warehouse',
                  label: t('supplierPriceList.header.warehouse'),
                  children: detail.warehouse || '-',
                },
                {
                  key: 'itemCount',
                  label: t('supplierPriceList.columns.itemCount'),
                  children: String(detail.items.length),
                },
                {
                  key: 'remark',
                  label: t('supplierPriceList.header.remark'),
                  children: detail.remark || '-',
                  span: 2,
                },
              ]}
            />
            <Table<SupplierPriceListItem>
              rowKey={(row) => row.id ?? describePriceRow(row)}
              size="small"
              columns={columns}
              dataSource={detail.items}
              pagination={{ pageSize: 50, size: 'small' }}
              scroll={{ x: 'max-content' }}
            />
          </>
        ) : null}
      </Spin>
    </WorkspaceOverlay>
  )
}
