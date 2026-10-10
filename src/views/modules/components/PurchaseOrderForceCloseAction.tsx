import { CheckCircleOutlined, StopOutlined } from '@ant-design/icons'
import { Button, Form, Input, Space, Tooltip, Typography } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  cancelPurchaseOrderForceClose,
  forceClosePurchaseOrder,
} from '@/api/purchase/purchase-order-force-close'
import { DOCUMENT_STATUS } from '@/constants/status-constants'
import { useHasPermission } from '@/hooks/usePermission'
import type { ModuleRecord } from '@/types/module-page'
import { message, modal } from '@/utils/antd-app'

const FORCE_CLOSE_PERMISSION = 'purchase-orders:force-close'

interface Props {
  selectedRows: ModuleRecord[]
  refreshModuleQueries: () => Promise<void>
}

/**
 * 采购订单「强制结单」工具栏入口。
 *
 * <p>剩余件物理作废（报废/供应商不再供货）时，订单永远收不满，也就永远停在「已审核」，
 * 并继续作为采购入库来源、继续给报单比价提供可开吨位。强制结单把剩余未入库件数一次性
 * 作废并把单据置为「完成采购」，原因必填用于留痕；结错了可原地撤销回「已审核」。</p>
 *
 * <p>按钮仅在恰好选中 1 行、且状态满足时可用：结单要求「已审核」且未结单，撤销要求
 * 由强制结单产生的「完成采购」。</p>
 */
export function PurchaseOrderForceCloseAction({
  selectedRows,
  refreshModuleQueries,
}: Props) {
  const { t } = useTranslation()
  const allowed = useHasPermission(FORCE_CLOSE_PERMISSION)
  const [form] = Form.useForm<{ reason: string }>()
  const [closing, setClosing] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const target = selectedRows.length === 1 ? selectedRows[0] : null
  const status = String(target?.status ?? '').trim()
  const forceClosed = Boolean(target?.forceClose)
  const canClose =
    allowed &&
    Boolean(target) &&
    status === DOCUMENT_STATUS.AUDITED &&
    !forceClosed
  const canCancel = allowed && Boolean(target) && forceClosed

  if (!allowed) {
    return null
  }

  const handleForceClose = () => {
    if (!target) return
    form.resetFields()
    modal.confirm({
      title: t('modules.purchaseForceClose.confirmTitle'),
      width: 520,
      icon: null,
      content: (
        <Space orientation="vertical" size="small" style={{ width: '100%' }}>
          <Typography.Text type="warning">
            {t('modules.purchaseForceClose.confirmHint', {
              orderNo: String(target.orderNo ?? ''),
            })}
          </Typography.Text>
          <Form form={form} layout="vertical" preserve={false}>
            <Form.Item
              name="reason"
              label={t('modules.purchaseForceClose.reasonLabel')}
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: t('modules.purchaseForceClose.reasonRequired'),
                },
                {
                  max: 255,
                  message: t('modules.purchaseForceClose.reasonTooLong'),
                },
              ]}
            >
              <Input.TextArea
                rows={3}
                maxLength={255}
                showCount
                placeholder={t('modules.purchaseForceClose.reasonPlaceholder')}
              />
            </Form.Item>
          </Form>
        </Space>
      ),
      okText: t('modules.purchaseForceClose.okText'),
      cancelText: t('common.cancel'),
      // 用 promise 链而非 try/finally: React Compiler 不支持 try/finally 语句,
      // 且 antd 需要 onOk 返回 rejected promise 时保持弹窗打开。
      onOk: () =>
        form.validateFields().then((values) => {
          setClosing(true)
          return forceClosePurchaseOrder(
            String(target.id),
            values.reason.trim(),
          )
            .then(() => {
              message.success(t('modules.purchaseForceClose.success'))
              return refreshModuleQueries()
            })
            .finally(() => setClosing(false))
        }),
    })
  }

  const handleCancelForceClose = () => {
    if (!target) return
    setCancelling(true)
    void cancelPurchaseOrderForceClose(String(target.id))
      .then(() => {
        message.success(t('modules.purchaseForceClose.cancelSuccess'))
        return refreshModuleQueries()
      })
      .finally(() => setCancelling(false))
  }

  const unavailableHint = !target
    ? t('modules.purchaseForceClose.selectOneHint')
    : status !== DOCUMENT_STATUS.AUDITED && !forceClosed
      ? t('modules.purchaseForceClose.onlyAuditedHint')
      : t('modules.purchaseForceClose.alreadyClosedHint')

  return (
    <>
      <Tooltip title={canClose ? undefined : unavailableHint}>
        <Button
          icon={<CheckCircleOutlined />}
          disabled={!canClose}
          loading={closing}
          onClick={handleForceClose}
        >
          {t('modules.purchaseForceClose.action')}
        </Button>
      </Tooltip>
      {canCancel ? (
        <Button
          icon={<StopOutlined />}
          loading={cancelling}
          onClick={() => void handleCancelForceClose()}
        >
          {t('modules.purchaseForceClose.cancelAction')}
        </Button>
      ) : null}
    </>
  )
}
