<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  AccountBookOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  BankOutlined,
  CalculatorOutlined,
  CarOutlined,
  CreditCardOutlined,
  DatabaseOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  FileSyncOutlined,
  FileTextOutlined,
  HomeOutlined,
  InboxOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProfileOutlined,
  SearchOutlined,
  PrinterOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
  TableOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons-vue'
import { listBusinessModule } from '@/api/business'
import { businessPageConfigs } from '@/config/business-pages'
import { useAuthStore } from '@/stores/auth'
import { appTitle, isMockEnabled } from '@/utils/env'
import { getPersonalSettings, setPersonalSettings } from '@/utils/storage'
import type { ModuleRecord } from '@/types/module-page'

interface OpenPage {
  key: string
  path: string
  title: string
  closable: boolean
}

interface GlobalSearchResult {
  value: string
  label: string
  moduleKey: string
  title: string
  primaryNo: string
  summary: string
}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { user } = storeToRefs(authStore)

const collapsed = ref(false)
const openKeys = ref<string[]>([])
const openPages = ref<OpenPage[]>([])
const globalSearchKeyword = ref('')
const globalSearchLoading = ref(false)
const globalSearchResults = ref<GlobalSearchResult[]>([])
const personalSettingVisible = ref(false)
const personalFontSize = ref(12)
let globalSearchRequestId = 0

const DEFAULT_FONT_SIZE = 12
const fontSizeOptions = [11, 12, 13, 14, 16, 18]

const globalSearchModuleKeys = [
  'purchase-orders',
  'purchase-inbounds',
  'sales-orders',
  'sales-outbounds',
  'freight-bills',
  'purchase-contracts',
  'sales-contracts',
  'supplier-statements',
  'customer-statements',
  'freight-statements',
  'receipts',
  'payments',
]

const selectedKeys = computed(() => [String(route.meta.menuKey || route.path)])
const activeTabKey = computed(() => String(route.meta.menuKey || route.path))
const currentTitle = computed(() => String(route.meta.title || appTitle))
const globalSearchOptions = computed(() =>
  globalSearchResults.value.map((item) => ({
    value: item.value,
    label: item.label,
  })),
)

function applyPersonalSettings(fontSize: number) {
  document.documentElement.style.setProperty('--app-font-size', `${fontSize}px`)
}

function loadPersonalSettings() {
  const storedSettings = getPersonalSettings()
  personalFontSize.value = storedSettings?.fontSize || DEFAULT_FONT_SIZE
  applyPersonalSettings(personalFontSize.value)
}

if (typeof window !== 'undefined') {
  loadPersonalSettings()
}

watch(
  () => route.meta.menuParent,
  (menuParent) => {
    openKeys.value = menuParent ? [String(menuParent)] : []
  },
  { immediate: true },
)

watch(
  () => route.fullPath,
  () => {
    const key = String(route.meta.menuKey || route.fullPath)
    const path = route.fullPath
    const title = String(route.meta.title || '未命名页面')

    if (!openPages.value.some((item) => item.key === key)) {
      openPages.value.push({
        key,
        path,
        title,
        closable: key !== '/dashboard',
      })
      return
    }

    openPages.value = openPages.value.map((item) =>
      item.key === key ? { ...item, path, title } : item,
    )
  },
  { immediate: true },
)

function goTo(path: string) {
  void router.push(path)
}

function getSearchSummary(record: ModuleRecord) {
  return [
    record.customerName,
    record.supplierName,
    record.projectName,
    record.carrierName,
    record.status,
  ]
    .filter(Boolean)
    .map((item) => String(item))
    .slice(0, 3)
    .join(' / ')
}

