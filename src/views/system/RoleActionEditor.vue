<script setup lang="ts">
import { h, ref, onMounted, computed, watch } from 'vue'
import { Modal, Checkbox, message } from 'ant-design-vue'
import { type ColumnDef } from '@tanstack/vue-table'
import { useDataTable } from '@/composables/use-data-table'
import DataTable from '@/components/DataTable.vue'
import { useRoute } from 'vue-router'
import {
  PlusOutlined,
  EditOutlined,
  SafetyCertificateOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  CheckSquareOutlined,
  BorderOutlined,
} from '@ant-design/icons-vue'
import {
  createRole,
  getRoleActions,
  listSystemMenus as listRolePermissionOptions,
  listRoleSettingsPage,
  updateRole,
  updateRoleActions,
  type MenuNode,
  type RoleRecord,
} from '@/api/role-actions'
import { useRequestError } from '@/composables/use-request-error'
import {
  enabledStatusValues,
  roleDataScopeValues,
  roleTypeValues,
} from '@/constants/module-options'
import { usePermissionStore } from '@/stores/permission'
import { normalizeAction, resolveResourceKey } from '@/constants/resource-permissions'

const ACTION_LABELS: Record<string, string> = {
  read: '查看',
  create: '新增',
  update: '编辑',
  delete: '删除',
  audit: '审核',
  export: '导出',
  print: '打印',
  manage_permissions: '配置权限',
}
const showRequestError = useRequestError()
const route = useRoute()

const ALL_ACTIONS = [
  'read',
  'create',
  'update',
  'delete',
  'audit',
  'export',
  'print',
  'manage_permissions',
] as const
type ActionCode = (typeof ALL_ACTIONS)[number]

const loading = ref(false)
const roles = ref<RoleRecord[]>([])
const selectedRoleId = ref<string | null>(null)
const selectedActions = ref<Set<string>>(new Set())
const saving = ref(false)
const roleSaving = ref(false)
const viewMode = ref<'list' | 'matrix'>('list')

const showRoleModal = ref(false)
const editingRole = ref<RoleRecord | null>(null)
const formRoleName = ref('')
const formRoleCode = ref('')
const formRoleType = ref<string>(roleTypeValues[1])
const formDataScope = ref<string>(roleDataScopeValues[0])
const formRemark = ref('')
const permissionStore = usePermissionStore()
const menuTree = ref<MenuNode[]>([])

const roleTypeOptions = [...roleTypeValues]
const dataScopeOptions = [...roleDataScopeValues]
const canViewRoleCatalog = computed(() =>
  permissionStore.can('role', 'read'),
)
const canCreateRole = computed(() =>
  permissionStore.can('role', 'create'),
)
const canEditRole = computed(() =>
  permissionStore.can('role', 'update'),
)
const canEditPermissions = computed(() =>
  permissionStore.can('role', 'manage_permissions'),
)
const ROLE_PAGE_SIZE = 100

onMounted(() => {
  if (canEditPermissions.value) {
    void loadMenus()
  }
  if (canViewRoleCatalog.value) {
    void loadRoles()
  }
})

watch(
  () => route?.query?.keyword,
  () => {
    void syncSelectedRoleFromQuery()
  },
)

async function loadMenus() {
  try {
    menuTree.value = await listRolePermissionOptions()
  } catch (error) {
    showRequestError(error, '加载菜单失败')
  }
}

async function loadRoles() {
  if (!canViewRoleCatalog.value) {
    roles.value = []
    selectedRoleId.value = null
    selectedActions.value = new Set()
    return
  }
  loading.value = true
  try {
    const mergedRoles: RoleRecord[] = []
    let page = 0
    let partialFailure = false

    while (true) {
      try {
        const data = await listRoleSettingsPage(page, ROLE_PAGE_SIZE)
        const currentPageRoles = data.records || []

        mergedRoles.push(...currentPageRoles)

        const totalPages = Number(data.totalPages || 0)
        if (
          (totalPages > 0 && page + 1 >= totalPages) ||
          currentPageRoles.length < ROLE_PAGE_SIZE
        ) {
          break
        }

        page += 1
      } catch {
        partialFailure = mergedRoles.length > 0
        if (!partialFailure) {
          throw new Error('load_roles_failed')
        }
        break
      }
    }

    roles.value = mergedRoles
    if (
      selectedRoleId.value != null &&
      !mergedRoles.some((role) => role.id === selectedRoleId.value)
    ) {
      selectedRoleId.value = null
      selectedActions.value = new Set()
    }
    if (partialFailure) {
      message.warning('部分角色加载失败，当前仅展示已成功加载的数据')
    }
    await syncSelectedRoleFromQuery()
  } catch (error) {
    showRequestError(error, '加载角色失败')
  } finally {
    loading.value = false
  }
}

