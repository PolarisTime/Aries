import type { ModulePageConfig } from '@/types/module-page'
import {
  operationLogModuleOptions,
  resolveOperationLogActionOptions,
} from './operation-log-options'
import { formatInteger, statusMap } from './shared'

export const operationLogsPageConfig: ModulePageConfig = {
  key: 'operation-log',
  title: '操作日志',
  kicker: 'System',
  description:
    '操作日志用于审计整个系统的写操作，记录操作人、模块、动作、对象、请求路径和结果状态，便于问题追踪与合规检查。',
  readOnly: true,
  actions: [{ label: '导出', type: 'primary' }],
  quickFilters: [
    { key: 'all', label: '全部日志', values: {} },
    { key: 'auth', label: '认证授权', values: { moduleName: '认证授权' } },
  ],
  filters: [
    {
      key: 'keyword',
      label: '关键字',
      type: 'input',
      placeholder: '日志编号 / 操作人 / 业务单号 / 请求路径',
    },
    {
      key: 'moduleName',
      label: '模块',
      type: 'select',
      options: operationLogModuleOptions,
    },
    {
      key: 'actionType',
      label: '动作',
      type: 'select',
      options: resolveOperationLogActionOptions,
    },
    {
      key: 'resultStatus',
      label: '结果',
      type: 'select',
      options: [
        { label: '成功', value: '成功' },
        { label: '失败', value: '失败' },
      ],
    },
    { key: 'authType', label: '认证方式', type: 'select', options: [
      { label: 'WEB', value: 'WEB' },
      { label: 'API_KEY', value: 'API_KEY' },
    ]},
    { key: 'operationTime', label: '操作时间', type: 'dateRange' },
  ],
  columns: [
    { title: '日志编号', dataIndex: 'logNo', width: 160 },
    { title: '操作人', dataIndex: 'operatorName', width: 120 },
    { title: '登录账号', dataIndex: 'loginName', width: 130 },
    {
      title: '认证方式',
      dataIndex: 'authType',
      width: 90,
      align: 'center',
      type: 'status',
    },
    { title: '模块', dataIndex: 'moduleName', width: 120 },
    { title: '动作', dataIndex: 'actionType', width: 100 },
    { title: '业务单号', dataIndex: 'businessNo', width: 180 },
    { title: '请求方式', dataIndex: 'requestMethod', width: 100 },
    { title: '请求路径', dataIndex: 'requestPath', width: 220 },
    { title: '客户端IP', dataIndex: 'clientIp', width: 130 },
    {
      title: '结果',
      dataIndex: 'resultStatus',
      width: 90,
      type: 'status',
      align: 'center',
    },
    { title: '操作时间', dataIndex: 'operationTime', width: 170 },
    { title: '备注', dataIndex: 'remark', width: 240 },
  ],
  detailFields: [
    { label: '日志编号', key: 'logNo' },
    { label: '操作人', key: 'operatorName' },
    { label: '登录账号', key: 'loginName' },
    { label: '认证方式', key: 'authType', type: 'status' },
    { label: '模块', key: 'moduleName' },
    { label: '动作', key: 'actionType' },
    { label: '业务单号', key: 'businessNo' },
    { label: '请求方式', key: 'requestMethod' },
    { label: '请求路径', key: 'requestPath' },
    { label: '客户端IP', key: 'clientIp' },
    { label: '结果', key: 'resultStatus', type: 'status' },
    { label: '操作时间', key: 'operationTime' },
    { label: '备注', key: 'remark' },
  ],
  data: [],
  buildOverview: (rows) => [
    { label: '日志数', value: formatInteger(rows.length) },
    {
      label: '成功数',
      value: formatInteger(
        rows.filter((row) => row.resultStatus === '成功').length,
      ),
    },
    {
      label: '失败数',
      value: formatInteger(
        rows.filter((row) => row.resultStatus === '失败').length,
      ),
    },
  ],
  statusMap,
  rowHighlightStatuses: ['失败'],
}
