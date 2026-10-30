import i18next from 'i18next'
import { enabledStatusOptions } from '@/constants/module-options'
import { INTERNAL_WEIGHT_PRECISION } from '@/constants/precision'
import { STATUS } from '@/constants/status-constants'
import {
  getLengthOptions,
  getMaterialCategoryOptions,
  materialCategoryOptions,
  materialGradeOptions,
} from '@/module-system/core/module-option-resolvers'
import type { ModulePageConfig } from '@/types/module-page'
import { actionSet, statusMap } from '../shared/shared'
import { masterStatusFilter } from '../shared/shared-filters'
import {
  buildMaterialOverview,
  isPhysicalMaterialFieldVisible,
} from './material-rules'

/**
 * 商品资料（`/material`）页面配置 —— **这是当前真实渲染路径的权威配置**。
 *
 * <p>链路：`page-registry-master.ts` 的 material `view: 'business-grid'` →
 * `view-loaders.ts` 懒加载 `BusinessGridView` → `useModulePageConfig` →
 * `business-page-loader.ts` 的 `masterMaterialPageConfigs` → 本文件的
 * `materialsPageConfig`。因此表单字段改动必须落在这里才会出现在界面上。</p>
 *
 * <p>`src/views/master-data/MaterialPage.tsx` + `material-page-fields.ts` 是迁移到通用列表页
 * 之前的遗留实现，已无注册表/加载器引用（仅剩自身 spec 引用），**不是**权威来源；
 * 若两者口径不一致，以本文件为准。</p>
 */
