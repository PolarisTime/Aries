export type QueryValue = string | number | boolean | string[] | undefined

export interface ModuleEndpointConfig {
  path: string
  readOnly?: boolean
  supportsSearch?: boolean
  nativeFilterKeys?: string[]
  dateRangeMapping?: Record<string, { startKey: string; endKey: string }>
  sortByParam?: string
  sortDirectionParam?: string
  fieldsParam?: string
}
