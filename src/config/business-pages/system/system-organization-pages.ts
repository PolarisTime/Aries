import i18next from 'i18next'
import { enabledStatusOptions } from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { actionSet, buildMasterOverview, statusMap } from '../shared/shared'
import { masterStatusFilter } from '../shared/shared-filters'

export const systemOrganizationPageConfigs: Record<string, ModulePageConfig> = {
  department: {
    key: 'department',
    title: i18next.t('modules.pages.systemOrganization.department'),
    kicker: 'Master Data',
    description: i18next.t('modules.pages.systemOrganization.deptDesc'),
    primaryNoKey: 'departmentCode',
    actions: actionSet,
    filters: [
      {
        key: 'keyword',
        label: i18next.t('modules.pages.systemOrganization.keyword'),
        type: 'input',
        placeholder: i18next.t(
          'modules.pages.systemOrganization.deptPlaceholder',
        ),
      },
      { ...masterStatusFilter },
    ],
    columns: [
      {
        title: i18next.t('modules.pages.systemOrganization.deptCode'),
        dataIndex: 'departmentCode',
        width: 140,
      },
      {
        title: i18next.t('modules.pages.systemOrganization.deptName'),
        dataIndex: 'departmentName',
        width: 160,
      },
      {
        title: i18next.t('modules.pages.systemOrganization.parentDept'),
        dataIndex: 'parentName',
        width: 150,
      },
      {
        title: i18next.t('modules.pages.systemOrganization.manager'),
        dataIndex: 'managerName',
        width: 120,
      },
      {
        title: i18next.t('modules.pages.systemOrganization.phone'),
        dataIndex: 'contactPhone',
        width: 140,
      },
      {
        title: i18next.t('modules.pages.systemOrganization.sortOrder'),
        dataIndex: 'sortOrder',
        width: 90,
        align: 'right',
        type: 'count',
      },
      {
        title: i18next.t('modules.pages.systemOrganization.status'),
        dataIndex: 'status',
        width: 100,
        type: 'status',
        align: 'center',
      },
      {
        title: i18next.t('modules.pages.systemOrganization.remark'),
        dataIndex: 'remark',
        width: 220,
      },
    ],
    detailFields: [
      {
        label: i18next.t('modules.pages.systemOrganization.deptCode'),
        key: 'departmentCode',
      },
      {
        label: i18next.t('modules.pages.systemOrganization.deptName'),
        key: 'departmentName',
      },
      {
        label: i18next.t('modules.pages.systemOrganization.parentDept'),
        key: 'parentName',
      },
      {
        label: i18next.t('modules.pages.systemOrganization.manager'),
        key: 'managerName',
      },
      {
        label: i18next.t('modules.pages.systemOrganization.phone'),
        key: 'contactPhone',
      },
      {
        label: i18next.t('modules.pages.systemOrganization.sortOrder'),
        key: 'sortOrder',
        type: 'count',
      },
      {
        label: i18next.t('modules.pages.systemOrganization.status'),
        key: 'status',
        type: 'status',
      },
      {
        label: i18next.t('modules.pages.systemOrganization.remark'),
        key: 'remark',
      },
    ],
    formFields: [
      {
        key: 'departmentCode',
        label: i18next.t('modules.pages.systemOrganization.deptCode'),
        type: 'input',
        required: true,
        row: 1,
      },
      {
        key: 'departmentName',
        label: i18next.t('modules.pages.systemOrganization.deptName'),
        type: 'input',
        required: true,
        row: 1,
      },
      {
        key: 'parentId',
        label: i18next.t('modules.pages.systemOrganization.parentDept'),
        type: 'select',
        allowClear: true,
        placeholder: i18next.t(
          'modules.pages.systemOrganization.selectParentDept',
        ),
        row: 1,
      },
      {
        key: 'managerName',
        label: i18next.t('modules.pages.systemOrganization.manager'),
        type: 'input',
        row: 1,
      },
      {
        key: 'contactPhone',
        label: i18next.t('modules.pages.systemOrganization.phone'),
        type: 'input',
        row: 2,
      },
      {
        key: 'sortOrder',
        label: i18next.t('modules.pages.systemOrganization.sortOrder'),
        type: 'number',
        min: 0,
        precision: 0,
        defaultValue: 0,
        row: 2,
      },
      {
        key: 'status',
        label: i18next.t('modules.pages.systemOrganization.status'),
        type: 'select',
        defaultValue: '正常',
        options: enabledStatusOptions,
        row: 2,
      },
      {
        key: 'remark',
        label: i18next.t('modules.pages.systemOrganization.remark'),
        type: 'textarea',
        row: 3,
        fullRow: true,
      },
    ],
    data: [],
    buildOverview: (rows) => buildMasterOverview(rows),
    statusMap,
    rowHighlightStatuses: ['禁用'],
  },
}
