import { Space } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getMaterialCategoryOptions,
  materialGradeOptions,
} from '@/module-system/core/module-option-resolvers'
import { asString } from '@/utils/type-narrowing'
import { MaterialHistoryAction } from '@/views/modules/components/MaterialHistoryAction'
import { MaterialImportActions } from '@/views/modules/components/MaterialImportActions'
import { MasterDataListPage } from './MasterDataListPage'
import type { MasterDataPageSpec } from './master-data-types'
import { buildMaterialFormFields } from './material-page-fields'

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
      renderToolbarExtra: ({ refresh, selectedRecord }) => (
        <Space wrap>
          <MaterialImportActions
            onImported={() => {
              refresh()
              return Promise.resolve()
            }}
          />
          <MaterialHistoryAction
            selectedRecord={selectedRecord}
            onRolledBack={() => {
              refresh()
              return Promise.resolve()
            }}
          />
        </Space>
      ),
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
      formFields: buildMaterialFormFields(t, materialTypeOptions),
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
