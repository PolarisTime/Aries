<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { EditOutlined, ReloadOutlined, SettingOutlined, UploadOutlined } from '@ant-design/icons-vue'
import {
  getPageUploadRule,
  listAllBusinessModuleRows,
  saveBusinessModule,
  updatePageUploadRule,
  type UploadRuleRecord,
} from '@/api/business'
import { useRequestError } from '@/composables/use-request-error'
import { usePermissionStore } from '@/stores/permission'
import type { ModuleRecord } from '@/types/module-page'

type EditorKind = 'number-rule' | 'upload-rule'

interface NumberRuleFormState {
  id: string
  settingCode: string
  settingName: string
  billName: string
  prefix: string
  dateRule: string
  serialLength: number
  resetRule: string
  status: string
  remark: string
}

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

const permissionStore = usePermissionStore()

const loading = ref(false)
const saving = ref(false)
const keyword = ref('')
const status = ref<string | undefined>(undefined)
const rows = ref<ModuleRecord[]>([])
const editorVisible = ref(false)
const editorKind = ref<EditorKind>('number-rule')
const numberRuleForm = reactive<NumberRuleFormState>({
  id: '',
  settingCode: '',
  settingName: '',
  billName: '',
  prefix: '',
  dateRule: 'yyyy',
  serialLength: 6,
  resetRule: 'YEARLY',
  status: '正常',
  remark: '',
})
const uploadRuleForm = reactive<UploadRuleFormState>({
  id: '',
  moduleKey: '',
  moduleName: '',
  ruleCode: '',
  ruleName: '',
  renamePattern: '',
  status: '正常',
  remark: '',
  previewFileName: '',
})

const canEdit = computed(() => permissionStore.can('general-setting', 'update'))

const DATE_RULE_OPTIONS = [
  { label: '按年（yyyy）', value: 'yyyy' },
  { label: '按月（yyyyMM）', value: 'yyyyMM' },
  { label: '无日期', value: 'NONE' },
]

const RESET_RULE_OPTIONS = [
  { label: '按年重置', value: 'YEARLY' },
  { label: '按月重置', value: 'MONTHLY' },
  { label: '永不重置', value: 'NEVER' },
]

const numberRuleTokenHints = [
  '{date}', '{yyyy}', '{yy}', '{MM}', '{dd}', '{yyyyMM}', '{yyyyMMdd}', '{seq}',
]

const uploadRuleTokenHints = [
  '{yyyy}', '{yyyyMMdd}', '{HHmmss}', '{yyyyMMddHHmmss}',
  '{timestamp}', '{random8}', '{originName}', '{ext}',
]
const showRequestError = useRequestError()

function isUploadRule(record: ModuleRecord) {
  return String(record.ruleType || '') === 'UPLOAD_RULE'
}

function isSystemSwitch(record: ModuleRecord) {
  if (isUploadRule(record)) {
    return false
  }
  const settingCode = String(record.settingCode || '')
  return settingCode.startsWith('UI_') || settingCode.startsWith('SYS_')
}

function isNumberRule(record: ModuleRecord) {
  return !isUploadRule(record) && !isSystemSwitch(record)
}

function matchesKeyword(record: ModuleRecord, searchKeyword: string) {
  if (!searchKeyword.trim()) {
    return true
  }
  const normalized = searchKeyword.trim().toLowerCase()
  return [
    record.settingCode,
    record.settingName,
    record.billName,
    record.prefix,
    record.sampleNo,
    record.remark,
    record.moduleKey,
  ].some((item) => String(item || '').toLowerCase().includes(normalized))
}

const filteredRows = computed(() =>
  rows.value.filter((record) => {
    if (status.value && String(record.status || '') !== status.value) {
      return false
    }
    return matchesKeyword(record, keyword.value)
  }),
)

const numberRuleRows = computed(() => filteredRows.value.filter(isNumberRule))
const uploadRuleRows = computed(() => filteredRows.value.filter(isUploadRule))

const overviewItems = computed(() => ([
  { label: '单号规则', value: String(rows.value.filter(isNumberRule).length) },
  { label: '上传规则', value: String(rows.value.filter(isUploadRule).length) },
  { label: '禁用上传规则', value: String(rows.value.filter((row) => isUploadRule(row) && String(row.status || '') === '禁用').length) },
]))

const numberRulePreview = computed(() =>
  buildRuleSampleNo(numberRuleForm.prefix, numberRuleForm.dateRule, numberRuleForm.serialLength),
)

