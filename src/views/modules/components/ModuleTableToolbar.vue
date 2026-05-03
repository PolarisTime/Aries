<script setup lang="ts">
import { computed } from 'vue'
import type { MenuProps } from 'ant-design-vue'
import ColumnSettingsPopover from './ColumnSettingsPopover.vue'

interface ToolbarAction { label: string; type?: string; danger?: boolean; disabled?: boolean; loading?: boolean }
interface SettingItem { key: string; title: string; visible: boolean }
type ExportMenuItems = NonNullable<MenuProps['items']>

const props = defineProps<{
  title: string
  summary: string
  actions: ToolbarAction[]
  exportMenuItems: ExportMenuItems
  exportLoading: boolean
  isMaterialModule: boolean
  canExport: boolean
  canImport: boolean
  columnSettingItems: SettingItem[]
  getColumnSettingItemClass: (key: string) => string
  handleColumnSettingDragStart: (key: string, event: DragEvent) => void
  handleColumnSettingDragOver: (key: string, event: DragEvent) => void
  handleColumnSettingDrop: (key: string) => void
  resetListColumnSettingDragState: () => void
  handleColumnVisibleChange: (key: string, checked: boolean) => void
  resetColumnSettings: () => void
}>()

const emit = defineEmits<{
  action: [label: string]
  exportMenuClick: [key: string]
  materialTemplateDownload: []
  materialImportClick: []
}>()

function handleExportMenuClick(info: { key: string | number }) {
  emit('exportMenuClick', String(info.key))
}

const exportDropdownMenu = computed<MenuProps>(() => ({
  items: props.exportMenuItems,
  onClick: handleExportMenuClick,
}))
</script>

<template>
  <div class="module-table-head">
    <div class="module-table-head-title">{{ title }}</div>
    <div class="module-table-head-actions">
      <template v-for="action in actions" :key="action.label">
        <a-dropdown
          v-if="action.label === '导出' && !isMaterialModule"
          :menu="exportDropdownMenu"
          trigger="click"
        >
          <a-button :loading="exportLoading" :disabled="action.disabled">{{ action.label }}</a-button>
        </a-dropdown>
        <a-button
          v-else
          :type="(action.type as 'primary' | 'default' | 'dashed' | undefined)"
          :danger="action.danger"
          :disabled="action.disabled"
          :loading="action.loading"
          @click="emit('action', action.label)"
        >
          {{ action.label }}
        </a-button>
      </template>
      <a-button v-if="isMaterialModule && canExport" @click="emit('materialTemplateDownload')">
        模板下载
      </a-button>
      <a-button v-if="isMaterialModule && canImport" @click="emit('materialImportClick')">
        导入
      </a-button>
      <ColumnSettingsPopover
        label="列设置"
        :items="columnSettingItems"
        :get-item-class="getColumnSettingItemClass"
        :on-drag-start="handleColumnSettingDragStart"
        :on-drag-over="handleColumnSettingDragOver"
        :on-drop="handleColumnSettingDrop"
        :on-drag-end="resetListColumnSettingDragState"
        :on-visible-change="handleColumnVisibleChange"
        :on-reset="resetColumnSettings"
      />
    </div>
    <div class="module-table-head-summary">{{ summary }}</div>
  </div>
</template>
