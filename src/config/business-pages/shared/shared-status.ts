import i18next from 'i18next'
import type { ModuleStatusMeta } from '@/types/module-page'

export const statusMap: Record<string, ModuleStatusMeta> = {
  草稿: { text: i18next.t('modules.status.draft'), color: 'warning' },
  完成采购: {
    text: i18next.t('modules.status.completedPurchase'),
    color: 'success',
  },
  完成入库: {
    text: i18next.t('modules.status.completedInbound'),
    color: 'success',
  },
  交付核定: {
    text: i18next.t('modules.status.deliveryVerification'),
    color: 'processing',
  },
  完成销售: {
    text: i18next.t('modules.status.completedSales'),
    color: 'success',
  },
  待核准: {
    text: i18next.t('modules.status.pendingApproval'),
    color: 'warning',
  },
  已核准: { text: i18next.t('modules.status.approved'), color: 'success' },
  未审核: { text: i18next.t('modules.status.unaudited'), color: 'warning' },
  已审核: { text: i18next.t('modules.status.audited'), color: 'success' },
  部分入库: {
    text: i18next.t('modules.status.partialInbound'),
    color: 'processing',
  },
  部分出库: {
    text: i18next.t('modules.status.partialOutbound'),
    color: 'processing',
  },
  已完成: { text: i18next.t('modules.status.completed'), color: 'success' },
  待确认: {
    text: i18next.t('modules.status.pendingConfirm'),
    color: 'warning',
  },
  已确认: { text: i18next.t('modules.status.confirmed'), color: 'success' },
  待审核: { text: i18next.t('modules.status.pendingAudit'), color: 'warning' },
  已签署: { text: i18next.t('modules.status.signed'), color: 'success' },
  未签署: { text: i18next.t('modules.status.unsigned'), color: 'warning' },
  已收款: { text: i18next.t('modules.status.received'), color: 'success' },
  已付款: { text: i18next.t('modules.status.paid'), color: 'success' },
  部分结清: {
    text: i18next.t('modules.status.partialSettled'),
    color: 'processing',
  },
  执行中: { text: i18next.t('modules.status.executing'), color: 'processing' },
  已归档: { text: i18next.t('modules.status.archived'), color: 'success' },
  正常: { text: i18next.t('modules.status.normal'), color: 'success' },
  禁用: { text: i18next.t('modules.status.disabled'), color: 'error' },
  成功: { text: i18next.t('modules.status.success'), color: 'success' },
  失败: { text: i18next.t('modules.status.failed'), color: 'error' },
  已删除: { text: i18next.t('modules.status.deleted'), color: 'error' },
}

export const actionSet = [
  {
    key: 'create',
    label: i18next.t('modules.actions.create'),
    type: 'primary' as const,
  },
  {
    key: 'export',
    label: i18next.t('modules.actions.export'),
    type: 'default' as const,
  },
]
