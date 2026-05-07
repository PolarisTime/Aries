<script setup lang="ts">
import { usePrintTemplate } from '@/composables/use-print-template'
import PrintTemplateLibrary from '@/components/print-template/PrintTemplateLibrary.vue'
import PrintTemplateEditor from '@/components/print-template/PrintTemplateEditor.vue'
import PrintTemplatePreview from '@/components/print-template/PrintTemplatePreview.vue'
import PrintTemplateSidebar from '@/components/print-template/PrintTemplateSidebar.vue'

const {
  // 状态
  selectedBillType,
  loading,
  saving,
  templateKeyword,
  previewTab,
  activeTemplateId,
  templateTextareaRef,
  editorWorkspaceRef,
  editorForm,

  // 权限
  canCreate,
  canEdit,
  canDelete,
  canMaintainTemplateContent,
  canSaveCurrentTemplate,

  // 计算属性
  tokenGroups,
  snippets,
  starterTemplate,
  templateKind,
  previewHint,
  filteredTemplates,
  selectedTemplateRecord,
  previewDocument,
  previewSource,
  previewSampleJson,
  librarySummary,

  // 方法
  handleCreate,
  handleSelectTemplate,
  handleEdit,
  handleCopyTemplate,
  handleSave,
  handleDelete,
  loadTemplates,
  resetEditor,
  beforeUpload,
  insertIntoEditor,

  // 常量
  printTemplateTargetOptions,
  printTemplateTargetMap,
} = usePrintTemplate()
</script>

<template>
  <div class="page-stack print-template-page">
    <div class="print-template-layout">
      <PrintTemplateLibrary
        :templates="filteredTemplates"
        :active-id="activeTemplateId"
        :loading="loading"
        :summary="librarySummary"
        :bill-type-options="printTemplateTargetOptions"
        :bill-type-map="printTemplateTargetMap"
        :can-create="canCreate"
        :can-edit="canEdit"
        :can-delete="canDelete"
        :can-maintain-content="canMaintainTemplateContent"
        v-model:selected-bill-type="selectedBillType"
        v-model:template-keyword="templateKeyword"
        @select="handleSelectTemplate"
        @create="handleCreate"
        @delete="handleDelete"
        @refresh="loadTemplates(false)"
      >
        <template #upload-button>
          <a-upload
            v-if="canMaintainTemplateContent"
            :show-upload-list="false"
            :before-upload="beforeUpload"
            accept=".html,.htm,.lodop,.txt"
          >
            <a-button block>上传模板</a-button>
          </a-upload>
        </template>
      </PrintTemplateLibrary>

      <div class="print-template-main">
        <div ref="editorWorkspaceRef" class="editor-workspace-anchor">
          <a-card
            :bordered="false"
            class="module-panel-card print-template-workspace"
          >
            <div class="workspace-grid">
              <PrintTemplateEditor
                :editor-form="editorForm"
                :bill-type-options="printTemplateTargetOptions"
                :bill-type-map="printTemplateTargetMap"
                :template-kind="templateKind"
                :preview-hint="previewHint"
                :selected-record="selectedTemplateRecord"
                :can-save="canSaveCurrentTemplate"
                :can-maintain-content="canMaintainTemplateContent"
                :saving="saving"
                :starter-template="starterTemplate"
                :can-create="canCreate"
                :template-textarea-ref="templateTextareaRef"
                @save="handleSave"
                @copy="handleCopyTemplate"
                @reset="resetEditor"
                @use-starter="editorForm.templateHtml = starterTemplate"
                @update:template-textarea-ref="templateTextareaRef = $event"
              />

              <PrintTemplatePreview
                v-model:preview-tab="previewTab"
                :template-kind="templateKind"
                :preview-document="previewDocument"
                :preview-source="previewSource"
                :preview-sample-json="previewSampleJson"
              />
            </div>
          </a-card>
        </div>
      </div>

      <PrintTemplateSidebar
        :token-groups="tokenGroups"
        :snippets="snippets"
        @insert="insertIntoEditor"
      />
    </div>
  </div>
</template>

<style scoped>
.print-template-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 340px;
  gap: 24px;
  align-items: start;
  width: 100%;
  min-width: 0;
}

.print-template-main {
  min-width: 0;
  width: 100%;
  position: relative;
  z-index: 1;
  overflow-x: hidden;
  overflow-y: visible;
  display: grid;
}

.print-template-workspace {
  overflow: hidden;
}

.editor-workspace-anchor {
  scroll-margin-top: 102px;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.95fr);
  gap: 16px;
  min-width: 0;
}

:deep(.module-panel-card) {
  position: relative;
}

:deep(.print-template-library) {
  position: sticky;
  top: 102px;
  z-index: 2;
  max-height: calc(100vh - 118px);
  overflow: hidden;
}

:deep(.print-template-library > .ant-card-body) {
  overflow-y: auto;
}

@media (max-width: 1600px) {
  .print-template-layout {
    grid-template-columns: 280px minmax(0, 1fr);
  }
}

@media (max-width: 1280px) {
  .print-template-layout {
    grid-template-columns: 1fr;
  }

  .workspace-grid {
    grid-template-columns: 1fr;
  }

  :deep(.print-template-library) {
    position: static;
    max-height: none;
    overflow: visible;
  }
}
</style>