async function performGlobalSearch(keyword: string) {
  const normalizedKeyword = keyword.trim()
  if (!normalizedKeyword) {
    globalSearchResults.value = []
    return []
  }

  const requestId = ++globalSearchRequestId
  globalSearchLoading.value = true

  try {
    const responseList = await Promise.all(
      globalSearchModuleKeys.map(async (moduleKey) => {
        const config = businessPageConfigs[moduleKey]
        const response = await listBusinessModule(
          moduleKey,
          { keyword: normalizedKeyword },
          { currentPage: 1, pageSize: 6 },
        )
        const rows = response.data?.rows || []
        return rows.map((record) => {
          const primaryNo = String(record[config.primaryNoKey || 'id'] || record.id)
          const summary = getSearchSummary(record)
          return {
            value: `${moduleKey}::${primaryNo}`,
            label: `${config.title} | ${primaryNo}${summary ? ` | ${summary}` : ''}`,
            moduleKey,
            title: config.title,
            primaryNo,
            summary,
          } satisfies GlobalSearchResult
        })
      }),
    )

    if (requestId !== globalSearchRequestId) {
      return []
    }

    const merged = responseList
      .flat()
      .sort((left, right) => left.primaryNo.localeCompare(right.primaryNo))
      .slice(0, 20)

    globalSearchResults.value = merged
    return merged
  } finally {
    if (requestId === globalSearchRequestId) {
      globalSearchLoading.value = false
    }
  }
}

async function handleGlobalSearch(value: string) {
  globalSearchKeyword.value = value
  await performGlobalSearch(value)
}

function clearGlobalSearchPanel() {
  globalSearchResults.value = []
}

function handleGlobalSearchBlur() {
  window.setTimeout(() => {
    clearGlobalSearchPanel()
  }, 120)
}

function jumpToGlobalSearchResult(result: GlobalSearchResult) {
  clearGlobalSearchPanel()
  void router.push({
    path: `/${result.moduleKey}`,
    query: { docNo: result.primaryNo, openDetail: '1' },
  })
}

function handleGlobalSearchSelect(value: string) {
  const target = globalSearchResults.value.find((item) => item.value === value)
  if (target) {
    jumpToGlobalSearchResult(target)
  }
}

async function handleGlobalSearchSubmit(value: string) {
  const normalizedKeyword = value.trim()
  if (!normalizedKeyword) {
    clearGlobalSearchPanel()
    return
  }

  const results = await performGlobalSearch(normalizedKeyword)
  const exactMatched = results.find((item) => item.primaryNo === normalizedKeyword)
  if (exactMatched) {
    jumpToGlobalSearchResult(exactMatched)
    return
  }

  if (results.length === 1) {
    jumpToGlobalSearchResult(results[0])
  }
}

function handleTabChange(key: string) {
  const target = openPages.value.find((item) => item.key === key)
  if (target) {
    void router.push(target.path)
  }
}

function closeTab(key: string) {
  const currentKey = String(route.meta.menuKey || route.path)
  const index = openPages.value.findIndex((item) => item.key === key)
  if (index < 0) {
    return
  }

  const nextPages = openPages.value.filter((item) => item.key !== key)
  openPages.value = nextPages

  if (currentKey === key) {
    const fallback = nextPages[Math.max(index - 1, 0)] || nextPages[0]
    void router.push(fallback?.path || '/dashboard')
  }
}

function handleTabEdit(
  key: string | MouseEvent | KeyboardEvent,
  action: 'add' | 'remove',
) {
  if (action === 'remove' && typeof key === 'string') {
    closeTab(key)
  }
}

function openPersonalSettings() {
  personalSettingVisible.value = true
}

function resetPersonalSettings() {
  personalFontSize.value = DEFAULT_FONT_SIZE
}

function savePersonalSettings() {
  applyPersonalSettings(personalFontSize.value)
  setPersonalSettings({
    fontSize: personalFontSize.value,
  })
  personalSettingVisible.value = false
}

async function handleLogout() {
  await authStore.signOut()
  void router.replace('/login')
}
</script>