function findRoleByKeyword() {
  const keyword = String(route?.query?.keyword || '').trim()
  if (!keyword) {
    return null
  }
  return (
    roles.value.find((role) => role.roleName === keyword)
    || roles.value.find((role) => role.roleCode === keyword)
    || roles.value.find(
      (role) =>
        role.roleName?.includes(keyword) || role.roleCode?.includes(keyword),
    )
    || null
  )
}

async function syncSelectedRoleFromQuery() {
  const matchedRole = findRoleByKeyword()
  if (!matchedRole || matchedRole.id === selectedRoleId.value) {
    return
  }
  await selectRole(matchedRole)
}

async function selectRole(role: RoleRecord) {
  selectedRoleId.value = role.id
  try {
    const actions = new Set<string>()
    for (const item of await getRoleActions(role.id)) {
      actions.add(`${item.resource}:${normalizeAction(item.action)}`)
    }
    selectedActions.value = actions
  } catch (error) {
    selectedActions.value = new Set()
    showRequestError(error, '加载角色权限失败')
  }
}

// ========== 矩阵视图数据 ==========

const flatMenus = computed(() => {
  const result: {
    menuCode: string
    menuName: string
    parentName: string
    resource: string
    actions: string[]
  }[] = []
  for (const group of menuTree.value) {
    if (group.children.length > 0) {
      for (const child of group.children) {
        if (child.actions.length > 0) {
          result.push({
            menuCode: child.menuCode,
            menuName: child.menuName,
            parentName: group.menuName,
            resource: resolveResourceKey(child.menuCode),
            actions: child.actions,
          })
        }
      }
    } else if (group.actions.length > 0) {
      result.push({
        menuCode: group.menuCode,
        menuName: group.menuName,
        parentName: '',
        resource: resolveResourceKey(group.menuCode),
        actions: group.actions,
      })
    }
  }
  return result
})

const matrixData = computed(() => {
  return flatMenus.value.map((menu) => {
    const row: Record<string, unknown> = {
      key: menu.menuCode,
      menuName: menu.menuName,
      menuCode: menu.menuCode,
      resource: menu.resource,
      actions: menu.actions,
    }
    let count = 0
    for (const action of ALL_ACTIONS) {
      const supported = menu.actions.includes(action)
      const checked =
        supported && selectedActions.value.has(`${menu.resource}:${action}`)
      row[action] = checked
      if (checked) count++
    }
    row._count = `${count}/${menu.actions.length}`
    return row
  })
})

// ========== 权限操作函数 ==========

function isMenuChecked(menuCode: string): boolean {
  const resource = resolveResourceKey(menuCode)
  for (const key of selectedActions.value) {
    if (key.startsWith(resource + ':')) return true
  }
  return false
}

function isMenuFullyChecked(menu: MenuNode) {
  const resource = resolveResourceKey(menu.menuCode)
  return menu.actions.every((action: string) =>
    selectedActions.value.has(`${resource}:${action}`),
  )
}

function isMenuPartiallyChecked(menu: MenuNode) {
  return isMenuChecked(menu.menuCode) && !isMenuFullyChecked(menu)
}

function toggleAction(menuCode: string, action: string) {
  if (!canEditPermissions.value) {
    message.warning('暂无权限配置编辑权限')
    return
  }
  const key = `${resolveResourceKey(menuCode)}:${action}`
  const newSet = new Set(selectedActions.value)
  if (newSet.has(key)) {
    newSet.delete(key)
  } else {
    newSet.add(key)
  }
  selectedActions.value = newSet
}

function isActionSelected(menuCode: string, action: string) {
  return selectedActions.value.has(`${resolveResourceKey(menuCode)}:${action}`)
}

