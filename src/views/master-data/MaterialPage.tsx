import { Space } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useMasterOptions } from '@/hooks/useMasterOptions'
import { asString } from '@/utils/type-narrowing'
import { MaterialHistoryAction } from '@/views/modules/components/MaterialHistoryAction'
import { MaterialImportActions } from '@/views/modules/components/MaterialImportActions'
import { MasterDataListPage } from './MasterDataListPage'
import type { MasterDataPageSpec } from './master-data-types'
import { buildMaterialFormFields } from './material-page-fields'

export function MaterialPage() {
  const { t } = useTranslation()
  /*
   * 材质 / 类别筛选的选项来自主数据接口（后端 SELECT DISTINCT material），**必须在这里
   * 真正发起加载**：MasterFilterSpec.options 只接受数组，而 resolver 是「读 React Query
   * 缓存」的函数，此前写成 `materialGradeOptions()` 立即调用——缓存必然为空，于是永远返回
   * 硬编码兜底 ['HRB400','HRB500']，筛选下拉只有两项；同时因为传的是数组而非函数引用，
   * 主数据需求标记丢失，接口一次都不会被请求，修好加载也不会刷新。
   */
  const { materialCategories, materialGrades } = useMasterOptions({
    materialCategories: true,
    materialGrades: true,
  })
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
          options: materialCategories,
        },
        {
          key: 'material',
          type: 'select',
          placeholder: t('modules.pages.material.material'),
          options: materialGrades,
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
      formFields: buildMaterialFormFields(
        t,
        materialTypeOptions,
        materialCategories,
      ),
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
  }, [t, materialCategories, materialGrades])
  return <MasterDataListPage spec={spec} />
}
