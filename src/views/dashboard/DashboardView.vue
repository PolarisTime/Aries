<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { getDashboardSummary } from '@/api/dashboard'
import {
  TeamOutlined,
  ShopOutlined,
  DatabaseOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ApartmentOutlined,
  ProfileOutlined,
  InboxOutlined,
  FileDoneOutlined,
  SwapOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  AccountBookOutlined,
  CarOutlined,
  BankOutlined,
} from '@ant-design/icons-vue'

useI18n()
const router = useRouter()

const summaryQuery = useQuery({
  queryKey: ['dashboard-summary'],
  queryFn: getDashboardSummary,
  refetchInterval: 120_000,
})

const summary = computed(() => summaryQuery.data.value)
const hasError = computed(() => summaryQuery.isError.value)
const isLoading = computed(() => summaryQuery.isPending.value)
const animatedServerTime = ref('—')
const serverTimeBase = ref<dayjs.Dayjs | null>(null)
const serverTimeSyncedAt = ref<number | null>(null)
let serverTimeTimer: number | null = null

interface WorkflowNode {
  key: string
  title: string
  path: string
  icon: unknown
  tone: string
  hint: string
  metric?: string
}

interface WorkflowSection {
  key: string
  title: string
  description: string
  accent: string
  nodes: WorkflowNode[]
}