function toggleAllMenuActions(menu: MenuNode) {
  if (!canEditPermissions.value) {
    message.warning('暂无权限配置编辑权限')
    return
  }
  const newSet = new Set(selectedActions.value)
  const resource = resolveResourceKey(menu.menuCode)
  const allChecked = menu.actions.every((action: string) =>
    newSet.has(`${resource}:${action}`),
  )
  for (const action of menu.actions) {
    const key = `${resource}:${action}`
    if (allChecked) {
      newSet.delete(key)
    } else {
      newSet.add(key)
    }
  }
  selectedActions.value = newSet
}

// ========== 批量操作 ==========

function selectAll() {
  if (!canEditPermissions.value) {
    message.warning('暂无权限配置编辑权限')
    return
  }
  const newSet = new Set<string>()
  for (const menu of flatMenus.value) {
    for (const action of menu.actions) {
      newSet.add(`${menu.resource}:${action}`)
    }
  }
  selectedActions.value = newSet
}

function deselectAll() {
  if (!canEditPermissions.value) {
    message.warning('暂无权限配置编辑权限')
    return
  }
  selectedActions.value = new Set()
}

function toggleActionColumn(action: string) {
  if (!canEditPermissions.value) {
    message.warning('暂无权限配置编辑权限')
    return
  }
  const newSet = new Set(selectedActions.value)
  const colState = actionColumnState.value[action]
  const allChecked = colState?.allChecked ?? false
  for (const menu of flatMenus.value) {
    if (!menu.actions.includes(action)) continue
    const key = `${menu.resource}:${action}`
    if (allChecked) {
      newSet.delete(key)
    } else {
      newSet.add(key)
    }
  }
  selectedActions.value = newSet
}

const actionColumnState = computed(() => {
  const result: Record<
    string,
    { allChecked: boolean; indeterminate: boolean }
  > = {}
  for (const action of ALL_ACTIONS) {
    const supported = flatMenus.value.filter((m) => m.actions.includes(action))
    if (supported.length === 0) {
      result[action] = { allChecked: false, indeterminate: false }
      continue
    }
    const checkedCount = supported.filter((m) =>
      selectedActions.value.has(`${m.resource}:${action}`),
    ).length
    result[action] = {
      allChecked: checkedCount === supported.length,
      indeterminate: checkedCount > 0 && checkedCount < supported.length,
    }
  }
  return result
})

function toggleMatrixCell(menuCode: string, action: string) {
  toggleAction(menuCode, action)
}

// ========== 保存权限 ==========

async function saveRoleActions() {
  if (!canEditPermissions.value) {
    message.warning('暂无权限配置编辑权限')
    return
  }
  if (!selectedRoleInfo.value || selectedRoleId.value == null) return
  saving.value = true
  try {
    const actions = Array.from(selectedActions.value).map((key) => {
      const [resource, action] = key.split(':')
      return { resource, action }
    })
    await updateRoleActions(selectedRoleId.value, actions)
    message.success('权限保存成功')
  } catch (error) {
    showRequestError(error, '保存失败')
  } finally {
    saving.value = false
  }
}

// ========== 角色 CRUD ==========

function openRoleForm(mode: 'create' | 'edit', role?: RoleRecord) {
  if (mode === 'edit' && role) {
    if (!canEditRole.value) {
      message.warning('暂无编辑角色权限')
      return
    }
    editingRole.value = role
    formRoleName.value = role.roleName
    formRoleCode.value = role.roleCode
    formRoleType.value = role.roleType
    formDataScope.value = role.dataScope
    formRemark.value = role.remark || ''
  } else {
    if (!canCreateRole.value) {
      message.warning('暂无新增角色权限')
      return
    }
    editingRole.value = null
    formRoleName.value = ''
    formRoleCode.value = ''
    formRoleType.value = roleTypeValues[1]
    formDataScope.value = roleDataScopeValues[0]
    formRemark.value = ''
  }
  showRoleModal.value = true
}

function closeRoleForm() {
  showRoleModal.value = false
  roleSaving.value = false
}