const uploadRulePreview = computed(() =>
  buildUploadRulePreview(uploadRuleForm.renamePattern) || uploadRuleForm.previewFileName || '--',
)

function formatStatusText(value: string | null | undefined) {
  return String(value || '') === '正常' ? '正常' : '禁用'
}

function formatStatusColor(value: string | null | undefined) {
  return String(value || '') === '正常' ? 'success' : 'default'
}

function formatDateRuleLabel(value: string | null | undefined) {
  const normalized = String(value || '').trim()
  return DATE_RULE_OPTIONS.find((item) => item.value === normalized)?.label || normalized || '--'
}

function formatResetRuleLabel(value: string | null | undefined) {
  const normalized = String(value || '').trim()
  return RESET_RULE_OPTIONS.find((item) => item.value === normalized)?.label || normalized || '--'
}

function formatUploadRuleStatusHelp(statusValue: string) {
  return statusValue === '正常'
    ? '启用后，该页面显示附件标志，并允许上传、绑定和维护附件。'
    : '禁用后，该页面隐藏附件标志，不显示附件入口。'
}

function buildRuleSampleNo(prefix: string, dateRule: string, serialLength: number) {
  const now = new Date()
  const year = String(now.getFullYear())
  const shortYear = year.slice(-2)
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const normalizedDateRule = String(dateRule || '').trim()
  const normalizedPrefix = String(prefix || '').trim()
  const serial = '1'.padStart(Math.max(1, Number(serialLength || 1)), '0')

  if (!normalizedPrefix) {
    return ''
  }

  if (normalizedPrefix.includes('{')) {
    return normalizedPrefix
      .replaceAll('{date}', normalizedDateRule === 'yyyyMM' ? `${year}${month}` : normalizedDateRule === 'NONE' ? '' : year)
      .replaceAll('{yyyy}', year)
      .replaceAll('{yy}', shortYear)
      .replaceAll('{MM}', month)
      .replaceAll('{dd}', day)
      .replaceAll('{yyyyMM}', `${year}${month}`)
      .replaceAll('{yyyyMMdd}', `${year}${month}${day}`)
      .replaceAll('{seq}', serial)
  }

  if (normalizedDateRule === 'yyyyMM') {
    return `${year}${month}${normalizedPrefix.toUpperCase()}${serial}`
  }
  if (normalizedDateRule === 'NONE') {
    return `${normalizedPrefix.toUpperCase()}${serial}`
  }
  return `${year}${normalizedPrefix.toUpperCase()}${serial}`
}

function buildUploadRulePreview(pattern: string) {
  const normalized = pattern.trim()
  if (!normalized) {
    return ''
  }

  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hour = String(now.getHours()).padStart(2, '0')
  const minute = String(now.getMinutes()).padStart(2, '0')
  const second = String(now.getSeconds()).padStart(2, '0')

  let preview = normalized
    .replaceAll('{yyyy}', year)
    .replaceAll('{yyyyMMdd}', `${year}${month}${day}`)
    .replaceAll('{HHmmss}', `${hour}${minute}${second}`)
    .replaceAll('{yyyyMMddHHmmss}', `${year}${month}${day}${hour}${minute}${second}`)
    .replaceAll('{timestamp}', String(now.getTime()))
    .replaceAll('{random8}', 'preview1')
    .replaceAll('{originName}', 'sample-file')
    .replaceAll('{ext}', 'pdf')

  if (normalized.includes('{ext}')) {
    preview = preview.replace(/(^|[^.])pdf$/, '$1.pdf')
  } else {
    preview = `${preview}.pdf`
  }

  return preview
}

function resetEditorState() {
  editorVisible.value = false
  saving.value = false
  numberRuleForm.id = ''
  numberRuleForm.settingCode = ''
  numberRuleForm.settingName = ''
  numberRuleForm.billName = ''
  numberRuleForm.prefix = ''
  numberRuleForm.dateRule = 'yyyy'
  numberRuleForm.serialLength = 6
  numberRuleForm.resetRule = 'YEARLY'
  numberRuleForm.status = '正常'
  numberRuleForm.remark = ''
  uploadRuleForm.id = ''
  uploadRuleForm.moduleKey = ''
  uploadRuleForm.moduleName = ''
  uploadRuleForm.ruleCode = ''
  uploadRuleForm.ruleName = ''
  uploadRuleForm.renamePattern = ''
  uploadRuleForm.status = '正常'
  uploadRuleForm.remark = ''
  uploadRuleForm.previewFileName = ''
}