export const materialsPageConfig: ModulePageConfig = {
  key: 'material',
  title: i18next.t('modules.pages.material.materials'),
  kicker: 'Master Data',
  description: i18next.t('modules.pages.material.materialDesc'),
  primaryNoKey: 'materialCode',
  showGeneratedPrimaryNoOnCreate: true,
  actions: actionSet,
  filters: [
    {
      key: 'materialType',
      label: i18next.t('modules.pages.material.materialType'),
      type: 'select',
      options: [
        {
          label: i18next.t('modules.pages.material.materialTypePhysical'),
          value: '实体商品',
        },
        {
          label: i18next.t('modules.pages.material.materialTypeExpense'),
          value: '附加费用',
        },
      ],
    },
    {
      key: 'keyword',
      label: i18next.t('modules.pages.material.keyword'),
      type: 'input',
      placeholder: i18next.t('modules.pages.material.materialPlaceholder'),
    },
    {
      key: 'category',
      label: i18next.t('modules.pages.material.category'),
      type: 'select',
      options: materialCategoryOptions,
    },
    {
      key: 'material',
      label: i18next.t('modules.pages.material.material'),
      type: 'select',
      options: materialGradeOptions,
    },
    { ...masterStatusFilter },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.material.materialType'),
      dataIndex: 'materialType',
      width: 96,
    },
    {
      title: i18next.t('modules.pages.material.materialCode'),
      dataIndex: 'materialCode',
      width: 180,
    },
    {
      title: i18next.t('modules.pages.material.brand'),
      dataIndex: 'brand',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.material.material'),
      dataIndex: 'material',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.material.category'),
      dataIndex: 'category',
      width: 110,
    },
    {
      title: i18next.t('modules.pages.material.spec'),
      dataIndex: 'spec',
      width: 100,
    },
    {
      title: i18next.t('modules.pages.material.length'),
      dataIndex: 'length',
      width: 100,
    },
    {
      title: i18next.t('modules.pages.material.unit'),
      dataIndex: 'unit',
      width: 90,
    },
    {
      title: i18next.t('modules.pages.material.qtyUnit'),
      dataIndex: 'quantityUnit',
      width: 90,
    },
    {
      title: i18next.t('modules.pages.material.pieceWeightTon'),
      dataIndex: 'pieceWeightTon',
      width: 110,
      align: 'right',
      type: 'weight',
    },
    {
      title: i18next.t('modules.pages.material.pcsPerBundle'),
      dataIndex: 'piecesPerBundle',
      width: 110,
      align: 'right',
      type: 'count',
    },
    {
      title: i18next.t('modules.pages.material.unitPrice'),
      dataIndex: 'unitPrice',
      width: 100,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.columns.status'),
      dataIndex: 'status',
      width: 100,
      type: 'status',
      align: 'center',
    },
    {
      title: i18next.t('modules.pages.material.remark'),
      dataIndex: 'remark',
      width: 180,
    },
  ],
  defaultHiddenColumnKeys: [
    'pieceWeightTon',
    'piecesPerBundle',
    'unitPrice',
    'remark',
  ],
  detailFields: [
    {
      label: i18next.t('modules.pages.material.materialType'),
      key: 'materialType',
    },
    {
      label: i18next.t('modules.pages.material.materialCode'),
      key: 'materialCode',
    },
    { label: i18next.t('modules.pages.material.brand'), key: 'brand' },
    { label: i18next.t('modules.pages.material.material'), key: 'material' },
    { label: i18next.t('modules.pages.material.category'), key: 'category' },
    { label: i18next.t('modules.pages.material.spec'), key: 'spec' },
    { label: i18next.t('modules.pages.material.length'), key: 'length' },
    { label: i18next.t('modules.pages.material.unit'), key: 'unit' },
    { label: i18next.t('modules.pages.material.qtyUnit'), key: 'quantityUnit' },
    {
      label: i18next.t('modules.pages.material.pieceWeightTon'),
      key: 'pieceWeightTon',
      type: 'weight',
    },
    {
      label: i18next.t('modules.pages.material.pcsPerBundle'),
      key: 'piecesPerBundle',
      type: 'count',
    },
    {
      label: i18next.t('modules.pages.material.unitPrice'),
      key: 'unitPrice',
      type: 'amount',
    },
    {
      label: i18next.t('modules.columns.status'),
      key: 'status',
      type: 'status',
    },
    { label: i18next.t('modules.pages.material.remark'), key: 'remark' },
  ],
  formFields: [
    {
      key: 'materialType',
      label: i18next.t('modules.pages.material.materialType'),
      type: 'select',
      required: true,
      defaultValue: '实体商品',
      options: [
        {
          label: i18next.t('modules.pages.material.materialTypePhysical'),
          value: '实体商品',
        },
        {
          label: i18next.t('modules.pages.material.materialTypeExpense'),
          value: '附加费用',
        },
      ],
      row: 1,
    },
    {
      key: 'materialCode',
      label: i18next.t('modules.pages.material.materialCode'),
      type: 'input',
      required: true,
      disabled: true,
      // 与后端 MaterialRequest `@Size(max = 64)`、md_material.material_code varchar(64) 对齐。
      maxLength: 64,
      placeholder: i18next.t(
        'modules.editorWorkspace.autoGeneratedPlaceholder',
      ),
      row: 1,
    },
    {
      key: 'brand',
      label: i18next.t('modules.pages.material.brand'),
      type: 'input',
      required: true,
      // 与后端 MaterialRequest `@Size(max = 64)` 对齐。
      maxLength: 64,
      row: 1,
      visibleWhen: isPhysicalMaterialFieldVisible,
    },
    {
      key: 'material',
      label: i18next.t('modules.pages.material.material'),
      type: 'input',
      required: true,
      // 与后端 MaterialRequest `@Size(max = 16)` 对齐。
      maxLength: 16,
      row: 1,
    },
    {
      key: 'category',
      label: i18next.t('modules.pages.material.category'),
      type: 'select',
      required: true,
      options: getMaterialCategoryOptions,
      row: 1,
      visibleWhen: isPhysicalMaterialFieldVisible,
    },
    {
      key: 'spec',
      label: i18next.t('modules.pages.material.spec'),
      type: 'input',
      required: true,
      // 与后端 MaterialRequest `@Size(max = 64)` 对齐。
      maxLength: 64,
      row: 2,
      visibleWhen: isPhysicalMaterialFieldVisible,
    },
    {
      key: 'length',
      label: i18next.t('modules.pages.material.length'),
      /*
       * 长度是**业务数据**，不是自由文本：取值必须来自定尺主数据（后端 MaterialService
       * 会校验），比价页的定尺加价/排序/互切也都读同一份。选项由 `getLengthOptions`
       * 从定尺主数据缓存同步读取（末尾追加「无定尺（卷材）= '-'」），主数据为空时下拉为空
       * —— 不写死 9米/12米 兜底。
       */
      type: 'select',
      required: true,
      options: getLengthOptions,
      row: 2,
      visibleWhen: isPhysicalMaterialFieldVisible,
    },
    {
      key: 'unit',
      label: i18next.t('modules.pages.material.unit'),
      type: 'input',
      required: true,
      // 与后端 MaterialRequest `@Size(max = 8)` 对齐。
      maxLength: 8,
      row: 2,
    },
    {
      key: 'quantityUnit',
      label: i18next.t('modules.pages.material.qtyUnit'),
      type: 'input',
      required: true,
      // 与后端 MaterialRequest `@Size(max = 8)` 对齐。
      maxLength: 8,
      row: 2,
      visibleWhen: isPhysicalMaterialFieldVisible,
    },
    {
      key: 'pieceWeightTon',
      label: i18next.t('modules.pages.material.pieceWeightTon'),
      type: 'number',
      required: true,
      min: 0,
      precision: INTERNAL_WEIGHT_PRECISION,
      defaultValue: 0,
      row: 3,
      visibleWhen: isPhysicalMaterialFieldVisible,
    },
    {
      key: 'piecesPerBundle',
      label: i18next.t('modules.pages.material.pcsPerBundle'),
      type: 'number',
      required: true,
      min: 0,
      precision: 0,
      defaultValue: 0,
      row: 3,
      visibleWhen: isPhysicalMaterialFieldVisible,
    },
    {
      key: 'unitPrice',
      label: i18next.t('modules.pages.material.unitPrice'),
      type: 'number',
      required: true,
      min: 0,
      precision: 2,
      defaultValue: 0,
      row: 3,
    },
    {
      key: 'status',
      label: i18next.t('modules.columns.status'),
      type: 'select',
      defaultValue: STATUS.NORMAL,
      options: enabledStatusOptions,
      row: 4,
    },
    {
      key: 'remark',
      label: i18next.t('modules.pages.material.remark'),
      type: 'textarea',
      // 与后端 MaterialRequest `@Size(max = 255)` 对齐。
      maxLength: 255,
      row: 4,
      fullRow: true,
    },
  ],
  data: [],
  buildOverview: buildMaterialOverview,
  statusMap,
  // 禁用商品在列表里降级显示：仍可查看/编辑，但一眼看出不能再被单据选中
  rowHighlightStatuses: [STATUS.DISABLED],
}
