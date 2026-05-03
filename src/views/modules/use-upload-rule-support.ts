import { computed, h, reactive, ref, type Ref, type VNodeChild } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { Input, message, Textarea } from 'ant-design-vue'
import { getPageUploadRule, updatePageUploadRule } from '@/api/business'
import { useDataTable } from '@/composables/use-data-table'
import { enabledStatusValues } from '@/constants/module-options'
import type { ModuleRecord } from '@/types/module-page'
import ModuleUploadRuleExpandedRow from './components/ModuleUploadRuleExpandedRow.vue'
import ModuleUploadRuleRowActions from './components/ModuleUploadRuleRowActions.vue'

interface UploadRuleFormState {
  id: string
  moduleKey: string
  moduleName: string
  ruleCode: string
  ruleName: string
  renamePattern: string
  status: string
  remark: string
  previewFileName: string
}

interface UploadRuleTokenItem {
  key: string
  placeholder: string
  description: string
  example: string
}

interface UploadRuleDetailRow extends Record<string, unknown> {
  key: string
  label: string
  description: string
  type: 'config' | 'token'
  example?: string
}

interface UseUploadRuleSupportOptions {
  moduleKey: Ref<string>
  canEditRecords: Ref<boolean>
  canViewRecords: Ref<boolean>
  isReadOnly: Ref<boolean>
  isSuccessCode: (code: unknown) => boolean
  refreshModuleQueries: () => Promise<void>
  showRequestError: (error: unknown, fallbackMessage: string) => void
}

type UploadRuleFeatureResponse = {
  code?: unknown
  data?: {
    status?: unknown
  } | null
}

export const UPLOAD_RULE_DEFAULT_CODE = 'PAGE_UPLOAD'
export const UPLOAD_RULE_DEFAULT_TITLE = '页面上传命名规则'
export const UPLOAD_RULE_DEFAULT_NAME = '页面上传文件命名规则'

const uploadRuleHiddenListKeys = new Set(['dateRule', 'serialLength', 'resetRule'])

const uploadRuleTokenRows: UploadRuleTokenItem[] = [
  { key: 'yyyy', placeholder: '{yyyy}', description: '四位年份', example: '2026' },
  { key: 'yyyyMMdd', placeholder: '{yyyyMMdd}', description: '年月日', example: '20260424' },
  { key: 'HHmmss', placeholder: '{HHmmss}', description: '时分秒', example: '123045' },
  { key: 'yyyyMMddHHmmss', placeholder: '{yyyyMMddHHmmss}', description: '完整时间戳', example: '20260424123045' },
  { key: 'timestamp', placeholder: '{timestamp}', description: '毫秒时间戳', example: '1777005045000' },
  { key: 'random8', placeholder: '{random8}', description: '8 位随机串', example: 'preview1' },
  { key: 'originName', placeholder: '{originName}', description: '原文件名，不含扩展名', example: 'sample-contract' },
  { key: 'ext', placeholder: '{ext}', description: '原扩展名，不含点号', example: 'pdf' },
]

const uploadRuleDetailHelper = createColumnHelper<Record<string, unknown>>()

function createUploadRuleColumns(
  uploadRuleForm: Record<string, unknown>,
  uploadRuleStatusText: Ref<string>,
  uploadRuleLoading: Ref<boolean>,
) {
  return computed<ColumnDef<Record<string, unknown>, unknown>[]>(() => [
    uploadRuleDetailHelper.accessor('label', { header: () => '项目', meta: { width: 180 } }),
    uploadRuleDetailHelper.accessor('description', { header: () => '说明', meta: { width: 360 } }),
    {
      id: 'value',
      header: () => '配置值 / 示例',
      cell: (info: { row: { original: Record<string, unknown> } }) => {
        const row = info.row.original
        if (row.type === 'token') return row.example || '--'
        if (row.key === 'ruleCode') return (uploadRuleForm.ruleCode as string) || ''
        if (row.key === 'ruleName') return (uploadRuleForm.ruleName as string) || ''
        if (row.key === 'status') return uploadRuleStatusText.value
        if (row.key === 'renamePattern') {
          return h(Input, {
            value: String(uploadRuleForm.renamePattern || ''),
            'onUpdate:value': (value: string) => { uploadRuleForm.renamePattern = value },
            disabled: uploadRuleLoading.value,
            class: 'editor-item-field',
            placeholder: '{yyyyMMddHHmmss}_{random8}',
          })
        }
        if (row.key === 'remark') {
          return h(Textarea, {
            value: String(uploadRuleForm.remark || ''),
            'onUpdate:value': (value: string) => { uploadRuleForm.remark = value },
            disabled: uploadRuleLoading.value,
            class: 'editor-item-field',
            autoSize: { minRows: 2, maxRows: 4 },
            placeholder: '说明该规则的适用范围',
          })
        }
        return (uploadRuleForm.previewFileName as string) || '--'
      },
      meta: { width: 380 },
    },
  ])
}

