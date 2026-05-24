export interface ListColumnSettings {
  orderedKeys: string[]
  hiddenKeys: string[]
}

export interface UserColumnSettingsPayload {
  pages: Record<string, ListColumnSettings>
}
