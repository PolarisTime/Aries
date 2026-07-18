import i18next from 'i18next'
import type { SearchParams } from '@/types/api-raw'
import { asString } from '@/utils/type-narrowing'

const operationLogActionOptions = [
  {
    label: i18next.t('modules.pages.operationLogOptions.create'),
    value: '新增',
  },
  { label: i18next.t('modules.pages.operationLogOptions.edit'), value: '编辑' },
  {
    label: i18next.t('modules.pages.operationLogOptions.delete'),
    value: '删除',
  },
  {
    label: i18next.t('modules.pages.operationLogOptions.audit'),
    value: '审核',
  },
  {
    label: i18next.t('modules.pages.operationLogOptions.export'),
    value: '导出',
  },
  {
    label: i18next.t('modules.pages.operationLogOptions.print'),
    value: '打印',
  },
  {
    label: i18next.t('modules.pages.operationLogOptions.login'),
    value: '登录',
  },
  {
    label: i18next.t('modules.pages.operationLogOptions.loginFailed'),
    value: '登录失败',
  },
  {
    label: i18next.t('modules.pages.operationLogOptions.logout'),
    value: '退出登录',
  },
  {
    label: i18next.t('modules.pages.operationLogOptions.execute'),
    value: '执行',
  },
  { label: i18next.t('modules.pages.operationLogOptions.save'), value: '保存' },
  {
    label: i18next.t('modules.pages.operationLogOptions.exportBackup'),
    value: '导出备份',
  },
  {
    label: i18next.t('modules.pages.operationLogOptions.importBackup'),
    value: '导入备份',
  },
  {
    label: i18next.t('modules.pages.operationLogOptions.uploadAttachment'),
    value: '上传附件',
  },
]

const operationLogActionOptionsByModule: Record<
  string,
  ReadonlyArray<{ label: string; value: string }>
> = {
  认证授权: [
    {
      label: i18next.t('modules.pages.operationLogOptions.login'),
      value: '登录',
    },
    {
      label: i18next.t('modules.pages.operationLogOptions.loginFailed'),
      value: '登录失败',
    },
    {
      label: i18next.t('modules.pages.operationLogOptions.logout'),
      value: '退出登录',
    },
  ],
  用户账户: [
    {
      label: i18next.t('modules.pages.operationLogOptions.create'),
      value: '新增',
    },
    {
      label: i18next.t('modules.pages.operationLogOptions.edit'),
      value: '编辑',
    },
    {
      label: i18next.t('modules.pages.operationLogOptions.delete'),
      value: '删除',
    },
  ],
  数据库管理: [
    {
      label: i18next.t('modules.pages.operationLogOptions.exportBackup'),
      value: '导出备份',
    },
    {
      label: i18next.t('modules.pages.operationLogOptions.importBackup'),
      value: '导入备份',
    },
  ],
  公司信息: [
    {
      label: i18next.t('modules.pages.operationLogOptions.save'),
      value: '保存',
    },
  ],
  附件管理: [
    {
      label: i18next.t('modules.pages.operationLogOptions.uploadAttachment'),
      value: '上传附件',
    },
  ],
}

export const operationLogModuleOptions = [
  {
    label: i18next.t('modules.pages.operationLogOptions.common'),
    options: [
      {
        label: i18next.t('modules.pages.operationLogOptions.authentication'),
        value: '认证授权',
      },
      {
        label: i18next.t('modules.pages.operationLogOptions.userAccounts'),
        value: '用户账户',
      },
      {
        label: i18next.t('modules.pages.operationLogOptions.database'),
        value: '数据库管理',
      },
    ],
  },
  {
    label: i18next.t('modules.pages.operationLogOptions.system'),
    options: [
      {
        label: i18next.t('modules.pages.operationLogOptions.companyInfo'),
        value: '公司信息',
      },
      {
        label: i18next.t('modules.pages.operationLogOptions.printTemplates'),
        value: '打印模板',
      },
      {
        label: i18next.t('modules.pages.operationLogOptions.operationLog'),
        value: '操作日志',
      },
    ],
  },
  {
    label: i18next.t('modules.pages.operationLogOptions.business'),
    options: [
      {
        label: i18next.t('modules.pages.operationLogOptions.materials'),
        value: '商品资料',
      },
      {
        label: i18next.t('modules.pages.operationLogOptions.supplier'),
        value: '供应商',
      },
      {
        label: i18next.t('modules.pages.operationLogOptions.customer'),
        value: '客户',
      },
      {
        label: i18next.t('modules.pages.operationLogOptions.carrier'),
        value: '物流商',
      },
      {
        label: i18next.t('modules.pages.operationLogOptions.warehouse'),
        value: '仓库',
      },
      {
        label: i18next.t('modules.pages.operationLogOptions.purchaseOrder'),
        value: '采购订单',
      },
      {
        label: i18next.t('modules.pages.operationLogOptions.purchaseInbound'),
        value: '采购入库',
      },
      {
        label: i18next.t('modules.pages.operationLogOptions.salesOrder'),
        value: '销售订单',
      },
      {
        label: i18next.t('modules.pages.operationLogOptions.salesOutbound'),
        value: '销售出库',
      },
      {
        label: i18next.t('modules.pages.operationLogOptions.freightBill'),
        value: '物流单',
      },
      {
        label: i18next.t('modules.pages.operationLogOptions.customerStatement'),
        value: '客户对账单',
      },
      {
        label: i18next.t('modules.pages.operationLogOptions.freightStatement'),
        value: '物流对账单',
      },
      {
        label: i18next.t('modules.pages.operationLogOptions.receipt'),
        value: '收款单',
      },
      {
        label: i18next.t('modules.pages.operationLogOptions.payment'),
        value: '付款单',
      },
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
