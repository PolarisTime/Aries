import type { TableProps } from 'antd'
import { InputNumber, Table, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { SalesReturnCandidateItem } from '@/shared/schemas/module-record'
import { isItemQuantityOutOfRange } from './sales-return-source-import-utils'

interface Props {
  /** 可退明细行（调用方已按 returnableQuantity > 0 过滤）。 */
  items: SalesReturnCandidateItem[]
  /** 已勾选行 id。 */
  selectedIds: string[]
  /** 各行退货数量（行 id → 数量）。 */
  quantityById: Record<string, number>
  onSelectedIdsChange: (ids: string[]) => void
  onQuantityChange: (itemId: string, quantity: number) => void
}

/**
 * 退货来源候选明细表：逐行勾选并填写退货数量，数量越界就地提示到行内。
 *
 * <p>从 `SalesReturnSourceImportAction` 抽出，让弹窗壳（来源选择、日期、提交）与表格
 * 各自保持可读；列定义与行内渲染完整搬过来，class 名与 aria 属性不变。</p>
 *
 * <p>只包一层表格、不额外包片段：外层 `Space` 会把片段摊平成多个间距项，
 * 若把来源单号文案也收进来，文案与表格之间的间距会消失。</p>
 */
export function SalesReturnSourceImportActionTable({
  items,
  selectedIds,
  quantityById,
  onSelectedIdsChange,
  onQuantityChange,
}: Props) {
  const { t } = useTranslation()

  const columns: TableProps<SalesReturnCandidateItem>['columns'] = [
    {
      title: t('modules.pages.salesReturn.sourceImport.colMaterialCode'),
      dataIndex: 'materialCode',
      width: 140,
    },
    {
      title: t('modules.pages.salesReturn.sourceImport.colBrand'),
      dataIndex: 'brand',
      width: 90,
    },
    {
      title: t('modules.pages.salesReturn.sourceImport.colMaterial'),
      dataIndex: 'material',
      width: 100,
    },
    {
      title: t('modules.pages.salesReturn.sourceImport.colSpec'),
      dataIndex: 'spec',
      width: 90,
    },
    {
      title: t('modules.pages.salesReturn.sourceImport.colOutboundQuantity'),
      dataIndex: 'outboundQuantity',
      width: 100,
      align: 'right',
    },
    {
      title: t('modules.pages.salesReturn.sourceImport.colReturnedQuantity'),
      dataIndex: 'returnedQuantity',
      width: 100,
      align: 'right',
    },
    {
      title: t('modules.pages.salesReturn.sourceImport.colReturnableQuantity'),
      dataIndex: 'returnableQuantity',
      width: 100,
      align: 'right',
    },
    {
      title: t('modules.pages.salesReturn.sourceImport.colReturnQuantity'),
      dataIndex: 'sourceSalesOutboundItemId',
      width: 160,
      render: (_value, item, index) => {
        const inputId = `sales-return-quantity-${item.sourceSalesOutboundItemId}`
        const errorId = `${inputId}-error`
        const invalid = isItemQuantityOutOfRange(item, quantityById)
        return (
          <div>
            <InputNumber
              id={inputId}
              min={0}
              max={item.returnableQuantity}
              precision={0}
              status={invalid ? 'error' : undefined}
              aria-label={t(
                'modules.pages.salesReturn.sourceImport.quantityAriaLabel',
                { index: index + 1 },
              )}
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? errorId : undefined}
              value={quantityById[item.sourceSalesOutboundItemId] ?? 0}
              onChange={(value) =>
                onQuantityChange(
                  item.sourceSalesOutboundItemId,
                  Number(value ?? 0),
                )
              }
              style={{ width: '100%' }}
            />
            {invalid ? (
              <Typography.Text
                id={errorId}
                role="alert"
                type="danger"
                style={{ display: 'block', fontSize: 12 }}
              >
                {t(
                  'modules.pages.salesReturn.sourceImport.quantityOutOfRange',
                  { max: item.returnableQuantity },
                )}
              </Typography.Text>
            ) : null}
          </div>
        )
      },
    },
  ]

  return (
    <Table<SalesReturnCandidateItem>
      rowKey="sourceSalesOutboundItemId"
      size="small"
      columns={columns}
      dataSource={items}
      pagination={false}
      scroll={{ y: 320 }}
      rowSelection={{
        selectedRowKeys: selectedIds,
        onChange: (keys) => onSelectedIdsChange(keys.map(String)),
      }}
    />
  )
}
