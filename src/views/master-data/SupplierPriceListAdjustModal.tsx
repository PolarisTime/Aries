import { Alert, Button, InputNumber, Modal, Radio, Space, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PriceAdjustmentMode } from '@/api/master/supplier-price-lists'
import {
  type AdjustmentPreviewRow,
  buildAdjustmentPreview,
  isAdjustmentAmountValid,
  type PriceDraftRow,
} from './supplier-price-list-editor-model'

interface Props {
  open: boolean
  rows: PriceDraftRow[]
  saving: boolean
  onCancel: () => void
  onSubmit: (mode: PriceAdjustmentMode, amount: number) => void
}

/**
 * 整体加减：**必须先预览**再确认。
 *
 * <p>预览展示影响条目数与加减前后单价；单价为空（不报价）的条目不计入，
 * 减价后出现负数的条目会阻断确认（契约要求 422，前端不静默截断）。</p>
 */
export function SupplierPriceListAdjustModal({
  open,
  rows,
  saving,
  onCancel,
  onSubmit,
}: Props) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<PriceAdjustmentMode>('ADD')
  const [amount, setAmount] = useState<number | null>(null)
  const [previewRequested, setPreviewRequested] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    setMode('ADD')
    setAmount(null)
    setPreviewRequested(false)
  }, [open])

  const amountValid = isAdjustmentAmountValid(amount)
  // 方向/金额任一变化都会清掉 previewRequested, 因此不会用过期预览确认
  const preview = useMemo(
    () =>
      previewRequested && amountValid
        ? buildAdjustmentPreview(rows, mode, amount as number)
        : null,
    [previewRequested, amountValid, rows, mode, amount],
  )

  const columns: ColumnsType<AdjustmentPreviewRow> = [
    {
      title: t('supplierPriceList.adjust.columns.item'),
      dataIndex: 'label',
      ellipsis: true,
    },
    {
      title: t('supplierPriceList.adjust.columns.before'),
      dataIndex: 'priceBefore',
      width: 120,
      align: 'right',
      render: (value: number) => value.toFixed(2),
    },
    {
      title: t('supplierPriceList.adjust.columns.after'),
      dataIndex: 'priceAfter',
      width: 120,
      align: 'right',
      render: (value: number) => (
        <strong className={value < 0 ? 'supplier-price-row-error' : undefined}>
          {value.toFixed(2)}
        </strong>
      ),
    },
  ]

  return (
    <Modal
      open={open}
      title={t('supplierPriceList.adjust.title')}
      width={720}
      okText={t('supplierPriceList.adjust.confirm')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      okButtonProps={{
        disabled: !preview || !amountValid || preview.negativeKeys.length > 0,
      }}
      onOk={() => {
        if (preview && amountValid) {
          onSubmit(mode, amount as number)
        }
      }}
      onCancel={onCancel}
    >
      <Space orientation="vertical" size={12} style={{ width: '100%' }}>
        <div className="supplier-price-list-editor-actions">
          <Radio.Group
            aria-label={t('supplierPriceList.adjust.modeLabel')}
            optionType="button"
            buttonStyle="solid"
            value={mode}
            onChange={(event) => {
              setMode(event.target.value as PriceAdjustmentMode)
              setPreviewRequested(false)
            }}
            options={[
              { value: 'ADD', label: t('supplierPriceList.adjust.add') },
              {
                value: 'SUBTRACT',
                label: t('supplierPriceList.adjust.subtract'),
              },
            ]}
          />
          <InputNumber
            aria-label={t('supplierPriceList.adjust.amountLabel')}
            min={0}
            precision={2}
            step={10}
            placeholder={t('supplierPriceList.adjust.amountPlaceholder')}
            value={amount}
            onChange={(value) => {
              setAmount(value)
              setPreviewRequested(false)
            }}
          />
          <Button
            disabled={!amountValid}
            onClick={() => setPreviewRequested(true)}
          >
            {t('supplierPriceList.adjust.preview')}
          </Button>
        </div>

        <Alert
          type="info"
          showIcon
          title={t('supplierPriceList.adjust.emptySkippedHint')}
          description={t('supplierPriceList.adjust.emptySkippedDetail')}
        />

        {!preview ? (
          <p className="supplier-price-list-editor-summary">
            {t('supplierPriceList.adjust.previewRequired')}
          </p>
        ) : (
          <>
            <div
              className="supplier-price-list-editor-summary"
              aria-live="polite"
            >
              <span>
                {t('supplierPriceList.adjust.affected', {
                  count: preview.affectedCount,
                })}
              </span>
              <span>
                {t('supplierPriceList.adjust.skipped', {
                  count: preview.skippedCount,
                })}
              </span>
            </div>
            {preview.negativeKeys.length ? (
              <Alert
                type="error"
                showIcon
                title={t('supplierPriceList.adjust.negativeTitle')}
                description={t('supplierPriceList.adjust.negativeDetail', {
                  count: preview.negativeKeys.length,
                })}
              />
            ) : null}
            <div className="supplier-price-adjust-preview">
              <Table<AdjustmentPreviewRow>
                rowKey="key"
                size="small"
                columns={columns}
                dataSource={preview.rows}
                pagination={{ pageSize: 50, size: 'small' }}
              />
            </div>
          </>
        )}
      </Space>
    </Modal>
  )
}
