import type { ModuleStatusMeta } from '@/types/module-page'

export const statusMap: Record<string, ModuleStatusMeta> = {
  草稿: { text: '草稿', color: 'default' },
  完成采购: { text: '完成采购', color: 'success' },
  完成入库: { text: '完成入库', color: 'success' },
  完成销售: { text: '完成销售', color: 'success' },
  待核准: { text: '待核准', color: 'warning' },
  已核准: { text: '已核准', color: 'success' },
  未审核: { text: '未审核', color: 'warning' },
  已审核: { text: '已审核', color: 'success' },
  部分入库: { text: '部分入库', color: 'processing' },
  部分出库: { text: '部分出库', color: 'processing' },
  已完成: { text: '已完成', color: 'success' },
  已送达: { text: '已送达', color: 'success' },
  未送达: { text: '未送达', color: 'default' },
  待确认: { text: '待确认', color: 'warning' },
  已确认: { text: '已确认', color: 'success' },
  待审核: { text: '待审核', color: 'warning' },
  已签署: { text: '已签署', color: 'success' },
  未签署: { text: '未签署', color: 'default' },
  已收款: { text: '已收款', color: 'success' },
  已付款: { text: '已付款', color: 'success' },
  已收票: { text: '已收票', color: 'success' },
  已开票: { text: '已开票', color: 'success' },
  未收票: { text: '未收票', color: 'warning' },
  部分结清: { text: '部分结清', color: 'processing' },
  执行中: { text: '执行中', color: 'processing' },
  已归档: { text: '已归档', color: 'success' },
  正常: { text: '正常', color: 'success' },
  禁用: { text: '禁用', color: 'warning' },
  成功: { text: '成功', color: 'success' },
  失败: { text: '失败', color: 'error' },
}

export const actionSet = [
  { key: 'create', label: '新增', type: 'primary' as const },
  { key: 'export', label: '导出', type: 'default' as const },
]
