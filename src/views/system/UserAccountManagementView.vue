<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons-vue'
import TableActions from '@/components/TableActions.vue'
import type { ActionItem } from '@/components/TableActions.vue'
import StatusTag from '@/components/StatusTag.vue'
import {
  checkUserAccountLoginName,
  createUserAccount,
  deleteUserAccount,
  disableUserAccount2fa,
  enableUserAccount2fa,
  getUserAccountDetail,
  listDepartmentOptions,
  listRoleOptions,
  listUserAccounts,
  setupUserAccount2fa,
  updateUserAccount,
} from '@/api/user-accounts'
import {
  enabledStatusOptions,
  enabledStatusValues,
  userAccountDataScopeValues,
} from '@/constants/module-options'
import { useRequestError } from '@/composables/use-request-error'
import { useAuthStore } from '@/stores/auth'
import { usePermissionStore } from '@/stores/permission'
import type { TotpSetupResponse } from '@/types/auth'
import type {
  DepartmentOptionRecord,
  RoleOptionRecord,
  UserAccountCreateResult,
  UserAccountFormPayload,
  UserAccountRecord,
} from '@/types/user-account'
import { setStoredUser } from '@/utils/storage'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'
import { useDataTable } from '@/composables/use-data-table'
import DataTable from '@/components/DataTable.vue'

type EditorMode = 'create' | 'edit'

const router = useRouter()
const authStore = useAuthStore()
const permissionStore = usePermissionStore()
const showRequestError = useRequestError()

const loading = ref(false)
const rows = ref<UserAccountRecord[]>([])
const totalElements = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const status = ref<string | undefined>(undefined)

const roleOptions = ref<RoleOptionRecord[]>([])
const departmentOptions = ref<DepartmentOptionRecord[]>([])

const showEditorModal = ref(false)
const editorLoading = ref(false)
const editorSaving = ref(false)
const editorMode = ref<EditorMode>('create')
const editingId = ref<string | null>(null)
const loginNameValidationMessage = ref('')
const loginNameChecking = ref(false)

const showDetailModal = ref(false)
const detailLoading = ref(false)
const detailRecord = ref<UserAccountRecord | null>(null)
const showCreateResultModal = ref(false)
const createResult = ref<UserAccountCreateResult | null>(null)

const show2faModal = ref(false)
const twoFactorLoading = ref(false)
const twoFactorSetupLoading = ref(false)
const twoFactorEnableLoading = ref(false)
const twoFactorDisableLoading = ref(false)
const twoFactorRecord = ref<UserAccountRecord | null>(null)
const twoFactorSetup = ref<TotpSetupResponse | null>(null)
const twoFactorCode = ref('')

const formState = reactive<UserAccountFormPayload>({
  loginName: '',
  password: '',
  userName: '',
  mobile: '',
  departmentId: null,
  roleNames: [],
  dataScope: userAccountDataScopeValues[0],
  permissionSummary: '',
  status: enabledStatusValues[0],
  remark: '',
})

const selectedDepartmentId = computed<string | number | undefined>({
  get: () => formState.departmentId ?? undefined,
  set: (value) => {
    formState.departmentId = value ?? null
  },
})

const canViewRoleCatalog = computed(() => permissionStore.can('role', 'read'))
const canViewDepartmentCatalog = computed(() => permissionStore.can('department', 'read'))
const canCreate = computed(() => permissionStore.can('user-account', 'create'))
const canEdit = computed(() => permissionStore.can('user-account', 'update'))
const canDelete = computed(() => permissionStore.can('user-account', 'delete'))

function getUserActions(row: UserAccountRecord): ActionItem[] {
  return [
    {
      key: 'view',
      label: '查看',
      icon: EyeOutlined,
      onClick: () => openDetailModal(row)
    },
    {
      key: 'edit',
      label: '编辑',
      icon: EditOutlined,
      visible: canEdit.value,
      onClick: () => openEditModal(row)
    },
    {
      key: '2fa',
      label: '2FA',
      icon: SafetyCertificateOutlined,
      visible: canEdit.value,
      onClick: () => open2faModal(row)
    },
    {
      key: 'delete',
      label: '删除',
      icon: DeleteOutlined,
      danger: true,
      visible: canDelete.value && row.loginName !== 'admin',
      onClick: () => handleDelete(row)
    }
  ]
}

