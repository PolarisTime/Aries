<script setup lang="ts">
import type { Table } from '@tanstack/vue-table'
import DataTable from '@/components/DataTable.vue'

const UPLOAD_RULE_DEFAULT_TITLE = '页面上传命名规则'

defineProps<{
  loading: boolean
  form: Record<string, unknown>
  table: Table<Record<string, unknown>>
  saving: boolean
  canEdit: boolean
}>()

const emit = defineEmits<{
  close: []
  save: []
}>()
</script>

<template>
  <a-spin :spinning="loading">
    <div class="editor-items-head upload-rule-section-head">
      <div class="editor-items-title-block">
        <h3 class="detail-section-title">{{ form.ruleName || UPLOAD_RULE_DEFAULT_TITLE }}</h3>
        <span class="parent-selector-hint">{ext} 为扩展名本体，不带点号；系统会自动补齐最终文件后缀</span>
      </div>
    </div>
    <DataTable
      :table="table"
      size="small"
      :scroll-x="980"
      class="module-detail-table upload-rule-config-table"
    />
    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
      <a-button @click="emit('close')">收起</a-button>
      <a-button
        v-if="canEdit"
        type="primary"
        :loading="saving"
        @click="emit('save')"
      >
        保存
      </a-button>
    </div>
  </a-spin>
</template>
