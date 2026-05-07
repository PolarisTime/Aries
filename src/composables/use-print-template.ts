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

export function usePrintTemplate() {
  const permissionStore = usePermissionStore()
  const showRequestError = useRequestError()

  const selectedBillType = ref(
    printTemplateTargetOptions[0]?.value || 'purchase-orders',
  )
  const loading = ref(false)
  const saving = ref(false)
  const templateRows = ref<PrintTemplateRecord[]>([])
  const templateKeyword = ref('')
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
      ? '当前仅选中模板，点击"编辑"后才进入编辑状态'
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
      content: `确定删除模板"${record.templateName}"吗？`,
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

  return {
    // 状态
    selectedBillType,
    loading,
    saving,
    templateRows,
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
    isEditingTemplate,

    // 计算属性
    libraryConfig,
    editorConfig,
    tokenGroups,
    snippets,
    starterTemplate,
    previewData,
    templateKind,
    previewHint,
    filteredTemplates,
    selectedTemplateRecord,
    previewSource,
    previewDocument,
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
    focusEditorWorkspace,

    // 常量
    printTemplateTargetOptions,
    printTemplateTargetMap,
  }
}