const selectedRoleSummaries = computed(() =>
  roleOptions.value
    .filter((role) => formState.roleNames.includes(role.roleName))
    .map((role) => role.permissionSummary)
    .filter((item): item is string => Boolean(item && item.trim()))
    .filter((item, index, array) => array.indexOf(item) === index),
)

const selectedRoleDataScope = computed(() => {
  const selectedRoles = roleOptions.value.filter((role) => formState.roleNames.includes(role.roleName))
  if (!selectedRoles.length) {
    return formState.roleNames.length ? normalizeDataScopeLabel(formState.dataScope) : '本人'
  }
  return selectedRoles
    .map((role) => normalizeDataScopeLabel(role.dataScope))
    .reduce((effective, current) => (dataScopeRank(current) > dataScopeRank(effective) ? current : effective), '本人')
})

const editorTitle = computed(() => (editorMode.value === 'create' ? '新增用户账户' : '编辑用户账户')) // UI uses this directly; Chinese is intentional for now
const loginNameValidateStatus = computed(() => {
  if (loginNameChecking.value) {
    return 'validating'
  }
  if (loginNameValidationMessage.value) {
    return 'error'
  }
  return undefined
})
const loginNameHelp = computed(() => {
  if (loginNameChecking.value) {
    return '正在检查登录账号...'
  }
  return loginNameValidationMessage.value || undefined
})

let loginNameCheckSequence = 0
let loginNameCheckPromise: Promise<boolean> | null = null

watch(selectedRoleSummaries, (summaries) => {
  formState.permissionSummary = summaries.join('；')
})

watch(selectedRoleDataScope, (dataScope) => {
  formState.dataScope = dataScope
})

watch(
  () => formState.loginName,
  () => {
    loginNameValidationMessage.value = ''
    loginNameCheckSequence += 1
    loginNameCheckPromise = null
    loginNameChecking.value = false
  },
)

watch(showEditorModal, (open) => {
  if (!open) {
    resetLoginNameValidation()
  }
})

watch([currentPage, pageSize], () => {
  void loadUsers()
})

async function loadUsers() {
  loading.value = true
  try {
    const data = await listUserAccounts({
      page: currentPage.value - 1,
      size: pageSize.value,
      keyword: keyword.value.trim() || undefined,
      status: status.value || undefined,
    })
    rows.value = data.records || []
    totalElements.value = data.totalElements || 0
  } catch (error) {
    showRequestError(error, '加载用户失败')
  } finally {
    loading.value = false
  }
}

async function loadRoles() {
  if (!canViewRoleCatalog.value) {
    roleOptions.value = []
    return
  }
  try {
    roleOptions.value = await listRoleOptions()
  } catch (error) {
    showRequestError(error, '加载角色失败')
  }
}

async function loadDepartments() {
  if (!canViewDepartmentCatalog.value) {
    departmentOptions.value = []
    return
  }
  try {
    departmentOptions.value = await listDepartmentOptions()
  } catch (error) {
    showRequestError(error, '加载部门失败')
  }
}

function handleSearch() {
  currentPage.value = 1
  void loadUsers()
}

function getStatusColor(value: string) {
  return value === enabledStatusValues[0] ? 'green' : 'red'
}

function getTotpColor(enabled: boolean) {
  return enabled ? 'processing' : 'default'
}

function normalizeDataScopeLabel(value: string | null | undefined) {
  const normalized = String(value || '').trim()
  if (normalized === '全部数据' || normalized === '全部') {
    return '全部数据'
  }
  if (normalized === '本部门') {
    return '本部门'
  }
  return '本人'
}

