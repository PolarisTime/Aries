import type { SearchParams } from '@/types/api-raw'
import { asString } from '@/utils/type-narrowing'
import i18next from 'i18next'
const operationLogActionOptions = [
  { label: i18next.t('modules.pages.operationLogOptions.query'), value: '查询' },
  { label: i18next.t('modules.pages.operationLogOptions.view'), value: '查看' },
  { label: i18next.t('modules.pages.operationLogOptions.create'), value: '新增' },
  { label: i18next.t('modules.pages.operationLogOptions.edit'), value: '编辑' },
  { label: i18next.t('modules.pages.operationLogOptions.delete'), value: '删除' },
  { label: i18next.t('modules.pages.operationLogOptions.audit'), value: '审核' },
  { label: i18next.t('modules.pages.operationLogOptions.export'), value: '导出' },
  { label: i18next.t('modules.pages.operationLogOptions.print'), value: '打印' },
  { label: i18next.t('modules.pages.operationLogOptions.login'), value: '登录' },
  { label: i18next.t('modules.pages.operationLogOptions.loginFailed'), value: '登录失败' },
  { label: i18next.t('modules.pages.operationLogOptions.logout'), value: '退出登录' },
  { label: i18next.t('modules.pages.operationLogOptions.execute'), value: '执行' },
  { label: i18next.t('modules.pages.operationLogOptions.save'), value: '保存' },
  { label: i18next.t('modules.pages.operationLogOptions.changePassword'), value: '修改密码' },
  { label: i18next.t('modules.pages.operationLogOptions.generate2faKey'), value: '生成2FA密钥' },
  { label: i18next.t('modules.pages.operationLogOptions.enable2fa'), value: '启用2FA' },
  { label: i18next.t('modules.pages.operationLogOptions.disable2fa'), value: '禁用2FA' },
  { label: i18next.t('modules.pages.operationLogOptions.editPermissions'), value: '编辑权限' },
  { label: i18next.t('modules.pages.operationLogOptions.generateApiKey'), value: '生成 API Key' },
  { label: i18next.t('modules.pages.operationLogOptions.disableApiKey'), value: '禁用 API Key' },
  { label: i18next.t('modules.pages.operationLogOptions.rotateJwtKey'), value: '轮转JWT主密钥' },
  { label: i18next.t('modules.pages.operationLogOptions.rotate2faKey'), value: '轮转2FA主密钥' },
  { label: i18next.t('modules.pages.operationLogOptions.exportBackup'), value: '导出备份' },
  { label: i18next.t('modules.pages.operationLogOptions.importBackup'), value: '导入备份' },
  { label: i18next.t('modules.pages.operationLogOptions.editUploadRule'), value: '编辑上传命名规则' },
  { label: i18next.t('modules.pages.operationLogOptions.uploadAttachment'), value: '上传附件' },
]

const operationLogActionOptionsByModule: Record<
  string,
  ReadonlyArray<{ label: string; value: string }>
> = {
  认证授权: [
    { label: i18next.t('modules.pages.operationLogOptions.login'), value: '登录' },
    { label: i18next.t('modules.pages.operationLogOptions.loginFailed'), value: '登录失败' },
    { label: i18next.t('modules.pages.operationLogOptions.logout'), value: '退出登录' },
  ],
  个人设置: [
    { label: i18next.t('modules.pages.operationLogOptions.changePassword'), value: '修改密码' },
    { label: i18next.t('modules.pages.operationLogOptions.generate2faKey'), value: '生成2FA密钥' },
    { label: i18next.t('modules.pages.operationLogOptions.enable2fa'), value: '启用2FA' },
    { label: i18next.t('modules.pages.operationLogOptions.disable2fa'), value: '禁用2FA' },
  ],
  用户账户: [
    { label: i18next.t('modules.pages.operationLogOptions.create'), value: '新增' },
    { label: i18next.t('modules.pages.operationLogOptions.edit'), value: '编辑' },
    { label: i18next.t('modules.pages.operationLogOptions.delete'), value: '删除' },
    { label: i18next.t('modules.pages.operationLogOptions.generate2faKey'), value: '生成2FA密钥' },
    { label: i18next.t('modules.pages.operationLogOptions.enable2fa'), value: '启用2FA' },
    { label: i18next.t('modules.pages.operationLogOptions.disable2fa'), value: '禁用2FA' },
  ],
  角色权限配置: [
    { label: i18next.t('modules.pages.operationLogOptions.create'), value: '新增' },
    { label: i18next.t('modules.pages.operationLogOptions.edit'), value: '编辑' },
    { label: i18next.t('modules.pages.operationLogOptions.delete'), value: '删除' },
    { label: i18next.t('modules.pages.operationLogOptions.editPermissions'), value: '编辑权限' },
  ],
  角色设置: [
    { label: i18next.t('modules.pages.operationLogOptions.create'), value: '新增' },
    { label: i18next.t('modules.pages.operationLogOptions.edit'), value: '编辑' },
    { label: i18next.t('modules.pages.operationLogOptions.delete'), value: '删除' },
    { label: i18next.t('modules.pages.operationLogOptions.editPermissions'), value: '编辑权限' },
  ],
  'API Key 管理': [
    { label: i18next.t('modules.pages.operationLogOptions.generateApiKey'), value: '生成 API Key' },
    { label: i18next.t('modules.pages.operationLogOptions.disableApiKey'), value: '禁用 API Key' },
  ],
  安全密钥管理: [
    { label: i18next.t('modules.pages.operationLogOptions.rotateJwtKey'), value: '轮转JWT主密钥' },
    { label: i18next.t('modules.pages.operationLogOptions.rotate2faKey'), value: '轮转2FA主密钥' },
  ],
  数据库管理: [
    { label: i18next.t('modules.pages.operationLogOptions.exportBackup'), value: '导出备份' },
    { label: i18next.t('modules.pages.operationLogOptions.importBackup'), value: '导入备份' },
  ],
  公司信息: [{ label: i18next.t('modules.pages.operationLogOptions.save'), value: '保存' }],
  单号规则: [{ label: i18next.t('modules.pages.operationLogOptions.editUploadRule'), value: '编辑上传命名规则' }],
  附件管理: [{ label: i18next.t('modules.pages.operationLogOptions.uploadAttachment'), value: '上传附件' }],
}