const workflowSections = computed<WorkflowSection[]>(() => [
  {
    key: 'master',
    title: '基础建档',
    description: '先维护业务主数据，后续单据可直接关联带出。',
    accent: '#0f766e',
    nodes: [
      {
        key: 'materials',
        title: '商品资料',
        path: '/materials',
        icon: DatabaseOutlined,
        tone: '#1677ff',
        hint: '维护品名、规格、品牌',
        metric: `${summary.value?.materialCount ?? 0} 项`,
      },
      {
        key: 'suppliers',
        title: '供应商资料',
        path: '/suppliers',
        icon: ShopOutlined,
        tone: '#52c41a',
        hint: '采购往来主体建档',
        metric: `${summary.value?.supplierCount ?? 0} 家`,
      },
      {
        key: 'customers',
        title: '客户资料',
        path: '/customers',
        icon: TeamOutlined,
        tone: '#fa8c16',
        hint: '销售往来主体建档',
        metric: `${summary.value?.customerCount ?? 0} 家`,
      },
      {
        key: 'warehouses',
        title: '仓库资料',
        path: '/warehouses',
        icon: BankOutlined,
        tone: '#13c2c2',
        hint: '维护仓库与库位能力',
      },
    ],
  },
  {
    key: 'purchase',
    title: '采购链路',
    description: '从合同与订单开始，经过入库、对账，最终完成付款。',
    accent: '#2563eb',
    nodes: [
      {
        key: 'purchase-contracts',
        title: '采购合同',
        path: '/purchase-contracts',
        icon: ProfileOutlined,
        tone: '#2563eb',
        hint: '锁定采购条款',
      },
      {
        key: 'purchase-orders',
        title: '采购订单',
        path: '/purchase-orders',
        icon: ProfileOutlined,
        tone: '#1677ff',
        hint: '生成采购执行单',
      },
      {
        key: 'purchase-inbounds',
        title: '采购入库',
        path: '/purchase-inbounds',
        icon: InboxOutlined,
        tone: '#2f54eb',
        hint: '确认入库数量重量',
      },
      {
        key: 'supplier-statements',
        title: '供应商对账单',
        path: '/supplier-statements',
        icon: FileSearchOutlined,
        tone: '#1d39c4',
        hint: '汇总采购应付',
      },
      {
        key: 'payments',
        title: '付款单',
        path: '/payments',
        icon: AccountBookOutlined,
        tone: '#10239e',
        hint: '完成付款登记',
      },
    ],
  },
  {
    key: 'sales',
    title: '销售链路',
    description: '从销售合同与订单开始，经过出库、对账，最终形成收款闭环。',
    accent: '#d97706',
    nodes: [
      {
        key: 'sales-contracts',
        title: '销售合同',
        path: '/sales-contracts',
        icon: FileDoneOutlined,
        tone: '#fa8c16',
        hint: '锁定销售条款',
      },
      {
        key: 'sales-orders',
        title: '销售订单',
        path: '/sales-orders',
        icon: FileDoneOutlined,
        tone: '#faad14',
        hint: '下达客户订单',
      },
      {
        key: 'sales-outbounds',
        title: '销售出库',
        path: '/sales-outbounds',
        icon: SwapOutlined,
        tone: '#d48806',
        hint: '确认发货与出库',
      },
      {
        key: 'customer-statements',
        title: '客户对账单',
        path: '/customer-statements',
        icon: FileTextOutlined,
        tone: '#ad6800',
        hint: '汇总销售应收',
      },
      {
        key: 'receipts',
        title: '收款单',
        path: '/receipts',
        icon: AccountBookOutlined,
        tone: '#874d00',
        hint: '完成收款登记',
      },
    ],
  },
  {
    key: 'freight',
    title: '物流协同',
    description: '物流相关单据可独立流转，也能嵌入采购和销售业务链路。',
    accent: '#7c3aed',
    nodes: [
      {
        key: 'carriers',
        title: '物流方资料',
        path: '/carriers',
        icon: CarOutlined,
        tone: '#722ed1',
        hint: '维护承运主体',
      },
      {
        key: 'freight-bills',
        title: '物流单',
        path: '/freight-bills',
        icon: CarOutlined,
        tone: '#9254de',
        hint: '记录运输过程',
      },
      {
        key: 'freight-statements',
        title: '物流对账单',
        path: '/freight-statements',
        icon: FileSearchOutlined,
        tone: '#531dab',
        hint: '汇总运费结算',
      },
    ],
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

function updateAnimatedServerTime() {
  if (!serverTimeBase.value || serverTimeSyncedAt.value == null) {
    animatedServerTime.value = '—'
    return
  }
  animatedServerTime.value = serverTimeBase.value
    .add(Date.now() - serverTimeSyncedAt.value, 'millisecond')
    .format('YYYY-MM-DD HH:mm:ss')
}

function syncServerTime(value?: string | null) {
  if (!value) {
    serverTimeBase.value = null
    serverTimeSyncedAt.value = null
    animatedServerTime.value = '—'
    return
  }
  const parsed = dayjs(value)
  if (!parsed.isValid()) {
    serverTimeBase.value = null
    serverTimeSyncedAt.value = null
    animatedServerTime.value = value
    return
  }
  serverTimeBase.value = parsed
  serverTimeSyncedAt.value = Date.now()
  updateAnimatedServerTime()
}

watch(
  () => summary.value?.serverTime,
  (value) => {
    syncServerTime(value)
  },
  { immediate: true },
)

onMounted(() => {
  updateAnimatedServerTime()
  serverTimeTimer = window.setInterval(() => {
    updateAnimatedServerTime()
  }, 1000)
})

onBeforeUnmount(() => {
  if (serverTimeTimer) {
    window.clearInterval(serverTimeTimer)
    serverTimeTimer = null
  }
})

function goModule(path: string) {
  void router.push(path)
}
</script>

<template>
  <div class="page-stack dashboard-root">
    <a-spin :spinning="isLoading">
      <div class="dashboard-hero">
        <div class="dashboard-hero-left">
          <h1 class="dashboard-hero-title">{{ summary?.companyName || '钢贸业务中台' }}</h1>
          <p class="dashboard-hero-desc">
            服务器时间 {{ animatedServerTime }}
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

      <a-card title="业务流程总览" class="dashboard-flow-card">
        <div class="dashboard-flow-grid">
          <section
            v-for="section in workflowSections"
            :key="section.key"
            class="dashboard-flow-section"
            :style="{ '--flow-accent': section.accent }"
          >
            <div class="dashboard-flow-section-head">
              <div class="dashboard-flow-section-title">{{ section.title }}</div>
              <div class="dashboard-flow-section-desc">{{ section.description }}</div>
            </div>

            <div class="dashboard-flow-chain">
              <template v-for="(node, index) in section.nodes" :key="node.key">
                <button
                  type="button"
                  class="dashboard-flow-node"
                  @click="goModule(node.path)"
                >
                  <span
                    class="dashboard-flow-node-icon"
                    :style="{ background: node.tone }"
                  >
                    <component :is="node.icon" />
                  </span>
                  <span class="dashboard-flow-node-copy">
                    <strong>{{ node.title }}</strong>
                    <small>{{ node.hint }}</small>
                    <em v-if="node.metric">{{ node.metric }}</em>
                  </span>
                </button>
                <span
                  v-if="index < section.nodes.length - 1"
                  class="dashboard-flow-arrow"
                >
                  →
                </span>
              </template>
            </div>
          </section>
        </div>
      </a-card>

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
  width: 100%;
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

.dashboard-flow-card {
  margin-bottom: 16px;
}

.dashboard-flow-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.dashboard-flow-section {
  padding: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%);
  border: 1px solid color-mix(in srgb, var(--flow-accent) 18%, #dbe3ee);
  border-radius: 14px;
}

.dashboard-flow-section-head {
  margin-bottom: 14px;
}

.dashboard-flow-section-title {
  color: var(--flow-accent);
  font-size: 15px;
  font-weight: 700;
}

.dashboard-flow-section-desc {
  margin-top: 6px;
  color: rgba(15, 23, 42, 0.68);
  font-size: 12px;
  line-height: 1.6;
}

.dashboard-flow-chain {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.dashboard-flow-node {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 12px 14px;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid rgba(219, 227, 238, 0.94);
  border-radius: 12px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    border-color 0.16s ease;
}

.dashboard-flow-node:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--flow-accent) 40%, #dbe3ee);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
}

.dashboard-flow-node-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  color: #fff;
  font-size: 17px;
  flex-shrink: 0;
}

.dashboard-flow-node-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.dashboard-flow-node-copy strong {
  color: rgba(15, 23, 42, 0.92);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.3;
}

.dashboard-flow-node-copy small {
  margin-top: 3px;
  color: rgba(71, 85, 105, 0.82);
  font-size: 11px;
  line-height: 1.4;
}

.dashboard-flow-node-copy em {
  margin-top: 4px;
  color: var(--flow-accent);
  font-size: 11px;
  font-style: normal;
  font-weight: 600;
}

.dashboard-flow-arrow {
  color: color-mix(in srgb, var(--flow-accent) 75%, #64748b);
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}

.dashboard-panel {
  height: 100%;
}

.dashboard-descriptions :deep(.ant-descriptions-item-label) {
  width: 120px;
}

@media (max-width: 1080px) {
  .dashboard-flow-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .dashboard-flow-section {
    padding: 14px;
  }

  .dashboard-flow-chain {
    gap: 8px;
  }

  .dashboard-flow-node {
    width: 100%;
  }

  .dashboard-flow-arrow {
    display: none;
  }
}
</style>
