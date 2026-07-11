import type {
  ModuleFormFieldDefinition,
  ModuleRecordInput,
} from '@/types/module-page'

export function isModuleFormFieldVisible(
  field: ModuleFormFieldDefinition,
  form: ModuleRecordInput,
): boolean {
  return field.visibleWhen?.(form) ?? true
}
