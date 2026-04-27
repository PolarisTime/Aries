<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  BankOutlined,
  DeleteOutlined,
  EditOutlined,
  IdcardOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons-vue'
import {
  getCompanySettingProfile,
  saveCompanySettingProfile,
  type CompanySettlementAccount,
} from '@/api/company-settings'
import { useRequestError } from '@/composables/use-request-error'
import { usePermissionStore } from '@/stores/permission'

interface SettlementAccountFormRow extends CompanySettlementAccount {
  localKey: string
}

const permissionStore = usePermissionStore()

const loading = ref(false)
const saving = ref(false)
const initialized = ref(false)
const accountRowSeed = ref(0)
const form = reactive({
  id: '',
  companyName: '',
  taxNo: '',
  settlementAccounts: [] as SettlementAccountFormRow[],
  status: '正常',
  remark: '',
})

const canView = computed(() => permissionStore.can('company-setting', 'read'))
const canSave = computed(() => permissionStore.can('company-setting', 'update'))
const showRequestError = useRequestError()

const overviewItems = computed(() => ([
  { label: '企业模式', value: '单企业' },
  { label: '主体状态', value: form.status || '--' },
  { label: '结算银行', value: `${form.settlementAccounts.length} 个` },
]))

function nextLocalKey() {
  accountRowSeed.value += 1
  return `settlement-account-${accountRowSeed.value}`
}

function createEmptySettlementAccount(): SettlementAccountFormRow {
  return {
    localKey: nextLocalKey(),
    accountName: '',
    bankName: '',
    bankAccount: '',
    usageType: '通用',
    status: '正常',
    remark: '',
  }
}

function normalizeSettlementAccounts(accounts: CompanySettlementAccount[] | undefined | null) {
  if (!accounts?.length) {
    return [createEmptySettlementAccount()]
  }
  return accounts.map((account) => ({
    ...account,
    id: account.id == null || account.id === '' ? undefined : account.id,
    accountName: String(account.accountName || ''),
    bankName: String(account.bankName || ''),
    bankAccount: String(account.bankAccount || ''),
    usageType: String(account.usageType || '通用'),
    status: String(account.status || '正常'),
    remark: String(account.remark || ''),
    localKey: nextLocalKey(),
  }))
}

function applyProfile(record: Awaited<ReturnType<typeof getCompanySettingProfile>>) {
  form.id = record?.id || ''
  form.companyName = record?.companyName || ''
  form.taxNo = record?.taxNo || ''
  form.settlementAccounts = normalizeSettlementAccounts(record?.settlementAccounts)
  form.status = record?.status || '正常'
  form.remark = record?.remark || ''
}

async function loadProfile() {
  if (!canView.value) {
    return
  }

  loading.value = true
  try {
    applyProfile(await getCompanySettingProfile())
    initialized.value = true
  } catch (error) {
    showRequestError(error, '加载公司信息失败')
  } finally {
    loading.value = false
  }
}

function addSettlementAccount() {
  form.settlementAccounts.push(createEmptySettlementAccount())
}

function removeSettlementAccount(index: number) {
  if (form.settlementAccounts.length <= 1) {
    message.warning('至少需要保留一个结算账户')
    return
  }
  form.settlementAccounts.splice(index, 1)
}

function validateForm() {
  if (!form.companyName.trim()) {
    message.warning('请输入公司名称')
    return false
  }
  if (!form.taxNo.trim()) {
    message.warning('请输入税号')
    return false
  }
  if (!form.settlementAccounts.length) {
    message.warning('请至少维护一个结算账户')
    return false
  }
  const usedBankAccounts = new Set<string>()
  for (const [index, account] of form.settlementAccounts.entries()) {
    if (!String(account.accountName || '').trim()) {
      message.warning(`请输入第 ${index + 1} 个结算账户的账户名称`)
      return false
    }
    if (!String(account.bankName || '').trim()) {
      message.warning(`请输入第 ${index + 1} 个结算账户的开户银行`)
      return false
    }
    const bankAccount = String(account.bankAccount || '').trim()
    if (!bankAccount) {
      message.warning(`请输入第 ${index + 1} 个结算账户的银行账号`)
      return false
    }
    if (usedBankAccounts.has(bankAccount)) {
      message.warning(`银行账号重复：${bankAccount}`)
      return false
    }
    usedBankAccounts.add(bankAccount)
  }
  return true
}

