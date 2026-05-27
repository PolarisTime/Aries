import {
  enabledStatusOptions,
  userAccountDataScopeOptions,
} from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { buildMasterOverview, statusMap } from './shared'
import { masterStatusFilter } from './shared-filters'
import i18next from 'i18next'

export const permissionManagementPageConfig: ModulePageConfig = {
  key: 'permission',
  title: i18next.t('modules.pages.systemPermissionManagement.accessControl'),
  kicker: 'System',
  description:
    i18next.t('modules.pages.systemPermissionManagement.accessControlDesc'),
  readOnly: true,
  actions: [{ label: i18next.t('modules.pages.systemPermissionManagement.export'), type: 'primary' }],
  filters: [
    {
      key: 'keyword',
      label: i18next.t('modules.pages.systemPermissionManagement.keyword'),
      type: 'input',
      placeholder: i18next.t('modules.pages.systemPermissionManagement.permissionPlaceholder'),
    },
    { ...masterStatusFilter },
  ],
  columns: [
    { title: i18next.t('modules.pages.systemPermissionManagement.permissionCode'), dataIndex: 'permissionCode', width: 150 },
    { title: i18next.t('modules.pages.systemPermissionManagement.permissionName'), dataIndex: 'permissionName', width: 180 },
    { title: i18next.t('modules.pages.systemPermissionManagement.module'), dataIndex: 'moduleName', width: 140 },
    { title: i18next.t('modules.pages.systemPermissionManagement.permissionType'), dataIndex: 'permissionType', width: 110 },
    { title: i18next.t('modules.pages.systemPermissionManagement.action'), dataIndex: 'actionName', width: 120 },
    { title: i18next.t('modules.pages.systemPermissionManagement.dataScope'), dataIndex: 'scopeName', width: 120 },
    { title: i18next.t('modules.pages.systemPermissionManagement.resourceKey'), dataIndex: 'resourceKey', width: 180 },
    {
      title: i18next.t('modules.pages.systemPermissionManagement.status'),
      dataIndex: 'status',
      width: 100,
      type: 'status',
      align: 'center',
    },
    { title: i18next.t('modules.pages.systemPermissionManagement.remark'), dataIndex: 'remark', width: 220 },
  ],
  detailFields: [
    { label: i18next.t('modules.pages.systemPermissionManagement.permissionCode'), key: 'permissionCode' },
    { label: i18next.t('modules.pages.systemPermissionManagement.permissionName'), key: 'permissionName' },
    { label: i18next.t('modules.pages.systemPermissionManagement.module'), key: 'moduleName' },
    { label: i18next.t('modules.pages.systemPermissionManagement.permissionType'), key: 'permissionType' },
    { label: i18next.t('modules.pages.systemPermissionManagement.action'), key: 'actionName' },
    { label: i18next.t('modules.pages.systemPermissionManagement.dataScope'), key: 'scopeName' },
    { label: i18next.t('modules.pages.systemPermissionManagement.resourceKey'), key: 'resourceKey' },
    { label: i18next.t('modules.pages.systemPermissionManagement.status'), key: 'status', type: 'status' },
    { label: i18next.t('modules.pages.systemPermissionManagement.remark'), key: 'remark' },
  ],
  formFields: [
    {
      key: 'permissionCode',
      label: i18next.t('modules.pages.systemPermissionManagement.permissionCode'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'permissionName',
      label: i18next.t('modules.pages.systemPermissionManagement.permissionName'),
      type: 'input',
      required: true,
      row: 1,
    },
    { key: 'moduleName', label: i18next.t('modules.pages.systemPermissionManagement.module'), type: 'input', required: true, row: 1 },
    {
      key: 'permissionType',
      label: i18next.t('modules.pages.systemPermissionManagement.permissionType'),
      type: 'select',
      required: true,
      row: 1,
      options: [
        { label: i18next.t('modules.pages.systemPermissionManagement.menuPermission'), value: '菜单权限' },
        { label: i18next.t('modules.pages.systemPermissionManagement.buttonPermission'), value: '按钮权限' },
        { label: i18next.t('modules.pages.systemPermissionManagement.dataPermission'), value: '数据权限' },
      ],
    },
    {
      key: 'actionName',
      label: i18next.t('modules.pages.systemPermissionManagement.action'),
      type: 'select',
      required: true,
      row: 2,
      options: [
        { label: i18next.t('modules.pages.systemPermissionManagement.view'), value: '查看' },
        { label: i18next.t('modules.pages.systemPermissionManagement.create'), value: '新增' },
        { label: i18next.t('modules.pages.systemPermissionManagement.edit'), value: '编辑' },
        { label: i18next.t('modules.pages.systemPermissionManagement.delete'), value: '删除' },
        { label: i18next.t('modules.pages.systemPermissionManagement.audit'), value: '审核' },
        { label: i18next.t('modules.pages.systemPermissionManagement.export'), value: '导出' },
        { label: i18next.t('modules.pages.systemPermissionManagement.print'), value: '打印' },
      ],
    },
    {
      key: 'scopeName',
      label: i18next.t('modules.pages.systemPermissionManagement.dataScope'),
      type: 'select',
      required: true,
      row: 2,
      options: [
        ...userAccountDataScopeOptions,
        { label: i18next.t('modules.pages.systemPermissionManagement.customScope'), value: '自定义范围' },
      ],
    },
    {
      key: 'resourceKey',
      label: i18next.t('modules.pages.systemPermissionManagement.resourceKey'),
      type: 'input',
      required: true,
      row: 2,
    },
    {
      key: 'status',
      label: i18next.t('modules.pages.systemPermissionManagement.status'),
      type: 'select',
      defaultValue: '正常',
      options: enabledStatusOptions,
      row: 2,
    },
    { key: 'remark', label: i18next.t('modules.pages.systemPermissionManagement.remark'), type: 'textarea', row: 3, fullRow: true },
  ],
  data: [],
  buildOverview: (rows) => buildMasterOverview(rows),
  statusMap,
  rowHighlightStatuses: ['禁用'],
}