export const operationLogModuleOptions = [
  {
    label: i18next.t('modules.pages.operationLogOptions.common'),
    options: [
      { label: i18next.t('modules.pages.operationLogOptions.authentication'), value: '认证授权' },
      { label: i18next.t('modules.pages.operationLogOptions.userAccounts'), value: '用户账户' },
      { label: i18next.t('modules.pages.operationLogOptions.rolePermissions'), value: '角色权限配置' },
      { label: i18next.t('modules.pages.operationLogOptions.generalSettings'), value: '通用设置' },
      { label: i18next.t('modules.pages.operationLogOptions.apiKeyManagement'), value: 'API Key 管理' },
      { label: i18next.t('modules.pages.operationLogOptions.database'), value: '数据库管理' },
    ],
  },
  {
    label: i18next.t('modules.pages.operationLogOptions.system'),
    options: [
      { label: i18next.t('modules.pages.operationLogOptions.companyInfo'), value: '公司信息' },
      { label: i18next.t('modules.pages.operationLogOptions.accessControl'), value: '权限管理' },
      { label: i18next.t('modules.pages.operationLogOptions.rolePermissions'), value: '角色权限配置' },
      { label: i18next.t('modules.pages.operationLogOptions.printTemplates'), value: '打印模板' },
      { label: i18next.t('modules.pages.operationLogOptions.operationLog'), value: '操作日志' },
      { label: i18next.t('modules.pages.operationLogOptions.sessionManagement'), value: '会话管理' },
      { label: i18next.t('modules.pages.operationLogOptions.securityKeys'), value: '安全密钥管理' },
    ],
  },
  {
    label: i18next.t('modules.pages.operationLogOptions.business'),
    options: [
      { label: i18next.t('modules.pages.operationLogOptions.materials'), value: '商品资料' },
      { label: i18next.t('modules.pages.operationLogOptions.supplier'), value: '供应商' },
      { label: i18next.t('modules.pages.operationLogOptions.customer'), value: '客户' },
      { label: i18next.t('modules.pages.operationLogOptions.carrier'), value: '物流商' },
      { label: i18next.t('modules.pages.operationLogOptions.warehouse'), value: '仓库' },
      { label: i18next.t('modules.pages.operationLogOptions.purchaseOrder'), value: '采购订单' },
      { label: i18next.t('modules.pages.operationLogOptions.purchaseInbound'), value: '采购入库' },
      { label: i18next.t('modules.pages.operationLogOptions.salesOrder'), value: '销售订单' },
      { label: i18next.t('modules.pages.operationLogOptions.salesOutbound'), value: '销售出库' },
      { label: i18next.t('modules.pages.operationLogOptions.freightBill'), value: '物流单' },
      { label: i18next.t('modules.pages.operationLogOptions.purchaseContract'), value: '采购合同' },
      { label: i18next.t('modules.pages.operationLogOptions.salesContract'), value: '销售合同' },
      { label: i18next.t('modules.pages.operationLogOptions.supplierStatement'), value: '供应商对账单' },
      { label: i18next.t('modules.pages.operationLogOptions.customerStatement'), value: '客户对账单' },
      { label: i18next.t('modules.pages.operationLogOptions.freightStatement'), value: '物流对账单' },
      { label: i18next.t('modules.pages.operationLogOptions.receipt'), value: '收款单' },
      { label: i18next.t('modules.pages.operationLogOptions.payment'), value: '付款单' },
      { label: i18next.t('modules.pages.operationLogOptions.invoiceReceipt'), value: '收票单' },
      { label: i18next.t('modules.pages.operationLogOptions.invoiceIssue'), value: '开票单' },
      { label: i18next.t('modules.pages.operationLogOptions.pendingInvoiceReceiptReport'), value: '未收票报表' },
      { label: i18next.t('modules.pages.operationLogOptions.ioReport'), value: '出入库报表' },
      { label: i18next.t('modules.pages.operationLogOptions.inventoryReport'), value: '库存报表' },
    ],
  },
]

export function resolveOperationLogActionOptions(filters: SearchParams) {
  const moduleName = asString(filters.moduleName).trim()
  return [
    ...(operationLogActionOptionsByModule[moduleName] ||
      operationLogActionOptions),
  ]
}
