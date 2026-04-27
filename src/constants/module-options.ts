function createOptionList(values: readonly string[]) {
  return values.map((value) => ({ label: value, value }))
}

export const materialCategoryValues = ['螺纹钢', '盘螺', '线材'] as const
export const materialCategoryOptions = createOptionList(materialCategoryValues)

export const materialGradeValues = ['HRB400', 'HRB500'] as const
export const materialGradeOptions = createOptionList(materialGradeValues)

export const supplierValues = ['江苏沙钢', '中天钢铁', '永锋钢铁'] as const
export const supplierOptions = createOptionList(supplierValues)

export const customerValues = ['中建八局', '上海城建', '中铁建工'] as const
export const customerOptions = createOptionList(customerValues)

export const carrierValues = ['中外运华东', '申通大件', '德邦钢材专线'] as const
export const carrierOptions = createOptionList(carrierValues)

export const warehouseValues = ['一号库', '二号库'] as const
export const warehouseOptions = createOptionList(warehouseValues)

export const enabledStatusValues = ['正常', '禁用'] as const
export const enabledStatusOptions = createOptionList(enabledStatusValues)

export const statementStatusValues = ['待确认', '已确认'] as const
export const statementStatusOptions = createOptionList(statementStatusValues)

export const userAccountDataScopeValues = ['全部数据', '全部', '本部门', '本人'] as const
export const userAccountDataScopeOptions = createOptionList(userAccountDataScopeValues)

export const flexibleUserAccountDataScopeValues = ['全部数据', '全部', '本部门', '本人'] as const
export const roleDataScopeValues = ['全部数据', '全部', '本部门', '本人'] as const
export const roleDataScopeOptions = createOptionList(roleDataScopeValues)

export const roleTypeValues = ['平台角色', '系统角色', '业务角色', '财务角色'] as const
export const roleTypeOptions = createOptionList(roleTypeValues)

export function buildValueOptions(...values: string[]) {
  return createOptionList(values)
}
