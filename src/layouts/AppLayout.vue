<script setup lang="ts">
import { computed, h, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { message, Modal, type MenuProps } from 'ant-design-vue'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'
import { useAccountSecurity } from '@/composables/use-account-security'
import { pingAuth } from '@/api/auth'
import { http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { isKnownAppIconKey, resolveAppIcon } from '@/config/app-icons'
import { type AppIconKey } from '@/config/navigation-registry'
import { useAuthHeartbeat } from '@/layouts/use-auth-heartbeat'
import { useGlobalSearchSupport } from '@/layouts/use-global-search-support'
import { useLayoutMenuSupport } from '@/layouts/use-layout-menu-support'
import { useOpenPages } from '@/layouts/use-open-pages'
import { usePersonalSettings } from '@/layouts/use-personal-settings'
import { useAuthStore } from '@/stores/auth'
import { usePermissionStore } from '@/stores/permission'
import { useSystemMenuStore } from '@/stores/system-menu'
import dayjs from 'dayjs'
import { apiBaseUrl, appTitle } from '@/utils/env'
import { fetchSupplierOptions } from '@/api/supplier-options'
import { fetchCustomerOptions } from '@/api/customer-options'
import { fetchCarrierOptions } from '@/api/carrier-options'
import { fetchWarehouseOptions } from '@/api/warehouse-options'
import { fetchMaterialCategories } from '@/api/material-categories'

const router = useRouter()

const clock = ref(dayjs())
let clockTimer: number | null = null
const route = useRoute()
const authStore = useAuthStore()
const permissionStore = usePermissionStore()
const systemMenuStore = useSystemMenuStore()

// Pre-fetch master data options when entering business module pages
const syncState = ref<'idle' | 'syncing' | 'success' | 'failed'>('idle')
let syncTimer: number | null = null
const BUSINESS_MODULE_PREFIXES = [
  '/materials', '/suppliers', '/customers', '/carriers', '/warehouses',
  '/purchase-orders', '/purchase-inbounds', '/sales-orders', '/sales-outbounds',
  '/freight-bills', '/purchase-contracts', '/sales-contracts',
  '/supplier-statements', '/customer-statements', '/freight-statements',
  '/receipts', '/payments', '/invoice-receipts', '/invoice-issues',
]

async function refreshOptions() {
  if (!authStore.token) return
  syncState.value = 'syncing'
  try {
    const results = await Promise.allSettled([
      fetchSupplierOptions(),
      fetchCustomerOptions(),
      fetchCarrierOptions(),
      fetchWarehouseOptions(),
      fetchMaterialCategories(),
    ])
    syncState.value = results.every(r => r.status === 'fulfilled') ? 'success' : 'failed'
  } catch {
    syncState.value = 'failed'
  }
  if (syncTimer) window.clearTimeout(syncTimer)
  syncTimer = window.setTimeout(() => { syncState.value = 'idle' }, 2000)
}

watch(() => route.path, (path) => {
  if (path === '/login' || path === '/setup') return
  if (BUSINESS_MODULE_PREFIXES.some(p => path.startsWith(p))) {
    refreshOptions()
  }
})

onBeforeUnmount(() => {
  if (syncTimer) window.clearTimeout(syncTimer)
})

// Redirect to login when auth state is lost
watch(() => authStore.token, (t) => { if (!t) router.replace('/login') })

const { user } = storeToRefs(authStore)
const { menus: systemMenuTree } = storeToRefs(systemMenuStore)

const collapsed = ref(false)
const companyName = ref('')
const backendOnline = ref(false)
let healthTimer: number | null = null
let healthRetries = 0
const MAX_HEALTH_RETRIES = 5

async function fetchCompanyName() {
  try {
    const res = await http.get<{ data: { companyName?: string } }>(ENDPOINTS.COMPANY_SETTINGS_CURRENT)
    companyName.value = res.data?.companyName || ''
  } catch { /* silent */ }
}

async function checkBackendHealth() {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5_000)
    const res = await fetch(`${apiBaseUrl}/health`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    })
    clearTimeout(timeout)
    if (res.ok) {
      const body = await res.json()
      backendOnline.value = body.status === 'UP'
      healthRetries = 0
    } else {
      backendOnline.value = false
    }
  } catch {
    backendOnline.value = false
    healthRetries++
    if (healthRetries <= MAX_HEALTH_RETRIES) {
      const delay = Math.min(1000 * Math.pow(2, healthRetries), 30_000)
      if (healthTimer) window.clearInterval(healthTimer)
      healthTimer = window.setTimeout(checkBackendHealth, delay)
    }
  }
}

