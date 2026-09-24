import { InputNumber, Modal, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatWeight } from '@/utils/formatters'
import type { PickupListRow } from './pickup-list-draft'
import { isValidSplitPieceCount } from './pickup-list-draft'

interface Props {
  /** 待拆分行(undefined 表示未打开)。 */
  row: PickupListRow | undefined
  open: boolean
  onConfirm: (pieceCount: number) => void
  onClose: () => void
}

/** 计算按每份件数拆分后的份数预览(逐份取 N 件, 余数独立成末份)。 */
function previewParts(total: number, pieceCount: number): number[] {
  if (!isValidSplitPieceCount(total, pieceCount)) return []
  const parts: number[] = []
  let remaining = total
  while (remaining > pieceCount) {
    parts.push(pieceCount)
    remaining -= pieceCount
  }
  if (remaining > 0) {
    parts.push(remaining)
  }
  return parts
}

/** 拆分预览: 展示各份件数(位置即份次), 无稳定业务 id 用下标作 key。 */
function SplitPreview({
  parts,
  pieceWeightTon,
}: {
  parts: number[]
  pieceWeightTon: number
}) {
  const { t } = useTranslation()
  return (
    <div className="purchase-pickup-list-split-preview">
      <Typography.Text type="secondary">
        {t('modules.purchasePickupList.splitPreview')}
      </Typography.Text>
      <div className="purchase-pickup-list-split-parts">
        {parts.map((quantity, partIndex) => {
          // 份次在前端无稳定业务 id: 用「份次序号+件数」构造确定性 key, 避免下标隐式复用。
          const partKey = `pickup-part-${quantity}-at-${partIndex}`
          return (
            <span key={partKey} className="purchase-pickup-list-split-part">
              {t('modules.purchasePickupList.splitPartShort', {
                index: partIndex + 1,
                quantity,
              })}
            </span>
          )
        })}
      </div>
      <Typography.Text type="secondary">
        {t('modules.purchasePickupList.splitPartTotal', {
          count: parts.length,
          pieceWeight: formatWeight(pieceWeightTon),
        })}
      </Typography.Text>
    </div>
  )
}

/**
 * 拆分数量弹窗: 输入每份件数, 实时预览各份件数(逐份取 N 件, 余数独立成末份),
 * 一次拆到位, 件数守恒。仅用于本次查看与分组, 不写回采购订单。
 */
export function PickupSplitModal({ row, open, onConfirm, onClose }: Props) {
  const { t } = useTranslation()
  const [pieceCount, setPieceCount] = useState<number | null>(null)

  // 每次打开时重置为默认每份件数(总数对半, 至少 1)。
  useEffect(() => {
    if (!open || !row) return
    setPieceCount(Math.max(1, Math.floor(row.item.pickupQuantity / 2)))
  }, [open, row])

  if (!row) {
    return null
  }

  const total = row.item.pickupQuantity
  const parts = pieceCount === null ? [] : previewParts(total, pieceCount)
  const valid = pieceCount !== null && isValidSplitPieceCount(total, pieceCount)

  return (
    <Modal
      title={t('modules.purchasePickupList.splitTitle')}
      open={open}
      destroyOnHidden
      okText={t('modules.purchasePickupList.splitConfirm')}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: !valid }}
      onOk={() => valid && pieceCount !== null && onConfirm(pieceCount)}
      onCancel={onClose}
    >
      <div className="purchase-pickup-list-split-form">
        <div className="purchase-pickup-list-split-field">
          <Typography.Text>
            {t('modules.purchasePickupList.splitPieceCountLabel')}
          </Typography.Text>
          <InputNumber
            aria-label={t('modules.purchasePickupList.splitPieceCountLabel')}
            className="purchase-pickup-list-split-piece-count"
            controls={false}
            min={1}
            precision={0}
            placeholder={t(
              'modules.purchasePickupList.splitPieceCountPlaceholder',
            )}
            value={pieceCount}
            onChange={(value) => setPieceCount(value)}
          />
        </div>
        <Typography.Text type="secondary">
          {t('modules.purchasePickupList.splitTotal', { total })}
        </Typography.Text>
        {valid ? (
          <SplitPreview
            parts={parts}
            pieceWeightTon={row.item.pieceWeightTon}
          />
        ) : (
          <Typography.Text type="warning">
            {t('modules.purchasePickupList.splitInvalid', {
              max: Math.max(1, total - 1),
            })}
          </Typography.Text>
        )}
      </div>
    </Modal>
  )
}