<template>
  <a-layout class="app-shell jsh-shell">
    <a-layout-sider
      collapsible
      :collapsed="collapsed"
      :trigger="null"
      theme="dark"
      :width="150"
      :collapsed-width="80"
      class="app-sider jsh-sider"
    >
      <div class="jsh-brand">
        <strong v-if="!collapsed">{{ appTitle }}</strong>
        <strong v-else>J</strong>
      </div>

      <a-menu
        v-model:openKeys="openKeys"
        :selected-keys="selectedKeys"
        mode="inline"
        theme="dark"
        class="jsh-menu"
      >
        <a-menu-item key="/dashboard" @click="goTo('/dashboard')">
          <template #icon><HomeOutlined /></template>
          工作台
        </a-menu-item>

        <a-sub-menu key="master">
          <template #icon><AppstoreOutlined /></template>
          <template #title>主数据管理</template>
          <a-menu-item key="/materials" @click="goTo('/materials')">
            <template #icon><DatabaseOutlined /></template>
            商品资料
          </a-menu-item>
          <a-menu-item key="/suppliers" @click="goTo('/suppliers')">
            <template #icon><TeamOutlined /></template>
            供应商资料
          </a-menu-item>
          <a-menu-item key="/customers" @click="goTo('/customers')">
            <template #icon><UserOutlined /></template>
            客户资料
          </a-menu-item>
          <a-menu-item key="/carriers" @click="goTo('/carriers')">
            <template #icon><CarOutlined /></template>
            物流方资料
          </a-menu-item>
          <a-menu-item key="/warehouses" @click="goTo('/warehouses')">
            <template #icon><BankOutlined /></template>
            仓库资料
          </a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="purchase">
          <template #icon><ShoppingCartOutlined /></template>
          <template #title>采购管理</template>
          <a-menu-item key="/purchase-orders" @click="goTo('/purchase-orders')">
            <template #icon><ProfileOutlined /></template>
            采购订单
          </a-menu-item>
          <a-menu-item key="/purchase-inbounds" @click="goTo('/purchase-inbounds')">
            <template #icon><InboxOutlined /></template>
            采购入库
          </a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="sales">
          <template #icon><ShopOutlined /></template>
          <template #title>销售管理</template>
          <a-menu-item key="/sales-orders" @click="goTo('/sales-orders')">
            <template #icon><FileDoneOutlined /></template>
            销售订单
          </a-menu-item>
          <a-menu-item key="/sales-outbounds" @click="goTo('/sales-outbounds')">
            <template #icon><SwapOutlined /></template>
            销售出库
          </a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="freight">
          <template #icon><CarOutlined /></template>
          <template #title>物流管理</template>
          <a-menu-item key="/freight-bills" @click="goTo('/freight-bills')">
            <template #icon><CarOutlined /></template>
            物流单
          </a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="contracts">
          <template #icon><FileTextOutlined /></template>
          <template #title>合同管理</template>
          <a-menu-item key="/purchase-contracts" @click="goTo('/purchase-contracts')">
            <template #icon><ProfileOutlined /></template>
            采购合同
          </a-menu-item>
          <a-menu-item key="/sales-contracts" @click="goTo('/sales-contracts')">
            <template #icon><FileDoneOutlined /></template>
            销售合同
          </a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="reports">
          <template #icon><TableOutlined /></template>
          <template #title>报表中心</template>
          <a-menu-item key="/inventory-report" @click="goTo('/inventory-report')">
            <template #icon><BarChartOutlined /></template>
            商品库存报表
          </a-menu-item>
          <a-menu-item key="/io-report" @click="goTo('/io-report')">
            <template #icon><SwapOutlined /></template>
            出入库报表
          </a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="statements">
          <template #icon><FileTextOutlined /></template>
          <template #title>对账管理</template>
          <a-menu-item key="/supplier-statements" @click="goTo('/supplier-statements')">
            <template #icon><FileSearchOutlined /></template>
            供应商对账单
          </a-menu-item>
          <a-menu-item key="/customer-statements" @click="goTo('/customer-statements')">
            <template #icon><FileTextOutlined /></template>
            客户对账单
          </a-menu-item>
          <a-menu-item key="/freight-statements" @click="goTo('/freight-statements')">
            <template #icon><FileSyncOutlined /></template>
            物流对账单
          </a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="finance">
          <template #icon><WalletOutlined /></template>
          <template #title>财务管理</template>
          <a-menu-item key="/receipts" @click="goTo('/receipts')">
            <template #icon><AccountBookOutlined /></template>
            收款单
          </a-menu-item>
          <a-menu-item key="/payments" @click="goTo('/payments')">
            <template #icon><CreditCardOutlined /></template>
            付款单
          </a-menu-item>
          <a-menu-item key="/receivables-payables" @click="goTo('/receivables-payables')">
            <template #icon><CalculatorOutlined /></template>
            应收应付
          </a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="system">
          <template #icon><PrinterOutlined /></template>
          <template #title>系统设置</template>
          <a-menu-item key="/general-settings" @click="goTo('/general-settings')">
            <template #icon><SettingOutlined /></template>
            通用设置
          </a-menu-item>
          <a-menu-item key="/permission-management" @click="goTo('/permission-management')">
            <template #icon><TeamOutlined /></template>
            权限管理
          </a-menu-item>
          <a-menu-item key="/user-accounts" @click="goTo('/user-accounts')">
            <template #icon><UserOutlined /></template>
            用户账户
          </a-menu-item>
          <a-menu-item key="/role-settings" @click="goTo('/role-settings')">
            <template #icon><AccountBookOutlined /></template>
            角色设置
          </a-menu-item>
          <a-menu-item key="/ops-support" @click="goTo('/ops-support')">
            <template #icon><SettingOutlined /></template>
            运维支持
          </a-menu-item>
          <a-menu-item key="/print-templates" @click="goTo('/print-templates')">
            <template #icon><PrinterOutlined /></template>
            打印模板
          </a-menu-item>
        </a-sub-menu>

      </a-menu>
    </a-layout-sider>

    <a-layout
      class="jsh-main"
      :style="{ paddingLeft: `${collapsed ? 80 : 150}px` }"
    >
      <a-layout-header
        :class="[
          'jsh-header',
          'ant-header-fixedHeader',
          collapsed ? 'ant-header-side-closed' : 'ant-header-side-opened',
        ]"
      >
        <div class="header">
          <span class="trigger" @click="collapsed = !collapsed">
            <MenuUnfoldOutlined v-if="collapsed" />
            <MenuFoldOutlined v-else />
          </span>

          <div class="header-page-meta">
            <div class="header-page-title">{{ currentTitle }}</div>
            <div class="header-page-desc">首页 / {{ currentTitle }}</div>
          </div>

          <div class="header-global-search">
            <div class="header-global-search-group">
              <a-auto-complete
                v-model:value="globalSearchKeyword"
                :options="globalSearchOptions"
                class="header-global-search-box"
                @search="handleGlobalSearch"
                @select="handleGlobalSearchSelect"
              >
                <a-input
                  v-model:value="globalSearchKeyword"
                  class="header-global-search-input"
                  placeholder="全局单据编号搜索"
                  @pressEnter="handleGlobalSearchSubmit(globalSearchKeyword)"
                  @blur="handleGlobalSearchBlur"
                />
              </a-auto-complete>
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
              <a-tag :color="isMockEnabled ? 'blue' : 'green'">
                {{ isMockEnabled ? 'Mock' : 'API' }}
              </a-tag>
            </span>
            <span class="action user-name">
              {{ user?.username || user?.loginName || '未登录' }}
            </span>
            <span class="action">
              <a class="settings-link" @click.prevent="openPersonalSettings">
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
          <template #tab>{{ page.title }}</template>
        </a-tab-pane>
      </a-tabs>

      <a-layout-content class="jsh-content">
        <div class="jsh-content-inner">
          <router-view />
        </div>
      </a-layout-content>
    </a-layout>

    <a-modal
      v-model:open="personalSettingVisible"
      title="个人设置"
      width="420px"
      :mask-closable="false"
      @ok="savePersonalSettings"
    >
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
      </div>

      <template #footer>
        <a-button @click="resetPersonalSettings">恢复默认</a-button>
        <a-button @click="personalSettingVisible = false">取消</a-button>
        <a-button type="primary" @click="savePersonalSettings">保存</a-button>
      </template>
    </a-modal>
  </a-layout>
</template>
