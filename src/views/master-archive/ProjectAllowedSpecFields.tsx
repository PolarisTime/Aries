import { useQuery } from '@tanstack/react-query'
import type { FormInstance } from 'antd'
import { Col, Form, Select } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchMaterialGrades } from '@/api/master/material-grades'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_MASTER_OPTIONS } from '@/constants/query-policies'
import { useMaterialBrands } from '@/hooks/useMaterialBrands'
import { asString } from '@/utils/type-narrowing'
import type { ProjectEditorValues } from './ProjectEditorOverlay'

/**
 * 下拉选项与已保存值的并集: 项目已配置的品牌/材质可能已从商品主数据中移除,
 * 直接按主数据选项渲染会让这些值在编辑态「消失」(保存后即被静默清空)。
 */
function mergeSelectedOptions(
  options: Array<{ label: string; value: string }>,
  selected: readonly string[] | undefined,
) {
  const known = new Set(options.map((option) => option.value))
  const missing = (selected ?? [])
    .map((value) => asString(value).trim())
    .filter((value) => value && !known.has(value))
    .map((value) => ({ label: value, value }))
  return missing.length ? [...options, ...missing] : options
}

/**
 * 项目「允许品牌/允许材质 + 处理方式」四个字段。
 *
 * <p>单独成组件有两个原因: 一是它自带数据依赖(品牌取商品资料去重、材质取商品资料牌号),
 * 二是项目编辑器本身已接近可读性上限, 把这组字段抽出来避免继续膨胀。</p>
 *
 * <p>列宽按预期输入给(NN/g 表单建议: 输入框宽度应与内容相称): 品牌/材质是多选下拉, 给 8 列;
 * 处理方式只有三个固定档位, 给 4 列即够, 两个「处理方式」紧跟在各自的多选之后成对出现。</p>
 */
export function ProjectAllowedSpecFields({
  form,
}: {
  form: FormInstance<ProjectEditorValues>
}) {
  const { t } = useTranslation()
  // 允许品牌来自商品资料去重; 允许材质复用商品资料的「材质」选项, 与明细材质取值同源。
  const materialBrands = useMaterialBrands()
  const materialGradeQuery = useQuery({
    queryKey: QUERY_KEYS.masterOptions.materialGrades,
    queryFn: () => fetchMaterialGrades(),
    staleTime: STALE_MASTER_OPTIONS,
  })
  const enforcementOptions = useMemo(
    () => [
      { label: t('modules.pages.project.scopeEnforcementWarn'), value: 'WARN' },
      {
        label: t('modules.pages.project.scopeEnforcementBlock'),
        value: 'BLOCK',
      },
      { label: t('modules.pages.project.scopeEnforcementOff'), value: 'OFF' },
    ],
    [t],
  )
  const selectedBrands = Form.useWatch('allowedBrands', form)
  const selectedMaterials = Form.useWatch('allowedMaterials', form)
  const brandOptions = useMemo(
    () =>
      mergeSelectedOptions(
        materialBrands.map((brand) => ({ label: brand, value: brand })),
        selectedBrands,
      ),
    [materialBrands, selectedBrands],
  )
  const materialOptions = useMemo(
    () =>
      mergeSelectedOptions(
        (materialGradeQuery.data ?? []).map((option) => ({
          label: option.label,
          value: String(option.value),
        })),
        selectedMaterials,
      ),
    [materialGradeQuery.data, selectedMaterials],
  )

  return (
    <>
      <Col span={8}>
        <Form.Item
          name="allowedBrands"
          label={t('modules.pages.project.allowedBrands')}
          tooltip={t('modules.pages.project.allowedSpecHint')}
          extra={t('modules.pages.project.allowedSpecHint')}
        >
          <Select
            allowClear
            maxTagCount="responsive"
            mode="multiple"
            options={brandOptions}
            placeholder={t('modules.pages.project.allowedSpecPlaceholder')}
            showSearch={{ optionFilterProp: 'label' }}
          />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item
          name="allowedBrandSeverity"
          label={t('modules.pages.project.scopeEnforcement')}
          tooltip={t('modules.pages.project.scopeEnforcementHint')}
          extra={t('modules.pages.project.scopeEnforcementHint')}
        >
          <Select options={enforcementOptions} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item
          name="allowedMaterials"
          label={t('modules.pages.project.allowedMaterials')}
          tooltip={t('modules.pages.project.allowedSpecHint')}
          extra={t('modules.pages.project.allowedSpecHint')}
        >
          <Select
            allowClear
            maxTagCount="responsive"
            mode="multiple"
            options={materialOptions}
            placeholder={t('modules.pages.project.allowedSpecPlaceholder')}
            showSearch={{ optionFilterProp: 'label' }}
          />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item
          name="allowedMaterialSeverity"
          label={t('modules.pages.project.scopeEnforcement')}
          tooltip={t('modules.pages.project.scopeEnforcementHint')}
          extra={t('modules.pages.project.scopeEnforcementHint')}
        >
          <Select options={enforcementOptions} />
        </Form.Item>
      </Col>
    </>
  )
}