export function isUploadRuleListRow(moduleKey: string, record: ModuleRecord | null | undefined) {
  return moduleKey === 'general-settings' && String(record?.ruleType || '') === 'UPLOAD_RULE'
}

export function shouldHideUploadRuleListValue(record: ModuleRecord | null | undefined, columnKey: string) {
  return String(record?.ruleType || '') === 'UPLOAD_RULE' && uploadRuleHiddenListKeys.has(columnKey)
}

function isUploadRuleFeatureResponse(value: unknown): value is UploadRuleFeatureResponse {
  return Boolean(value && typeof value === 'object' && 'code' in value)
}

export function useUploadRuleSupport(options: UseUploadRuleSupportOptions) {
  const uploadRuleVisible = ref(false)
  const uploadRuleLoading = ref(false)
  const uploadRuleSaving = ref(false)
  const activeUploadRuleRowId = ref('')
  const uploadRuleForm = reactive<UploadRuleFormState>({
    id: '',
    moduleKey: '',
    moduleName: '',
    ruleCode: '',
    ruleName: '',
    renamePattern: '',
    status: '',
    remark: '',
    previewFileName: '',
  })
  const uploadRuleStatusText = computed(() => uploadRuleForm.status || enabledStatusValues[0])
  const uploadRuleFeatureQuery = useQuery({
    queryKey: computed(() => ['page-upload-rule', options.moduleKey.value]),
    queryFn: async () => {
      try {
        return (await getPageUploadRule(options.moduleKey.value)) ?? null
      } catch {
        return null
      }
    },
    enabled: computed(() => Boolean(options.moduleKey.value) && !options.isReadOnly.value),
    placeholderData: keepPreviousData,
  })
  const attachmentFeatureEnabled = computed(() => {
    const response = uploadRuleFeatureQuery.data.value
    if (!isUploadRuleFeatureResponse(response) || !options.isSuccessCode(response.code) || !response.data) {
      return true
    }
    return String(response.data.status || '正常') === '正常'
  })

  const uploadRuleDetailRows = computed<UploadRuleDetailRow[]>(() => [
    {
      key: 'ruleCode',
      label: '规则编码',
      description: '页面上传规则固定编码',
      type: 'config',
    },
    {
      key: 'ruleName',
      label: '规则名称',
      description: '当前页面上传命名规则名称',
      type: 'config',
    },
    {
      key: 'status',
      label: '规则状态',
      description: '规则启用状态',
      type: 'config',
    },
    {
      key: 'renamePattern',
      label: '命名规则',
      description: '保存后页面选择文件和粘贴上传都会按此规则重命名',
      type: 'config',
    },
    {
      key: 'remark',
      label: '备注',
      description: '说明该规则的适用范围',
      type: 'config',
    },
    {
      key: 'previewFileName',
      label: '当前预览',
      description: '按当前规则生成的预览文件名',
      type: 'config',
    },
    ...uploadRuleTokenRows.map((item) => ({
      key: item.key,
      label: item.placeholder,
      description: item.description,
      example: item.example,
      type: 'token' as const,
    })),
  ])
  const uploadRuleTableColumns = createUploadRuleColumns(
    uploadRuleForm,
    uploadRuleStatusText,
    uploadRuleLoading,
  )
  const { table: uploadRuleTable } = useDataTable({
    data: computed(() => uploadRuleDetailRows.value as Record<string, unknown>[]),
    columns: uploadRuleTableColumns,
    getRowId: (row) => String(row.key ?? ''),
    manualPagination: false,
    enableSorting: false,
  })
  const uploadRuleExpandedRowKeys = computed(() =>
    uploadRuleVisible.value && activeUploadRuleRowId.value ? [activeUploadRuleRowId.value] : [],
  )

  function getUploadRuleModuleKey(record: ModuleRecord | null | undefined) {
    return String(record?.moduleKey || '')
  }

  function isCurrentUploadRuleListRow(record: ModuleRecord | null | undefined) {
    return isUploadRuleListRow(options.moduleKey.value, record)
  }

  function resetUploadRuleForm() {
    uploadRuleForm.id = ''
    uploadRuleForm.moduleKey = ''
    uploadRuleForm.moduleName = ''
    uploadRuleForm.ruleCode = ''
    uploadRuleForm.ruleName = ''
    uploadRuleForm.renamePattern = ''
    uploadRuleForm.status = ''
    uploadRuleForm.remark = ''
    uploadRuleForm.previewFileName = ''
  }

  function resetUploadRuleState() {
    uploadRuleVisible.value = false
    uploadRuleLoading.value = false
    uploadRuleSaving.value = false
    activeUploadRuleRowId.value = ''
    resetUploadRuleForm()
  }

  function closeUploadRuleDialog() {
    uploadRuleVisible.value = false
    activeUploadRuleRowId.value = ''
  }

  async function loadUploadRule(moduleKey: string, force = false) {
    if (!moduleKey) {
      return
    }
    if (uploadRuleLoading.value || (!force && uploadRuleForm.id && uploadRuleForm.moduleKey === moduleKey)) {
      return
    }

    uploadRuleLoading.value = true
    resetUploadRuleForm()
    try {
      const response = await getPageUploadRule(moduleKey)
      if (!response || !options.isSuccessCode(response.code) || !response.data) {
        throw new Error(response?.message || '加载页面上传命名规则失败')
      }
      uploadRuleForm.id = String(response.data.id || '')
      uploadRuleForm.moduleKey = String(response.data.moduleKey || moduleKey)
      uploadRuleForm.moduleName = String(response.data.moduleName || '')
      uploadRuleForm.ruleCode = String(response.data.ruleCode || '')
      uploadRuleForm.ruleName = String(response.data.ruleName || '')
      uploadRuleForm.renamePattern = String(response.data.renamePattern || '')
      uploadRuleForm.status = String(response.data.status || '')
      uploadRuleForm.remark = String(response.data.remark || '')
      uploadRuleForm.previewFileName = String(response.data.previewFileName || '')
    } catch (error) {
      options.showRequestError(error, '加载页面上传命名规则失败')
    } finally {
      uploadRuleLoading.value = false
    }
  }

  async function openUploadRuleDialog(record: ModuleRecord) {
    if (!options.canViewRecords.value) {
      message.warning('暂无查看权限')
      return
    }

    const moduleKey = getUploadRuleModuleKey(record)
    if (!moduleKey) {
      message.warning('页面上传命名规则缺少页面标识')
      return
    }

    activeUploadRuleRowId.value = String(record.id || '')
    uploadRuleVisible.value = true
    await loadUploadRule(moduleKey, true)
  }

  function handleUploadRuleRowExpand(expanded: boolean, record: ModuleRecord) {
    if (!isCurrentUploadRuleListRow(record)) {
      return
    }
    if (expanded) {
      void openUploadRuleDialog(record)
      return
    }
    closeUploadRuleDialog()
  }

  async function handleUploadRuleRecordView(record: ModuleRecord) {
    if (!isCurrentUploadRuleListRow(record)) {
      return false
    }
    if (uploadRuleVisible.value && activeUploadRuleRowId.value === String(record.id || '')) {
      closeUploadRuleDialog()
      return true
    }
    await openUploadRuleDialog(record)
    return true
  }

  async function handleUploadRuleRecordEdit(record: ModuleRecord) {
    if (!isCurrentUploadRuleListRow(record)) {
      return false
    }
    if (!options.canEditRecords.value) {
      message.warning('暂无编辑权限')
      return true
    }
    await openUploadRuleDialog(record)
    return true
  }

  function canSelectGridRecord(record: ModuleRecord) {
    return !isCurrentUploadRuleListRow(record)
  }

  function canUseRecordActions(record: ModuleRecord | null | undefined) {
    return !isCurrentUploadRuleListRow(record)
  }

  function getRecordActionBlockedMessage(record: ModuleRecord | null | undefined, actionLabel: string) {
    if (!isCurrentUploadRuleListRow(record)) {
      return ''
    }
    return `页面上传命名规则不支持${actionLabel}`
  }

  function renderUploadRuleRowActions(record: ModuleRecord): VNodeChild {
    if (!isCurrentUploadRuleListRow(record)) {
      return null
    }
    return h(ModuleUploadRuleRowActions, {
      record,
      canView: options.canViewRecords.value,
      canEdit: !options.isReadOnly.value && options.canEditRecords.value,
      expanded: uploadRuleVisible.value,
      active: activeUploadRuleRowId.value === String(record.id || ''),
      onToggle: (row: ModuleRecord) => {
        void handleUploadRuleRecordView(row)
      },
    })
  }

  function renderUploadRuleExpandedRow(record: ModuleRecord): VNodeChild {
    if (!isCurrentUploadRuleListRow(record)) {
      return null
    }
    return h(ModuleUploadRuleExpandedRow, {
      loading: uploadRuleLoading.value,
      form: uploadRuleForm,
      table: uploadRuleTable,
      saving: uploadRuleSaving.value,
      canEdit: options.canEditRecords.value,
      onClose: closeUploadRuleDialog,
      onSave: () => {
        void handleSaveUploadRule()
      },
    })
  }

  async function handleSaveUploadRule() {
    if (!options.canEditRecords.value) {
      message.warning('暂无编辑权限')
      return
    }
    if (!uploadRuleForm.moduleKey) {
      message.warning('页面上传命名规则缺少页面标识')
      return
    }

    const renamePattern = uploadRuleForm.renamePattern.trim()
    if (!renamePattern) {
      message.warning('请先填写页面上传命名规则')
      return
    }

    uploadRuleSaving.value = true
    try {
      const response = await updatePageUploadRule(uploadRuleForm.moduleKey, {
        renamePattern,
        status: uploadRuleForm.status || '正常',
        remark: uploadRuleForm.remark.trim(),
      })
      if (!options.isSuccessCode(response.code) || !response.data) {
        throw new Error(response.message || '保存页面上传命名规则失败')
      }
      uploadRuleForm.id = String(response.data.id || '')
      uploadRuleForm.ruleCode = String(response.data.ruleCode || '')
      uploadRuleForm.ruleName = String(response.data.ruleName || '')
      uploadRuleForm.renamePattern = String(response.data.renamePattern || renamePattern)
      uploadRuleForm.status = String(response.data.status || '')
      uploadRuleForm.remark = String(response.data.remark || '')
      uploadRuleForm.previewFileName = String(response.data.previewFileName || '')
      await Promise.all([
        options.refreshModuleQueries(),
        uploadRuleFeatureQuery.refetch(),
      ])
      message.success(response.message || '页面上传命名规则已更新')
    } catch (error) {
      options.showRequestError(error, '保存页面上传命名规则失败')
    } finally {
      uploadRuleSaving.value = false
    }
  }

  const uploadRuleGridTableHooks = {
    canSelectRecord: canSelectGridRecord,
    customExpandedRowKeys: uploadRuleExpandedRowKeys,
    isCustomExpandableRow: isCurrentUploadRuleListRow,
    handleCustomRowExpand: handleUploadRuleRowExpand,
  }

  const uploadRuleRecordActionGuards = {
    canUseRecordActions,
    getRecordActionBlockedMessage,
  }

  const uploadRuleGridRowRenderers = {
    isCustomGridRow: isCurrentUploadRuleListRow,
    customRowActionsRenderer: renderUploadRuleRowActions,
    customExpandedRowRenderer: renderUploadRuleExpandedRow,
  }

  return {
    attachmentFeatureEnabled,
    handleUploadRuleRecordEdit,
    handleUploadRuleRecordView,
    resetUploadRuleState,
    uploadRuleGridTableHooks,
    uploadRuleGridRowRenderers,
    uploadRuleRecordActionGuards,
  }
}
