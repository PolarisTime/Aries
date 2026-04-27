<script setup lang="ts">
import ColumnSettingsPopover from './ColumnSettingsPopover.vue'

interface ToolbarAction { label: string; type?: string; danger?: boolean }
interface SettingItem { key: string; title: string; visible: boolean }

defineProps<{
  title: string
  summary: string
  actions: ToolbarAction[]
  exportMenuItems: { label: string; key: string }[]
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
</script>

<template>
  <div class="module-table-head">
    <div class="module-table-head-title">{{ title }}</div>
    <div class="module-table-head-actions">
      <a-button v-if="isMaterialModule && canExport" @click="emit('materialTemplateDownload')">
        模板下载
      </a-button>
      <a-button v-if="isMaterialModule && canImport" @click="emit('materialImportClick')">
        导入
      </a-button>
      <template v-for="action in actions" :key="action.label">
        <a-dropdown
          v-if="action.label === '导出' && !isMaterialModule"
          :menu="{ items: exportMenuItems as any, onClick: (info: unknown) => emit('exportMenuClick', (info as { key: string }).key) }"
          trigger="click"
        >
          <a-button :loading="exportLoading">{{ action.label }}</a-button>
        </a-dropdown>
        <a-button
          v-else
          :type="(action.type as 'primary' | 'default' | 'dashed' | undefined)"
          :danger="action.danger"
          @click="emit('action', action.label)"
        >
          {{ action.label }}
        </a-button>
      </template>
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
