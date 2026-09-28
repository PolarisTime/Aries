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

type BrandPlan = MatrixAdjustmentPreview['brandPlans'][number]

interface Props {
  state: PriceMatrixState
  /** 参与加减的品牌列（默认全部） */
  brandNames: string[]
  saving: boolean
  onCancel: () => void
  onSubmit: (
    mode: PriceAdjustmentMode,
    amount: number,
    plans: BrandPlan[],
  ) => void
}

/**
 * 整体加减：**必须先预览**再确认。
 *
 * <p>R2 口径：一次预览覆盖当前供应商的全部品牌列（跨列），执行时按品牌分别调用
 * `price-adjustments`（接口是单表粒度）。单价为空（不报价）的条目不参与，减价后出现
 * 负数的条目会阻断确认（契约要求 422，前端不静默截断）；尚未建表/未落库的价格也只能
 * 提示「先保存」，不得静默跳过。</p>
 *
 * <p>调用方按需挂载（`{open ? <Modal/> : null}`）：每次打开都是全新实例，
 * 状态无需在 effect 里重置（避免 set-state-in-effect 与过期预览残留）。</p>
 */
export function SupplierPriceListAdjustModal({
  state,
  brandNames,
  saving,
  onCancel,
  onSubmit,
}: Props) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<PriceAdjustmentMode>('ADD')
  const [amount, setAmount] = useState<number | null>(null)
  const [previewRequested, setPreviewRequested] = useState(false)

  const amountValid = isAdjustmentAmountValid(amount)
  // 方向/金额任一变化都会清掉 previewRequested, 因此不会用过期预览确认
  const preview = useMemo(
    () =>
      previewRequested && amountValid
        ? buildMatrixAdjustmentPreview(
            state,
            mode,
            amount as number,
            brandNames,
          )
        : null,
    [previewRequested, amountValid, state, mode, amount, brandNames],
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
      open
      title={t('supplierPriceList.adjust.title')}
      width={760}
      okText={t('supplierPriceList.adjust.confirm')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      okButtonProps={{
        disabled:
          !preview ||
          !amountValid ||
          preview.negativeLabels.length > 0 ||
          preview.brandPlans.length === 0,
      }}
      onOk={() => {
        if (preview && amountValid && preview.brandPlans.length) {
          onSubmit(mode, amount as number, preview.brandPlans)
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
              <span>
                {t('supplierPriceList.adjust.brandCount', {
                  count: preview.brandPlans.length,
                })}
              </span>
            </div>
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
            {preview.brandsWithoutList.length ? (
              <Alert
                type="warning"
                showIcon
                title={t('supplierPriceList.adjust.noListTitle', {
                  brands: preview.brandsWithoutList.join('、'),
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
            {preview.brandPlans.length === 0 ? (
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