const userColumnHelper = createColumnHelper<UserAccountRecord>()
const userAccountColumns = computed<ColumnDef<UserAccountRecord, unknown>[]>(() => [
  userColumnHelper.accessor('loginName', { header: () => '登录账号', meta: { width: 140 } }),
  userColumnHelper.accessor('userName', { header: () => '用户姓名', meta: { width: 140 } }),
  userColumnHelper.accessor('departmentName', {
    header: () => '所属部门',
    cell: (info) => info.getValue() || '--',
    meta: { width: 140 },
  }),
  userColumnHelper.accessor('mobile', {
    header: () => '手机号',
    cell: (info) => info.getValue() || '--',
    meta: { width: 140 },
  }),
  userColumnHelper.accessor('roleNames', {
    header: () => '所属角色',
    cell: (info) => {
      const names = info.getValue()
      return Array.isArray(names) ? names.join('、') : '--'
    },
    meta: { width: 220 },
  }),
  userColumnHelper.accessor('dataScope', {
    header: () => '数据范围',
    cell: (info) => info.getValue() || '--',
    meta: { width: 120 },
  }),
  userColumnHelper.accessor('totpEnabled', {
    header: () => '2FA 状态',
    cell: (info) => {
      const enabled = info.getValue()
      return h(StatusTag, { status: enabled ? '已启用' : '未启用', color: getTotpColor(!!enabled) })
    },
    meta: { width: 110, align: 'center' },
  }),
  userColumnHelper.accessor('status', {
    header: () => '状态',
    cell: (info) => {
      const v = String(info.getValue() ?? '')
      return h(StatusTag, { status: v, color: getStatusColor(v) })
    },
    meta: { width: 100, align: 'center' },
  }),
  userColumnHelper.accessor('lastLoginDate', {
    header: () => '最近登录',
    cell: (info) => info.getValue() || '--',
    meta: { width: 180 },
  }),
  userColumnHelper.display({
    id: 'action',
    header: () => '操作',
    meta: { width: 260, align: 'center', fixed: 'right' },
  }),
])

const { table: userAccountTable } = useDataTable({
  data: computed(() => rows.value),
  columns: userAccountColumns,
  getRowId: (row) => String(row.id ?? ''),
  manualPagination: true,
  enableSorting: false,
})

function dataScopeRank(value: string) {
  switch (normalizeDataScopeLabel(value)) {
    case '全部数据':
      return 3
    case '本部门':
      return 2
    default:
      return 1
  }
}

function syncCurrentUserTotpState(record: UserAccountRecord | null) {
  if (!record || !authStore.user) {
    return
  }
  if (String(authStore.user.id) !== String(record.id)) {
    return
  }
  const nextUser = {
    ...authStore.user,
    totpEnabled: record.totpEnabled,
  }
  authStore.user = nextUser
  setStoredUser(nextUser)
}

function resetEditorForm() {
  editingId.value = null
  formState.loginName = ''
  formState.password = ''
  formState.userName = ''
  formState.mobile = ''
  formState.departmentId = null
  formState.roleNames = []
  formState.dataScope = userAccountDataScopeValues[0]
  formState.permissionSummary = ''
  formState.status = enabledStatusValues[0]
  formState.remark = ''
  resetLoginNameValidation()
}

function fillEditorForm(record: UserAccountRecord) {
  editingId.value = record.id
  formState.loginName = record.loginName || ''
  formState.password = ''
  formState.userName = record.userName || ''
  formState.mobile = record.mobile || ''
  formState.departmentId = record.departmentId ?? null
  formState.roleNames = [...(record.roleNames || [])]
  formState.dataScope = record.dataScope || userAccountDataScopeValues[0]
  formState.permissionSummary = record.permissionSummary || ''
  formState.status = record.status || enabledStatusValues[0]
  formState.remark = record.remark || ''
  resetLoginNameValidation()
}

function resetLoginNameValidation() {
  loginNameValidationMessage.value = ''
  loginNameChecking.value = false
  loginNameCheckSequence += 1
  loginNameCheckPromise = null
}

function resolveEditingUserId() {
  return editorMode.value === 'edit' && editingId.value ? Number(editingId.value) : undefined
}

async function runLoginNameAvailabilityCheck(force = false) {
  const loginName = formState.loginName.trim()
  if (!loginName) {
    resetLoginNameValidation()
    return false
  }
  if (!force && loginNameCheckPromise) {
    return loginNameCheckPromise
  }

  const requestSequence = ++loginNameCheckSequence
  loginNameChecking.value = true
  const request = checkUserAccountLoginName(loginName, resolveEditingUserId())
    .then((result) => {
      if (requestSequence !== loginNameCheckSequence) {
        return true
      }
      loginNameValidationMessage.value = result.available ? '' : (result.message || '登录账号已存在')
      return result.available
    })
    .catch((error) => {
      if (requestSequence !== loginNameCheckSequence) {
        return true
      }
      loginNameValidationMessage.value = ''
      showRequestError(error, '检查登录账号失败')
      return true
    })
    .finally(() => {
      if (requestSequence === loginNameCheckSequence) {
        loginNameChecking.value = false
      }
      if (loginNameCheckPromise === request) {
        loginNameCheckPromise = null
      }
    })
  loginNameCheckPromise = request
  return request
}

