export interface ListColumnSettings {
  orderedKeys: string[]
  hiddenKeys: string[]
  /** 用户调整后的列宽（key 为列 dataIndex/key），缺省表示未调整过，兼容旧数据 */
  columnSizes?: Record<string, number>
}

export interface UserColumnSettingsPayload {
  pages: Record<string, ListColumnSettings>
}
