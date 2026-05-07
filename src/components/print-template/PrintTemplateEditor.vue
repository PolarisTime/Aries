<script setup lang="ts">
import type { PrintTemplateRecord } from '@/types/print-template'

interface EditorFormModel {
  id?: string
  billType: string
  templateName: string
  templateHtml: string
  isDefault: boolean
}

interface Props {
  billTypeOptions: Array<{ value: string; label: string }>
  billTypeMap: Record<string, string>
  templateKind: string
  previewHint: string
  selectedRecord?: PrintTemplateRecord
  canSave: boolean
  canMaintainContent: boolean
  saving: boolean
  canCreate: boolean
}

defineProps<Props>()
const editorForm = defineModel<EditorFormModel>('editorForm', { required: true })

const emit = defineEmits<{
  save: []
  copy: []
  reset: []
  'use-starter': []
  'update:templateTextareaRef': [ref: unknown]
}>()

function handleTextareaRef(el: unknown) {
  emit('update:templateTextareaRef', el)
}
</script>

<template>
  <section class="workspace-panel">
    <div class="workspace-panel-head">
      <div>
        <div class="workspace-panel-title">
          {{ editorForm.id ? '编辑模板' : '新建模板' }}
        </div>
        <div class="workspace-panel-subtitle">
          {{ previewHint }}
        </div>
      </div>
      <div class="editor-overview-tags">
        <a-tag color="geekblue">
          {{ billTypeMap[editorForm.billType] || editorForm.billType }}
        </a-tag>
        <a-tag color="gold">{{ templateKind }}</a-tag>
        <a-tag v-if="selectedRecord?.updateTime">
          {{ selectedRecord.updateTime }}
        </a-tag>
      </div>
    </div>

    <div class="editor-config-panel">
      <a-form layout="vertical" class="print-template-form">
        <a-row :gutter="16">
          <a-col :lg="10" :xs="24">
            <a-form-item label="模板名称" html-for="print-template-name">
              <a-input
                id="print-template-name"
                v-model:value="editorForm.templateName"
                :disabled="!canMaintainContent"
                placeholder="输入模板名称"
              />
            </a-form-item>
          </a-col>
          <a-col :lg="8" :xs="24">
            <a-form-item label="适用页面" html-for="print-template-bill-type">
              <a-select
                id="print-template-bill-type"
                v-model:value="editorForm.billType"
                :disabled="!canMaintainContent"
              >
                <a-select-option
                  v-for="item in billTypeOptions"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :lg="6" :xs="24">
            <a-form-item label="默认模板" html-for="print-template-default">
              <a-switch
                id="print-template-default"
                v-model:checked="editorForm.isDefault"
                :disabled="!canMaintainContent"
                checked-children="默认"
                un-checked-children="普通"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="workspace-panel-head workspace-panel-toolbar">
      <div class="workspace-panel-actions">
        <a-button @click="emit('use-starter')">使用骨架</a-button>
        <a-button v-if="canCreate" @click="emit('copy')">复制当前</a-button>
        <a-button @click="emit('reset')">清空</a-button>
        <a-button
          v-if="canSave"
          type="primary"
          :loading="saving"
          @click="emit('save')"
        >
          保存模板
        </a-button>
      </div>
    </div>

    <a-textarea
      id="print-template-html"
      :ref="handleTextareaRef"
      v-model:value="editorForm.templateHtml"
      :disabled="!canMaintainContent"
      class="template-editor-textarea"
      :rows="24"
      placeholder="支持 HTML 模板和 LODOP 指令模板"
    />
  </section>
</template>

<style scoped>
.workspace-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.workspace-panel-head > div:first-child {
  min-width: 0;
}

.workspace-panel-title {
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
}

.workspace-panel-subtitle {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.editor-overview-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.editor-config-panel {
  margin-top: 16px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.print-template-form {
  margin-top: 0;
}

.workspace-panel-toolbar {
  margin-top: 16px;
}

.workspace-panel-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.template-editor-textarea {
  margin-top: 16px;
}

:deep(.template-editor-textarea textarea) {
  min-height: 660px;
  border-radius: 14px;
  font-family:
    'JetBrains Mono', 'Fira Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  line-height: 1.7;
  background: #0f172a;
  color: #dbeafe;
}
</style>