function handleLoginNameBlur() {
  if (!formState.loginName.trim()) {
    return
  }
  void runLoginNameAvailabilityCheck()
}

function validateEditorForm() {
  if (!formState.loginName.trim()) {
    message.warning('请填写登录账号')
    return false
  }
  if (!formState.userName.trim()) {
    message.warning('请填写用户姓名')
    return false
  }
  if (!formState.departmentId) {
    message.warning('请选择所属部门')
    return false
  }
  if (!formState.roleNames.length) {
    message.warning('请至少选择一个角色')
    return false
  }
  if (!formState.status) {
    message.warning('请选择状态')
    return false
  }
  return true
}

async function ensureLoginNameAvailableForSave() {
  const available = loginNameCheckPromise
    ? await loginNameCheckPromise
    : await runLoginNameAvailabilityCheck(true)
  if (!available) {
    message.warning(loginNameValidationMessage.value || '登录账号已存在')
    return false
  }
  return true
}

function buildEditorPayload(): UserAccountFormPayload {
  const password = formState.password?.trim()
  return {
    loginName: formState.loginName.trim(),
    ...(editorMode.value === 'create' && password ? { password } : {}),
    userName: formState.userName.trim(),
    mobile: formState.mobile.trim(),
    departmentId: formState.departmentId ?? null,
    roleNames: [...formState.roleNames],
    dataScope: selectedRoleDataScope.value,
    permissionSummary: formState.permissionSummary.trim(),
    status: formState.status,
    remark: formState.remark.trim(),
  }
}

function openCreateModal() {
  editorMode.value = 'create'
  resetEditorForm()
  showEditorModal.value = true
}

async function openEditModal(record: UserAccountRecord) {
  editorMode.value = 'edit'
  showEditorModal.value = true
  editorLoading.value = true
  try {
    const detail = await getUserAccountDetail(record.id)
    fillEditorForm(detail)
  } catch (error) {
    showRequestError(error, '加载用户详情失败')
    showEditorModal.value = false
  } finally {
    editorLoading.value = false
  }
}

async function handleSave() {
  if (!validateEditorForm()) {
    return
  }
  if (!(await ensureLoginNameAvailableForSave())) {
    return
  }

  editorSaving.value = true
  try {
    const payload = buildEditorPayload()
    if (editorMode.value === 'create') {
      const response = await createUserAccount(payload)
      showEditorModal.value = false
      createResult.value = response.data
      showCreateResultModal.value = true
    } else {
      const response = await updateUserAccount(editingId.value as string, payload)
      message.success(response.message || '保存成功')
      showEditorModal.value = false
    }
    await loadUsers()
  } catch (error) {
    if (error instanceof Error && error.message.includes('登录账号已存在')) {
      loginNameValidationMessage.value = '登录账号已存在'
      return
    }
    showRequestError(error, '保存失败')
  } finally {
    editorSaving.value = false
  }
}

async function openDetailModal(record: UserAccountRecord) {
  showDetailModal.value = true
  detailLoading.value = true
  try {
    detailRecord.value = await getUserAccountDetail(record.id)
  } catch (error) {
    showRequestError(error, '加载详情失败')
    showDetailModal.value = false
  } finally {
    detailLoading.value = false
  }
}

async function handleDelete(record: UserAccountRecord) {
  const confirmed = await new Promise<boolean>((resolve) => {
    Modal.confirm({
      title: '删除用户账户',
      content: `确定删除账号「${record.loginName}」吗？删除后该用户将无法继续登录。`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    })
  })
  if (!confirmed) {
    return
  }

  try {
    await deleteUserAccount(record.id)
    message.success('删除成功')
    await loadUsers()
  } catch (error) {
    showRequestError(error, '删除失败')
  }
}

async function open2faModal(record: UserAccountRecord) {
  show2faModal.value = true
  twoFactorLoading.value = true
  twoFactorSetup.value = null
  twoFactorCode.value = ''
  try {
    twoFactorRecord.value = await getUserAccountDetail(record.id)
  } catch (error) {
    showRequestError(error, '加载 2FA 信息失败')
    show2faModal.value = false
  } finally {
    twoFactorLoading.value = false
  }
}

async function handleGenerate2fa() {
  if (!twoFactorRecord.value) {
    return
  }
  twoFactorSetupLoading.value = true
  try {
    const response = await setupUserAccount2fa(twoFactorRecord.value.id)
    twoFactorSetup.value = response.data
    twoFactorCode.value = ''
    message.success(response.message || '二维码生成成功')
  } catch (error) {
    showRequestError(error, '二维码生成失败')
  } finally {
    twoFactorSetupLoading.value = false
  }
}