async function loadSettings() {
  loading.value = true
  try {
    const allRows = await listAllBusinessModuleRows('general-settings', {})
    rows.value = allRows.filter((record) => isNumberRule(record) || isUploadRule(record))
  } catch (error) {
    showRequestError(error, '加载单号规则失败')
  } finally {
    loading.value = false
  }
}

function openNumberRuleEditor(record: ModuleRecord) {
  editorKind.value = 'number-rule'
  numberRuleForm.id = String(record.id || '')
  numberRuleForm.settingCode = String(record.settingCode || '')
  numberRuleForm.settingName = String(record.settingName || '')
  numberRuleForm.billName = String(record.billName || '')
  numberRuleForm.prefix = String(record.prefix || '')
  numberRuleForm.dateRule = String(record.dateRule || 'yyyy')
  numberRuleForm.serialLength = Number(record.serialLength || 6)
  numberRuleForm.resetRule = String(record.resetRule || 'YEARLY')
  numberRuleForm.status = String(record.status || '正常')
  numberRuleForm.remark = String(record.remark || '')
  editorVisible.value = true
}

function fillUploadRuleForm(record: UploadRuleRecord) {
  uploadRuleForm.id = String(record.id || '')
  uploadRuleForm.moduleKey = String(record.moduleKey || '')
  uploadRuleForm.moduleName = String(record.moduleName || '')
  uploadRuleForm.ruleCode = String(record.ruleCode || '')
  uploadRuleForm.ruleName = String(record.ruleName || '')
  uploadRuleForm.renamePattern = String(record.renamePattern || '')
  uploadRuleForm.status = String(record.status || '正常')
  uploadRuleForm.remark = String(record.remark || '')
  uploadRuleForm.previewFileName = String(record.previewFileName || '')
}

async function openUploadRuleEditor(record: ModuleRecord) {
  editorKind.value = 'upload-rule'
  editorVisible.value = true
  saving.value = false
  try {
    const response = await getPageUploadRule(String(record.moduleKey || 'general-settings'))
    if (Number(response.code) !== 0 || !response.data) {
      throw new Error(response.message || '加载上传规则失败')
    }
    fillUploadRuleForm(response.data)
  } catch (error) {
    showRequestError(error, '加载上传规则失败')
    resetEditorState()
  }
}

