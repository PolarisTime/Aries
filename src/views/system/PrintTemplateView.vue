<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import type { UploadProps } from 'ant-design-vue'
import { businessPageConfigs } from '@/config/business-pages'
import { useRequestError } from '@/composables/use-request-error'
import {
  printTemplateTargetMap,
  printTemplateTargetOptions,
} from '@/config/print-template-targets'
import {
  deletePrintTemplate,
  listPrintTemplates,
  savePrintTemplate,
} from '@/api/print-template'
import { usePermissionStore } from '@/stores/permission'
import type { PrintTemplateRecord } from '@/types/print-template'
import { isCLodopCode } from '@/utils/clodop'
import {
  buildPrintTemplatePreviewData,
  buildPrintTemplateSnippets,
  buildPrintTemplateStarter,
  buildPrintTemplateTokenGroups,
} from '@/utils/print-template-designer'
import { renderPrintTemplate } from '@/utils/print-template-engine'

interface AntTextAreaRef {
  resizableTextArea?: {
    textArea?: HTMLTextAreaElement
  }
}

const permissionStore = usePermissionStore()
const selectedBillType = ref(
  printTemplateTargetOptions[0]?.value || 'purchase-orders',
)
const loading = ref(false)
const saving = ref(false)
const templateRows = ref<PrintTemplateRecord[]>([])
const templateKeyword = ref('')
const showRequestError = useRequestError()
const previewTab = ref<'preview' | 'data'>('preview')
const activeTemplateId = ref<string>()
const templateTextareaRef = ref<AntTextAreaRef | null>(null)
const editorWorkspaceRef = ref<HTMLElement | null>(null)
const suppressBillTypeWatcher = ref(false)

const editorForm = reactive({
  id: undefined as string | undefined,
  billType: selectedBillType.value,
  templateName: '',
  templateHtml: '',
  isDefault: true,
})

const canCreate = computed(() =>
  permissionStore.can('print-template', 'create'),
)
const canEdit = computed(() =>
  permissionStore.can('print-template', 'update'),
)
const canDelete = computed(() =>
  permissionStore.can('print-template', 'delete'),
)
const canMaintainTemplateContent = computed(
  () => canCreate.value || canEdit.value,
)
const canSaveCurrentTemplate = computed(() =>
  editorForm.id ? canEdit.value : canCreate.value,
)
const isEditingTemplate = computed(() => Boolean(editorForm.id))
const libraryConfig = computed(
  () => businessPageConfigs[selectedBillType.value],
)
const editorConfig = computed(
  () => businessPageConfigs[editorForm.billType] || libraryConfig.value,
)
const tokenGroups = computed(() =>
  buildPrintTemplateTokenGroups(editorConfig.value),
)
const snippets = computed(() => buildPrintTemplateSnippets(editorConfig.value))
const starterTemplate = computed(() =>
  buildPrintTemplateStarter(editorConfig.value),
)
const previewData = computed(() =>
  buildPrintTemplatePreviewData(editorConfig.value),
)
const templateKind = computed(() => {
  const content = getWorkingTemplate()
  return isCLodopCode(content) ? 'LODOP 指令' : 'HTML 模板'
})
const previewHint = computed(() =>
  selectedTemplateRecord.value && !isEditingTemplate.value
    ? '当前仅选中模板，点击“编辑”后才进入编辑状态'
    : !editorForm.id &&
        editorForm.templateHtml.trim() === starterTemplate.value.trim()
      ? '当前为内置骨架预览，保存后才会生成模板记录'
      : '当前编辑内容预览',
)
const filteredTemplates = computed(() => {
  const keyword = templateKeyword.value.trim().toLowerCase()
  if (!keyword) {
    return templateRows.value
  }
  return templateRows.value.filter((item) => {
    const haystack =
      `${item.templateName} ${item.billType || ''} ${item.updateTime || ''}`.toLowerCase()
    return haystack.includes(keyword)
  })
})
const selectedTemplateRecord = computed(() =>
  templateRows.value.find((item) => String(item.id) === activeTemplateId.value),
)
const previewSource = computed(() =>
  renderPrintTemplate(
    getWorkingTemplate(),
    previewData.value.model,
    previewData.value.details,
  ),
)
const previewDocument = computed(() =>
  templateKind.value === 'HTML 模板'
    ? wrapPreviewHtml(previewSource.value)
    : '',
)
const previewSampleJson = computed(() =>
  JSON.stringify(
    {
      model: previewData.value.model,
      details: previewData.value.details,
    },
    null,
    2,
  ),
)
const librarySummary = computed(
  () => `${filteredTemplates.value.length}/${templateRows.value.length}`,
)