async function handleEnable2fa() {
  if (!twoFactorRecord.value) {
    return
  }
  if (!/^\d{6}$/.test(twoFactorCode.value.trim())) {
    message.warning('请输入 6 位动态验证码')
    return
  }
  twoFactorEnableLoading.value = true
  try {
    const response = await enableUserAccount2fa(twoFactorRecord.value.id, twoFactorCode.value.trim())
    twoFactorRecord.value = response.data
    syncCurrentUserTotpState(response.data)
    twoFactorSetup.value = null
    twoFactorCode.value = ''
    message.success(response.message || '2FA 已启用')
    show2faModal.value = false
    await loadUsers()
  } catch (error) {
    showRequestError(error, '启用 2FA 失败')
  } finally {
    twoFactorEnableLoading.value = false
  }
}

async function handleDisable2fa() {
  if (!twoFactorRecord.value) {
    return
  }
  const confirmed = await new Promise<boolean>((resolve) => {
    Modal.confirm({
      title: '关闭二次验证',
      content: `确定关闭用户「${twoFactorRecord.value?.loginName}」的 2FA 吗？`,
      okText: '确认关闭',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    })
  })
  if (!confirmed) {
    return
  }
  twoFactorDisableLoading.value = true
  try {
    const response = await disableUserAccount2fa(twoFactorRecord.value.id)
    twoFactorRecord.value = response.data
    syncCurrentUserTotpState(response.data)
    twoFactorSetup.value = null
    twoFactorCode.value = ''
    message.success(response.message || '2FA 已关闭')
    show2faModal.value = false
    await loadUsers()
  } catch (error) {
    showRequestError(error, '关闭 2FA 失败')
  } finally {
    twoFactorDisableLoading.value = false
  }
}

function close2faModal() {
  show2faModal.value = false
  twoFactorRecord.value = null
  twoFactorSetup.value = null
  twoFactorCode.value = ''
}

function closeCreateResultModal() {
  showCreateResultModal.value = false
  createResult.value = null
}

