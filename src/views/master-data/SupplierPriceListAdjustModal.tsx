import { Alert, Button, InputNumber, Modal, Radio, Space, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PriceAdjustmentMode } from '@/api/master/supplier-price-lists'
import {
  type AdjustmentPreviewRow,
  buildMatrixAdjustmentPreview,
  isAdjustmentAmountValid,
  type MatrixAdjustmentPreview,
  type PriceMatrixState,
} from './supplier-price-list-editor-model'

interface Props {
  state: PriceMatrixState
  /** 目标供应商列（该（供应商, 品牌）价格表） */
  supplierId: string
  supplierName: string
  brandName: string
  saving: boolean
  onCancel: () => void
  onSubmit: (
    mode: PriceAdjustmentMode,
    amount: number,
    preview: MatrixAdjustmentPreview,
  ) => void
}

/**
 * 整体加减：**必须先预览**再确认。
 *
 * <p>R2 + 轴向变更后，加减接口按**价格表（供应商 + 品牌）**生效，因此入口挂在列头菜单上，
 * 弹窗一次只作用于该供应商列。单价为空（不报价）的条目不参与；减价后出现负数的条目会阻断
 * 确认（契约要求 422，前端不静默截断）；该品牌下尚无价格表、或已填价尚未落库的格子会明确
 * 提示「先保存」，不静默跳过。</p>
 *
 * <p>调用方按需挂载（`{open ? <Modal/> : null}`）：每次打开都是全新实例，
 * 状态无需在 effect 里重置（避免 set-state-in-effect 与过期预览残留）。</p>
 */
export function SupplierPriceListAdjustModal({
  state,
  supplierId,
  supplierName,
  brandName,
  saving,
  onCancel,
  onSubmit,
}: Props) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<PriceAdjustmentMode>('ADD')
  const [amount, setAmount] = useState<number | null>(null)
  const [preview, setPreview] = useState<MatrixAdjustmentPreview | null>(null)

  const amountValid = isAdjustmentAmountValid(amount)

  const columns: ColumnsType<AdjustmentPreviewRow> = useMemo(
    () => [
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
          <strong
            className={value < 0 ? 'supplier-price-row-error' : undefined}
          >
            {value.toFixed(2)}
          </strong>
        ),
      },
    ],
    [t],
  )

  const canSubmit =
    Boolean(preview?.target) &&
    amountValid &&
    (preview?.negativeLabels.length ?? 1) === 0 &&
    (preview?.affectedCount ?? 0) > 0

  return (
    <Modal
      open
      title={t('supplierPriceList.adjust.titleWithTarget', {
        supplier: supplierName,
        brand: brandName,
      })}
      width={760}
      okText={t('supplierPriceList.adjust.confirm')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      okButtonProps={{ disabled: !canSubmit }}
      onOk={() => {
        if (preview && amountValid && canSubmit) {
          onSubmit(mode, amount as number, preview)
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
              setPreview(null)
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
              setPreview(null)
            }}
          />
          <Button
            disabled={!amountValid}
            onClick={() =>
              setPreview(
                buildMatrixAdjustmentPreview(
                  state,
                  supplierId,
                  mode,
                  amount as number,
                ),
              )
            }
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
            {preview.missingList ? (
              <Alert
                type="warning"
                showIcon
                title={t('supplierPriceList.adjust.missingListTitle')}
              />
            ) : null}
            {preview.unsavedCount > 0 ? (
              // 有价但没有服务端条目 ID: 必须先保存成价格表条目才能加减
              <Alert
                type="warning"
                showIcon
                title={t('supplierPriceList.adjust.unsavedTitle', {
                  count: preview.unsavedCount,
                })}
              />
            ) : null}
            {preview.negativeLabels.length ? (
              <Alert
                type="error"
                showIcon
                title={t('supplierPriceList.adjust.negativeTitle')}
                description={t('supplierPriceList.adjust.negativeDetail', {
                  count: preview.negativeLabels.length,
                })}
              />
            ) : null}
            {preview.affectedCount === 0 ? (
              <Alert
                type="warning"
                showIcon
                title={t('supplierPriceList.adjust.noneTitle')}
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