watch(selectedBillType, () => {
  editorForm.billType = selectedBillType.value
  if (suppressBillTypeWatcher.value) {
    suppressBillTypeWatcher.value = false
    return
  }
  activeTemplateId.value = undefined
  if (!editorForm.id) {
    fillStarterTemplate()
  }
  void loadTemplates(false)
})

onMounted(() => {
  fillStarterTemplate()
  void loadTemplates(true)
})

function getWorkingTemplate() {
  const current = editorForm.templateHtml.trim()
  return current || starterTemplate.value
}

function wrapPreviewHtml(content: string) {
  if (/<html[\s>]/i.test(content)) {
    return content
  }

  const extractedStyles: string[] = []
  let bodyContent = content
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
  bodyContent = bodyContent.replace(styleRegex, (_, css: string) => {
    extractedStyles.push(css.trim())
    return ''
  })

  const templateStyles = sanitizePreviewStyle(extractedStyles.join('\n'))
  bodyContent = sanitizePreviewHtml(bodyContent)

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    ${templateStyles}

    *, *::before, *::after { box-sizing: border-box; }
    html { background: #eef2f6; }
    body {
      max-width: 190mm;
      margin: 24px auto;
      background: #fff;
      box-shadow: 0 2px 20px rgba(0,0,0,.12);
    }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #111827; padding: 7px 8px; font-size: 12px; vertical-align: middle; word-break: break-all; }
    th { background: #eff4f9; font-weight: 700; }
    h1 { margin: 0 0 10px; text-align: center; font-size: 20px; }
    .print-subtitle { margin: 0 0 12px; text-align: center; font-size: 12px; }
    .print-block { margin-top: 12px; }
    .print-footnote { margin-top: 12px; text-align: right; font-size: 11px; }
  </style><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https: http:; style-src 'unsafe-inline'; font-src data: https: http:;"></head><body>${bodyContent}</body></html>`
}

function sanitizePreviewStyle(value: string) {
  return value
    .replace(/@import[\s\S]*?;/gi, '')
    .replace(/expression\s*\([^)]*\)/gi, '')
    .replace(/url\s*\(\s*['"]?\s*javascript:[^)]*\)/gi, 'none')
}

function sanitizePreviewHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(
      /<(iframe|object|embed|base|meta|link|form)[^>]*>[\s\S]*?<\/\1>/gi,
      '',
    )
    .replace(/<(iframe|object|embed|base|meta|link|form)\b[^>]*\/?>/gi, '')
    .replace(/\son[a-z-]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son[a-z-]+\s*=\s*[^\s>]+/gi, '')
    .replace(
      /\s(href|src|action)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi,
      ' $1="#"',
    )
    .replace(
      /\s(href|src|action)\s*=\s*(['"])\s*data:text\/html[\s\S]*?\2/gi,
      ' $1="#"',
    )
}

function fillStarterTemplate() {
  editorForm.id = undefined
  editorForm.billType = selectedBillType.value
  editorForm.templateName = `${editorConfig.value?.title || '打印'}模板`
  editorForm.templateHtml = starterTemplate.value
  editorForm.isDefault = true
}

function resetEditor() {
  fillStarterTemplate()
  focusEditorWorkspace()
}

function applyTemplateRecord(record: PrintTemplateRecord) {
  activeTemplateId.value = String(record.id)
  editorForm.id = String(record.id)
  editorForm.billType = record.billType || selectedBillType.value
  editorForm.templateName = record.templateName
  editorForm.templateHtml = record.templateHtml
  editorForm.isDefault = record.isDefault === '1'

  if (selectedBillType.value !== editorForm.billType) {
    suppressBillTypeWatcher.value = true
    selectedBillType.value = editorForm.billType
  }

  focusEditorWorkspace()
}

async function loadTemplates(autoSelectFirst: boolean) {
  loading.value = true
  try {
    const response = await listPrintTemplates(selectedBillType.value)
    if (Number(response.code) !== 0) {
      throw new Error(response.message || '加载模板失败')
    }

    templateRows.value = (response.data || []).filter(
      (item) => item.source !== 'file',
    )

    if (activeTemplateId.value) {
      const matched = templateRows.value.some(
        (item) => String(item.id) === activeTemplateId.value,
      )
      if (matched) {
        return
      }
      activeTemplateId.value = undefined
    }

    if (
      autoSelectFirst &&
      !activeTemplateId.value &&
      templateRows.value.length > 0
    ) {
      activeTemplateId.value = String(templateRows.value[0].id)
    }
  } catch (error) {
    showRequestError(error, '加载模板失败')
  } finally {
    loading.value = false
  }
}

function handleCreate() {
  if (!canCreate.value) {
    message.warning('暂无新增模板权限')
    return
  }
  resetEditor()
}

function handleSelectTemplate(record: PrintTemplateRecord) {
  activeTemplateId.value = String(record.id)
}

function handleEdit(record: PrintTemplateRecord) {
  if (!canEdit.value) {
    message.warning('暂无编辑模板权限')
    return
  }
  applyTemplateRecord(record)
}

function handleCopyTemplate() {
  if (!canCreate.value) {
    message.warning('暂无新增模板权限')
    return
  }

  editorForm.id = undefined
  activeTemplateId.value = undefined
  editorForm.isDefault = false
  editorForm.templateName = editorForm.templateName.trim()
    ? `${editorForm.templateName.trim()}-副本`
    : `${editorConfig.value?.title || '打印'}模板-副本`
  message.success('已基于当前内容创建副本，可直接保存为新模板')
}

async function handleSave() {
  if (!canSaveCurrentTemplate.value) {
    message.warning(editorForm.id ? '暂无编辑模板权限' : '暂无新增模板权限')
    return
  }
  if (!editorForm.templateName.trim()) {
    message.warning('请输入模板名称')
    return
  }
  if (!editorForm.templateHtml.trim()) {
    message.warning('请上传或填写模板内容')
    return
  }

  saving.value = true
  try {
    const response = await savePrintTemplate({
      id: editorForm.id,
      billType: editorForm.billType,
      templateName: editorForm.templateName.trim(),
      templateHtml: editorForm.templateHtml,
      isDefault: editorForm.isDefault ? '1' : '0',
    })
    if (Number(response.code) !== 0) {
      throw new Error(response.message || '保存失败')
    }

    message.success('模板保存成功')
    editorForm.id = String(response.data?.id || editorForm.id || '')
    activeTemplateId.value = editorForm.id

    if (selectedBillType.value !== editorForm.billType) {
      suppressBillTypeWatcher.value = true
      selectedBillType.value = editorForm.billType
    }

    await loadTemplates(false)
  } catch (error) {
    showRequestError(error, '保存失败')
  } finally {
    saving.value = false
  }
}

function handleDelete(record: PrintTemplateRecord) {
  if (!canDelete.value) {
    message.warning('暂无删除模板权限')
    return
  }

  Modal.confirm({
    title: '删除模板',
    content: `确定删除模板“${record.templateName}”吗？`,
    okText: '删除',
    cancelText: '取消',
    onOk: async () => {
      try {
        const response = await deletePrintTemplate(String(record.id))
        if (Number(response.code) !== 0) {
          throw new Error(response.message || '删除失败')
        }
        if (activeTemplateId.value === String(record.id)) {
          activeTemplateId.value = undefined
        }
        if (editorForm.id === String(record.id)) {
          resetEditor()
        }
        message.success('模板已删除')
        await loadTemplates(false)
      } catch (error) {
        showRequestError(error, '删除失败')
      }
    },
  })
}

function readFileText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('读取模板文件失败'))
    reader.readAsText(file, 'utf-8')
  })
}

const beforeUpload: UploadProps['beforeUpload'] = async (file) => {
  if (!canMaintainTemplateContent.value) {
    message.warning('暂无模板维护权限')
    return false
  }
  try {
    const text = await readFileText(file as File)
    if (!editorForm.templateName.trim()) {
      editorForm.templateName = file.name.replace(/\.[^.]+$/, '')
    }
    editorForm.templateHtml = text
    message.success(`已载入模板文件：${file.name}`)
  } catch (error) {
    showRequestError(error, '读取模板文件失败')
  }
  return false
}

function getTextareaElement() {
  return templateTextareaRef.value?.resizableTextArea?.textArea || null
}

function focusEditorWorkspace() {
  void nextTick(() => {
    const editorWorkspace = editorWorkspaceRef.value
    if (editorWorkspace instanceof HTMLElement) {
      const viewportOffset = 102
      const top =
        window.scrollY +
        editorWorkspace.getBoundingClientRect().top -
        viewportOffset
      try {
        window.scrollTo({
          top: Math.max(top, 0),
          behavior: 'smooth',
        })
      } catch {
        // ignore scroll API limitations in test environments
      }
    }
    getTextareaElement()?.focus()
  })
}

function insertIntoEditor(content: string) {
  if (!canMaintainTemplateContent.value) {
    message.warning('暂无模板维护权限')
    return
  }

  const textarea = getTextareaElement()
  if (!textarea) {
    editorForm.templateHtml += content
    return
  }

  const start = textarea.selectionStart ?? editorForm.templateHtml.length
  const end = textarea.selectionEnd ?? start
  editorForm.templateHtml = `${editorForm.templateHtml.slice(0, start)}${content}${editorForm.templateHtml.slice(end)}`

  void nextTick(() => {
    const nextPosition = start + content.length
    textarea.focus()
    textarea.setSelectionRange(nextPosition, nextPosition)
  })
}
</script>

<template>
  <div class="page-stack print-template-page">
    <div class="print-template-layout">
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
            <a-tag color="blue">{{ librarySummary }}</a-tag>
          </div>
        </template>

        <div class="library-toolbar">
          <span class="toolbar-label">适用页面</span>
          <a-select v-model:value="selectedBillType" style="width: 100%">
            <a-select-option
              v-for="item in printTemplateTargetOptions"
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
              @click="handleCreate"
              >新增模板</a-button
            >
            <a-upload
              v-if="canMaintainTemplateContent"
              :show-upload-list="false"
              :before-upload="beforeUpload"
              accept=".html,.htm,.lodop,.txt"
            >
              <a-button block>上传模板</a-button>
            </a-upload>
            <a-button block @click="loadTemplates(false)">刷新</a-button>
          </div>
        </div>

        <a-spin :spinning="loading">
          <div v-if="filteredTemplates.length" class="library-list">
            <div
              v-for="record in filteredTemplates"
              :key="record.id"
              class="template-card"
              :class="{
                'template-card-active': String(record.id) === activeTemplateId,
              }"
              role="button"
              tabindex="0"
              @click="handleSelectTemplate(record)"
              @keydown.enter.prevent="handleSelectTemplate(record)"
              @keydown.space.prevent="handleSelectTemplate(record)"
            >
              <div class="template-card-head">
                <div class="template-card-name">{{ record.templateName }}</div>
                <a-tag :color="record.isDefault === '1' ? 'blue' : 'default'">
                  {{ record.isDefault === '1' ? '默认' : '普通' }}
                </a-tag>
              </div>
              <div class="template-card-meta">
                <span>{{
                  printTemplateTargetMap[record.billType || selectedBillType] ||
                  record.billType ||
                  '--'
                }}</span>
                <span>{{ record.updateTime || '--' }}</span>
              </div>
              <div class="template-card-actions">
                <a-button
                  v-if="canEdit"
                  type="link"
                  size="small"
                  @click.stop="handleEdit(record)"
                >
                  编辑
                </a-button>
                <a-button
                  v-if="canDelete"
                  type="link"
                  danger
                  size="small"
                  @click.stop="handleDelete(record)"
                >
                  删除
                </a-button>
                <span v-if="!canEdit && !canDelete" class="template-card-empty"
                  >--</span
                >
              </div>
            </div>
          </div>
          <a-empty
            v-else
            description="当前页面还没有模板，右侧可直接从骨架开始编辑"
          />
        </a-spin>
      </a-card>

      <div class="print-template-main">
        <div ref="editorWorkspaceRef" class="editor-workspace-anchor">
          <a-card
            :bordered="false"
            class="module-panel-card print-template-workspace"
          >
            <div class="workspace-grid">
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
                    <a-tag color="geekblue">{{
                      printTemplateTargetMap[editorForm.billType] ||
                      editorForm.billType
                    }}</a-tag>
                    <a-tag color="gold">{{ templateKind }}</a-tag>
                    <a-tag v-if="selectedTemplateRecord?.updateTime">{{
                      selectedTemplateRecord.updateTime
                    }}</a-tag>
                  </div>
                </div>

                <div class="editor-config-panel">
                  <a-form layout="vertical" class="print-template-form">
                    <a-row :gutter="16">
                      <a-col :lg="10" :xs="24">
                        <a-form-item
                          label="模板名称"
                          html-for="print-template-name"
                        >
                          <a-input
                            id="print-template-name"
                            v-model:value="editorForm.templateName"
                            :disabled="!canMaintainTemplateContent"
                            placeholder="输入模板名称"
                          />
                        </a-form-item>
                      </a-col>
                      <a-col :lg="8" :xs="24">
                        <a-form-item
                          label="适用页面"
                          html-for="print-template-bill-type"
                        >
                          <a-select
                            id="print-template-bill-type"
                            v-model:value="editorForm.billType"
                            :disabled="!canMaintainTemplateContent"
                          >
                            <a-select-option
                              v-for="item in printTemplateTargetOptions"
                              :key="item.value"
                              :value="item.value"
                            >
                              {{ item.label }}
                            </a-select-option>
                          </a-select>
                        </a-form-item>
                      </a-col>
                      <a-col :lg="6" :xs="24">
                        <a-form-item
                          label="默认模板"
                          html-for="print-template-default"
                        >
                          <a-switch
                            id="print-template-default"
                            v-model:checked="editorForm.isDefault"
                            :disabled="!canMaintainTemplateContent"
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
                    <a-button @click="editorForm.templateHtml = starterTemplate"
                      >使用骨架</a-button
                    >
                    <a-button v-if="canCreate" @click="handleCopyTemplate"
                      >复制当前</a-button
                    >
                    <a-button @click="resetEditor">清空</a-button>
                    <a-button
                      v-if="canSaveCurrentTemplate"
                      type="primary"
                      :loading="saving"
                      @click="handleSave"
                    >
                      保存模板
                    </a-button>
                  </div>
                </div>

                <a-textarea
                  id="print-template-html"
                  ref="templateTextareaRef"
                  v-model:value="editorForm.templateHtml"
                  :disabled="!canMaintainTemplateContent"
                  class="template-editor-textarea"
                  :rows="24"
                  placeholder="支持 HTML 模板和 LODOP 指令模板"
                />
              </section>

              <section class="workspace-panel">
                <div class="workspace-panel-head">
                  <div>
                    <div class="workspace-panel-title">实时预览</div>
                    <div class="workspace-panel-subtitle">
                      基于当前页面的样例数据即时渲染
                    </div>
                  </div>
                  <a-radio-group v-model:value="previewTab" size="small">
                    <a-radio-button value="preview">预览</a-radio-button>
                    <a-radio-button value="data">样例数据</a-radio-button>
                  </a-radio-group>
                </div>

                <div v-if="previewTab === 'preview'" class="preview-shell">
                  <a-alert
                    v-if="templateKind === 'LODOP 指令'"
                    type="info"
                    show-icon
                    message="LODOP 指令模板无法在浏览器中直接还原版式，下面展示的是变量替换后的代码。"
                  />
                  <iframe
                    v-if="templateKind === 'HTML 模板'"
                    class="preview-frame"
                    sandbox=""
                    referrerpolicy="no-referrer"
                    :srcdoc="previewDocument"
                    title="打印模板预览"
                  />
                  <pre v-else class="preview-code">{{ previewSource }}</pre>
                </div>

                <pre v-else class="preview-data">{{ previewSampleJson }}</pre>
              </section>
            </div>
          </a-card>
        </div>
      </div>

      <aside class="print-template-sidebar">
        <div class="print-template-sidebar-stack">
          <a-card
            :bordered="false"
            class="module-panel-card print-template-sidebar-card"
          >
            <template #title>
              <div class="sidebar-title">
                <div>
                  <div class="sidebar-title-main">变量与语法</div>
                  <div class="sidebar-title-sub">点击即可插入当前编辑器</div>
                </div>
                <a-tag color="processing">快捷插入</a-tag>
              </div>
            </template>

            <div class="sidebar-card-body">
              <div
                v-for="group in tokenGroups"
                :key="group.key"
                class="sidebar-section"
              >
                <div class="sidebar-section-head">
                  <div class="sidebar-section-title">{{ group.label }}</div>
                  <div class="sidebar-section-desc">{{ group.description }}</div>
                </div>
                <div class="token-list">
                  <button
                    v-for="item in group.tokens"
                    :key="`${group.key}-${item.key}`"
                    type="button"
                    class="token-chip"
                    @click="insertIntoEditor(item.token)"
                  >
                    <span class="token-chip-text">{{ item.token }}</span>
                    <span class="token-chip-label">{{ item.label }}</span>
                  </button>
                </div>
              </div>
            </div>
          </a-card>

          <a-card
            :bordered="false"
            class="module-panel-card print-template-sidebar-card"
          >
            <template #title>
              <div class="sidebar-title">
                <div>
                  <div class="sidebar-title-main">模板片段</div>
                  <div class="sidebar-title-sub">
                    常用条件块和循环结构，减少手写出错
                  </div>
                </div>
                <a-tag color="blue">结构片段</a-tag>
              </div>
            </template>

            <div class="sidebar-card-body">
              <div class="snippet-list">
                <div
                  v-for="snippet in snippets"
                  :key="snippet.key"
                  class="snippet-card"
                >
                  <div class="snippet-card-head">
                    <div>
                      <div class="snippet-title">{{ snippet.label }}</div>
                      <div class="snippet-desc">{{ snippet.description }}</div>
                    </div>
                    <a-button
                      size="small"
                      @click="insertIntoEditor(snippet.content)"
                      >插入</a-button
                    >
                  </div>
                  <pre class="snippet-code">{{ snippet.content }}</pre>
                </div>
              </div>
            </div>
          </a-card>
        </div>
      </aside>
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

