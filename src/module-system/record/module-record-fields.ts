export interface ModuleEntityRecord {
  id?: string
}

export function readModuleRecordField(
  record: object | null | undefined,
  field: string,
): unknown {
  if (!record) {
    return undefined
  }
  return Object.getOwnPropertyDescriptor(record, field)?.value
}

export function hasModuleRecordItems(record: object): boolean {
  const items = readModuleRecordField(record, 'items')
  return Array.isArray(items) && items.length > 0
}
