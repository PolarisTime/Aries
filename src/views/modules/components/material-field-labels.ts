const MATERIAL_FIELD_LABEL_KEYS: Record<string, string> = {
  materialCode: 'modules.pages.material.materialCode',
  brand: 'modules.pages.material.brand',
  material: 'modules.pages.material.material',
  category: 'modules.pages.material.category',
  spec: 'modules.pages.material.spec',
  length: 'modules.pages.material.length',
  unit: 'modules.pages.material.unit',
  quantityUnit: 'modules.pages.material.qtyUnit',
  pieceWeightTon: 'modules.pages.material.pieceWeightTon',
  piecesPerBundle: 'modules.pages.material.pcsPerBundle',
  unitPrice: 'modules.pages.material.unitPrice',
  remark: 'modules.pages.material.remark',
  materialType: 'modules.pages.material.materialType',
}

/**
 * 字段差异的展示标签：优先使用前端 i18n（保证中英文一致），
 * 未知字段回退到后端 label，再回退到字段名本身。
 */
export function resolveMaterialFieldLabel(
  field: string,
  fallbackLabel: string | null | undefined,
  t: (key: string) => string,
): string {
  const key = MATERIAL_FIELD_LABEL_KEYS[field]
  if (key) {
    return t(key)
  }
  return fallbackLabel?.trim() || field
}