function startHealthPolling() {
  checkBackendHealth()
  healthTimer = window.setInterval(() => {
    if (healthRetries === 0) checkBackendHealth()
  }, 30_000)
}

const isE2eMode = computed(() =>
  typeof window !== 'undefined' && window.localStorage.getItem('aries-e2e-mode') === '1',
)

const fontSizeOptions = [11, 12, 13, 14, 16, 18]
const personalSettingsTab = ref('display')

const {
  passwordSaving,
  twoFactorSetupLoading,
  twoFactorEnableLoading,
  twoFactorDisableLoading,
  twoFactorSetup,
  twoFactorCode,
  passwordForm,
  disableTwoFactorForm,
  currentUserTotpEnabled,
  forbidDisable2fa,
  loadSecurityStatus,
  resetSecurityForms,
  handleChangeOwnPassword,
  handleSetupOwn2fa,
  handleEnableOwn2fa,
  handleDisableOwn2fa,
} = useAccountSecurity()

const selectedKeys = computed(() => [
  String(route.meta.activeMenuKey || route.meta.menuKey || route.path),
])
const currentTitle = computed(() => String(route.meta.title || appTitle))
const menuEntriesForRender = computed(() =>
  isE2eMode.value
    ? visibleMenuEntries.value.flatMap((entry) =>
        entry.children.length > 0 ? entry.children.map((child) => ({ ...child, children: [] })) : [entry],
      )
    : visibleMenuEntries.value,
)
const menuRenderKey = computed(() =>
  menuEntriesForRender.value
    .map((entry) => `${entry.menuCode}:${entry.children.map((child) => child.menuCode).join(',')}`)
    .join('|'),
)

function resolveIcon(iconKey: AppIconKey) {
  return resolveAppIcon(iconKey)
}

const { visibleMenuEntries } = useLayoutMenuSupport({
  user,
  systemMenuTree,
  permissionStore,
  systemMenuStore,
  isKnownIconKey: isKnownAppIconKey,
})

const menuPathByKey = computed(() => {
  const pathMap: Record<string, string> = {}

  const visit = (entry: (typeof visibleMenuEntries.value)[number]) => {
    const key = entry.path || entry.menuCode
    if (entry.path) {
      pathMap[key] = entry.path
    }
    entry.children.forEach((child) => {
      if (child.path) {
        pathMap[child.path] = child.path
      }
    })
  }

  menuEntriesForRender.value.forEach((entry) => visit(entry))
  return pathMap
})

const menuItems = computed<NonNullable<MenuProps['items']>>(() =>
  menuEntriesForRender.value.map((entry) => ({
    key: entry.path || entry.menuCode,
    icon: h(resolveIcon(entry.icon)),
    label: entry.title,
    children: entry.children.length
      ? entry.children.map((child) => ({
          key: child.path || child.menuCode,
          icon: h(resolveIcon(child.icon)),
          label: child.title,
        }))
      : undefined,
  })),
)

function goTo(path: string) {
  void router.push(path)
}

function handleMenuClick({ key }: Parameters<NonNullable<MenuProps['onClick']>>[0]) {
  const path = menuPathByKey.value[String(key)]
  if (path) {
    goTo(path)
  }
}

const {
  keyword: globalSearchKeyword,
  loading: globalSearchLoading,
  resultOptions: globalSearchOptions,
  handleBlur: handleGlobalSearchBlur,
  handleSearch: handleGlobalSearch,
  handleSelect: handleGlobalSearchSelect,
  handleSubmit: handleGlobalSearchSubmit,
} = useGlobalSearchSupport({
  router,
  canAccessModule: (moduleKey) => permissionStore.canAccessMenuKey(moduleKey),
})

