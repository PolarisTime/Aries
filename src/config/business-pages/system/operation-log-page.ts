import i18next from 'i18next'
import type { ModulePageConfig } from '@/types/module-page'
import { formatInteger, statusMap } from '../shared/shared'
import {
  operationLogModuleOptions,
  resolveOperationLogActionOptions,
} from './operation-log-options'

export const operationLogsPageConfig: ModulePageConfig = {
  key: 'operation-log',
  title: i18next.t('modules.pages.operationLog.operationLog'),
  kicker: 'System',
  description: i18next.t('modules.pages.operationLog.operationLogDesc'),
  readOnly: true,
  actions: [
    {
      key: 'export',
      label: i18next.t('modules.pages.operationLog.export'),
      type: 'primary',
    },
  ],
  quickFilters: [
    {
      key: 'all',
      label: i18next.t('modules.pages.operationLog.allLogs'),
      values: {},
    },
    {
      key: 'auth',
      label: i18next.t('modules.pages.operationLog.authentication'),
      values: { moduleName: '认证授权' },
    },
  ],
  filters: [
    {
      key: 'keyword',
      label: i18next.t('modules.pages.operationLog.keyword'),
      type: 'input',
      placeholder: i18next.t(
        'modules.pages.operationLog.operationLogPlaceholder',
      ),
    },
    {
      key: 'moduleName',
      label: i18next.t('modules.pages.operationLog.module'),
      type: 'select',
      options: operationLogModuleOptions,
    },
    {
      key: 'actionType',
      label: i18next.t('modules.pages.operationLog.action'),
      type: 'select',
      options: resolveOperationLogActionOptions,
    },
    {
      key: 'resultStatus',
      label: i18next.t('modules.pages.operationLog.result'),
      type: 'select',
      options: [
        {
          label: i18next.t('modules.pages.operationLog.success'),
          value: '成功',
        },
        {
          label: i18next.t('modules.pages.operationLog.failed'),
          value: '失败',
        },
      ],
    },
    {
      key: 'authType',
      label: i18next.t('modules.pages.operationLog.authType'),
      type: 'select',
      options: [{ label: 'WEB', value: 'WEB' }],
    },
    {
      key: 'operationTime',
      label: i18next.t('modules.pages.operationLog.operationTime'),
      type: 'dateRange',
    },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.operationLog.logNo'),
      dataIndex: 'logNo',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.operationLog.operator'),
      dataIndex: 'operatorName',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.operationLog.loginName'),
      dataIndex: 'loginName',
      width: 130,
    },
    {
      title: i18next.t('modules.pages.operationLog.authType'),
      dataIndex: 'authType',
      width: 90,
      align: 'center',
      type: 'status',
    },
    {
      title: i18next.t('modules.pages.operationLog.module'),
      dataIndex: 'moduleName',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.operationLog.action'),
      dataIndex: 'actionType',
      width: 100,
    },
    {
      title: i18next.t('modules.pages.operationLog.businessNo'),
      dataIndex: 'businessNo',
      width: 180,
    },
    {
      title: i18next.t('modules.pages.operationLog.requestMethod'),
      dataIndex: 'requestMethod',
      width: 100,
    },
    {
      title: i18next.t('modules.pages.operationLog.requestPath'),
      dataIndex: 'requestPath',
      width: 220,
    },
    {
      title: i18next.t('modules.pages.operationLog.clientIp'),
      dataIndex: 'clientIp',
      width: 130,
    },
    {
      title: i18next.t('modules.pages.operationLog.result'),
      dataIndex: 'resultStatus',
      width: 90,
      type: 'status',
      align: 'center',
    },
    {
      title: i18next.t('modules.pages.operationLog.operationTime'),
      dataIndex: 'operationTime',
      width: 170,
      type: 'datetime',
    },
    {
      title: i18next.t('modules.pages.operationLog.remark'),
      dataIndex: 'remark',
      width: 240,
    },
  ],
  defaultHiddenColumnKeys: [
    'loginName',
    'authType',
    'requestMethod',
    'requestPath',
    'clientIp',
    'remark',
  ],
  detailFields: [
    { label: i18next.t('modules.pages.operationLog.logNo'), key: 'logNo' },
    {
      label: i18next.t('modules.pages.operationLog.operator'),
      key: 'operatorName',
    },
    {
      label: i18next.t('modules.pages.operationLog.loginName'),
      key: 'loginName',
    },
    {
      label: i18next.t('modules.pages.operationLog.authType'),
      key: 'authType',
      type: 'status',
    },
    {
      label: i18next.t('modules.pages.operationLog.module'),
      key: 'moduleName',
    },
    {
      label: i18next.t('modules.pages.operationLog.action'),
      key: 'actionType',
    },
    {
      label: i18next.t('modules.pages.operationLog.businessNo'),
      key: 'businessNo',
    },
    {
      label: i18next.t('modules.pages.operationLog.requestMethod'),
      key: 'requestMethod',
    },
    {
      label: i18next.t('modules.pages.operationLog.requestPath'),
      key: 'requestPath',
    },
    {
      label: i18next.t('modules.pages.operationLog.clientIp'),
      key: 'clientIp',
    },
    {
      label: i18next.t('modules.pages.operationLog.result'),
      key: 'resultStatus',
      type: 'status',
    },
    {
      label: i18next.t('modules.pages.operationLog.operationTime'),
      key: 'operationTime',
      type: 'datetime',
    },
    { label: i18next.t('modules.pages.operationLog.remark'), key: 'remark' },
  ],
  data: [],
  buildOverview: (rows) => [
    {
      label: i18next.t('modules.pages.operationLog.logCount'),
      value: formatInteger(rows.length),
    },
    {
      label: i18next.t('modules.pages.operationLog.successCount'),
      value: formatInteger(
        rows.filter((row) => row.resultStatus === '成功').length,
      ),
    },
    {
      label: i18next.t('modules.pages.operationLog.failedCount'),
      value: formatInteger(
        rows.filter((row) => row.resultStatus === '失败').length,
      ),
    },
  ],
  statusMap,
  rowHighlightStatuses: ['失败'],
}
