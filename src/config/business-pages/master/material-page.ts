import i18next from 'i18next'
import {
  getMaterialCategoryOptions,
  materialCategoryOptions,
  materialGradeOptions,
} from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { actionSet, formatInteger } from '../shared/shared'

export const materialsPageConfig: ModulePageConfig = {
  key: 'material',
  title: i18next.t('modules.pages.material.materials'),
  kicker: 'Master Data',
  description: i18next.t('modules.pages.material.materialDesc'),
  primaryNoKey: 'materialCode',
  actions: actionSet,
  filters: [
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
  ],
  columns: [
    {
      title: i18next.t('modules.pages.material.materialCode'),
      dataIndex: 'materialCode',
      width: 150,
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
      title: i18next.t('modules.pages.material.batchMgmt'),
      dataIndex: 'batchNoEnabled',
      width: 110,
    },
    {
      title: i18next.t('modules.pages.material.remark'),
      dataIndex: 'remark',
      width: 180,
    },
  ],
  detailFields: [
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
      label: i18next.t('modules.pages.material.batchMgmt'),
      key: 'batchNoEnabled',
    },
    { label: i18next.t('modules.pages.material.remark'), key: 'remark' },
  ],
  formFields: [
    {
      key: 'materialCode',
      label: i18next.t('modules.pages.material.materialCode'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'brand',
      label: i18next.t('modules.pages.material.brand'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'material',
      label: i18next.t('modules.pages.material.material'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'category',
      label: i18next.t('modules.pages.material.category'),
      type: 'select',
      required: true,
      options: getMaterialCategoryOptions,
      row: 1,
    },
    {
      key: 'spec',
      label: i18next.t('modules.pages.material.spec'),
      type: 'input',
      required: true,
      row: 2,
    },
    {
      key: 'length',
      label: i18next.t('modules.pages.material.length'),
      type: 'input',
      required: true,
      row: 2,
    },
    {
      key: 'unit',
      label: i18next.t('modules.pages.material.unit'),
      type: 'input',
      required: true,
      row: 2,
    },
    {
      key: 'quantityUnit',
      label: i18next.t('modules.pages.material.qtyUnit'),
      type: 'input',
      required: true,
      row: 2,
    },
    {
      key: 'pieceWeightTon',
      label: i18next.t('modules.pages.material.pieceWeightTon'),
      type: 'number',
      required: true,
      min: 0,
      precision: 3,
      defaultValue: 0,
      row: 3,
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
      key: 'batchNoEnabled',
      label: i18next.t('modules.pages.material.batchMgmt'),
      type: 'select',
      defaultValue: true,
      options: [
        { label: i18next.t('modules.pages.material.enabled'), value: true },
        { label: i18next.t('modules.pages.material.closed'), value: false },
      ],
      row: 3,
    },
    {
      key: 'remark',
      label: i18next.t('modules.pages.material.remark'),
      type: 'textarea',
      row: 4,
      fullRow: true,
    },
  ],
  data: [],
  buildOverview: (rows) => [
    {
      label: i18next.t('modules.pages.material.materialCount'),
      value: formatInteger(rows.length),
    },
    {
      label: i18next.t('modules.pages.material.calculated'),
      value: formatInteger(
        rows.filter((row) => row.category === '螺纹钢').length,
      ),
    },
    {
      label: i18next.t('modules.pages.material.weighed'),
      value: formatInteger(
        rows.filter((row) => row.category !== '螺纹钢').length,
      ),
    },
  ],
}