async function saveRole() {
  const isEdit = editingRole.value != null
  if (!(isEdit ? canEditRole.value : canCreateRole.value)) {
    message.warning(isEdit ? '暂无编辑角色权限' : '暂无新增角色权限')
    return
  }
  if (!formRoleName.value.trim() || !formRoleCode.value.trim()) {
    message.warning('请填写角色名称和编码')
    return
  }

  roleSaving.value = true
  try {
    const payload: Record<string, unknown> = {
      roleName: formRoleName.value.trim(),
      roleCode: formRoleCode.value.trim(),
      roleType: formRoleType.value,
      dataScope: formDataScope.value,
      remark: formRemark.value.trim() || null,
      status: editingRole.value?.status || enabledStatusValues[0],
    }

    if (isEdit) {
      await updateRole(editingRole.value!.id, payload)
      message.success('角色更新成功')
    } else {
      const response = await createRole(payload)
      message.success('角色创建成功')
      closeRoleForm()
      await loadRoles()
      const newRole = (response as { data?: RoleRecord }).data
      if (newRole?.id) {
        Modal.confirm({
          title: '角色创建成功',
          content: `角色「${payload.roleName}」已创建完成，是否立即为此角色配置权限？`,
          okText: '去配置',
          cancelText: '稍后配置',
          onOk() {
            const created = roles.value.find((r) => r.id === newRole.id)
            if (created) {
              selectRole(created)
            }
          },
        })
      }
      return
    }

    closeRoleForm()
    await loadRoles()
  } catch (error) {
    showRequestError(error, '保存失败')
  } finally {
    roleSaving.value = false
  }
}

const selectedRoleInfo = computed(() =>
  roles.value.find((r) => r.id === selectedRoleId.value),
)

const roleModalTitle = computed(() =>
  editingRole.value ? '编辑角色' : '新增角色',
)

function resolveActionCode(value: unknown): ActionCode | null {
  if (typeof value !== 'string') {
    return null
  }
  return (ALL_ACTIONS as readonly string[]).includes(value) ? value as ActionCode : null
}

function getActionLabel(value: unknown) {
  const action = resolveActionCode(value)
  return action ? ACTION_LABELS[action] || action : String(value || '')
}

function isAnyMenuSupportingAction(value: unknown) {
  const action = resolveActionCode(value)
  return action ? flatMenus.value.some((menu) => menu.actions.includes(action)) : false
}

function getActionColumnCheckState(value: unknown) {
  const action = resolveActionCode(value)
  return action ? actionColumnState.value[action] : undefined
}

function matrixRowSupportsAction(record: Record<string, unknown>, value: unknown) {
  const action = resolveActionCode(value)
  if (!action || !Array.isArray(record.actions)) {
    return false
  }
  return record.actions.map((item) => String(item)).includes(action)
}

function isMatrixActionSelected(record: Record<string, unknown>, value: unknown) {
  const action = resolveActionCode(value)
  if (!action) {
    return false
  }
  return selectedActions.value.has(`${String(record.resource || '')}:${action}`)
}

function toggleMatrixCellByKey(record: Record<string, unknown>, value: unknown) {
  const action = resolveActionCode(value)
  if (action) {
    toggleMatrixCell(String(record.menuCode || ''), action)
  }
}

const matrixTanstackColumns = computed<ColumnDef<Record<string, unknown>, unknown>[]>(() => {
  const cols: ColumnDef<Record<string, unknown>, unknown>[] = [
    {
      id: 'menuName',
      accessorKey: 'menuName',
      header: () => '菜单名称',
      meta: { width: 160, fixed: 'left' },
    },
  ]
  for (const action of ALL_ACTIONS) {
    cols.push({
      id: action,
      accessorKey: action,
      header: () => {
        const label = getActionLabel(action)
        if (!isAnyMenuSupportingAction(action)) return label
        const state = getActionColumnCheckState(action)
        return h('div', { class: 'matrix-col-header' }, [
          h(Checkbox, {
            checked: state?.allChecked ?? false,
            indeterminate: state?.indeterminate ?? false,
            disabled: !canEditPermissions.value,
            onChange: () => toggleActionColumn(action),
          }),
          h('span', label),
        ])
      },
      cell: (info) => {
        const record = info.row.original
        if (!matrixRowSupportsAction(record, action)) return h('span', { class: 'matrix-unsupported' }, '-')
        return h(Checkbox, {
          checked: isMatrixActionSelected(record, action),
          disabled: !canEditPermissions.value,
          onChange: () => toggleMatrixCellByKey(record, action),
        })
      },
      meta: { width: 70 },
    })
  }
  cols.push({
    id: '_count',
    accessorKey: '_count',
    header: () => '已授权',
    meta: { width: 70 },
  })
  return cols
})

const { table: matrixTable } = useDataTable({
  data: computed(() => matrixData.value),
  columns: matrixTanstackColumns,
  getRowId: (row) => String(row.key ?? ''),
  manualPagination: false,
  enableSorting: false,
})
</script>

