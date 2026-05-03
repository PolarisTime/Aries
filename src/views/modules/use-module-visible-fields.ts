import { computed, type Ref } from 'vue'
import type {
  ModuleColumnDefinition,
  ModuleFormFieldDefinition,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { hasBehavior } from './module-behavior-registry'

type SettingItem = {
  key: string
  title: string
  visible: boolean
}

interface UseModuleVisibleFieldsOptions {
  moduleKey: Ref<string>
  config: Ref<ModulePageConfig>
  formFields: Ref<ModuleFormFieldDefinition[]>
  warehouseRows: Ref<ModuleRecord[]>
  departmentRows: Ref<ModuleRecord[]>
  editorForm: Record<string, unknown>
  showSnowflakeId: Ref<boolean>
  columnSettingItems: Ref<SettingItem[]>
  formFieldSettingItems: Ref<SettingItem[]>
  attachmentFeatureEnabled: Ref<boolean>
  canEditRecords: Ref<boolean>
  resolveSourceStatementField: (field: ModuleFormFieldDefinition) => ModuleFormFieldDefinition
}

const SNOWFLAKE_ID_COLUMN: ModuleColumnDefinition = {
  title: '雪花ID',
  dataIndex: 'id',
  width: 180,
  align: 'center',
}

function createWarehouseField(
  field: ModuleFormFieldDefinition,
  warehouseRows: ModuleRecord[],
): ModuleFormFieldDefinition {
  return {
    ...field,
    options: warehouseRows.map((warehouse) => ({
      label: String(warehouse.warehouseName || ''),
      value: String(warehouse.warehouseName || ''),
    })),
  }
}

function createDepartmentParentField(
  field: ModuleFormFieldDefinition,
  departmentRows: ModuleRecord[],
  currentDepartmentId: string,
): ModuleFormFieldDefinition {
  return {
    ...field,
    type: 'select',
    options: departmentRows
      .filter((department) =>
        String(department.status || '') === '正常'
        && String(department.id || '') !== currentDepartmentId,
      )
      .map((department) => ({
        label: String(department.departmentName || department.departmentCode || ''),
        value: Number(department.id),
      })),
  }
}

export function useModuleVisibleFields(options: UseModuleVisibleFieldsOptions) {
  const rawColumnMetaMap = computed<Record<string, ModuleColumnDefinition>>(() =>
    Object.fromEntries(options.config.value.columns.map((column) => [column.dataIndex, column])),
  )

  const rawFormFieldMetaMap = computed<Record<string, ModuleFormFieldDefinition>>(() =>
    Object.fromEntries(options.formFields.value.map((field) => {
      if (field.key === 'warehouseName' && field.type === 'select') {
        return [field.key, createWarehouseField(field, options.warehouseRows.value)]
      }

      if (hasBehavior(options.moduleKey.value, 'isSettingsModule') && field.key === 'parentId') {
        const currentDepartmentId = String(options.editorForm.id || '')
        return [field.key, createDepartmentParentField(field, options.departmentRows.value, currentDepartmentId)]
      }

      if (field.key === 'sourceStatementId') {
        return [field.key, options.resolveSourceStatementField(field)]
      }

      return [field.key, field]
    })),
  )

  const canManageAttachments = computed(() =>
    options.canEditRecords.value && options.attachmentFeatureEnabled.value,
  )

  const visibleConfigColumns = computed(() =>
    [
      ...(options.showSnowflakeId.value ? [SNOWFLAKE_ID_COLUMN] : []),
      ...options.columnSettingItems.value
        .filter((item) => item.visible)
        .map((item) => rawColumnMetaMap.value[item.key])
        .filter(Boolean),
    ],
  )

  const columnMetaMap = computed<Record<string, ModuleColumnDefinition>>(() =>
    Object.fromEntries(visibleConfigColumns.value.map((column) => [column.dataIndex, column])),
  )

  const visibleFormFields = computed(() =>
    options.formFieldSettingItems.value
      .filter((item) => item.visible)
      .map((item) => rawFormFieldMetaMap.value[item.key])
      .filter(Boolean),
  )

  return {
    canManageAttachments,
    columnMetaMap,
    visibleConfigColumns,
    visibleFormFields,
  }
}
