<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import {
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons-vue'
import TwoFactorConfirmModal from '@/components/TwoFactorConfirmModal.vue'
import {
  createApiKey,
  getApiKeyDetail,
  listApiKeyActionOptions,
  listApiKeys,
  listApiKeyResourceOptions,
  listApiKeyUserOptions,
  revokeApiKey,
  type ApiKeyActionOption,
  type ApiKeyResourceOption,
  type ApiKeyRecord,
  type ApiKeyUserOption,
} from '@/api/api-keys'
import { useRequestError } from '@/composables/use-request-error'
import { useAuthStore } from '@/stores/auth'
import { usePermissionStore } from '@/stores/permission'

const authStore = useAuthStore()
const permissionStore = usePermissionStore()

const loading = ref(false)
const keyRows = ref<ApiKeyRecord[]>([])
const totalElements = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const status = ref<string | undefined>(undefined)
const usageScope = ref<string | undefined>(undefined)
const filterUserId = ref<string | undefined>(undefined)

const userOptions = ref<ApiKeyUserOption[]>([])
const resourceOptions = ref<ApiKeyResourceOption[]>([])
const actionOptions = ref<ApiKeyActionOption[]>([])
const loadingUserOptions = ref(false)

const showGenerateModal = ref(false)
const generating = ref(false)
const formUserId = ref<string | undefined>(undefined)
const formKeyName = ref('')
const formUsageScope = ref('全部接口')
const formAllowedResources = ref<string[]>([])
const formAllowedActions = ref<string[]>(['read', 'create', 'update', 'delete', 'export'])
const formExpireDays = ref<number | undefined>(undefined)
const generatedKey = ref<string | null>(null)
const showGenerateTotpModal = ref(false)

const showDetailModal = ref(false)
const detailLoading = ref(false)
const detailRecord = ref<ApiKeyRecord | null>(null)

const canView = computed(() => permissionStore.can('api-key', 'read'))
const canCreate = computed(() => permissionStore.can('api-key', 'create'))
const canEdit = computed(() => permissionStore.can('api-key', 'update'))
const canLoadUserOptions = computed(() => canView.value)
const isCurrentUserTotpDisabled = computed(() => authStore.user?.totpEnabled === false)
const showRequestError = useRequestError()

watch([currentPage, pageSize], () => {
  void loadKeys()
})

async function loadKeys() {
  loading.value = true
  try {
    const data = await listApiKeys({
      page: currentPage.value - 1,
      size: pageSize.value,
      keyword: keyword.value.trim() || undefined,
      userId: filterUserId.value,
      status: status.value || undefined,
      usageScope: usageScope.value || undefined,
    })
    keyRows.value = data.records || []
    totalElements.value = Number(data.totalElements || 0)
  } catch (error) {
    showRequestError(error, '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadUserOptions(searchKeyword = '') {
  if (!canLoadUserOptions.value) {
    return
  }
  loadingUserOptions.value = true
  try {
    userOptions.value = await listApiKeyUserOptions(searchKeyword)
  } catch (error) {
    showRequestError(error, '加载用户选项失败')
  } finally {
    loadingUserOptions.value = false
  }
}

async function loadResourceOptions() {
  try {
    resourceOptions.value = await listApiKeyResourceOptions()
  } catch (error) {
    showRequestError(error, '加载资源选项失败')
  }
}

async function loadActionOptions() {
  try {
    actionOptions.value = await listApiKeyActionOptions()
  } catch (error) {
    showRequestError(error, '加载动作选项失败')
  }
}

async function handleGenerate() {
  if (!canCreate.value) {
    message.warning('暂无 API Key 创建权限')
    return
  }
  if (isCurrentUserTotpDisabled.value) {
    message.warning('当前账号未启用 2FA，禁止生成 API Key')
    return
  }
  if (!formUserId.value || !formKeyName.value.trim() || !formUsageScope.value) {
    message.warning('请选择用户、使用范围并填写密钥名称')
    return
  }
  if (!formAllowedActions.value.length) {
    message.warning('请至少选择一个允许动作')
    return
  }
  showGenerateTotpModal.value = true
}

async function handleGenerateWithTotp(totpCode: string) {
  generating.value = true
  try {
    const userId = formUserId.value
    if (userId == null) {
      message.warning('请选择用户')
      return
    }
    const response = await createApiKey(userId, {
      keyName: formKeyName.value.trim(),
      usageScope: formUsageScope.value,
      allowedResources: formAllowedResources.value,
      allowedActions: formAllowedActions.value,
      expireDays: formExpireDays.value ?? null,
    }, totpCode)
    generatedKey.value = response.data?.rawKey || null
    showGenerateTotpModal.value = false
    message.success(response.message || 'API Key 已生成')
    await loadKeys()
  } catch (error) {
    showRequestError(error, '生成失败')
  } finally {
    generating.value = false
  }
}

function handleGenerateTotpModalOpenChange(value: boolean) {
  showGenerateTotpModal.value = value
}

async function handleRevoke(record: ApiKeyRecord) {
  if (!canEdit.value) {
    message.warning('暂无 API Key 管理权限')
    return
  }
  const confirmed = await new Promise<boolean>((resolve) => {
    Modal.confirm({
      title: '禁用 API Key',
      content: `确定禁用密钥「${record.keyName}」吗？禁用后使用该密钥的调用将失败。`,
      okText: '确认禁用',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    })
  })
  if (!confirmed) return

  try {
    const response = await revokeApiKey(record.id)
    message.success(response.message || '已禁用')
    await loadKeys()
  } catch (error) {
    showRequestError(error, '禁用失败')
  }
}

async function openDetailModal(record: ApiKeyRecord) {
  showDetailModal.value = true
  detailLoading.value = true
  try {
    detailRecord.value = await getApiKeyDetail(record.id)
  } catch (error) {
    showRequestError(error, '加载详情失败')
    showDetailModal.value = false
  } finally {
    detailLoading.value = false
  }
}

function closeGenerateModal() {
  showGenerateModal.value = false
  showGenerateTotpModal.value = false
  formUserId.value = undefined
  formKeyName.value = ''
  formUsageScope.value = '全部接口'
  formAllowedResources.value = []
  formAllowedActions.value = actionOptions.value.map((item) => item.code)
  formExpireDays.value = undefined
  generatedKey.value = null
}

async function openGenerateModal() {
  if (!canCreate.value) {
    message.warning('暂无 API Key 创建权限')
    return
  }
  if (isCurrentUserTotpDisabled.value) {
    message.warning('当前账号未启用 2FA，禁止生成 API Key')
    return
  }
  generatedKey.value = null
  formUserId.value = undefined
  formKeyName.value = ''
  formUsageScope.value = '全部接口'
  formAllowedResources.value = []
  formAllowedActions.value = actionOptions.value.length
    ? actionOptions.value.map((item) => item.code)
    : ['read', 'create', 'update', 'delete', 'export']
  formExpireDays.value = undefined
  showGenerateModal.value = true
  await Promise.all([
    !userOptions.value.length ? loadUserOptions() : Promise.resolve(),
    !resourceOptions.value.length ? loadResourceOptions() : Promise.resolve(),
    !actionOptions.value.length ? loadActionOptions() : Promise.resolve(),
  ])
}

function handleSearch() {
  if (currentPage.value !== 1) {
    currentPage.value = 1
    return
  }
  currentPage.value = 1
  void loadKeys()
}

function getStatusColor(currentStatus: string) {
  if (currentStatus === '有效') return 'green'
  if (currentStatus === '已过期') return 'orange'
  if (currentStatus === '已禁用') return 'red'
  return 'default'
}

function getUserDisplayName(record: Pick<ApiKeyUserOption, 'userName' | 'loginName'>) {
  return record.userName ? `${record.userName}（${record.loginName}）` : record.loginName
}

function getAllowedResourceText(allowedResources: string[]) {
  if (!allowedResources?.length) {
    return '未限制'
  }
  const titleByCode = new Map(resourceOptions.value.map((item) => [item.code, item.title]))
  return allowedResources.map((item) => titleByCode.get(item) || item).join('、')
}

function getAllowedActionText(allowedActions: string[]) {
  if (!allowedActions?.length) {
    return '未设置'
  }
  const titleByCode = new Map(actionOptions.value.map((item) => [item.code, item.title]))
  return allowedActions.map((item) => titleByCode.get(item) || item).join('、')
}

void loadKeys()
if (canLoadUserOptions.value) {
  void loadUserOptions()
}
void loadResourceOptions()
void loadActionOptions()
</script>

<template>
  <div class="page-stack api-key-management-page">
    <a-card :bordered="false" class="module-panel-card">
      <a-alert
        type="info"
        show-icon
        class="api-key-instruction"
      >
        <template #message>API Key 使用说明</template>
        <template #description>
          <div class="api-key-instruction-list">
            <div>1. 生成后会返回完整密钥，仅显示一次，关闭弹窗后无法再次查看。</div>
            <div>2. 调用接口时请在请求头中传入 <code>X-API-Key</code>，值为完整 API Key。</div>
            <div>3. 使用范围说明：只读接口仅允许 GET / HEAD / OPTIONS，请求写接口会被拒绝。</div>
            <div>4. 业务接口仅允许访问业务数据接口，不允许访问系统管理类接口。</div>
            <div>5. 允许访问资源留空时，按使用范围放行；选择资源后，只允许访问白名单资源接口。</div>
            <div>6. 仅允许为已启用 2FA 的账号生成 API Key，且生成时需要验证当前操作人的 2FA。</div>
            <div>7. 建议按用途分开创建，例如订单同步、报表读取，便于后续排查和禁用。</div>
            <div>8. 禁用后立即失效，已过期或已禁用的密钥无法继续调用接口。</div>
          </div>
        </template>
      </a-alert>
      <a-alert
        v-if="isCurrentUserTotpDisabled"
        type="warning"
        show-icon
        class="api-key-instruction"
        message="当前账号未启用 2FA，禁止生成 API Key。请先在用户管理中完成 2FA 绑定。"
      />

      <div class="api-key-toolbar">
        <div class="api-key-toolbar-left">
          <a-input-search
            v-model:value="keyword"
            placeholder="搜索密钥名称 / 前缀"
            style="width: 280px"
            allow-clear
            @search="handleSearch"
          />
          <a-select
            v-if="canLoadUserOptions"
            v-model:value="filterUserId"
            show-search
            allow-clear
            :filter-option="false"
            :loading="loadingUserOptions"
            placeholder="筛选所属用户"
            style="width: 260px"
            @search="loadUserOptions"
            @change="handleSearch"
          >
            <a-select-option
              v-for="user in userOptions"
              :key="user.id"
              :value="user.id"
            >
              {{ getUserDisplayName(user) }}
            </a-select-option>
          </a-select>
          <a-select
            v-model:value="status"
            allow-clear
            placeholder="全部状态"
            style="width: 140px"
            @change="handleSearch"
          >
            <a-select-option value="有效">有效</a-select-option>
            <a-select-option value="已过期">已过期</a-select-option>
            <a-select-option value="已禁用">已禁用</a-select-option>
          </a-select>
          <a-select
            v-model:value="usageScope"
            allow-clear
            placeholder="全部范围"
            style="width: 150px"
            @change="handleSearch"
          >
            <a-select-option value="全部接口">全部接口</a-select-option>
            <a-select-option value="只读接口">只读接口</a-select-option>
            <a-select-option value="业务接口">业务接口</a-select-option>
          </a-select>
        </div>
        <div class="api-key-toolbar-right">
          <a-button @click="loadKeys">
            <template #icon><ReloadOutlined /></template>
            刷新
          </a-button>
          <a-button
            v-if="canCreate"
            type="primary"
            :disabled="isCurrentUserTotpDisabled"
            @click="openGenerateModal"
          >
            <template #icon><PlusOutlined /></template>
            生成 API Key
          </a-button>
        </div>
      </div>

      <a-table
        row-key="id"
        size="middle"
        bordered
        :data-source="keyRows"
        :loading="loading"
        :pagination="{
          current: currentPage,
          pageSize: pageSize,
          total: totalElements,
          showSizeChanger: true,
          showTotal: (total: number) => `共 ${total} 条`,
          onChange: (page: number, size: number) => { currentPage = page; pageSize = size },
        }"
      >
        <a-table-column key="keyName" title="密钥名称" data-index="keyName" width="180" />
        <a-table-column key="usageScope" title="使用范围" data-index="usageScope" width="130" />
        <a-table-column key="allowedResources" title="允许资源" width="240" :ellipsis="true">
          <template #default="{ record }">
            <a-tooltip :title="getAllowedResourceText(record.allowedResources)">
              {{ getAllowedResourceText(record.allowedResources) }}
            </a-tooltip>
          </template>
        </a-table-column>
        <a-table-column key="allowedActions" title="允许动作" width="180" :ellipsis="true">
          <template #default="{ record }">
            <a-tooltip :title="getAllowedActionText(record.allowedActions)">
              {{ getAllowedActionText(record.allowedActions) }}
            </a-tooltip>
          </template>
        </a-table-column>
        <a-table-column key="user" title="所属用户" width="200">
          <template #default="{ record }">
            <div class="api-key-user-cell">
              <strong>{{ record.userName || record.loginName }}</strong>
              <span>{{ record.loginName }}</span>
            </div>
          </template>
        </a-table-column>
        <a-table-column key="keyPrefix" title="前缀" data-index="keyPrefix" width="110" />
        <a-table-column key="createdAt" title="创建时间" data-index="createdAt" width="180" />
        <a-table-column key="expiresAt" title="过期时间" data-index="expiresAt" width="180">
          <template #default="{ record }">
            {{ record.expiresAt || '永不过期' }}
          </template>
        </a-table-column>
        <a-table-column key="lastUsedAt" title="最后使用" data-index="lastUsedAt" width="180">
          <template #default="{ record }">
            {{ record.lastUsedAt || '--' }}
          </template>
        </a-table-column>
        <a-table-column key="status" title="状态" width="110" align="center">
          <template #default="{ record }">
            <a-tag :color="getStatusColor(record.status)">
              {{ record.status }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column key="action" title="操作" width="150" align="center">
          <template #default="{ record }">
            <a-space :size="10">
              <a @click.prevent="openDetailModal(record)">
                <EyeOutlined /> 查看
              </a>
              <a
                v-if="canEdit && record.status === '有效'"
                class="api-key-action-danger"
                @click.prevent="handleRevoke(record)"
              >
                <StopOutlined /> 禁用
              </a>
              <span v-else>--</span>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="showGenerateModal"
      title="生成 API Key"
      :mask-closable="false"
      @cancel="closeGenerateModal"
    >
      <template v-if="!generatedKey">
        <div class="centered-form-stage">
          <a-form layout="vertical" class="centered-form-shell">
            <a-form-item label="所属用户" required>
              <a-select
                v-model:value="formUserId"
                show-search
                :filter-option="false"
                :loading="loadingUserOptions"
                placeholder="搜索账号 / 用户姓名 / 手机号"
                style="width: 100%"
                @search="loadUserOptions"
              >
                <a-select-option
                  v-for="user in userOptions"
                  :key="user.id"
                  :value="user.id"
                >
                  {{ getUserDisplayName(user) }}<span v-if="user.mobile"> / {{ user.mobile }}</span>
                </a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="密钥名称" required>
              <a-input
                v-model:value="formKeyName"
                placeholder="例如：订单同步密钥"
                :maxlength="64"
              />
            </a-form-item>
            <a-form-item label="使用范围" required>
              <a-select v-model:value="formUsageScope" placeholder="请选择使用范围">
                <a-select-option value="全部接口">全部接口</a-select-option>
                <a-select-option value="只读接口">只读接口</a-select-option>
                <a-select-option value="业务接口">业务接口</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="允许访问资源">
              <a-select
                v-model:value="formAllowedResources"
                mode="multiple"
                allow-clear
                placeholder="不选则按使用范围放行"
                :max-tag-count="4"
              >
                <a-select-option
                  v-for="item in resourceOptions"
                  :key="item.code"
                  :value="item.code"
                >
                  {{ item.group }} / {{ item.title }}
                </a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="允许动作" required>
              <a-select
                v-model:value="formAllowedActions"
                mode="multiple"
                placeholder="请选择允许动作"
                :max-tag-count="5"
              >
                <a-select-option
                  v-for="item in actionOptions"
                  :key="item.code"
                  :value="item.code"
                >
                  {{ item.title }}
                </a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="有效期（天）">
              <a-input-number
                v-model:value="formExpireDays"
                placeholder="留空则永不过期"
                style="width: 100%"
                :min="1"
                :max="3650"
              />
            </a-form-item>
          </a-form>
        </div>
      </template>
      <template v-else>
        <a-alert type="warning" show-icon style="margin-bottom: 16px">
          <template #message>
            请立即复制保存，此密钥仅显示一次
          </template>
        </a-alert>
        <div class="generated-key-box">
          <a-typography-paragraph copyable :code="true" style="margin: 0; word-break: break-all;">
            {{ generatedKey }}
          </a-typography-paragraph>
        </div>
      </template>
      <template #footer>
        <a-button @click="closeGenerateModal">
          {{ generatedKey ? '关闭' : '取消' }}
        </a-button>
        <a-button
          v-if="!generatedKey"
          type="primary"
          :loading="generating"
          :disabled="isCurrentUserTotpDisabled"
          @click="handleGenerate"
        >
          生成
        </a-button>
      </template>
    </a-modal>

    <a-modal
      v-model:open="showDetailModal"
      title="API Key 详情"
      :footer="null"
      :mask-closable="false"
      @cancel="showDetailModal = false"
    >
      <a-spin :spinning="detailLoading">
        <a-descriptions v-if="detailRecord" bordered :column="1" size="small">
          <a-descriptions-item label="密钥名称">{{ detailRecord.keyName }}</a-descriptions-item>
          <a-descriptions-item label="使用范围">{{ detailRecord.usageScope }}</a-descriptions-item>
          <a-descriptions-item label="允许资源">{{ getAllowedResourceText(detailRecord.allowedResources) }}</a-descriptions-item>
          <a-descriptions-item label="允许动作">{{ getAllowedActionText(detailRecord.allowedActions) }}</a-descriptions-item>
          <a-descriptions-item label="所属用户">
            {{ detailRecord.userName || detailRecord.loginName }}（{{ detailRecord.loginName }}）
          </a-descriptions-item>
          <a-descriptions-item label="用户 ID">{{ detailRecord.userId }}</a-descriptions-item>
          <a-descriptions-item label="密钥前缀">
            <a-typography-paragraph copyable :code="true" style="margin: 0">
              {{ detailRecord.keyPrefix }}
            </a-typography-paragraph>
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="getStatusColor(detailRecord.status)">
              {{ detailRecord.status }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ detailRecord.createdAt }}</a-descriptions-item>
          <a-descriptions-item label="过期时间">
            {{ detailRecord.expiresAt || '永不过期' }}
          </a-descriptions-item>
          <a-descriptions-item label="最后使用">
            {{ detailRecord.lastUsedAt || '--' }}
          </a-descriptions-item>
        </a-descriptions>
      </a-spin>
    </a-modal>
    <TwoFactorConfirmModal
      :open="showGenerateTotpModal"
      title="验证 2FA 后生成 API Key"
      description="当前账号必须已启用 2FA，并输入本次验证码后才允许生成 API Key。目标账号也必须已启用 2FA。"
      confirm-text="验证并生成"
      :loading="generating"
      @submit="handleGenerateWithTotp"
      @update:open="handleGenerateTotpModalOpenChange"
    />
  </div>
</template>

<style scoped>
.api-key-instruction {
  margin-bottom: 16px;
}

.api-key-instruction-list {
  display: grid;
  gap: 4px;
  line-height: 1.7;
}

.api-key-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.api-key-toolbar-left,
.api-key-toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.api-key-user-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.api-key-user-cell span {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.generated-key-box {
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 16px;
}

.api-key-action-danger {
  color: #ff4d4f;
}

@media (max-width: 768px) {
  .api-key-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .api-key-toolbar-left,
  .api-key-toolbar-right {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