async function copyText(value: string, label: string) {
  try {
    const clipboard = globalThis.navigator?.clipboard
    if (clipboard?.writeText) {
      await clipboard.writeText(value)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = value
      textarea.setAttribute('readonly', 'true')
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    message.success(`${label}已复制`)
  } catch (error) {
    showRequestError(error, `${label}复制失败`)
  }
}

onMounted(() => {
  void loadUsers()
  if (canViewRoleCatalog.value) {
    void loadRoles()
  }
  if (canViewDepartmentCatalog.value) {
    void loadDepartments()
  }
})
</script>

<template>
  <div class="page-stack user-account-page">
    <a-card :bordered="false" class="module-panel-card">
      <div class="user-account-toolbar">
        <div class="user-account-toolbar-left">
          <a-input-search
            v-model:value="keyword"
            placeholder="搜索登录账号 / 用户姓名 / 手机号"
            style="width: 320px"
            allow-clear
            @search="handleSearch"
          />
          <a-select
            v-model:value="status"
            allow-clear
            placeholder="全部状态"
            style="width: 140px"
            @change="handleSearch"
          >
            <a-select-option
              v-for="option in enabledStatusOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
        </div>
        <div class="user-account-toolbar-right">
          <a-button @click="loadUsers">
            <template #icon><ReloadOutlined /></template>
            {{ $t('common.refresh') }}
          </a-button>
          <a-button v-if="canCreate" type="primary" @click="openCreateModal">
            <template #icon><PlusOutlined /></template>
            {{ $t('common.create') }}
          </a-button>
        </div>
      </div>

      <DataTable
        :table="userAccountTable"
        size="middle"
        :loading="loading"
      >
        <template #cell-action="{ row }">
          <TableActions :items="getUserActions(row)" />
        </template>
      </DataTable>
      <div style="display: flex; justify-content: flex-end; margin-top: 16px">
        <a-pagination
          :current="currentPage"
          :page-size="pageSize"
          :total="totalElements"
          show-size-changer
          :show-total="(total: number) => $t('common.total', { count: total })"
          @change="(page: number, size: number) => { currentPage = page; pageSize = size }"
        />
      </div>
    </a-card>

    <a-modal
      v-model:open="showEditorModal"
      :title="editorTitle"
      width="760px"
      :mask-closable="false"
      :confirm-loading="editorSaving"
      @ok="handleSave"
      @cancel="showEditorModal = false"
    >
      <a-spin :spinning="editorLoading">
        <a-form layout="vertical" class="user-account-form">
          <!-- 账户信息 -->
          <div class="form-section">
            <div class="form-section-title">账户信息</div>
            <a-row :gutter="24">
              <a-col :span="12">
                <a-form-item
                  label="登录账号"
                  required
                  has-feedback
                  :validate-status="loginNameValidateStatus"
                  :help="loginNameHelp"
                >
                  <a-input
                    v-model:value="formState.loginName"
                    placeholder="请输入登录账号"
                    :maxlength="64"
                    @blur="handleLoginNameBlur"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="用户姓名" required>
                  <a-input
                    v-model:value="formState.userName"
                    placeholder="请输入用户姓名"
                    :maxlength="64"
                  />
                </a-form-item>
              </a-col>
            </a-row>

            <a-row :gutter="24">
              <a-col :span="12">
                <a-form-item label="手机号">
                  <a-input
                    v-model:value="formState.mobile"
                    placeholder="请输入手机号"
                    :maxlength="32"
                  />
                </a-form-item>
              </a-col>
              <a-col v-if="editorMode === 'create'" :span="12">
                <a-form-item label="初始密码">
                  <a-input-password
                    v-model:value="formState.password"
                    placeholder="请输入初始密码"
                    :maxlength="128"
                  />
                  <div class="form-field-extra">留空时系统会自动生成 8 位随机数字大小写字母密码。</div>
                </a-form-item>
              </a-col>
              <a-col v-else :span="12">
                <a-form-item label="状态">
                  <a-select v-model:value="formState.status" placeholder="请选择状态">
                    <a-select-option
                      v-for="option in enabledStatusOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>

            <a-row :gutter="24">
              <a-col :span="12">
                <a-form-item label="所属部门" required>
                  <a-select
                    v-model:value="selectedDepartmentId"
                    show-search
                    option-filter-prop="label"
                    placeholder="请选择部门"
                    style="width: 100%"
                  >
                    <a-select-option
                      v-for="department in departmentOptions"
                      :key="department.id"
                      :value="department.id"
                      :label="department.departmentName"
                    >
                      {{ department.departmentName }}
                    </a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>
          </div>

          <!-- 权限配置 -->
          <div class="form-section">
            <div class="form-section-title">权限配置</div>
            <a-row :gutter="24">
              <a-col :span="editorMode === 'create' ? 16 : 14">
                <a-form-item label="所属角色" required>
                  <a-select
                    v-model:value="formState.roleNames"
                    mode="multiple"
                    placeholder="请选择角色"
                    :max-tag-count="5"
                    style="width: 100%"
                  >
                    <a-select-option
                      v-for="role in roleOptions"
                      :key="role.id"
                      :value="role.roleName"
                      :disabled="role.status === enabledStatusValues[1] && !formState.roleNames.includes(role.roleName)"
                    >
                      <span>{{ role.roleName }}</span>
                      <a-tag v-if="role.status === enabledStatusValues[1]" color="red" style="margin-left: 6px">已禁用</a-tag>
                    </a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="editorMode === 'create' ? 8 : 5">
                <a-form-item label="角色数据范围">
                  <a-input :value="selectedRoleDataScope" disabled />
                </a-form-item>
              </a-col>
              <a-col v-if="editorMode === 'create'" :span="8">
                <a-form-item label="状态">
                  <a-select v-model:value="formState.status" placeholder="请选择状态">
                    <a-select-option
                      v-for="option in enabledStatusOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>

            <a-form-item label="权限摘要" class="permission-summary-item">
              <div v-if="formState.permissionSummary" class="permission-summary-tags">
                <a-tag
                  v-for="(item, index) in formState.permissionSummary.split('；').filter(Boolean)"
                  :key="index"
                  color="blue"
                >
                  {{ item }}
                </a-tag>
              </div>
              <div v-else class="permission-summary-empty">选择角色后自动汇总</div>
            </a-form-item>
          </div>

          <!-- 补充信息 -->
          <div class="form-section">
            <div class="form-section-title">补充信息</div>
            <a-form-item label="备注">
              <a-textarea
                v-model:value="formState.remark"
                :rows="2"
                placeholder="请输入备注"
              />
            </a-form-item>
          </div>
        </a-form>
      </a-spin>
    </a-modal>

    <a-modal
      v-model:open="showDetailModal"
      title="用户详情"
      width="760px"
      :footer="null"
      @cancel="showDetailModal = false"
    >
      <a-spin :spinning="detailLoading">
        <a-descriptions v-if="detailRecord" :column="2" bordered size="small">
          <a-descriptions-item label="登录账号">{{ detailRecord.loginName }}</a-descriptions-item>
          <a-descriptions-item label="用户姓名">{{ detailRecord.userName }}</a-descriptions-item>
          <a-descriptions-item label="手机号">{{ detailRecord.mobile || '--' }}</a-descriptions-item>
          <a-descriptions-item label="所属部门">{{ detailRecord.departmentName || '--' }}</a-descriptions-item>
          <a-descriptions-item label="数据范围">{{ detailRecord.dataScope || '--' }}</a-descriptions-item>
          <a-descriptions-item label="所属角色" :span="2">
            <template v-if="detailRecord.roleNames?.length">
              <a
                v-for="(roleName, index) in detailRecord.roleNames"
                :key="roleName"
                style="margin-right: 4px"
                @click="router.push({ path: '/role-action-editor', query: { keyword: roleName } })"
              >
                {{ roleName }}<template v-if="index < detailRecord.roleNames.length - 1">、</template>
              </a>
            </template>
            <template v-else>--</template>
          </a-descriptions-item>
          <a-descriptions-item label="权限摘要" :span="2">
            {{ detailRecord.permissionSummary || '--' }}
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="getStatusColor(detailRecord.status)">{{ detailRecord.status }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="2FA 状态">
            <a-tag :color="getTotpColor(detailRecord.totpEnabled)">
              {{ detailRecord.totpEnabled ? '已启用' : '未启用' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="最近登录" :span="2">
            {{ detailRecord.lastLoginDate || '--' }}
          </a-descriptions-item>
          <a-descriptions-item label="备注" :span="2">
            {{ detailRecord.remark || '--' }}
          </a-descriptions-item>
        </a-descriptions>
      </a-spin>
    </a-modal>

    <a-modal
      v-model:open="showCreateResultModal"
      title="用户创建成功"
      width="560px"
      :footer="null"
      :mask-closable="false"
      @cancel="closeCreateResultModal"
    >
      <div v-if="createResult" class="user-account-create-result">
        <div class="user-account-create-result-row">
          <div class="user-account-create-result-meta">
            <div class="user-account-create-result-label">账号</div>
            <div class="user-account-create-result-value">{{ createResult.user.loginName }}</div>
          </div>
          <a-button @click="copyText(createResult.user.loginName, '账号')">
            复制账号
          </a-button>
        </div>

        <div class="user-account-create-result-row">
          <div class="user-account-create-result-meta">
            <div class="user-account-create-result-label">初始密码</div>
            <div class="user-account-create-result-value user-account-create-result-password">
              {{ createResult.initialPassword }}
            </div>
          </div>
          <a-button type="primary" @click="copyText(createResult.initialPassword, '密码')">
            复制密码
          </a-button>
        </div>

        <div class="user-account-create-result-role-block">
          <div class="user-account-create-result-label">所属部门</div>
          <div class="user-account-create-result-role-list">
            {{ createResult.user.departmentName || '--' }}
          </div>
        </div>

        <div class="user-account-create-result-role-block">
          <div class="user-account-create-result-label">所属角色</div>
          <div class="user-account-create-result-role-list">
            {{ createResult.user.roleNames.join('、') || '--' }}
          </div>
        </div>

        <div class="user-account-create-result-hint">
          请妥善保存初始密码，关闭后将不再展示。
        </div>

        <div class="user-account-create-result-actions">
          <a-button type="primary" @click="closeCreateResultModal">
            知道了
          </a-button>
        </div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="show2faModal"
      title="2FA 管理"
      width="720px"
      :footer="null"
      :mask-closable="false"
      @cancel="close2faModal"
    >
      <a-spin :spinning="twoFactorLoading">
        <template v-if="twoFactorRecord">
          <a-alert
            :type="twoFactorRecord.totpEnabled ? 'success' : 'info'"
            show-icon
            :message="twoFactorRecord.totpEnabled ? '当前已启用二次验证' : '当前未启用二次验证'"
            :description="`用户：${twoFactorRecord.loginName}`"
            style="margin-bottom: 16px"
          />

          <div v-if="!twoFactorRecord.totpEnabled" class="two-factor-layout">
            <div class="two-factor-panel">
              <h4>步骤 1：生成绑定二维码</h4>
              <p>支持 Google Authenticator、Microsoft Authenticator 等标准 TOTP 应用。</p>
              <a-button type="primary" :loading="twoFactorSetupLoading" @click="handleGenerate2fa">
                生成二维码
              </a-button>

              <template v-if="twoFactorSetup">
                <div class="two-factor-qr-box">
                  <img
                    class="two-factor-qr-image"
                    :src="`data:image/png;base64,${twoFactorSetup.qrCodeBase64}`"
                    alt="2FA QR Code"
                  />
                </div>
                <div class="centered-form-stage centered-form-stage-compact">
                  <a-form layout="vertical" class="centered-form-shell">
                    <a-form-item label="手动绑定密钥">
                      <a-input :value="twoFactorSetup.secret" readonly />
                    </a-form-item>
                    <a-form-item label="步骤 2：输入 6 位验证码确认启用">
                      <a-input
                        v-model:value="twoFactorCode"
                        :maxlength="6"
                        placeholder="请输入动态验证码"
                      />
                    </a-form-item>
                    <div class="two-factor-actions">
                      <a-button @click="handleGenerate2fa">重新生成</a-button>
                      <a-button
                        type="primary"
                        :loading="twoFactorEnableLoading"
                        @click="handleEnable2fa"
                      >
                        确认启用 2FA
                      </a-button>
                    </div>
                  </a-form>
                </div>
              </template>
            </div>
          </div>

          <div v-else class="two-factor-layout">
            <div class="two-factor-panel">
              <h4>当前状态</h4>
              <p>该用户已启用二次验证，登录时需要在账号密码后继续输入动态验证码。</p>
              <div class="two-factor-actions">
                <a-button
                  danger
                  :loading="twoFactorDisableLoading"
                  @click="handleDisable2fa"
                >
                  关闭 2FA
                </a-button>
              </div>
            </div>
          </div>
        </template>
      </a-spin>
    </a-modal>
  </div>
</template>

<style scoped>
.user-account-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.user-account-toolbar-left,
.user-account-toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 表单分区布局 */
.user-account-form {
  padding: 4px 0;
}

.form-section {
  margin-bottom: 12px;
  padding: 16px 16px 4px;
  border-radius: 8px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
}

.form-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #595959;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8e8e8;
}

.form-field-extra {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 2px;
  line-height: 1.5;
}

/* 权限摘要标签式展示 */
.permission-summary-item :deep(.ant-form-item-control-input) {
  min-height: auto;
}

.permission-summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 28px;
  align-items: center;
  padding: 4px 0;
}

.permission-summary-empty {
  color: #bfbfbf;
  font-size: 13px;
  padding: 4px 0;
}

.user-account-create-result {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-account-create-result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
}

.user-account-create-result-meta {
  min-width: 0;
}

.user-account-create-result-label {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  margin-bottom: 6px;
}

.user-account-create-result-value {
  color: rgba(0, 0, 0, 0.88);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  word-break: break-all;
}

.user-account-create-result-password {
  letter-spacing: 1px;
}

.user-account-create-result-role-block {
  padding: 16px;
  border-radius: 12px;
  background: #fafafa;
}

.user-account-create-result-role-list {
  color: rgba(0, 0, 0, 0.88);
  line-height: 1.7;
}

.user-account-create-result-hint {
  color: rgba(0, 0, 0, 0.45);
}

.user-account-create-result-actions {
  display: flex;
  justify-content: flex-end;
}

.two-factor-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.two-factor-panel {
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  padding: 20px;
  background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
}

.two-factor-panel h4 {
  margin: 0 0 8px;
  font-size: 16px;
}

.two-factor-panel p {
  margin: 0 0 16px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.7;
}

.two-factor-qr-box {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 20px 0 12px;
  padding: 20px;
  border-radius: 12px;
  background: #fff;
  border: 1px dashed #d9d9d9;
}

.two-factor-qr-image {
  width: 240px;
  height: 240px;
  object-fit: contain;
}

.two-factor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .user-account-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .user-account-toolbar-left,
  .user-account-toolbar-right {
    width: 100%;
    flex-wrap: wrap;
  }

  .two-factor-qr-image {
    width: 200px;
    height: 200px;
  }
}
</style>