const { activeTabKey, openKeys, openPages, closeTab, handleTabChange, handleTabEdit } =
  useOpenPages({
    route,
    router,
    defaultPath: '/dashboard',
    defaultTitle: '未命名页面',
  })

const {
  visible: personalSettingVisible,
  fontSize: personalFontSize,
  open: openPersonalSettings,
  close: closePersonalSettings,
  reset: resetPersonalSettings,
  save: savePersonalSettings,
} = usePersonalSettings()

function handleOpenPersonalSettings() {
  personalSettingsTab.value = 'display'
  resetSecurityForms()
  loadSecurityStatus()
  openPersonalSettings()
}

function handleClosePersonalSettings() {
  closePersonalSettings()
}

function handleSavePersonalSettings() {
  savePersonalSettings()
  message.success('显示设置已保存')
}

function handleResetPersonalSettings() {
  resetPersonalSettings()
}

watch(personalSettingVisible, (visible) => {
  if (!visible) {
    personalSettingsTab.value = 'display'
    resetSecurityForms()
  }
})

function handleLogout() {
  Modal.confirm({
    title: '确认退出',
    content: '确定要退出登录吗？',
    okText: '确认退出',
    cancelText: '取消',
    onOk: () => {
      authStore.signOut().finally(() => {
        window.location.replace('/login')
      })
    },
  })
}

if (!isE2eMode.value) {
  useAuthHeartbeat({
    ping: pingAuth,
  })
}

const pageLoading = ref(false)
let pageLoadingTimer: ReturnType<typeof setTimeout> | null = null

function startPageLoading() {
  pageLoadingTimer = setTimeout(() => { pageLoading.value = true }, 80)
}

function stopPageLoading() {
  if (pageLoadingTimer) { clearTimeout(pageLoadingTimer); pageLoadingTimer = null }
  pageLoading.value = false
}

router.beforeResolve(() => { startPageLoading() })
router.afterEach(() => { stopPageLoading() })
router.onError(() => { stopPageLoading() })

onMounted(() => {
  fetchCompanyName()
  startHealthPolling()
  clockTimer = window.setInterval(() => { clock.value = dayjs() }, 1000)
})

onBeforeUnmount(() => {
  if (healthTimer) {
    window.clearInterval(healthTimer)
    healthTimer = null
  }
  if (clockTimer) {
    window.clearInterval(clockTimer)
    clockTimer = null
  }
})
</script>