async function handleSave() {
  if (!canEdit.value) {
    message.warning('暂无编辑权限')
    return
  }

  saving.value = true
  try {
    if (editorKind.value === 'number-rule') {
      if (!numberRuleForm.prefix.trim()) {
        message.warning('请填写规则模板')
        return
      }
      if (numberRuleForm.prefix.includes('{') && !numberRuleForm.prefix.includes('{seq}')) {
        message.warning('规则模板包含魔法变量时必须包含 {seq}')
        return
      }
      await saveBusinessModule('general-settings', {
        id: numberRuleForm.id,
        settingCode: numberRuleForm.settingCode,
        settingName: numberRuleForm.settingName,
        billName: numberRuleForm.billName,
        prefix: numberRuleForm.prefix.trim(),
        dateRule: numberRuleForm.dateRule,
        serialLength: Math.max(1, Number(numberRuleForm.serialLength || 1)),
        resetRule: numberRuleForm.resetRule,
        sampleNo: numberRulePreview.value,
        status: numberRuleForm.status,
        remark: numberRuleForm.remark.trim(),
      })
      message.success('单号规则已更新')
    } else {
      if (!uploadRuleForm.renamePattern.trim()) {
        message.warning('请填写上传命名规则')
        return
      }
      const response = await updatePageUploadRule(uploadRuleForm.moduleKey, {
        renamePattern: uploadRuleForm.renamePattern.trim(),
        status: uploadRuleForm.status,
        remark: uploadRuleForm.remark.trim(),
      })
      if (Number(response.code) !== 0 || !response.data) {
        throw new Error(response.message || '更新上传规则失败')
      }
      fillUploadRuleForm(response.data)
      message.success(response.message || '上传规则已更新')
    }

    await loadSettings()
    editorVisible.value = false
  } catch (error) {
    showRequestError(error, '保存单号规则失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void loadSettings()
})

function appendNumberRuleToken(token: string) {
  numberRuleForm.prefix = `${numberRuleForm.prefix || ''}${token}`
}
</script>

<template>
  <div class="page-stack number-rules-page">
    <div class="status-section">
      <div class="status-header">
        <div class="status-header-main">
          <span class="status-title">单号规则</span>
          <span class="status-subtitle">这里统一维护单号规则和上传规则。单号规则支持魔法变量自由拼装；上传规则可单独启停，禁用后目标页面隐藏附件标志。</span>
        </div>
        <a-button size="small" :loading="loading" @click="loadSettings">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </div>

      <div class="overview-grid">
        <div v-for="item in overviewItems" :key="item.label" class="overview-card">
          <span class="overview-label">{{ item.label }}</span>
          <strong class="overview-value">{{ item.value }}</strong>
        </div>
      </div>
    </div>

    <a-card :bordered="false" class="module-panel-card">
      <div class="toolbar-row">
        <a-input-search
          v-model:value="keyword"
          allow-clear
          placeholder="搜索编码 / 名称 / 页面 / 模板"
          style="width: 320px"
        />
        <a-select
          v-model:value="status"
          allow-clear
          placeholder="全部状态"
          style="width: 140px"
        >
          <a-select-option value="正常">正常</a-select-option>
          <a-select-option value="禁用">禁用</a-select-option>
        </a-select>
      </div>

      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 16px"
        message="维护说明"
        description="单号规则影响后续新生成的单据编号。规则模板支持 {date} / {yyyy} / {yy} / {MM} / {dd} / {yyyyMM} / {yyyyMMdd} / {seq} 魔法变量；其中 {date} 使用右侧日期规则，{seq} 使用流水位数和重置规则。"
      />

      <section class="setting-group">
        <div class="setting-group-head">
          <div class="setting-group-title">
            <SettingOutlined />
            <span>单号规则</span>
          </div>
          <span class="setting-group-count">{{ numberRuleRows.length }} 项</span>
        </div>
        <a-table
          row-key="id"
          size="middle"
          bordered
          :data-source="numberRuleRows"
          :loading="loading"
          :pagination="false"
          :scroll="{ x: 1320 }"
        >
          <a-table-column key="billName" title="单据" data-index="billName" width="140" />
          <a-table-column key="settingName" title="规则名称" data-index="settingName" width="180" />
          <a-table-column key="prefix" title="规则模板" data-index="prefix" width="240" />
          <a-table-column key="dateRule" title="日期规则" width="150">
            <template #default="{ record }">{{ formatDateRuleLabel(record.dateRule) }}</template>
          </a-table-column>
          <a-table-column key="serialLength" title="流水位数" data-index="serialLength" width="100" align="right" />
          <a-table-column key="resetRule" title="重置规则" width="120">
            <template #default="{ record }">{{ formatResetRuleLabel(record.resetRule) }}</template>
          </a-table-column>
          <a-table-column key="sampleNo" title="示例单号" data-index="sampleNo" width="180" />
          <a-table-column key="status" title="状态" width="100" align="center">
            <template #default="{ record }">
              <a-tag :color="formatStatusColor(String(record.status || ''))">
                {{ formatStatusText(String(record.status || '')) }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column key="remark" title="备注" data-index="remark" width="220" />
          <a-table-column key="action" title="操作" width="90" align="center" fixed="right">
            <template #default="{ record }">
              <a-button type="link" :disabled="!canEdit" @click="openNumberRuleEditor(record)">
                <EditOutlined /> 编辑
              </a-button>
            </template>
          </a-table-column>
        </a-table>
      </section>

      <section class="setting-group">
        <div class="setting-group-head">
          <div class="setting-group-title">
            <UploadOutlined />
            <span>上传规则</span>
          </div>
          <span class="setting-group-count">{{ uploadRuleRows.length }} 项</span>
        </div>
        <a-table
          row-key="id"
          size="middle"
          bordered
          :data-source="uploadRuleRows"
          :loading="loading"
          :pagination="false"
          :scroll="{ x: 1160 }"
        >
          <a-table-column key="moduleKey" title="页面标识" data-index="moduleKey" width="180" />
          <a-table-column key="billName" title="适用页面" data-index="billName" width="160" />
          <a-table-column key="prefix" title="命名规则" data-index="prefix" width="300" />
          <a-table-column key="sampleNo" title="预览文件名" data-index="sampleNo" width="220" />
          <a-table-column key="status" title="状态" width="100" align="center">
            <template #default="{ record }">
              <a-tag :color="formatStatusColor(String(record.status || ''))">
                {{ formatStatusText(String(record.status || '')) }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column key="remark" title="备注" data-index="remark" width="220" />
          <a-table-column key="action" title="操作" width="90" align="center" fixed="right">
            <template #default="{ record }">
              <a-button type="link" :disabled="!canEdit" @click="openUploadRuleEditor(record)">
                <EditOutlined /> 编辑
              </a-button>
            </template>
          </a-table-column>
        </a-table>
      </section>
    </a-card>

    <a-modal
      :open="editorVisible"
      :title="editorKind === 'number-rule' ? '编辑单号规则' : '编辑上传规则'"
      :confirm-loading="saving"
      :width="editorKind === 'upload-rule' ? 760 : 760"
      ok-text="保存"
      cancel-text="取消"
      @ok="handleSave"
      @cancel="resetEditorState"
    >
      <template v-if="editorKind === 'number-rule'">
        <a-form layout="vertical">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="规则名称">
                <a-input :value="numberRuleForm.settingName" disabled />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="适用单据">
                <a-input :value="numberRuleForm.billName" disabled />
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="16">
            <a-col :span="24">
              <a-form-item label="规则模板" required>
                <a-input v-model:value="numberRuleForm.prefix" :maxlength="64" placeholder="例如 {date}SO{seq}" />
                <div class="field-help-text">
                  可用变量：{{ numberRuleTokenHints.join(' / ') }}
                </div>
                <div class="number-rule-token-row">
                  <a-button
                    v-for="token in numberRuleTokenHints"
                    :key="token"
                    size="small"
                    @click="appendNumberRuleToken(token)"
                  >
                    {{ token }}
                  </a-button>
                </div>
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="日期规则" required>
                <a-select v-model:value="numberRuleForm.dateRule">
                  <a-select-option v-for="item in DATE_RULE_OPTIONS" :key="item.value" :value="item.value">
                    {{ item.label }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="流水位数" required>
                <a-input-number v-model:value="numberRuleForm.serialLength" :min="1" :max="12" style="width: 100%" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="重置规则" required>
                <a-select v-model:value="numberRuleForm.resetRule">
                  <a-select-option v-for="item in RESET_RULE_OPTIONS" :key="item.value" :value="item.value">
                    {{ item.label }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="状态">
                <a-select v-model:value="numberRuleForm.status">
                  <a-select-option value="正常">正常</a-select-option>
                  <a-select-option value="禁用">禁用</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="示例单号">
            <a-input :value="numberRulePreview" disabled />
          </a-form-item>
          <a-form-item label="备注">
            <a-textarea v-model:value="numberRuleForm.remark" :rows="3" placeholder="补充该规则的使用说明" />
          </a-form-item>
        </a-form>
      </template>

      <template v-else>
        <a-form layout="vertical">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="规则名称">
                <a-input :value="uploadRuleForm.ruleName" disabled />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="适用页面">
                <a-input :value="uploadRuleForm.moduleName || uploadRuleForm.moduleKey" disabled />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="规则编码">
            <a-input :value="uploadRuleForm.ruleCode" disabled />
          </a-form-item>
          <a-form-item label="命名规则" required>
            <a-input
              v-model:value="uploadRuleForm.renamePattern"
              placeholder="{yyyyMMddHHmmss}_{random8}"
            />
            <div class="field-help-text">
              可用占位符：{{ uploadRuleTokenHints.join(' / ') }}
            </div>
          </a-form-item>
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="启用状态">
                <a-select v-model:value="uploadRuleForm.status">
                  <a-select-option value="正常">正常</a-select-option>
                  <a-select-option value="禁用">禁用</a-select-option>
                </a-select>
                <div class="field-help-text">
                  {{ formatUploadRuleStatusHelp(uploadRuleForm.status) }}
                </div>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="预览文件名">
                <a-input :value="uploadRulePreview" disabled />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="备注">
            <a-textarea v-model:value="uploadRuleForm.remark" :rows="3" placeholder="说明该规则的适用范围" />
          </a-form-item>
        </a-form>
      </template>
    </a-modal>
  </div>
</template>

<style scoped>
.status-section {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
}

.status-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.status-header-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status-title {
  font-size: 18px;
  font-weight: 600;
  color: #262626;
}

.status-subtitle {
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.7;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.overview-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
  border-radius: 12px;
  background: linear-gradient(180deg, #fafafa 0%, #fff 100%);
  border: 1px solid #f0f0f0;
}

.overview-label {
  color: rgba(0, 0, 0, 0.45);
}

.overview-value {
  font-size: 24px;
  color: #1f1f1f;
}

.toolbar-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.setting-group + .setting-group {
  margin-top: 24px;
}

.setting-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.setting-group-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.setting-group-count {
  color: rgba(0, 0, 0, 0.45);
}

.field-help-text {
  margin-top: 8px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.6;
}

.number-rule-token-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

@media (max-width: 900px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .status-header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
