import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

/** 商品下拉选项：展示字段来自主数据快照，value 为商品主键字符串。 */
export interface MaterialSelectOption {
  disabled?: boolean
  label: string
  value: string
  code: string
  brand: string
  material: string
  category: string
  spec: string
  length: string
}

function readTrimmedText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** 商品行快照回显标签：品牌（或名称）| 类别 | 材质 | 规格 | 长度。 */
export function buildMaterialSnapshotLabel(record: ModuleRecord): string {
  const materialName = readTrimmedText(record.materialName)
  return [
    asString(record.brand).trim() || materialName,
    asString(record.category).trim(),
    asString(record.material).trim(),
    asString(record.spec).trim(),
    asString(record.length).trim(),
  ]
    .filter(Boolean)
    .join(' | ')
}

/**
 * 合并商品来源集合：远程搜索结果优先，本地预加载兜底，按商品主键去重。
 * 本地预加载只有首页 200 条，搜索结果必须与本地选项合并，
 * 才能在保留拼音等本地过滤语义的同时覆盖完整商品主数据。
 */
export function mergeMaterialRecords(
  primary: ModuleRecord[],
  fallback: ModuleRecord[],
): ModuleRecord[] {
  const seen = new Set<string>()
  const merged: ModuleRecord[] = []

  for (const record of [...primary, ...fallback]) {
    const materialId = asString(record.id).trim()
    if (!materialId || seen.has(materialId)) {
      continue
    }
    seen.add(materialId)
    merged.push(record)
  }

  return merged
}

/** 主数据记录转下拉选项：缺少主键或商品编码的脏数据不进入候选。 */
export function buildMaterialSelectOptions(
  records: ModuleRecord[],
): MaterialSelectOption[] {
  const seen = new Set<string>()

  return records.flatMap((record): MaterialSelectOption[] => {
    const materialId = asString(record.id).trim()
    const materialCode = asString(record.materialCode).trim()
    if (!materialId || !materialCode || seen.has(materialId)) {
      return []
    }
    seen.add(materialId)

    return [
      {
        label: buildMaterialSnapshotLabel(record),
        code: materialCode,
        brand: asString(record.brand).trim(),
        material: asString(record.material).trim(),
        category: asString(record.category).trim(),
        spec: asString(record.spec).trim(),
        length: asString(record.length).trim(),
        value: materialId,
      },
    ]
  })
}

/** 当前行已选商品不在候选集合时，补一个禁用选项用于回显历史快照。 */
export function withCurrentMaterialOption(
  materialOptions: MaterialSelectOption[],
  record: ModuleLineItem,
): MaterialSelectOption[] {
  const materialId = asString(record.materialId).trim()
  if (!materialId) {
    return materialOptions
  }
  if (materialOptions.some((option) => option.value === materialId)) {
    return materialOptions
  }

  const materialCode = asString(record.materialCode).trim()
  const label = buildMaterialSnapshotLabel(record) || materialCode
  if (!label) {
    return materialOptions
  }

  return [
    {
      disabled: true,
      label,
      code: materialCode,
      brand: asString(record.brand).trim(),
      material: asString(record.material).trim(),
      category: asString(record.category).trim(),
      spec: asString(record.spec).trim(),
      length: asString(record.length).trim(),
      value: materialId,
    },
    ...materialOptions,
  ]
}
