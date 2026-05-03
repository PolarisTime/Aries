import dayjs, { type Dayjs } from 'dayjs'

type RoleTreeCheckedKeys =
  | Array<string | number>
  | { checked: Array<string | number>; halfChecked?: Array<string | number> }

interface UseModuleEditorEventsOptions {
  handleRoleTreeCheck: (checkedKeys: RoleTreeCheckedKeys) => void
  handleEditorDateChange: (key: string, value: Dayjs | null) => void
}

export function useModuleEditorEvents(options: UseModuleEditorEventsOptions) {
  function handleRoleTreeCheckChange(checkedKeys: RoleTreeCheckedKeys) {
    options.handleRoleTreeCheck(checkedKeys)
  }

  function handleEditorDateValueChange(key: string, value: unknown) {
    if (value === null || dayjs.isDayjs(value)) {
      options.handleEditorDateChange(key, value)
    }
  }

  return {
    handleEditorDateValueChange,
    handleRoleTreeCheckChange,
  }
}
