import { useQuery } from '@tanstack/react-query'
import { Alert, Input, Select, Space, Spin, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SupplierOption } from '@/api/master/supplier-options'
import {
  fetchSupplierPriceListMatrix,
  type SupplierPriceMatrixRow,
} from '@/api/master/supplier-price-lists'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_REALTIME } from '@/constants/query-policies'
import { WorkspaceOverlay } from '@/views/modules/components/WorkspaceOverlay'
import { formatUpdatedAt } from './supplier-price-list-editor-model'

interface Props {
  open: boolean
  supplierOptions: SupplierOption[]
  onClose: () => void
}

/**
 * 只读对照矩阵（P1）：跨供应商/品牌的单价横向对照，作为主矩阵的补充视图。
 *
 * <p>纯读接口 `GET /supplier-price-lists/matrix`，不触发任何写入；R2 起没有版本，
 * 因此列头只显示「更新时间」而不是发布时刻/生效区间。</p>
 */
export function SupplierPriceListMatrixOverlay({
  open,
  supplierOptions,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const [supplierIds, setSupplierIds] = useState<string[]>([])
  const [brandNames, setBrandNames] = useState<string[]>([])
  const [category, setCategory] = useState('')

  const matrixQuery = useQuery({
    queryKey: QUERY_KEYS.supplierPriceListMatrix({
      supplierIds,
      brandNames,
      category,
    }),
    queryFn: ({ signal }) =>
      fetchSupplierPriceListMatrix(
        {
          ...(supplierIds.length ? { supplierIds } : {}),
          ...(brandNames.length ? { brandNames } : {}),
          ...(category ? { category } : {}),
        },
        signal,
      ),
    enabled: open,
    staleTime: STALE_REALTIME,
  })

  const brandOptions = useMemo(() => {
    const selectedSuppliers = new Set(supplierIds)
    const brands = new Set<string>()
    for (const option of supplierOptions) {
      if (selectedSuppliers.size && !selectedSuppliers.has(option.id)) {
        continue
      }
      for (const brand of option.brands ?? []) {
        brands.add(brand)
      }
    }
    return [...brands].map((value) => ({ value, label: value }))
  }, [supplierOptions, supplierIds])

  const columns = useMemo(() => {
    const base: ColumnsType<SupplierPriceMatrixRow> = [
      {
        title: t('supplierPriceList.columns.category'),
        dataIndex: 'category',
        width: 110,
        fixed: 'left',
      },
      {
        title: t('supplierPriceList.columns.material'),
        dataIndex: 'material',
        width: 150,
        fixed: 'left',
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
        width: 90,
      },
    ]
    const matrixColumns: ColumnsType<SupplierPriceMatrixRow> = (
      matrixQuery.data?.columns ?? []
    ).map((column, index) => ({
      title: (
        <span className="supplier-price-brand-header">
          <span>
            {column.supplierName || `#${column.supplierId}`} /{' '}
            {column.brandName}
          </span>
          {column.updatedAt ? (
            <span className="supplier-price-brand-state">
              {formatUpdatedAt(column.updatedAt)}
            </span>
          ) : null}
        </span>
      ),
      key: `${column.supplierId}-${column.brandName}-${index}`,
      width: 160,
      align: 'right',
      render: (_: unknown, row) => {
        const cell = row.cells[index]
        if (!cell) {
          // 该品牌没有这一行（无价格表/无条目）：用 title 说明，避免无 role 元素挂 aria-label
          return <span title={t('supplierPriceList.noQuote')}>-</span>
        }
        if (cell.price === null) {
          // WCAG 1.4.1: 「不报价」用文字而不是只靠颜色
          return <Tag color="default">{t('supplierPriceList.noQuote')}</Tag>
        }
        return cell.price.toFixed(2)
      },
    }))
    return [...base, ...matrixColumns]
  }, [t, matrixQuery.data])

  return (
    <WorkspaceOverlay
      open={open}
      title={t('supplierPriceList.matrix.title')}
      width={1400}
      onClose={onClose}
    >
      <Space orientation="vertical" size={12} style={{ width: '100%' }}>
        <div className="supplier-price-list-editor-actions">
          <Select
            mode="multiple"
            allowClear
            style={{ minWidth: 220 }}
            aria-label={t('supplierPriceList.matrix.suppliers')}
            placeholder={t('supplierPriceList.matrix.suppliers')}
            value={supplierIds}
            onChange={(value) => {
              setSupplierIds(value)
              setBrandNames([])
            }}
            options={supplierOptions.map((option) => ({
              value: option.id,
              label: option.label,
            }))}
          />
          <Select
            mode="multiple"
            allowClear
            style={{ minWidth: 200 }}
            aria-label={t('supplierPriceList.matrix.brands')}
            placeholder={t('supplierPriceList.matrix.brands')}
            value={brandNames}
            onChange={setBrandNames}
            options={brandOptions}
          />
          <Input
            allowClear
            style={{ width: 160 }}
            aria-label={t('supplierPriceList.matrix.category')}
            placeholder={t('supplierPriceList.matrix.category')}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
        </div>

        {matrixQuery.error ? (
          <Alert
            type="error"
            showIcon
            title={
              matrixQuery.error instanceof Error
                ? matrixQuery.error.message
                : t('api.loadFailed')
            }
          />
        ) : null}

        <Spin spinning={matrixQuery.isLoading}>
          <Table<SupplierPriceMatrixRow>
            className="supplier-price-matrix-table"
            rowKey={(row) =>
              [row.category, row.material, row.spec, row.length].join('|')
            }
            size="small"
            columns={columns}
            dataSource={matrixQuery.data?.rows ?? []}
            pagination={{ pageSize: 50, size: 'small' }}
            scroll={{ x: 'max-content' }}
          />
        </Spin>
      </Space>
    </WorkspaceOverlay>
  )
}