async function handleSave() {
  if (!canSave.value) {
    message.warning('暂无保存权限')
    return
  }
  if (!validateForm()) {
    return
  }

  saving.value = true
  try {
    const response = await saveCompanySettingProfile({
      companyName: form.companyName.trim(),
      taxNo: form.taxNo.trim(),
      settlementAccounts: form.settlementAccounts.map((account) => ({
        id: account.id == null || account.id === '' ? undefined : String(account.id),
        accountName: String(account.accountName || '').trim(),
        bankName: String(account.bankName || '').trim(),
        bankAccount: String(account.bankAccount || '').trim(),
        usageType: String(account.usageType || '通用').trim(),
        status: String(account.status || '正常').trim(),
        remark: String(account.remark || '').trim(),
      })),
      status: form.status || '正常',
      remark: form.remark.trim(),
    })
    applyProfile(response)
    initialized.value = true
    message.success('公司信息已保存')
  } catch (error) {
    showRequestError(error, '保存公司信息失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void loadProfile()
})
</script>

<template>
  <div class="page-stack company-settings-page">
    <div class="status-section">
      <div class="status-header">
        <div class="status-header-main">
          <span class="status-title">公司信息</span>
          <span class="status-subtitle">本系统按单企业模式运行，公司名称和税号由 OOBE 初始化写入；本页集中维护多个结算银行、状态和补充说明。</span>
        </div>
        <div class="status-actions">
          <a-button size="small" :loading="loading" @click="loadProfile">
            <template #icon><ReloadOutlined /></template>
            刷新
          </a-button>
          <a-button v-if="canSave" type="primary" size="small" :loading="saving" @click="handleSave">
            <template #icon><SaveOutlined /></template>
            保存
          </a-button>
        </div>
      </div>

      <div class="overview-grid">
        <div v-for="item in overviewItems" :key="item.label" class="overview-card">
          <div class="overview-label">{{ item.label }}</div>
          <div class="overview-value">{{ item.value }}</div>
        </div>
      </div>
    </div>

    <a-card :bordered="false" class="module-panel-card">
      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 24px"
        message="公司主体信息"
        description="公司名称和税号由 OOBE 脚本初始化后锁定；默认税率已迁移到“通用设置”，本页只维护公司主体和结算银行信息。"
      />

      <a-alert
        v-if="!canView"
        type="warning"
        show-icon
        style="margin-bottom: 24px"
        message="暂无查看权限"
        description="当前账号没有公司信息查看权限。"
      />

      <a-skeleton v-if="loading && !initialized" active />

      <a-form v-else layout="vertical" class="company-form">
        <div class="company-form-grid">
          <a-card class="company-block" :bordered="false">
            <template #title>
              <span class="block-title">
                <EditOutlined />
                基础主体
              </span>
            </template>
            <a-form-item label="公司名称" required>
              <a-input v-model:value="form.companyName" disabled placeholder="由 OOBE 初始化写入" />
            </a-form-item>
            <a-form-item label="税号" required>
              <a-input v-model:value="form.taxNo" disabled placeholder="由 OOBE 初始化写入" />
            </a-form-item>
            <a-form-item label="状态" required>
              <a-select v-model:value="form.status" :disabled="!canSave">
                <a-select-option value="正常">正常</a-select-option>
                <a-select-option value="禁用">禁用</a-select-option>
              </a-select>
            </a-form-item>
            <div class="identity-preview">
              <div class="identity-icon"><IdcardOutlined /></div>
              <div class="identity-copy">
                <div class="identity-title">{{ form.companyName || '公司主体待配置' }}</div>
                <div class="identity-subtitle">{{ form.taxNo || '税号待配置' }} / 结算银行 {{ form.settlementAccounts.length }} 个</div>
              </div>
            </div>
          </a-card>

          <a-card class="company-block" :bordered="false">
            <template #title>
              <div class="settlement-title-row">
                <span class="block-title">
                  <BankOutlined />
                  结算信息
                </span>
                <a-button v-if="canSave" type="dashed" size="small" @click="addSettlementAccount">
                  <template #icon><PlusOutlined /></template>
                  新增银行
                </a-button>
              </div>
            </template>

            <div class="settlement-list">
              <div
                v-for="(account, index) in form.settlementAccounts"
                :key="account.localKey"
                class="settlement-item"
              >
                <div class="settlement-item-head">
                  <span class="settlement-item-title">结算账户 {{ index + 1 }}</span>
                  <a-button
                    v-if="canSave"
                    type="text"
                    danger
                    size="small"
                    @click="removeSettlementAccount(index)"
                  >
                    <template #icon><DeleteOutlined /></template>
                    删除
                  </a-button>
                </div>
                <div class="settlement-item-grid">
                  <a-form-item label="账户名称" required>
                    <a-input v-model:value="account.accountName" :disabled="!canSave" placeholder="如：基本户 / 收款户" />
                  </a-form-item>
                  <a-form-item label="用途" required>
                    <a-select v-model:value="account.usageType" :disabled="!canSave">
                      <a-select-option value="通用">通用</a-select-option>
                      <a-select-option value="收款">收款</a-select-option>
                      <a-select-option value="付款">付款</a-select-option>
                    </a-select>
                  </a-form-item>
                  <a-form-item label="开户银行" required>
                    <a-input v-model:value="account.bankName" :disabled="!canSave" placeholder="输入开户银行" />
                  </a-form-item>
                  <a-form-item label="银行账号" required>
                    <a-input v-model:value="account.bankAccount" :disabled="!canSave" placeholder="输入银行账号" />
                  </a-form-item>
                  <a-form-item label="状态" required>
                    <a-select v-model:value="account.status" :disabled="!canSave">
                      <a-select-option value="正常">正常</a-select-option>
                      <a-select-option value="禁用">禁用</a-select-option>
                    </a-select>
                  </a-form-item>
                  <a-form-item label="备注">
                    <a-input v-model:value="account.remark" :disabled="!canSave" placeholder="补充账户用途或说明" />
                  </a-form-item>
                </div>
              </div>
            </div>
          </a-card>
        </div>

        <a-card class="company-block remark-block" :bordered="false">
          <template #title>补充说明</template>
          <a-form-item label="备注">
            <a-textarea
              v-model:value="form.remark"
              :disabled="!canSave"
              :rows="4"
              placeholder="补充主体抬头、结算习惯或财务说明"
            />
          </a-form-item>
        </a-card>
      </a-form>
    </a-card>
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
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
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
  color: #8c8c8c;
  line-height: 1.6;
}

