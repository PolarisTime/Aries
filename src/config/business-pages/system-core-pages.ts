import { enabledStatusOptions } from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import {
  actionSet,
  buildMasterOverview,
  formatInteger,
  statusMap,
} from './shared'
import { masterStatusFilter } from './shared-filters'

export const systemCorePageConfigs: Record<string, ModulePageConfig> = {
  'general-setting': {
    key: 'general-setting',
    title: '通用设置',
    kicker: 'System',
    description:
      '通用设置集中维护默认税率和系统开关，用于控制页面行为、草稿默认值和附件命名策略。',
    actions: [...actionSet],
    filters: [
      {
        key: 'keyword',
        label: '关键字',
        type: 'input',
        placeholder: '配置编码 / 单据名称 / 前缀',
      },
      { ...masterStatusFilter },
    ],
    columns: [
      { title: '配置编码', dataIndex: 'settingCode', width: 150 },
      { title: '配置名称', dataIndex: 'settingName', width: 180 },
      { title: '单据名称', dataIndex: 'billName', width: 140 },
      { title: '前缀', dataIndex: 'prefix', width: 90 },
      { title: '日期规则', dataIndex: 'dateRule', width: 120 },
      {
        title: '流水位数',
        dataIndex: 'serialLength',
        width: 100,
        align: 'right',
        type: 'count',
      },
      { title: '重置规则', dataIndex: 'resetRule', width: 110 },
      { title: '示例号 / 配置值', dataIndex: 'sampleNo', width: 170 },
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
      { label: '配置编码', key: 'settingCode' },
      { label: '配置名称', key: 'settingName' },
      { label: '单据名称', key: 'billName' },
      { label: '前缀', key: 'prefix' },
      { label: '日期规则', key: 'dateRule' },
      { label: '流水位数', key: 'serialLength', type: 'count' },
      { label: '重置规则', key: 'resetRule' },
      { label: '示例号 / 配置值', key: 'sampleNo' },
      { label: '状态', key: 'status', type: 'status' },
      { label: '备注', key: 'remark' },
    ],
    formFields: [
      {
        key: 'settingCode',
        label: '配置编码',
        type: 'input',
        required: true,
        row: 1,
      },
      {
        key: 'settingName',
        label: '配置名称',
        type: 'input',
        required: true,
        row: 1,
      },
      {
        key: 'billName',
        label: '单据名称',
        type: 'input',
        required: true,
        row: 1,
      },
      { key: 'prefix', label: '前缀', type: 'input', required: true, row: 1 },
      {
        key: 'dateRule',
        label: '日期规则',
        type: 'select',
        required: true,
        row: 2,
        options: [
          { label: 'YYYY', value: 'YYYY' },
          { label: 'YYYYMM', value: 'YYYYMM' },
        ],
      },
      {
        key: 'serialLength',
        label: '流水位数',
        type: 'number',
        required: true,
        min: 1,
        precision: 0,
        defaultValue: 6,
        row: 2,
      },
      {
        key: 'resetRule',
        label: '重置规则',
        type: 'select',
        required: true,
        row: 2,
        options: [
          { label: '按年重置', value: '按年重置' },
          { label: '按月重置', value: '按月重置' },
          { label: '永不重置', value: '永不重置' },
        ],
      },
      {
        key: 'sampleNo',
        label: '示例号 / 配置值',
        type: 'input',
        required: true,
        placeholder: '单号规则为示例; 系统开关为当前值',
        row: 2,
      },
      {
        key: 'status',
        label: '状态',
        type: 'select',
        defaultValue: '正常',
        options: enabledStatusOptions,
        row: 3,
      },
      { key: 'remark', label: '备注', type: 'textarea', row: 4, fullRow: true },
    ],
    data: [],
    buildOverview: (rows) => [
      { label: '规则数', value: formatInteger(rows.length) },
      {
        label: '启用规则',
        value: formatInteger(
          rows.filter((row) => row.status === '正常').length,
        ),
      },
    ],
    statusMap,
    rowHighlightStatuses: ['禁用'],
  },
  'company-setting': {
    key: 'company-setting',
    title: '公司信息',
    kicker: 'System',
    description:
      '公司信息集中维护公司名称、税号与多个结算银行信息，供打印模板、结算抬头和财务页面统一引用。',
    primaryNoKey: 'companyName',
    actions: [...actionSet],
    filters: [
      {
        key: 'keyword',
        label: '关键字',
        type: 'input',
        placeholder: '公司名称 / 税号 / 银行 / 账号',
      },
    ],
    columns: [
      { title: '公司名称', dataIndex: 'companyName', width: 180 },
      { title: '税号', dataIndex: 'taxNo', width: 180 },
      { title: '备注', dataIndex: 'remark', width: 220 },
    ],
    detailFields: [
      { label: '公司名称', key: 'companyName' },
      { label: '税号', key: 'taxNo' },
      { label: '备注', key: 'remark' },
    ],
    formFields: [
      {
        key: 'companyName',
        label: '公司名称',
        type: 'input',
        required: true,
        row: 1,
      },
      { key: 'taxNo', label: '税号', type: 'input', required: true, row: 1 },
      { key: 'remark', label: '备注', type: 'textarea', row: 2, fullRow: true },
    ],
    data: [],
    buildOverview: (rows) => buildMasterOverview(rows),
  },
}
