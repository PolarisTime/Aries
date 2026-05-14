import type { SearchParams } from '@/types/api-raw'
import { asString } from '@/utils/type-narrowing'
export const operationLogActionOptions = [
  { label: '查询', value: '查询' },
  { label: '查看', value: '查看' },
  { label: '新增', value: '新增' },
  { label: '编辑', value: '编辑' },
  { label: '删除', value: '删除' },
  { label: '审核', value: '审核' },
  { label: '导出', value: '导出' },
  { label: '打印', value: '打印' },
  { label: '登录', value: '登录' },
  { label: '登录失败', value: '登录失败' },
  { label: '退出登录', value: '退出登录' },
  { label: '执行', value: '执行' },
  { label: '保存', value: '保存' },
  { label: '修改密码', value: '修改密码' },
  { label: '生成2FA密钥', value: '生成2FA密钥' },
  { label: '启用2FA', value: '启用2FA' },
  { label: '禁用2FA', value: '禁用2FA' },
  { label: '编辑权限', value: '编辑权限' },
  { label: '生成 API Key', value: '生成 API Key' },
  { label: '禁用 API Key', value: '禁用 API Key' },
  { label: '轮转JWT主密钥', value: '轮转JWT主密钥' },
  { label: '轮转2FA主密钥', value: '轮转2FA主密钥' },
  { label: '导出备份', value: '导出备份' },
  { label: '导入备份', value: '导入备份' },
  { label: '编辑上传命名规则', value: '编辑上传命名规则' },
  { label: '上传附件', value: '上传附件' },
]

export const operationLogActionOptionsByModule: Record<
  string,
  ReadonlyArray<{ label: string; value: string }>
> = {
  认证授权: [
    { label: '登录', value: '登录' },
    { label: '登录失败', value: '登录失败' },
    { label: '退出登录', value: '退出登录' },
  ],
  个人设置: [
    { label: '修改密码', value: '修改密码' },
    { label: '生成2FA密钥', value: '生成2FA密钥' },
    { label: '启用2FA', value: '启用2FA' },
    { label: '禁用2FA', value: '禁用2FA' },
  ],
  用户账户: [
    { label: '新增', value: '新增' },
    { label: '编辑', value: '编辑' },
    { label: '删除', value: '删除' },
    { label: '生成2FA密钥', value: '生成2FA密钥' },
    { label: '启用2FA', value: '启用2FA' },
    { label: '禁用2FA', value: '禁用2FA' },
  ],
  角色权限配置: [
    { label: '新增', value: '新增' },
    { label: '编辑', value: '编辑' },
    { label: '删除', value: '删除' },
    { label: '编辑权限', value: '编辑权限' },
  ],
  角色设置: [
    { label: '新增', value: '新增' },
    { label: '编辑', value: '编辑' },
    { label: '删除', value: '删除' },
    { label: '编辑权限', value: '编辑权限' },
  ],
  'API Key 管理': [
    { label: '生成 API Key', value: '生成 API Key' },
    { label: '禁用 API Key', value: '禁用 API Key' },
  ],
  安全密钥管理: [
    { label: '轮转JWT主密钥', value: '轮转JWT主密钥' },
    { label: '轮转2FA主密钥', value: '轮转2FA主密钥' },
  ],
  数据库管理: [
    { label: '导出备份', value: '导出备份' },
    { label: '导入备份', value: '导入备份' },
  ],
  公司信息: [{ label: '保存', value: '保存' }],
  单号规则: [{ label: '编辑上传命名规则', value: '编辑上传命名规则' }],
  附件管理: [{ label: '上传附件', value: '上传附件' }],
}

export const operationLogModuleOptions = [
  {
    label: '常用',
    options: [
      { label: '认证授权', value: '认证授权' },
      { label: '用户账户', value: '用户账户' },
      { label: '角色权限配置', value: '角色权限配置' },
      { label: '通用设置', value: '通用设置' },
      { label: 'API Key 管理', value: 'API Key 管理' },
      { label: '数据库管理', value: '数据库管理' },
    ],
  },
  {
    label: '系统',
    options: [
      { label: '公司信息', value: '公司信息' },
      { label: '权限管理', value: '权限管理' },
      { label: '角色权限配置', value: '角色权限配置' },
      { label: '打印模板', value: '打印模板' },
      { label: '操作日志', value: '操作日志' },
      { label: '会话管理', value: '会话管理' },
      { label: '安全密钥管理', value: '安全密钥管理' },
    ],
  },
  {
    label: '业务',
    options: [
      { label: '商品资料', value: '商品资料' },
      { label: '供应商', value: '供应商' },
      { label: '客户', value: '客户' },
      { label: '物流商', value: '物流商' },
      { label: '仓库', value: '仓库' },
      { label: '采购订单', value: '采购订单' },
      { label: '采购入库', value: '采购入库' },
      { label: '销售订单', value: '销售订单' },
      { label: '销售出库', value: '销售出库' },
      { label: '物流单', value: '物流单' },
      { label: '采购合同', value: '采购合同' },
      { label: '销售合同', value: '销售合同' },
      { label: '供应商对账单', value: '供应商对账单' },
      { label: '客户对账单', value: '客户对账单' },
      { label: '物流对账单', value: '物流对账单' },
      { label: '收款单', value: '收款单' },
      { label: '付款单', value: '付款单' },
      { label: '收票单', value: '收票单' },
      { label: '开票单', value: '开票单' },
      { label: '未收票报表', value: '未收票报表' },
      { label: '出入库报表', value: '出入库报表' },
      { label: '库存报表', value: '库存报表' },
    ],
  },
]

export function resolveOperationLogActionOptions(
  filters: SearchParams,
) {
  const moduleName = asString(filters.moduleName).trim()
  return [
    ...(operationLogActionOptionsByModule[moduleName] ||
      operationLogActionOptions),
  ]
}
