import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { INTERNAL_WEIGHT_PRECISION } from '@/constants/precision'
import {
  getMaterialCategoryOptions,
  materialGradeOptions,
} from '@/module-system/core/module-option-resolvers'
import { asString } from '@/utils/type-narrowing'
import { MasterDataListPage } from './MasterDataListPage'
import type { MasterDataPageSpec } from './master-data-types'

const physicalVisibleWhen = (values: Record<string, unknown>) =>
  values.materialType !== '附加费用'

export function MaterialPage() {
  const { t } = useTranslation()
  const spec = useMemo<MasterDataPageSpec>(() => {
    const materialTypeOptions = [
      {
        label: t('modules.pages.material.materialTypePhysical'),
        value: '实体商品',
      },
      {
        label: t('modules.pages.material.materialTypeExpense'),
        value: '附加费用',
      },
    ]
    return {
      moduleKey: 'material',
      primaryNoKey: 'materialCode',
      title: t('modules.pages.material.materials'),
      description: t('modules.pages.material.materialDesc'),
      keywordPlaceholder: t('modules.pages.material.materialPlaceholder'),
      filters: [
        {
          key: 'materialType',
          type: 'select',
          placeholder: t('modules.pages.material.materialType'),
          options: materialTypeOptions,
        },
        {
          key: 'category',
          type: 'select',
          placeholder: t('modules.pages.material.category'),
          options: getMaterialCategoryOptions(),
        },
        {
          key: 'material',
          type: 'select',
          placeholder: t('modules.pages.material.material'),
          options: materialGradeOptions(),
        },
      ],
      columns: [
        {
          key: 'materialType',
          title: t('modules.pages.material.materialType'),
          width: 96,
        },
        {
          key: 'materialCode',
          title: t('modules.pages.material.materialCode'),
          width: 180,
        },
        {
          key: 'brand',
          title: t('modules.pages.material.brand'),
          width: 120,
        },
        {
          key: 'material',
          title: t('modules.pages.material.material'),
          width: 120,
        },
        {
          key: 'category',
          title: t('modules.pages.material.category'),
          width: 110,
        },
        {
          key: 'spec',
          title: t('modules.pages.material.spec'),
          width: 100,
        },
        {
          key: 'length',
          title: t('modules.pages.material.length'),
          width: 100,
        },
        {
          key: 'unit',
          title: t('modules.pages.material.unit'),
          width: 90,
        },
        {
          key: 'quantityUnit',
          title: t('modules.pages.material.qtyUnit'),
          width: 90,
        },
        {
          key: 'pieceWeightTon',
          title: t('modules.pages.material.pieceWeightTon'),
          width: 110,
          align: 'right',
        },
        {
          key: 'piecesPerBundle',
          title: t('modules.pages.material.pcsPerBundle'),
          width: 110,
          align: 'right',
        },
        {
          key: 'unitPrice',
          title: t('modules.pages.material.unitPrice'),
          width: 100,
          align: 'right',
        },
        {
          key: 'remark',
          title: t('modules.pages.material.remark'),
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
          key: 'materialType',
          label: t('modules.pages.material.materialType'),
        },
        {
          key: 'materialCode',
          label: t('modules.pages.material.materialCode'),
        },
        { key: 'brand', label: t('modules.pages.material.brand') },
        { key: 'material', label: t('modules.pages.material.material') },
        { key: 'category', label: t('modules.pages.material.category') },
        { key: 'spec', label: t('modules.pages.material.spec') },
        { key: 'length', label: t('modules.pages.material.length') },
        { key: 'unit', label: t('modules.pages.material.unit') },
        { key: 'quantityUnit', label: t('modules.pages.material.qtyUnit') },
        {
          key: 'pieceWeightTon',
          label: t('modules.pages.material.pieceWeightTon'),
        },
        {
          key: 'piecesPerBundle',
          label: t('modules.pages.material.pcsPerBundle'),
        },
        { key: 'unitPrice', label: t('modules.pages.material.unitPrice') },
        { key: 'remark', label: t('modules.pages.material.remark') },
      ],
      formFields: [
        {
          key: 'materialType',
          label: t('modules.pages.material.materialType'),
          type: 'select',
          required: true,
          defaultValue: '实体商品',
          options: materialTypeOptions,
        },
        {
          key: 'materialCode',
          label: t('modules.pages.material.materialCode'),
          type: 'input',
          disabled: true,
          placeholder: t('modules.editorWorkspace.autoGeneratedPlaceholder'),
        },
        {
          key: 'brand',
          label: t('modules.pages.material.brand'),
          type: 'input',
          required: true,
          visibleWhen: physicalVisibleWhen,
        },
        {
          key: 'material',
          label: t('modules.pages.material.material'),
          type: 'input',
          required: true,
          visibleWhen: physicalVisibleWhen,
        },
        {
          key: 'category',
          label: t('modules.pages.material.category'),
          type: 'select',
          required: true,
          options: getMaterialCategoryOptions(),
        },
        {
          key: 'spec',
          label: t('modules.pages.material.spec'),
          type: 'input',
          required: true,
          visibleWhen: physicalVisibleWhen,
        },
        {
          key: 'length',
          label: t('modules.pages.material.length'),
          type: 'input',
          required: true,
          visibleWhen: physicalVisibleWhen,
        },
        {
          key: 'unit',
          label: t('modules.pages.material.unit'),
          type: 'input',
          required: true,
        },
        {
          key: 'quantityUnit',
          label: t('modules.pages.material.qtyUnit'),
          type: 'input',
          required: true,
          visibleWhen: physicalVisibleWhen,
        },
        {
          key: 'pieceWeightTon',
          label: t('modules.pages.material.pieceWeightTon'),
          type: 'number',
          required: true,
          min: 0,
          precision: INTERNAL_WEIGHT_PRECISION,
          defaultValue: 0,
          visibleWhen: physicalVisibleWhen,
        },
        {
          key: 'piecesPerBundle',
          label: t('modules.pages.material.pcsPerBundle'),
          type: 'number',
          required: true,
          min: 0,
          precision: 0,
          defaultValue: 0,
          visibleWhen: physicalVisibleWhen,
        },
        {
          key: 'unitPrice',
          label: t('modules.pages.material.unitPrice'),
          type: 'number',
          required: true,
          min: 0,
          precision: 2,
          defaultValue: 0,
        },
        {
          key: 'remark',
          label: t('modules.pages.material.remark'),
          type: 'textarea',
          fullRow: true,
        },
      ],
      buildValues: (record) => ({
        materialType: asString(record?.materialType) || '实体商品',
        materialCode: asString(record?.materialCode),
        brand: asString(record?.brand),
        material: asString(record?.material),
        category: asString(record?.category),
        spec: asString(record?.spec),
        length: asString(record?.length),
        unit: asString(record?.unit),
        quantityUnit: asString(record?.quantityUnit),
        pieceWeightTon: Number(record?.pieceWeightTon ?? 0),
        piecesPerBundle: Number(record?.piecesPerBundle ?? 0),
        unitPrice: Number(record?.unitPrice ?? 0),
        remark: asString(record?.remark),
      }),
      buildRecord: (values, base) => ({
        ...(base ?? {}),
        materialType: values.materialType,
        materialCode: asString(values.materialCode),
        brand: values.brand ?? '',
        material: values.material ?? '',
        category: values.category ?? '',
        spec: values.spec ?? '',
        length: values.length ?? '',
        unit: values.unit ?? '',
        quantityUnit: values.quantityUnit ?? '',
        pieceWeightTon: Number(values.pieceWeightTon ?? 0),
        piecesPerBundle: Number(values.piecesPerBundle ?? 0),
        unitPrice: Number(values.unitPrice ?? 0),
        remark: values.remark ?? '',
      }),
    }
  }, [t])
  return <MasterDataListPage spec={spec} />
}