<template>
  <div class="page-stack role-action-editor-page">
    <div class="role-editor-layout">
      <!-- 左侧：角色列表 -->
      <div class="role-list-panel">
        <div class="panel-header">
          <span class="panel-title">角色列表</span>
          <a-button
            v-if="canCreateRole"
            size="small"
            type="primary"
            @click="openRoleForm('create')"
          >
            <template #icon><PlusOutlined /></template>
            新增
          </a-button>
        </div>
        <div class="role-list">
          <div
            v-for="role in roles"
            :key="role.id"
            :class="['role-item', { active: selectedRoleId === role.id }]"
            @click="selectRole(role)"
          >
            <div class="role-item-header">
              <span class="role-name">{{ role.roleName }}</span>
              <a-tag
                :color="role.status === enabledStatusValues[0] ? 'green' : 'red'"
                size="small"
              >
                {{ role.status }}
              </a-tag>
            </div>
            <div class="role-item-meta">
              <span>{{ role.roleCode }}</span>
              <span>{{ role.roleType }}</span>
              <span>{{ role.userCount }} 用户</span>
            </div>
            <div v-if="canEditRole" class="role-item-actions">
              <span
                class="role-edit-link"
                @click.stop="openRoleForm('edit', role)"
              >
                <EditOutlined /> 编辑
              </span>
            </div>
          </div>
          <a-empty v-if="roles.length === 0" description="暂无角色" />
        </div>
      </div>

      <!-- 右侧：权限配置 -->
      <div class="permission-panel">
        <div class="panel-header">
          <div class="panel-header-left">
            <span class="panel-title">
              <SafetyCertificateOutlined />
              {{
                selectedRoleInfo
                  ? `${selectedRoleInfo.roleName} - 权限配置`
                  : canViewRoleCatalog
                    ? '请选择角色'
                    : '缺少角色列表查看权限'
              }}
            </span>
          </div>
          <div v-if="selectedRoleInfo" class="panel-header-right">
            <a-space size="small">
              <a-button
                v-if="canEditPermissions"
                size="small"
                @click="selectAll"
              >
                <template #icon><CheckSquareOutlined /></template>
                全选
              </a-button>
              <a-button
                v-if="canEditPermissions"
                size="small"
                @click="deselectAll"
              >
                <template #icon><BorderOutlined /></template>
                全不选
              </a-button>
              <a-divider v-if="canEditPermissions" type="vertical" />
              <a-radio-group
                v-model:value="viewMode"
                size="small"
                button-style="solid"
              >
                <a-radio-button value="list">
                  <UnorderedListOutlined /> 列表
                </a-radio-button>
                <a-radio-button value="matrix">
                  <AppstoreOutlined /> 矩阵
                </a-radio-button>
              </a-radio-group>
              <a-divider type="vertical" />
              <a-button
                v-if="canEditPermissions"
                type="primary"
                size="small"
                :loading="saving"
                @click="saveRoleActions"
              >
                保存权限
              </a-button>
            </a-space>
          </div>
        </div>

        <!-- 列表视图 -->
        <div v-if="selectedRoleInfo && viewMode === 'list'" class="menu-tree">
          <div v-for="menu in menuTree" :key="menu.menuCode" class="menu-group">
            <div v-if="menu.children.length > 0" class="menu-group-header">
              <span class="menu-group-title">{{ menu.menuName }}</span>
            </div>

            <div
              v-for="child in menu.children"
              :key="child.menuCode"
              class="menu-item-row"
            >
              <div class="menu-item-header">
                <a-checkbox
                  :checked="isMenuChecked(child.menuCode)"
                  :indeterminate="isMenuPartiallyChecked(child)"
                  :disabled="!canEditPermissions"
                  @change="toggleAllMenuActions(child)"
                >
                  <span class="menu-item-name">{{ child.menuName }}</span>
                </a-checkbox>
              </div>
              <div class="action-checkboxes">
                <a-checkbox
                  v-for="action in child.actions"
                  :key="action"
                  :checked="isActionSelected(child.menuCode, action)"
                  :disabled="!canEditPermissions"
                  @change="toggleAction(child.menuCode, action)"
                >
                  {{ ACTION_LABELS[action] || action }}
                </a-checkbox>
              </div>
            </div>

            <div
              v-if="menu.children.length === 0 && menu.actions.length > 0"
              class="menu-item-row"
            >
              <div class="menu-item-header">
                <a-checkbox
                  :checked="isMenuChecked(menu.menuCode)"
                  :indeterminate="isMenuPartiallyChecked(menu)"
                  :disabled="!canEditPermissions"
                  @change="toggleAllMenuActions(menu)"
                >
                  <span class="menu-item-name">{{ menu.menuName }}</span>
                </a-checkbox>
              </div>
              <div class="action-checkboxes">
                <a-checkbox
                  v-for="action in menu.actions"
                  :key="action"
                  :checked="isActionSelected(menu.menuCode, action)"
                  :disabled="!canEditPermissions"
                  @change="toggleAction(menu.menuCode, action)"
                >
                  {{ ACTION_LABELS[action] || action }}
                </a-checkbox>
              </div>
            </div>
          </div>
        </div>

        <!-- 矩阵视图 -->
        <div
          v-if="selectedRoleInfo && viewMode === 'matrix'"
          class="matrix-view"
        >
          <DataTable
            :table="matrixTable"
            size="small"
            bordered
          />
        </div>

        <a-empty
          v-if="!selectedRoleInfo"
          :description="
            canViewRoleCatalog
              ? '请从左侧选择一个角色来配置权限'
              : '当前账号缺少角色列表查看权限'
          "
          style="margin-top: 120px"
        />
      </div>
    </div>

    <!-- 角色编辑弹窗 -->
    <a-modal
      v-model:open="showRoleModal"
      :title="roleModalTitle"
      :mask-closable="false"
      :confirm-loading="roleSaving"
      ok-text="保存"
      cancel-text="取消"
      @ok="saveRole"
      @cancel="closeRoleForm"
    >
      <a-form layout="vertical">
        <a-form-item label="角色名称" required>
          <a-input
            v-model:value="formRoleName"
            placeholder="例如：采购主管"
            :maxlength="64"
          />
        </a-form-item>
        <a-form-item label="角色编码" required>
          <a-input
            v-model:value="formRoleCode"
            placeholder="例如：PURCHASER"
            :maxlength="64"
            :disabled="!!editingRole"
          />
        </a-form-item>
        <a-form-item label="角色类型">
          <a-select v-model:value="formRoleType">
            <a-select-option
              v-for="t in roleTypeOptions"
              :key="t"
              :value="t"
            >
              {{ t }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="数据范围">
          <a-select v-model:value="formDataScope">
            <a-select-option
              v-for="s in dataScopeOptions"
              :key="s"
              :value="s"
            >
              {{ s }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea
            v-model:value="formRemark"
            placeholder="角色描述"
            :rows="3"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.role-editor-layout {
  display: flex;
  gap: 16px;
  height: calc(100vh - 160px);
}

.role-list-panel {
  width: 280px;
  min-width: 280px;
  background: #fff;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.permission-panel {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid #f0f0f0;
  gap: 12px;
}

.panel-header-left {
  flex-shrink: 0;
}

.panel-header-right {
  flex-shrink: 0;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #262626;
}

.role-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.role-item {
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.role-item:hover {
  background: #f5f5f5;
}

.role-item.active {
  background: #e6f7ff;
  border-color: #91d5ff;
}

.role-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.role-name {
  font-weight: 500;
  color: #262626;
}

.role-item-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #8c8c8c;
}

.role-item-actions {
  margin-top: 8px;
}

.role-edit-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #1890ff;
  cursor: pointer;
  user-select: none;
  padding: 2px 0;
}

.role-edit-link:hover {
  color: #40a9ff;
}

/* 列表视图 */
.menu-tree {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.menu-group {
  margin-bottom: 16px;
}

.menu-group-header {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 8px;
}

.menu-group-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
}

.menu-item-row {
  display: flex;
  align-items: center;
  padding: 6px 0 6px 16px;
  border-radius: 4px;
  transition: background 0.2s;
}

.menu-item-row:hover {
  background: #fafafa;
}

.menu-item-header {
  width: 160px;
  flex-shrink: 0;
}

.menu-item-name {
  font-weight: 500;
}

.action-checkboxes {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

/* 矩阵视图 */
.matrix-view {
  flex: 1;
  overflow: hidden;
  padding: 12px;
}

.matrix-col-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.matrix-col-header span {
  font-size: 12px;
}

.matrix-unsupported {
  color: #d9d9d9;
  text-align: center;
}
</style>