.print-template-library,
.print-template-sidebar,
.print-template-main {
  min-width: 0;
}

.print-template-library {
  width: 100%;
}

.print-template-sidebar {
  width: 100%;
}

.print-template-library {
  position: sticky;
  top: 102px;
  z-index: 2;
  max-height: calc(100vh - 118px);
  overflow: hidden;
}

.print-template-sidebar {
  position: relative;
}

.print-template-library,
.module-panel-card {
  position: relative;
}

.print-template-main {
  width: 100%;
  position: relative;
  z-index: 1;
  overflow-x: hidden;
  overflow-y: visible;
}

.library-title,
.sidebar-title,
.workspace-panel-head,
.library-title-main {
  display: flex;
}

.library-title,
.sidebar-title,
.workspace-panel-head {
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.library-title > div,
.workspace-panel-head > div:first-child,
.sidebar-section-head,
.sidebar-title > div,
.snippet-card-head > div:first-child {
  min-width: 0;
}

.library-title-main,
.sidebar-title-main,
.editor-title,
.workspace-panel-title,
.sidebar-section-title,
.snippet-title {
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
}

.library-title-sub,
.sidebar-title-sub,
.editor-subtitle,
.workspace-panel-subtitle,
.sidebar-section-desc,
.snippet-desc {
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

.print-template-main {
  display: grid;
}

:deep(.print-template-library > .ant-card-body),
:deep(.print-template-sidebar-card > .ant-card-body) {
  overflow-y: auto;
}

.print-template-sidebar-stack {
  position: sticky;
  top: 102px;
  display: grid;
  gap: 16px;
  max-height: calc(100vh - 118px);
}

.print-template-sidebar-card {
  min-height: 0;
}

.sidebar-card-body {
  display: grid;
  gap: 20px;
}

.editor-overview-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.print-template-form {
  margin-top: 0;
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

.workspace-panel {
  min-width: 0;
  overflow: hidden;
}

.editor-config-panel {
  margin-top: 16px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
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

.preview-shell {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.preview-frame,
.preview-code,
.preview-data,
.snippet-code {
  width: 100%;
  border: 1px solid #dbe4ee;
  border-radius: 14px;
  background: #f8fafc;
}

.preview-frame {
  min-height: 660px;
}

.preview-code,
.preview-data,
.snippet-code {
  margin: 16px 0 0;
  padding: 14px 16px;
  overflow: auto;
  color: #0f172a;
  font-family:
    'JetBrains Mono', 'Fira Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-data {
  min-height: 660px;
  margin-top: 16px;
}

.sidebar-section + .sidebar-section {
  margin-top: 20px;
}

.sidebar-section-head {
  margin-bottom: 12px;
}

.token-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.token-chip {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  max-width: 100%;
  padding: 10px 12px;
  border: 1px solid #dbe4ee;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.token-chip:hover {
  border-color: #1677ff;
  background: #eff6ff;
}

.token-chip-text {
  color: #0f172a;
  font-family:
    'JetBrains Mono', 'Fira Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  word-break: break-all;
}

.token-chip-label {
  color: #64748b;
  font-size: 12px;
}

.snippet-list {
  display: grid;
  gap: 12px;
}

.snippet-card {
  padding: 12px;
  border: 1px solid #dbe4ee;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.snippet-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.snippet-code {
  min-height: 96px;
}

@media (max-width: 1600px) {
  .print-template-layout {
    grid-template-columns: 280px minmax(0, 1fr);
  }

  .print-template-sidebar {
    grid-column: 1 / -1;
  }

  .print-template-sidebar-stack {
    position: static;
    max-height: none;
  }
}

@media (max-width: 1280px) {
  .print-template-layout {
    grid-template-columns: 1fr;
  }

  .print-template-library,
  .print-template-sidebar {
    position: static;
    max-height: none;
    overflow: visible;
  }

  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .print-template-sidebar-stack {
    position: static;
    max-height: none;
  }

  :deep(.template-editor-textarea textarea),
  .preview-frame,
  .preview-data {
    min-height: 480px;
  }
}
</style>
