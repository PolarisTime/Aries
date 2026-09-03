import type { ProjectOption } from '@/api/master/project-options'
import { getCustomerProjectOptions } from '@/module-system/core/module-option-resolvers'
import type { SearchParams } from '@/types/api-raw'
import type {
  ModuleFilterDefinition,
  ModuleFilterOption,
  ModuleFilterOptionEntry,
} from '@/types/module-page'

export function resolveFilterOptions(
  field: ModuleFilterDefinition,
  filters: SearchParams,
  projectOptions: readonly ProjectOption[],
): ModuleFilterOptionEntry[] {
  const rawOptions =
    typeof field.options === 'function'
      ? field.options === getCustomerProjectOptions
        ? getCustomerProjectOptions(filters, projectOptions)
        : field.options(filters)
      : field.options || []

  return rawOptions.map((option: ModuleFilterOptionEntry) => {
    if ('options' in option) {
      const group = option
      return {
        label: group.label,
        options: group.options.map((item: ModuleFilterOption) => ({
          label: item.label,
          value: item.value,
        })),
      }
    }

    const entry = option
    return {
      label: entry.label,
      value: entry.value,
    }
  })
}
