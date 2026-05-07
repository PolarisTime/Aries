<script setup lang="ts">
import type { PrintTemplateRecord } from '@/types/print-template'

interface Props {
  templates: PrintTemplateRecord[]
  activeId?: string
  loading: boolean
  summary: string
  billTypeOptions: Array<{ value: string; label: string }>
  billTypeMap: Record<string, string>
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canMaintainContent: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [record: PrintTemplateRecord]
  create: []
  delete: [record: PrintTemplateRecord]
  refresh: []
  'update:selectedBillType': [value: string]
  'update:templateKeyword': [value: string]
}>()

const selectedBillType = defineModel<string>('selectedBillType', { default: '' })
const templateKeyword = defineModel<string>('templateKeyword', { default: '' })
</script>

<template>
  <a-card
    :bordered="false"
    class="module-panel-card print-template-library"
  >
    <template #title>
      <div class="library-title">
        <div>
          <div class="library-title-main">模板库</div>
          <div class="library-title-sub">按业务页面管理默认打印模板</div>
        </div>
        <a-tag color="blue">{{ summary }}</a-tag>
      </div>
    </template>

    <div class="library-toolbar">
      <span class="toolbar-label">适用页面</span>
      <a-select v-model:value="selectedBillType" style="width: 100%">
        <a-select-option
          v-for="item in billTypeOptions"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
        </a-select-option>
      </a-select>
      <a-input
        v-model:value="templateKeyword"
        allow-clear
        placeholder="筛选模板名称"
      />
      <div class="library-toolbar-actions">
        <a-button
          v-if="canCreate"
          type="primary"
          block
          @click="emit('create')"
        >
          新增模板
        </a-button>
        <slot name="upload-button" />
        <a-button block @click="emit('refresh')">刷新</a-button>
      </div>
    </div>

    <a-spin :spinning="loading">
      <div v-if="templates.length" class="library-list">
        <div
          v-for="record in templates"
          :key="record.id"
          class="template-card"
          :class="{
            'template-card-active': String(record.id) === activeId,
          }"
          role="button"
          tabindex="0"
          @click="emit('select', record)"
          @keydown.enter.prevent="emit('select', record)"
          @keydown.space.prevent="emit('select', record)"
        >
          <div class="template-card-head">
            <div class="template-card-name">{{ record.templateName }}</div>
            <a-tag :color="record.isDefault === '1' ? 'blue' : 'default'">
              {{ record.isDefault === '1' ? '默认' : '普通' }}
            </a-tag>
          </div>
          <div class="template-card-meta">
            <span>{{ billTypeMap[record.billType || selectedBillType] || record.billType || '--' }}</span>
            <span>{{ record.updateTime || '--' }}</span>
          </div>
          <div class="template-card-actions">
            <a-button
              v-if="canEdit"
              type="link"
              size="small"
              @click.stop="emit('select', record)"
            >
              编辑
            </a-button>
            <a-button
              v-if="canDelete"
              type="link"
              danger
              size="small"
              @click.stop="emit('delete', record)"
            >
              删除
            </a-button>
            <span v-if="!canEdit && !canDelete" class="template-card-empty">--</span>
          </div>
        </div>
      </div>
      <a-empty
        v-else
        description="当前页面还没有模板，右侧可直接从骨架开始编辑"
      />
    </a-spin>
  </a-card>
</template>

<style scoped>
.library-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.library-title > div {
  min-width: 0;
}

.library-title-main {
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
}

.library-title-sub {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.library-toolbar {
  display: grid;
  gap: 12px;
}

.toolbar-label {
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.library-toolbar-actions {
  display: grid;
  gap: 8px;
}

.library-list {
  display: grid;
  gap: 10px;
  margin-top: 16px;
  padding-right: 2px;
}

.template-card {
  width: 100%;
  padding: 14px;
  border: 1px solid #dbe4ee;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.template-card:hover,
.template-card-active {
  border-color: #1677ff;
  box-shadow: 0 10px 24px rgba(22, 119, 255, 0.12);
  transform: translateY(-1px);
}

.template-card-head,
.template-card-meta,
.template-card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.template-card-name {
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
}

.template-card-meta {
  margin-top: 8px;
  color: #64748b;
  font-size: 12px;
}

.template-card-actions {
  margin-top: 10px;
  min-height: 24px;
}

.template-card-empty {
  color: #94a3b8;
  font-size: 12px;
}
</style>
