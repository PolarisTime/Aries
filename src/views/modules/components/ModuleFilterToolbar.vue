<script setup lang="ts">
import dayjs, { type Dayjs } from 'dayjs'
import type { SelectValue } from 'ant-design-vue/es/select'
import type {
  ModuleFilterDefinition,
  ModuleFilterOptionEntry,
  ModuleFilterOptionGroup,
  ModuleQuickFilterDefinition,
} from '@/types/module-page'

type TextModelValue = string | number | undefined
type DateRangeModelValue = [Dayjs, Dayjs] | undefined

const props = defineProps<{
  moduleKey: string
  filters: Record<string, unknown>
  visibleFilters: ModuleFilterDefinition[]
  quickFilters: ModuleQuickFilterDefinition[]
  activeQuickFilterKey: string
  hasAdvancedFilters: boolean
  expanded: boolean
}>()

const emit = defineEmits<{
  'apply-quick-filter': [filterPreset: ModuleQuickFilterDefinition]
  'update-filter': [key: string, value: unknown]
  'filter-change': []
  'update:expanded': [value: boolean]
  search: []
  reset: []
}>()

function getFilterFieldId(fieldKey: string) {
  return `filter-field-${props.moduleKey}-${fieldKey}`
}

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

function getDateRangeModelValue(source: Record<string, unknown>, key: string): DateRangeModelValue {
  const value = source[key]
  if (Array.isArray(value) && value.length === 2 && dayjs.isDayjs(value[0]) && dayjs.isDayjs(value[1])) {
    return [value[0], value[1]]
  }
  return undefined
}

function resolveFilterOptions(filter: ModuleFilterDefinition) {
  if (!filter.options) {
    return []
  }
  return typeof filter.options === 'function'
    ? filter.options(props.filters)
    : filter.options
}

function isFilterOptionGroup(option: ModuleFilterOptionEntry): option is ModuleFilterOptionGroup {
  return 'options' in option
}
</script>

<template>
  <div class="table-page-search-wrapper">
    <div
      v-if="quickFilters.length"
      style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;"
    >
      <span style="color: rgba(0, 0, 0, 0.45);">快捷筛选</span>
      <a-button
        v-for="filterPreset in quickFilters"
        :key="filterPreset.key"
        size="small"
        :type="activeQuickFilterKey === filterPreset.key ? 'primary' : 'default'"
        @click="emit('apply-quick-filter', filterPreset)"
      >
        {{ filterPreset.label }}
      </a-button>
    </div>
    <a-form :model="filters" layout="inline" @submit.prevent="emit('search')">
      <div class="filter-inline-group">
        <a-form-item
          v-for="filter in visibleFilters"
          :key="filter.key"
          :label="filter.label"
          :html-for="getFilterFieldId(filter.key)"
        >
          <a-input
            v-if="filter.type === 'input'"
            :id="getFilterFieldId(filter.key)"
            :value="getTextModelValue(filters, filter.key)"
            :name="filter.key"
            :placeholder="filter.placeholder"
            allow-clear
            @update:value="emit('update-filter', filter.key, $event)"
            @press-enter="emit('search')"
          />
          <a-select
            v-else-if="filter.type === 'select'"
            :id="getFilterFieldId(filter.key)"
            :value="getSelectModelValue(filters, filter.key)"
            allow-clear
            :placeholder="filter.placeholder || `请选择${filter.label}`"
            @update:value="emit('update-filter', filter.key, $event)"
            @change="emit('filter-change')"
          >
            <template
              v-for="option in resolveFilterOptions(filter)"
              :key="isFilterOptionGroup(option) ? option.label : option.value"
            >
              <a-select-opt-group
                v-if="isFilterOptionGroup(option)"
                :label="option.label"
              >
                <a-select-option
                  v-for="groupOption in option.options"
                  :key="groupOption.value"
                  :value="groupOption.value"
                >
                  {{ groupOption.label }}
                </a-select-option>
              </a-select-opt-group>
              <a-select-option
                v-else
                :value="option.value"
              >
                {{ option.label }}
              </a-select-option>
            </template>
          </a-select>
          <a-range-picker
            v-else
            :id="getFilterFieldId(filter.key)"
            :value="getDateRangeModelValue(filters, filter.key)"
            format="YYYY-MM-DD"
            :placeholder="['开始时间', '结束时间']"
            @update:value="(value) => emit('update-filter', filter.key, value)"
          />
        </a-form-item>
        <div class="table-page-search-submitButtons">
          <a-button type="primary" @click="emit('search')">查询</a-button>
          <a-button style="margin-left: 8px" @click="emit('reset')">重置</a-button>
          <a
            v-if="hasAdvancedFilters"
            style="margin-left: 8px"
            @click="emit('update:expanded', !expanded)"
          >
            {{ expanded ? '收起' : '展开' }}
          </a>
        </div>
      </div>
    </a-form>
  </div>
</template>
