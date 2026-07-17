import i18next from 'i18next'
import type { ModulePageConfig } from '@/types/module-page'
import { buildMasterOverview, statusMap } from '../shared/shared'

export const permissionManagementPageConfig: ModulePageConfig = {
  key: 'permission',
  title: i18next.t('modules.pages.systemPermissionManagement.accessControl'),
  kicker: 'System',
  description: i18next.t(
    'modules.pages.systemPermissionManagement.accessControlDesc',
  ),
  readOnly: true,
  filters: [
    {
      key: 'keyword',
      label: i18next.t('modules.pages.systemPermissionManagement.keyword'),
      type: 'input',
      placeholder: i18next.t(
        'modules.pages.systemPermissionManagement.permissionPlaceholder',
      ),
    },
  ],
  columns: [
    {
      title: i18next.t(
        'modules.pages.systemPermissionManagement.permissionCode',
      ),
      dataIndex: 'permissionCode',
      width: 150,
    },
    {
      title: i18next.t(
        'modules.pages.systemPermissionManagement.permissionName',
      ),
      dataIndex: 'permissionName',
      width: 180,
    },
    {
      title: i18next.t('modules.pages.systemPermissionManagement.module'),
      dataIndex: 'moduleName',
      width: 140,
    },
    {
      title: i18next.t(
        'modules.pages.systemPermissionManagement.permissionType',
      ),
      dataIndex: 'permissionType',
      width: 110,
    },
    {
      title: i18next.t('modules.pages.systemPermissionManagement.action'),
      dataIndex: 'actionName',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.systemPermissionManagement.resourceKey'),
      dataIndex: 'resourceKey',
      width: 180,
    },
    {
      title: i18next.t('modules.pages.systemPermissionManagement.status'),
      dataIndex: 'status',
      width: 100,
      type: 'status',
      align: 'center',
    },
    {
      title: i18next.t('modules.pages.systemPermissionManagement.remark'),
      dataIndex: 'remark',
      width: 220,
    },
  ],
  detailFields: [
    {
      label: i18next.t(
        'modules.pages.systemPermissionManagement.permissionCode',
      ),
      key: 'permissionCode',
    },
    {
      label: i18next.t(
        'modules.pages.systemPermissionManagement.permissionName',
      ),
      key: 'permissionName',
    },
    {
      label: i18next.t('modules.pages.systemPermissionManagement.module'),
      key: 'moduleName',
    },
    {
      label: i18next.t(
        'modules.pages.systemPermissionManagement.permissionType',
      ),
      key: 'permissionType',
    },
    {
      label: i18next.t('modules.pages.systemPermissionManagement.action'),
      key: 'actionName',
    },
    {
      label: i18next.t('modules.pages.systemPermissionManagement.resourceKey'),
      key: 'resourceKey',
    },
    {
      label: i18next.t('modules.pages.systemPermissionManagement.status'),
      key: 'status',
      type: 'status',
    },
    {
      label: i18next.t('modules.pages.systemPermissionManagement.remark'),
      key: 'remark',
    },
  ],
  data: [],
  buildOverview: (rows) => buildMasterOverview(rows),
  statusMap,
}
