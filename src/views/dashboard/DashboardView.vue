<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { getDashboardSummary } from '@/api/dashboard'
import { appTitle } from '@/utils/env'
import {
  AppstoreOutlined,
  TeamOutlined,
  ShopOutlined,
  DatabaseOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ApartmentOutlined,
} from '@ant-design/icons-vue'

const { t } = useI18n()
const router = useRouter()

const summaryQuery = useQuery({
  queryKey: ['dashboard-summary'],
  queryFn: getDashboardSummary,
  refetchInterval: 120_000,
})

const summary = computed(() => summaryQuery.data.value)
const hasError = computed(() => summaryQuery.isError.value)
const isLoading = computed(() => summaryQuery.isPending.value)

const statCards = computed(() => [
  {
    key: 'materials',
    title: '商品资料',
    value: summary.value?.materialCount ?? 0,
    icon: DatabaseOutlined,
    color: '#1677ff',
    path: '/materials',
  },
  {
    key: 'suppliers',
    title: '供应商',
    value: summary.value?.supplierCount ?? 0,
    icon: ShopOutlined,
    color: '#52c41a',
    path: '/suppliers',
  },
  {
    key: 'customers',
    title: '客户',
    value: summary.value?.customerCount ?? 0,
    icon: TeamOutlined,
    color: '#fa8c16',
    path: '/customers',
  },
  {
    key: 'modules',
    title: '可用模块',
    value: summary.value?.moduleCount ?? 0,
    icon: AppstoreOutlined,
    color: '#722ed1',
    path: null,
  },
])

const infoItems = computed(() => [
  { label: '当前用户', value: summary.value?.userName || '—', icon: UserOutlined },
  { label: '登录账号', value: summary.value?.loginName || '—', icon: SafetyOutlined },
  { label: '所属角色', value: summary.value?.roleName || '未分配', icon: ApartmentOutlined },
  { label: '所属公司', value: summary.value?.companyName || '未配置', icon: ShopOutlined },
  { label: 'MFA 状态', value: summary.value?.totpEnabled ? '已启用' : '未启用', icon: SafetyOutlined },
  { label: '最近登录', value: formatDateTime(summary.value?.lastLoginAt), icon: ClockCircleOutlined },
])

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : value
}

function goModule(path: string) {
  void router.push(path)
}
</script>

<template>
  <div class="dashboard-root">
    <a-spin :spinning="isLoading">
      <div class="dashboard-hero">
        <div class="dashboard-hero-left">
          <h1 class="dashboard-hero-title">{{ appTitle }}</h1>
          <p class="dashboard-hero-desc">
            {{ summary?.companyName || '钢贸业务中台' }}
            <a-divider type="vertical" />
            {{ formatDateTime(summary?.serverTime) }}
          </p>
        </div>
        <div class="dashboard-hero-right">
          <a-avatar :size="48" style="background-color: #1677ff">
            <template #icon><UserOutlined /></template>
          </a-avatar>
          <div class="dashboard-hero-user">
            <strong>{{ summary?.userName || '—' }}</strong>
            <span>{{ summary?.roleName || '—' }}</span>
          </div>
        </div>
      </div>

      <a-alert
        v-if="hasError"
        type="error"
        show-icon
        message="工作台数据加载失败，请刷新页面重试"
        style="margin-bottom: 16px"
      />

      <a-row :gutter="[16, 16]" class="dashboard-stats">
        <a-col v-for="card in statCards" :key="card.key" :xs="12" :sm="6">
          <a-card
            class="dashboard-stat-card"
            :class="{ 'is-clickable': !!card.path }"
            hoverable
            @click="card.path && goModule(card.path)"
          >
            <div class="stat-card-inner">
              <div class="stat-card-icon" :style="{ backgroundColor: card.color }">
                <component :is="card.icon" />
              </div>
              <div class="stat-card-body">
                <span class="stat-card-value">{{ card.value }}</span>
                <span class="stat-card-label">{{ card.title }}</span>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :lg="14">
          <a-card title="账户信息" class="dashboard-panel">
            <a-descriptions :column="1" size="small" class="dashboard-descriptions">
              <a-descriptions-item
                v-for="item in infoItems"
                :key="item.label"
                :label="item.label"
              >
                <component :is="item.icon" style="margin-right: 6px; opacity: 0.45" />
                {{ item.value }}
              </a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-col>
        <a-col :xs="24" :lg="10">
          <a-card title="系统概况" class="dashboard-panel">
            <a-statistic
              title="活跃会话"
              :value="summary?.activeSessionCount ?? 0"
              style="margin-bottom: 16px"
            />
            <a-statistic
              title="可见菜单"
              :value="summary?.visibleMenuCount ?? 0"
              style="margin-bottom: 16px"
            />
            <a-statistic
              title="操作权限项"
              :value="summary?.actionCount ?? 0"
            />
          </a-card>
        </a-col>
      </a-row>
    </a-spin>
  </div>
</template>

<style scoped>
.dashboard-root {
  max-width: 1200px;
  margin: 0 auto;
  padding: 8px 0;
}

.dashboard-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #1677ff 0%, #0958d9 100%);
  border-radius: 8px;
  color: #fff;
}

.dashboard-hero-title {
  margin: 0 0 4px;
  font-size: 22px;
  font-weight: 600;
  color: #fff;
}

.dashboard-hero-desc {
  margin: 0;
  font-size: 13px;
  opacity: 0.85;
}

.dashboard-hero-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.dashboard-hero-user {
  display: flex;
  flex-direction: column;
  line-height: 1.4;
}

.dashboard-hero-user strong {
  font-size: 15px;
}

.dashboard-hero-user span {
  font-size: 12px;
  opacity: 0.75;
}

.dashboard-stats {
  margin-bottom: 16px;
}

.dashboard-stat-card {
  cursor: default;
}

.dashboard-stat-card.is-clickable {
  cursor: pointer;
}

.stat-card-inner {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-card-icon {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
  flex-shrink: 0;
}

.stat-card-body {
  display: flex;
  flex-direction: column;
}

.stat-card-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  color: rgba(0, 0, 0, 0.85);
}

.stat-card-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 2px;
}

.dashboard-panel {
  height: 100%;
}

.dashboard-descriptions :deep(.ant-descriptions-item-label) {
  width: 120px;
}
</style>
