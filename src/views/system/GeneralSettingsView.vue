<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { EditOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons-vue'
import { listAllBusinessModuleRows, saveBusinessModule } from '@/api/business'
import { useRequestError } from '@/composables/use-request-error'
import { usePermissionStore } from '@/stores/permission'
import type { ModuleRecord } from '@/types/module-page'

defineProps<{
  moduleKey?: string
}>()

const DEFAULT_TAX_RATE_SETTING_CODE = 'SYS_DEFAULT_TAX_RATE'
const SYSTEM_SWITCH_HELP_TEXT: Record<string, string> = {
  SYS_DEFAULT_TAX_RATE: '用于发票默认税率与税额自动计算，修改后新开票草稿会使用该值。',
  UI_WEIGHT_ONLY_PURCHASE_INBOUNDS: '启用后，采购入库页面切换到重量视图，隐藏金额和单价字段。',
  UI_WEIGHT_ONLY_SALES_OUTBOUNDS: '启用后，销售出库页面切换到重量视图，隐藏金额和单价字段。',
  SYS_CUSTOMER_STATEMENT_RECEIPT_ZERO_FROM_SALES_ORDER: '启用后，生成客户对账单草稿时默认收款金额为 0，期末余额等于所选销售订单总金额；关闭后默认收款金额等于所选销售订单总金额。',
  SYS_SUPPLIER_STATEMENT_FULL_PAYMENT_FROM_PURCHASE: '启用后，生成供应商对账单草稿时默认付款金额等于所选采购单据总金额；关闭后按账期内已付款记录自动汇总。',
  SYS_OPERATION_LOG_RECORD_ALL_WRITE: '启用后，普通写操作会按新增、编辑、删除、审核、导出、打印自动记录；权限变更、角色授权、API Key、2FA、密钥轮转、数据库导入导出等高风险动作会按显式细分动作记录。日志包含操作人、模块、动作、业务单号或对象标识、请求路径和结果状态；GET、HEAD、OPTIONS 等只读请求不自动记录。关闭后，仅记录显式声明了操作日志的接口。',
  SYS_OPERATION_LOG_DETAILED_PAGE_ACTIONS: '启用后，会按照下方勾选项自动记录页面层操作。开启时优先使用勾选动作控制自动日志范围；未显式勾选的查询、查看、编辑等页面操作不会自动记录。',
  SYS_OPERATION_LOG_RECORD_AUTH_EVENTS: '启用后，登录成功、登录失败、2FA 验证失败和退出登录会写入操作日志，便于审计账号访问行为；关闭后不记录这些认证事件。',
  SYS_FORCE_USER_TOTP_ON_FIRST_LOGIN: '启用后，管理员新增的账号首次使用密码登录时，会先进入专用安全引导页；在完成 2FA 绑定前不能进入业务页面，但仍允许先用初始密码修改为个人密码。',
  SYS_BATCH_NO_AUTO_GENERATE: '启用后，批号管理商品在明细未填写批号时，系统按“单号规则”中的批号生成规则自动补齐；关闭后仍按当前手工录入与必填校验处理。',
}

const DETAILED_OPERATION_ACTION_OPTIONS = [
  { label: '查询', value: 'QUERY' },
  { label: '查看', value: 'DETAIL' },
  { label: '新增', value: 'CREATE' },
  { label: '编辑', value: 'EDIT' },
  { label: '删除', value: 'DELETE' },
  { label: '审核', value: 'AUDIT' },
  { label: '导出', value: 'EXPORT' },
  { label: '打印', value: 'PRINT' },
]

const DETAILED_OPERATION_SWITCH_CODE = 'SYS_OPERATION_LOG_DETAILED_PAGE_ACTIONS'

interface SettingFormState {
  id: string
  settingCode: string
  settingName: string
  billName: string
  enabled: boolean
  selectedActions: string[]
  numericValue: number
  remark: string
}

const permissionStore = usePermissionStore()

const loading = ref(false)
const saving = ref(false)
const keyword = ref('')
const status = ref<string | undefined>(undefined)
const rows = ref<ModuleRecord[]>([])
const editorVisible = ref(false)
const showRequestError = useRequestError()
const settingForm = reactive<SettingFormState>({
  id: '',
  settingCode: '',
  settingName: '',
  billName: '',
  enabled: true,
  selectedActions: [],
  numericValue: 0.13,
  remark: '',
})

const canEdit = computed(() => permissionStore.can('general-setting', 'update'))

function isUploadRule(record: ModuleRecord) {
  return String(record.ruleType || '') === 'UPLOAD_RULE'
}

function isSystemSetting(record: ModuleRecord) {
  if (isUploadRule(record)) {
    return false
  }
  const settingCode = String(record.settingCode || '')
  return settingCode.startsWith('UI_') || settingCode.startsWith('SYS_')
}

function isDefaultTaxRateSetting(record: ModuleRecord | SettingFormState) {
  return String(record.settingCode || '').trim() === DEFAULT_TAX_RATE_SETTING_CODE
}

function isToggleSetting(record: ModuleRecord | SettingFormState) {
  return !isDefaultTaxRateSetting(record)
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
    record.remark,
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

const basicSettingRows = computed(() => filteredRows.value.filter((record) => isDefaultTaxRateSetting(record)))
const switchRows = computed(() => filteredRows.value.filter((record) => isToggleSetting(record)))

const overviewItems = computed(() => ([
  { label: '基础参数', value: String(basicSettingRows.value.length) },
  { label: '系统开关', value: String(switchRows.value.length) },
  { label: '当前启用', value: String(filteredRows.value.filter((row) => String(row.status || '') === '正常').length) },
]))

function formatSwitchState(record: ModuleRecord) {
  return String(record.status || '') === '正常' ? '已启用' : '已关闭'
}

function formatSwitchColor(record: ModuleRecord) {
  return String(record.status || '') === '正常' ? 'processing' : 'default'
}

function formatSettingValue(record: ModuleRecord) {
  if (isDefaultTaxRateSetting(record)) {
    const numericValue = Number(record.sampleNo || 0)
    return Number.isFinite(numericValue) ? numericValue.toFixed(4) : '0.0000'
  }
  return String(record.sampleNo || '--')
}

function getSystemSwitchHelpText(settingCode: string | null | undefined) {
  return SYSTEM_SWITCH_HELP_TEXT[String(settingCode || '').trim()]
    || '启用后，将按该配置项定义的业务规则生效；关闭后恢复默认行为。'
}

function isDetailedOperationSwitch(settingCode: string | null | undefined) {
  return String(settingCode || '').trim() === DETAILED_OPERATION_SWITCH_CODE
}

function parseDetailedOperationActions(sampleNo: unknown) {
  const raw = String(sampleNo || '').trim()
  const selected = raw
    ? raw.split(',').map((item) => item.trim()).filter(Boolean)
    : []
  return DETAILED_OPERATION_ACTION_OPTIONS
    .map((item) => item.value)
    .filter((value) => selected.includes(value))
}

function resetEditorState() {
  editorVisible.value = false
  saving.value = false
  settingForm.id = ''
  settingForm.settingCode = ''
  settingForm.settingName = ''
  settingForm.billName = ''
  settingForm.enabled = true
  settingForm.selectedActions = []
  settingForm.numericValue = 0.13
  settingForm.remark = ''
}

async function loadSettings() {
  loading.value = true
  try {
    rows.value = (await listAllBusinessModuleRows('general-settings', {})).filter(isSystemSetting)
  } catch (error) {
    showRequestError(error, '加载通用设置失败')
  } finally {
    loading.value = false
  }
}

function openSettingEditor(record: ModuleRecord) {
  settingForm.id = String(record.id || '')
  settingForm.settingCode = String(record.settingCode || '')
  settingForm.settingName = String(record.settingName || '')
  settingForm.billName = String(record.billName || '')
  settingForm.enabled = String(record.status || '') === '正常'
  settingForm.selectedActions = isDetailedOperationSwitch(String(record.settingCode || ''))
    ? parseDetailedOperationActions(record.sampleNo)
    : []
  settingForm.numericValue = Number(record.sampleNo || 0.13)
  settingForm.remark = String(record.remark || '')
  editorVisible.value = true
}

async function handleSave() {
  if (!canEdit.value) {
    message.warning('暂无编辑权限')
    return
  }

  saving.value = true
  try {
    const source = rows.value.find((item) => String(item.id || '') === settingForm.id)
    if (!source) {
      throw new Error('配置记录不存在')
    }
    if (isDetailedOperationSwitch(settingForm.settingCode) && !settingForm.selectedActions.length) {
      message.warning('请至少勾选一个页面操作动作')
      return
    }
    if (isDefaultTaxRateSetting(settingForm) && settingForm.numericValue < 0) {
      message.warning('默认税率不能小于 0')
      return
    }
    await saveBusinessModule('general-settings', {
      id: settingForm.id,
      settingCode: String(source.settingCode || ''),
      settingName: String(source.settingName || ''),
      billName: String(source.billName || ''),
      prefix: String(source.prefix || 'SYS'),
      dateRule: String(source.dateRule || 'yyyy'),
      serialLength: Number(source.serialLength || 1),
      resetRule: String(source.resetRule || 'YEARLY'),
      sampleNo: isDefaultTaxRateSetting(settingForm)
        ? Number(settingForm.numericValue || 0).toFixed(4)
        : isDetailedOperationSwitch(settingForm.settingCode)
          ? settingForm.selectedActions.join(',')
          : settingForm.enabled ? 'ON' : 'OFF',
      status: isDefaultTaxRateSetting(settingForm) ? '正常' : settingForm.enabled ? '正常' : '禁用',
      remark: settingForm.remark.trim(),
    })
    message.success(isDefaultTaxRateSetting(settingForm) ? '默认税率已更新' : '系统开关已更新')
    await loadSettings()
    editorVisible.value = false
  } catch (error) {
    showRequestError(error, '保存通用设置失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void loadSettings()
})
</script>

<template>
  <div class="page-stack general-settings-page">
    <div class="status-section">
      <div class="status-header">
        <div class="status-header-main">
          <span class="status-title">通用设置</span>
          <span class="status-subtitle">这里集中维护基础参数和系统开关。默认税率已从“公司信息”迁移到本页统一维护。</span>
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
          placeholder="搜索编码 / 名称 / 适用范围"
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
        description="基础参数用于维护默认值，系统开关用于控制页面显示、草稿默认值和日志记录策略。"
      />

      <section v-if="basicSettingRows.length" class="setting-group">
        <div class="setting-group-head">
          <div class="setting-group-title">
            <SettingOutlined />
            <span>基础参数</span>
          </div>
          <span class="setting-group-count">{{ basicSettingRows.length }} 项</span>
        </div>
        <a-table
          row-key="id"
          size="middle"
          bordered
          :data-source="basicSettingRows"
          :loading="loading"
          :pagination="false"
          :scroll="{ x: 900 }"
        >
          <a-table-column key="billName" title="适用范围" data-index="billName" width="160" />
          <a-table-column key="settingName" title="参数名称" data-index="settingName" width="240" />
          <a-table-column key="sampleNo" title="当前值" width="140" align="right">
            <template #default="{ record }">
              {{ formatSettingValue(record) }}
            </template>
          </a-table-column>
          <a-table-column key="remark" title="说明" data-index="remark" width="420" />
          <a-table-column key="action" title="操作" width="90" align="center" fixed="right">
            <template #default="{ record }">
              <a-button type="link" :disabled="!canEdit" @click="openSettingEditor(record)">
                <EditOutlined /> 编辑
              </a-button>
            </template>
          </a-table-column>
        </a-table>
      </section>

      <section class="setting-group">
        <div class="setting-group-head">
          <div class="setting-group-title">
            <SettingOutlined />
            <span>系统开关</span>
          </div>
          <span class="setting-group-count">{{ switchRows.length }} 项</span>
        </div>
        <a-table
          row-key="id"
          size="middle"
          bordered
          :data-source="switchRows"
          :loading="loading"
          :pagination="false"
          :scroll="{ x: 980 }"
        >
          <a-table-column key="billName" title="适用范围" data-index="billName" width="160" />
          <a-table-column key="settingName" title="开关名称" data-index="settingName" width="300" />
          <a-table-column key="switchState" title="当前状态" width="120" align="center">
            <template #default="{ record }">
              <a-tag :color="formatSwitchColor(record)">{{ formatSwitchState(record) }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column key="remark" title="说明" data-index="remark" width="420" />
          <a-table-column key="action" title="操作" width="90" align="center" fixed="right">
            <template #default="{ record }">
              <a-button type="link" :disabled="!canEdit" @click="openSettingEditor(record)">
                <EditOutlined /> 编辑
              </a-button>
            </template>
          </a-table-column>
        </a-table>
      </section>
    </a-card>

    <a-modal
      :open="editorVisible"
      :title="isDefaultTaxRateSetting(settingForm) ? '编辑默认税率' : '编辑系统开关'"
      :confirm-loading="saving"
      :width="640"
      ok-text="保存"
      cancel-text="取消"
      @ok="handleSave"
      @cancel="resetEditorState"
    >
      <a-form layout="vertical">
        <a-form-item label="配置名称">
          <a-input :value="settingForm.settingName" disabled />
        </a-form-item>
        <a-form-item label="适用范围">
          <a-input :value="settingForm.billName" disabled />
        </a-form-item>
        <a-form-item v-if="isDefaultTaxRateSetting(settingForm)" label="默认税率">
          <a-input-number
            v-model:value="settingForm.numericValue"
            :min="0"
            :step="0.0001"
            :precision="4"
            style="width: 100%"
          />
          <div class="field-help-text">
            {{ getSystemSwitchHelpText(settingForm.settingCode) }}
          </div>
        </a-form-item>
        <template v-else>
          <a-form-item label="启用状态">
            <a-switch
              v-model:checked="settingForm.enabled"
              checked-children="启用"
              un-checked-children="关闭"
            />
            <div class="field-help-text">
              {{ getSystemSwitchHelpText(settingForm.settingCode) }}
            </div>
          </a-form-item>
          <a-form-item
            v-if="isDetailedOperationSwitch(settingForm.settingCode)"
            label="记录动作"
          >
            <a-checkbox-group
              v-model:value="settingForm.selectedActions"
              :options="DETAILED_OPERATION_ACTION_OPTIONS"
              class="action-checkbox-group"
            />
            <div class="field-help-text">
              勾选后才会自动记录对应页面动作；显式声明的高风险日志不受这里影响。
            </div>
          </a-form-item>
        </template>
        <a-form-item label="备注">
          <a-textarea
            v-model:value="settingForm.remark"
            :rows="3"
            :placeholder="isDefaultTaxRateSetting(settingForm) ? '补充税率适用说明' : '补充该系统开关的说明'"
          />
        </a-form-item>
      </a-form>
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

.action-checkbox-group {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px 8px;
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