<template>
  <div class="leo-page-loader" :class="{ 'is-loading': pageLoading }" />
  <a-layout class="app-shell leo-shell">
    <a-layout-sider
      collapsible
      :collapsed="collapsed"
      :trigger="null"
      theme="light"
      :width="180"
      :collapsed-width="60"
      class="app-sider leo-sider"
    >
      <div class="leo-brand">
        <div class="leo-brand-mark">{{ collapsed ? 'L' : 'LEO' }}</div>
        <div v-if="!collapsed" class="leo-brand-copy">
          <strong>{{ appTitle }}</strong>
          <span>钢贸业务中台</span>
        </div>
      </div>

      <a-menu
        :key="menuRenderKey"
        v-model:open-keys="openKeys"
        :selected-keys="selectedKeys"
        :items="menuItems"
        mode="inline"
        theme="light"
        class="leo-menu"
        @click="handleMenuClick"
      />
    </a-layout-sider>

    <a-layout
      class="leo-main"
      :style="{ paddingLeft: `${collapsed ? 60 : 180}px` }"
    >
      <a-layout-header
        :class="[
          'leo-header',
          'app-fixed-header',
          collapsed ? 'app-side-closed' : 'app-side-opened',
        ]"
      >
        <div class="app-header-bar">
          <span class="app-trigger" @click="collapsed = !collapsed">
            <MenuUnfoldOutlined v-if="collapsed" />
            <MenuFoldOutlined v-else />
          </span>

          <div class="header-page-meta">
            <div class="header-page-title">{{ currentTitle }}</div>
            <div class="header-page-desc">业务中心 / {{ currentTitle }}</div>
          </div>

          <div class="header-global-search">
            <div class="header-global-search-group">
              <a-auto-complete
                v-model:value="globalSearchKeyword"
                :options="globalSearchOptions"
                class="header-global-search-box"
                placeholder="搜索单号、合同号、对账单号"
                @search="handleGlobalSearch"
                @select="handleGlobalSearchSelect"
                @press-enter="handleGlobalSearchSubmit(globalSearchKeyword)"
                @blur="handleGlobalSearchBlur"
              />
              <a-button
                type="primary"
                class="header-global-search-button"
                :loading="globalSearchLoading"
                @click="handleGlobalSearchSubmit(globalSearchKeyword)"
              >
                <SearchOutlined />
              </a-button>
            </div>
          </div>

          <div class="user-wrapper">
            <span class="action action-tag">
              <Transition name="fade">
                <a-tag v-if="syncState === 'syncing'" color="processing">同步中</a-tag>
                <a-tag v-else-if="syncState === 'success'" color="success">已同步</a-tag>
                <a-tag v-else-if="syncState === 'failed'" color="error">同步失败</a-tag>
              </Transition>
              <a-tag v-if="companyName" color="blue">{{ companyName }}</a-tag>
              <a-tag :color="backendOnline ? 'green' : 'red'">
                {{ backendOnline ? 'API 正常' : 'API 离线' }}
              </a-tag>
              <a-tag color="default">{{ clock.format('HH:mm:ss') }}</a-tag>
            </span>
            <span class="action user-name">
              {{ user?.userName || user?.loginName || '未登录' }}
            </span>
            <span class="action">
              <a class="settings-link" @click.prevent="handleOpenPersonalSettings">
                <SettingOutlined />
                个人设置
              </a>
            </span>
            <span class="action">
              <a class="logout-link" @click.prevent="handleLogout">退出登录</a>
            </span>
          </div>
        </div>
      </a-layout-header>

      <a-tabs
        class="tab-layout-tabs"
        :active-key="activeTabKey"
        type="editable-card"
        hide-add
        @change="handleTabChange"
        @edit="handleTabEdit"
      >
        <a-tab-pane
          v-for="page in openPages"
          :key="page.key"
          :closable="page.closable"
        >
          <template #tab>
            <span @dblclick="page.closable && closeTab(page.key)">{{ page.title }}</span>
          </template>
        </a-tab-pane>
      </a-tabs>

      <a-layout-content class="leo-content">
        <div class="leo-content-inner">
          <router-view :key="$route.path" />
        </div>
      </a-layout-content>
    </a-layout>

    <a-modal
      v-model:open="personalSettingVisible"
      title="个人设置"
      width="720px"
      :mask-closable="false"
      :footer="null"
    >
      <a-tabs v-model:active-key="personalSettingsTab">
        <a-tab-pane key="display" tab="显示偏好">
          <div class="personal-setting-panel">
            <div class="personal-setting-row">
              <span class="personal-setting-label">系统字体</span>
              <span class="personal-setting-value">苹方</span>
            </div>
            <div class="personal-setting-row">
              <span class="personal-setting-label">字体大小</span>
              <a-select v-model:value="personalFontSize" style="width: 160px">
                <a-select-option
                  v-for="size in fontSizeOptions"
                  :key="size"
                  :value="size"
                >
                  {{ size }}px
                </a-select-option>
              </a-select>
            </div>
            <div class="personal-setting-actions">
              <a-button @click="handleResetPersonalSettings">恢复默认</a-button>
              <a-button type="primary" @click="handleSavePersonalSettings">保存显示设置</a-button>
            </div>
          </div>
        </a-tab-pane>

        <a-tab-pane key="security" tab="账户安全">
          <a-space direction="vertical" style="width: 100%" :size="16">
            <a-alert
              show-icon
              type="info"
              :message="`当前账号：${user?.userName || user?.loginName || '--'}（${user?.loginName || '--'}）`"
              :description="currentUserTotpEnabled ? '已启用 2FA，高风险操作会要求二次验证。' : '未启用 2FA，建议立即绑定认证器。'"
            />

            <a-card size="small" title="修改密码">
              <a-form layout="vertical">
                <a-row :gutter="16">
                  <a-col :span="8">
                    <a-form-item label="当前密码" required>
                      <a-input-password
                        v-model:value="passwordForm.currentPassword"
                        placeholder="请输入当前密码"
                        :maxlength="128"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :span="8">
                    <a-form-item label="新密码" required>
                      <a-input-password
                        v-model:value="passwordForm.newPassword"
                        placeholder="请输入新密码"
                        :maxlength="128"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :span="8">
                    <a-form-item label="确认新密码" required>
                      <a-input-password
                        v-model:value="passwordForm.confirmPassword"
                        placeholder="请再次输入新密码"
                        :maxlength="128"
                      />
                    </a-form-item>
                  </a-col>
                </a-row>
                <a-button type="primary" :loading="passwordSaving" @click="handleChangeOwnPassword">
                  更新密码
                </a-button>
              </a-form>
            </a-card>

            <a-card size="small" title="两步验证（2FA）">
              <a-space direction="vertical" style="width: 100%" :size="16">
                <div class="personal-setting-row">
                  <span class="personal-setting-label">当前状态</span>
                  <a-tag :color="currentUserTotpEnabled ? 'processing' : 'default'">
                    {{ currentUserTotpEnabled ? '已启用' : '未启用' }}
                  </a-tag>
                </div>

                <template v-if="!currentUserTotpEnabled">
                  <a-alert
                    show-icon
                    type="warning"
                    message="建议绑定 Google Authenticator、Microsoft Authenticator 等标准 TOTP 应用。"
                  />
                  <a-button type="primary" :loading="twoFactorSetupLoading" @click="handleSetupOwn2fa">
                    生成绑定二维码
                  </a-button>

                  <template v-if="twoFactorSetup">
                    <div class="two-factor-qr-box">
                      <img
                        class="two-factor-qr-image"
                        :src="`data:image/png;base64,${twoFactorSetup.qrCodeBase64}`"
                        alt="2FA QR Code"
                      />
                    </div>
                    <a-form layout="vertical">
                      <a-form-item label="手动绑定密钥">
                        <a-input :value="twoFactorSetup.secret" readonly />
                      </a-form-item>
                      <a-form-item label="输入 6 位验证码完成绑定" required>
                        <a-input
                          v-model:value="twoFactorCode"
                          placeholder="请输入动态验证码"
                          :maxlength="6"
                        />
                      </a-form-item>
                      <a-space>
                        <a-button @click="handleSetupOwn2fa">重新生成</a-button>
                        <a-button
                          type="primary"
                          :loading="twoFactorEnableLoading"
                          @click="handleEnableOwn2fa"
                        >
                          确认启用 2FA
                        </a-button>
                      </a-space>
                    </a-form>
                  </template>
                </template>

                <template v-else-if="forbidDisable2fa">
                  <a-alert
                    show-icon
                    type="info"
                    message="当前账号已启用 2FA。系统设置禁止关闭 2FA，如需关闭请联系管理员。"
                  />
                </template>

                <template v-else>
                  <a-alert
                    show-icon
                    type="success"
                    message="当前账号已启用 2FA。若需关闭，请输入当前有效的 2FA 验证码确认。"
                  />
                  <a-form layout="vertical">
                    <a-form-item label="2FA 验证码" required>
                      <a-input
                        v-model:value="disableTwoFactorForm.totpCode"
                        placeholder="请输入 6 位验证码"
                        :maxlength="6"
                      />
                    </a-form-item>
                    <a-button
                      danger
                      :loading="twoFactorDisableLoading"
                      @click="handleDisableOwn2fa"
                    >
                      关闭 2FA
                    </a-button>
                  </a-form>
                </template>
              </a-space>
            </a-card>
          </a-space>
        </a-tab-pane>
      </a-tabs>

      <template #footer>
        <div style="text-align: right">
          <a-button @click="handleClosePersonalSettings">关闭</a-button>
        </div>
      </template>
    </a-modal>
  </a-layout>
</template>