.status-actions {
  display: flex;
  gap: 8px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.overview-card {
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 18px 20px;
  background: linear-gradient(180deg, #fafafa 0%, #fff 100%);
}

.overview-label {
  font-size: 13px;
  color: #8c8c8c;
}

.overview-value {
  margin-top: 10px;
  font-size: 22px;
  font-weight: 600;
  color: #262626;
}

.company-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.company-form-grid {
  display: grid;
  grid-template-columns: minmax(280px, 380px) minmax(0, 1fr);
  gap: 16px;
}

.company-block {
  background: #fafafa;
  border-radius: 12px;
}

.block-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.settlement-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.settlement-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settlement-item {
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  background: #fff;
}

.settlement-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.settlement-item-title {
  font-weight: 600;
  color: #262626;
}

.settlement-item-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}

.identity-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #e6f4ff 0%, #f6ffed 100%);
}

.identity-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1677ff;
  color: #fff;
  font-size: 20px;
}

.identity-title {
  font-weight: 600;
  color: #262626;
}

.identity-subtitle {
  margin-top: 4px;
  color: #8c8c8c;
}

.remark-block {
  margin-top: 4px;
}

@media (max-width: 960px) {
  .status-header {
    flex-direction: column;
  }

  .overview-grid,
  .company-form-grid,
  .settlement-item-grid {
    grid-template-columns: 1fr;
  }
}
</style>
