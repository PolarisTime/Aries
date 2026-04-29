<script setup lang="ts">
type TableBinding = Record<string, unknown>
type TableRowHandler = {
  bivarianceHack(record: unknown): TableBinding
}['bivarianceHack']

withDefaults(defineProps<{
  visible: boolean
  title: string
  panelTitle: string
  hint?: string
  rows: unknown[]
  loading?: boolean
  rowSelection?: TableBinding
  pagination?: TableBinding | false
  emptyDescription: string
  cancelText?: string
  confirmText?: string
  confirmVisible?: boolean
  confirmDisabled?: boolean
  rowKey?: string
  customRow?: TableRowHandler | undefined
}>(), {
  hint: '',
  loading: false,
  rowSelection: undefined,
  pagination: () => ({ pageSize: 12, showSizeChanger: false }),
  cancelText: '取消',
  confirmText: '确认',
  confirmVisible: true,
  confirmDisabled: false,
  rowKey: 'id',
  customRow: undefined,
})

defineEmits<{
  cancel: []
  confirm: []
}>()
</script>

<template>
  <div v-if="visible" class="workspace-overlay">
    <div class="workspace-overlay-mask"></div>
    <section class="workspace-overlay-panel">
      <header class="workspace-overlay-header">
        <span class="workspace-overlay-title">{{ title }}</span>
        <div class="workspace-overlay-header-actions">
          <a-button class="overlay-action-button" @click="$emit('cancel')">{{ cancelText }}</a-button>
          <a-button
            v-if="confirmVisible"
            type="primary"
            class="overlay-action-button"
            :disabled="confirmDisabled"
            @click="$emit('confirm')"
          >
            {{ confirmText }}
          </a-button>
        </div>
      </header>

      <div class="workspace-overlay-body statement-generator-body">
        <div class="module-table-head">
          <div class="module-table-head-meta statement-generator-meta">
            <slot name="meta">
              <span class="module-table-head-title">{{ panelTitle }}</span>
              <span v-if="hint" class="parent-selector-hint">{{ hint }}</span>
            </slot>
          </div>
          <div class="module-table-head-summary statement-generator-summary">
            <slot name="summary"></slot>
          </div>
        </div>

        <div class="module-table-shell statement-generator-table-shell">
          <a-table
            size="small"
            bordered
            :row-key="rowKey"
            :data-source="rows"
            :loading="loading"
            :pagination="pagination"
            :row-selection="rowSelection"
            :custom-row="customRow"
          >
            <slot></slot>
            <template #emptyText>
              <a-empty :description="emptyDescription" />
            </template>
          </a-table>
        </div>
      </div>

      <footer v-if="!confirmVisible" class="workspace-overlay-footer">
        <a-button class="overlay-action-button" @click="$emit('cancel')">{{ cancelText }}</a-button>
      </footer>
    </section>
  </div>
</template>
