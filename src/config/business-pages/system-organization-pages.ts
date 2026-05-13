import { enabledStatusOptions } from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { actionSet, buildMasterOverview, statusMap } from './shared'

export const systemOrganizationPageConfigs: Record<string, ModulePageConfig> = {
  department: {
    key: 'department',
    title: '部门管理',
    kicker: 'System',
    description:
      '部门管理维护组织部门、负责人、联系电话和启用状态，为用户账户的数据范围控制提供基础归属。',
    primaryNoKey: 'departmentCode',
    actions: actionSet,
    filters: [
      {
        key: 'keyword',
        label: '关键字',
        type: 'input',
        placeholder: '部门编码 / 部门名称 / 负责人',
      },
      {
        key: 'status',
        label: '状态',
        type: 'select',
        options: enabledStatusOptions,
      },
    ],
    columns: [
      { title: '部门编码', dataIndex: 'departmentCode', width: 140 },
      { title: '部门名称', dataIndex: 'departmentName', width: 160 },
      { title: '上级部门', dataIndex: 'parentName', width: 150 },
      { title: '负责人', dataIndex: 'managerName', width: 120 },
      { title: '联系电话', dataIndex: 'contactPhone', width: 140 },
      {
        title: '排序号',
        dataIndex: 'sortOrder',
        width: 90,
        align: 'right',
        type: 'count',
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        type: 'status',
        align: 'center',
      },
      { title: '备注', dataIndex: 'remark', width: 220 },
    ],
    detailFields: [
      { label: '部门编码', key: 'departmentCode' },
      { label: '部门名称', key: 'departmentName' },
      { label: '上级部门', key: 'parentName' },
      { label: '负责人', key: 'managerName' },
      { label: '联系电话', key: 'contactPhone' },
      { label: '排序号', key: 'sortOrder', type: 'count' },
      { label: '状态', key: 'status', type: 'status' },
      { label: '备注', key: 'remark' },
    ],
    formFields: [
      {
        key: 'departmentCode',
        label: '部门编码',
        type: 'input',
        required: true,
        row: 1,
      },
      {
        key: 'departmentName',
        label: '部门名称',
        type: 'input',
        required: true,
        row: 1,
      },
      {
        key: 'parentId',
        label: '上级部门',
        type: 'select',
        allowClear: true,
        placeholder: '请选择上级部门',
        row: 1,
      },
      { key: 'managerName', label: '负责人', type: 'input', row: 1 },
      { key: 'contactPhone', label: '联系电话', type: 'input', row: 2 },
      {
        key: 'sortOrder',
        label: '排序号',
        type: 'number',
        min: 0,
        precision: 0,
        defaultValue: 0,
        row: 2,
      },
      {
        key: 'status',
        label: '状态',
        type: 'select',
        defaultValue: '正常',
        options: enabledStatusOptions,
        row: 2,
      },
      { key: 'remark', label: '备注', type: 'textarea', row: 3, fullRow: true },
    ],
    data: [],
    buildOverview: (rows) => buildMasterOverview(rows),
    statusMap,
    rowHighlightStatuses: ['禁用'],
  },
}
