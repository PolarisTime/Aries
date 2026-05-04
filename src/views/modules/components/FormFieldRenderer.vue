<script setup lang="ts">
import type { Dayjs } from 'dayjs'
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ModuleFormFieldDefinition } from '@/types/module-page'

type TextModelValue = string | number | undefined
type RoleTreeCheckedKeys =
  | Array<string | number>
  | { checked: Array<string | number>; halfChecked?: Array<string | number> }

interface RoleTreeNode {
  title: string
  key: string
  children?: RoleTreeNode[]
}

const props = defineProps<{
  field: ModuleFormFieldDefinition
  fieldId: string
  form: Record<string, unknown>
  disabled: boolean
  dateValue?: Dayjs
  roleTreeField: boolean
  checkedRoleNames: string[]
  roleTreeData: RoleTreeNode[]
  selectedRolePermissionLabels: string[]
}>()

import { computed } from 'vue'

const resolvedOptions = computed(() => {
  if (!props.field.options) return []
  return typeof props.field.options === 'function' ? props.field.options(props.form) : props.field.options
})

const resolvedAutoCompleteOptions = computed(() => resolvedOptions.value.map((option) => ({
  label: option.label,
  value: String(option.value),
})))

const emit = defineEmits<{
  'update-value': [key: string, value: unknown]
  'date-change': [key: string, value: unknown]
  'role-tree-check': [checkedKeys: RoleTreeCheckedKeys]
}>()

function getTextModelValue(source: Record<string, unknown>, key: string): TextModelValue {
  const value = source[key]
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }
  if (typeof value === 'boolean') {
    return String(value)
  }
  return undefined
}

function getSelectModelValue(source: Record<string, unknown>, key: string): SelectValue {
  const value = source[key]
  if (Array.isArray(value)) {
    return value.filter((item): item is string | number | boolean =>
      typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean',
    ) as SelectValue
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === undefined) {
    return value as SelectValue
  }
  return undefined
}

function getNumberModelValue(source: Record<string, unknown>, key: string) {
  const value = source[key]
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? undefined : parsed
  }
  return undefined
}
</script>

<template>
  <a-form-item
    :label="field.label"
    :html-for="fieldId"
    :required="field.required"
  >
    <a-input
      v-if="field.type === 'input'"
      :id="fieldId"
      :value="getTextModelValue(form, field.key)"
      :name="field.key"
      style="width: 100%"
      :disabled="disabled"
      :placeholder="field.placeholder || `请输入${field.label}`"
      @update:value="(value) => emit('update-value', field.key, value)"
    />
    <a-select
      v-else-if="field.type === 'select'"
      :id="fieldId"
      :value="getSelectModelValue(form, field.key)"
      :allow-clear="field.allowClear || !field.required"
      style="width: 100%"
      :disabled="disabled"
      :placeholder="field.placeholder || `请选择${field.label}`"
      @update:value="(value) => emit('update-value', field.key, value)"
    >
      <a-select-option
        v-for="option in resolvedOptions"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </a-select-option>
    </a-select>
    <a-auto-complete
      v-else-if="field.type === 'autoComplete'"
      :id="fieldId"
      :value="getTextModelValue(form, field.key)"
      :options="resolvedAutoCompleteOptions"
      :allow-clear="field.allowClear || !field.required"
      style="width: 100%"
      :disabled="disabled"
      :placeholder="field.placeholder || `请输入或选择${field.label}`"
      @update:value="(value) => emit('update-value', field.key, value)"
    />
    <div
      v-else-if="roleTreeField"
      :id="fieldId"
      class="rbac-tree-field"
    >
      <div class="rbac-tree-field-meta">
        <span>已选 {{ checkedRoleNames.length }} 项</span>
        <span class="rbac-tree-field-hint">按角色类型分组勾选</span>
      </div>
      <a-tree
        checkable
        block-node
        default-expand-all
        :checked-keys="checkedRoleNames"
        :tree-data="roleTreeData"
        @check="emit('role-tree-check', $event)"
      />
      <div v-if="selectedRolePermissionLabels.length" class="rbac-tree-field-summary">
        自动汇总权限：{{ selectedRolePermissionLabels.join('、') }}
      </div>
    </div>
    <a-select
      v-else-if="field.type === 'multiSelect'"
      :id="fieldId"
      :value="getSelectModelValue(form, field.key)"
      mode="multiple"
      :disabled="disabled"
      :placeholder="field.placeholder || `请选择${field.label}`"
      @update:value="(value) => emit('update-value', field.key, value)"
    >
      <a-select-option
        v-for="option in resolvedOptions"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </a-select-option>
    </a-select>
    <a-date-picker
      v-else-if="field.type === 'date'"
      :id="fieldId"
      style="width: 100%"
      format="YYYY-MM-DD"
      :disabled="disabled"
      :value="dateValue"
      @change="emit('date-change', field.key, $event)"
    />
    <a-input-number
      v-else-if="field.type === 'number'"
      :id="fieldId"
      :value="getNumberModelValue(form, field.key)"
      :name="field.key"
      style="width: 100%"
      :disabled="disabled"
      :min="field.min"
      :precision="field.precision"
      :placeholder="field.placeholder || `请输入${field.label}`"
      @update:value="(value) => emit('update-value', field.key, value)"
    />
    <a-textarea
      v-else
      :id="fieldId"
      :value="getTextModelValue(form, field.key)"
      :name="field.key"
      :rows="3"
      :disabled="disabled"
      :placeholder="field.placeholder || `请输入${field.label}`"
      @update:value="(value) => emit('update-value', field.key, value)"
    />
  </a-form-item>
</template>
