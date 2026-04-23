<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { listPurchaseOrders, searchSuppliers } from '@/api/orders'
import type { PurchaseOrderSearch, SupplierOption } from '@/types/order'
import { normalizeTableResponse } from '@/utils/list'

const statusOptions = [
  { label: '未审核', value: '0' },
  { label: '已审核', value: '1' },
  { label: '完成采购', value: '2' },
  { label: '部分采购', value: '3' },
  { label: '审核中', value: '9' },
]

const defaultFilters = (): PurchaseOrderSearch => ({
  type: '其它',
  subType: '采购订单',
  number: '',
  materialParam: '',
  organId: undefined,
  status: undefined,
})

const filters = reactive(defaultFilters())
const submittedFilters = ref(defaultFilters())
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
})
const supplierOptions = ref<SupplierOption[]>([])
const supplierLoading = ref(false)

const purchaseOrderQuery = useQuery({
  queryKey: computed(() => [
    'purchase-orders',
    submittedFilters.value,
    pagination.currentPage,
    pagination.pageSize,
  ]),
  queryFn: () =>
    listPurchaseOrders(submittedFilters.value, {
      currentPage: pagination.currentPage,
      pageSize: pagination.pageSize,
    }),
  placeholderData: keepPreviousData,
})

const purchaseOrders = computed(() =>
  normalizeTableResponse(purchaseOrderQuery.data.value),
)

const overviewItems = computed(() => [
  {
    label: '当前页订单',
    value: String(purchaseOrders.value.rows.length),
  },
  {
    label: '订单总数',
    value: String(purchaseOrders.value.total),
  },
  {
    label: '状态筛选',
    value:
      statusOptions.find((item) => item.value === filters.status)?.label || '全部',
  },
])

const tablePagination = computed(() => ({
  current: pagination.currentPage,
  pageSize: pagination.pageSize,
  total: purchaseOrders.value.total,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
}))

const columns = [
  {
    title: '供应商',
    dataIndex: 'organName',
    key: 'organName',
    width: 180,
  },
  {
    title: '单据编号',
    dataIndex: 'number',
    key: 'number',
    width: 180,
  },
  {
    title: '关联单据',
    dataIndex: 'linkNumber',
    key: 'linkNumber',
    width: 170,
  },
  {
    title: '商品信息',
    dataIndex: 'materialsList',
    key: 'materialsList',
    width: 280,
  },
  {
    title: '日期',
    dataIndex: 'operTimeStr',
    key: 'operTimeStr',
    width: 160,
  },
  {
    title: '操作员',
    dataIndex: 'userName',
    key: 'userName',
    width: 110,
  },
  {
    title: '数量',
    dataIndex: 'materialCount',
    key: 'materialCount',
    width: 100,
    align: 'right' as const,
  },
  {
    title: '金额合计',
    dataIndex: 'totalPrice',
    key: 'totalPrice',
    width: 130,
    align: 'right' as const,
  },
  {
    title: '订金',
    dataIndex: 'changeAmount',
    key: 'changeAmount',
    width: 120,
    align: 'right' as const,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    align: 'center' as const,
  },
]

const fetchSuppliers = useDebounceFn(async (keyword?: string) => {
  supplierLoading.value = true
  try {
    supplierOptions.value = await searchSuppliers(keyword)
  } finally {
    supplierLoading.value = false
  }
}, 250)

void fetchSuppliers()

function handleSearch() {
  submittedFilters.value = {
    ...filters,
  }
  pagination.currentPage = 1
}

function handleReset() {
  Object.assign(filters, defaultFilters())
  submittedFilters.value = defaultFilters()
  pagination.currentPage = 1
  void fetchSuppliers()
}

function handleTableChange(page: { current?: number; pageSize?: number }) {
  pagination.currentPage = page.current || 1
  pagination.pageSize = page.pageSize || 10
}

function formatNumber(value: unknown, digits = 2) {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(digits) : '--'
}

function getStatusMeta(status: unknown) {
  const statusTextMap: Record<string, string> = {
    '0': '未审核',
    '1': '已审核',
    '2': '完成采购',
    '3': '部分采购',
    '9': '审核中',
  }
  const statusClassMap: Record<string, string> = {
    '0': 'status-pill-danger',
    '1': 'status-pill-active',
    '2': 'status-pill-info',
    '3': 'status-pill-warn',
    '9': 'status-pill-muted',
  }
  const key = String(status ?? '')
  return {
    text: statusTextMap[key] || '未知状态',
    className: statusClassMap[key] || 'status-pill-muted',
  }
}

function getRowClassName(record: { status?: string | number }) {
  return String(record.status) !== '2' ? 'table-row-emphasis' : ''
}
</script>

<template>
  <div class="page-stack">
    <a-card :bordered="false" class="page-intro-card">
      <div class="page-intro">
        <div>
          <p class="page-kicker">Bills</p>
          <h2>采购订单</h2>
          <p class="page-copy">
            这一版先把旧系统里最常用的单据列表迁过来，保留编号、供应商、商品摘要、金额和状态筛选，作为后续单据编辑器的落点。
          </p>
        </div>
        <div class="overview-grid">
          <div v-for="item in overviewItems" :key="item.label" class="overview-tile">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </div>
    </a-card>

    <a-card title="筛选条件">
      <a-form layout="vertical">
        <div class="filter-grid filter-grid-orders">
          <a-form-item label="单据编号">
            <a-input
              v-model:value="filters.number"
              placeholder="输入采购单号"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="商品关键字">
            <a-input
              v-model:value="filters.materialParam"
              placeholder="商品名称 / 条码 / 规格"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="供应商">
            <a-select
              v-model:value="filters.organId"
              allow-clear
              show-search
              :filter-option="false"
              :loading="supplierLoading"
              placeholder="搜索供应商"
              @search="fetchSuppliers"
            >
              <a-select-option
                v-for="item in supplierOptions"
                :key="item.id"
                :value="item.id"
              >
                {{ item.supplier }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="状态">
            <a-select v-model:value="filters.status" allow-clear placeholder="全部状态">
              <a-select-option
                v-for="item in statusOptions"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </div>
        <a-space>
          <a-button type="primary" @click="handleSearch">查询</a-button>
          <a-button @click="handleReset">重置</a-button>
        </a-space>
      </a-form>
    </a-card>

    <a-card title="订单列表">
      <a-table
        row-key="id"
        :columns="columns"
        :data-source="purchaseOrders.rows"
        :loading="purchaseOrderQuery.isFetching.value"
        :pagination="tablePagination"
        :row-class-name="getRowClassName"
        :scroll="{ x: 1500 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'organName'">
            <div class="cell-stack">
              <strong>{{ record.organName || '--' }}</strong>
              <span class="cell-subtle">{{ record.projectName || '未关联项目' }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'number'">
            <div class="cell-stack">
              <strong>{{ record.number || '--' }}</strong>
              <span class="cell-subtle">
                {{ record.linkApply ? `请购单 ${record.linkApply}` : '无关联请购' }}
              </span>
            </div>
          </template>
          <template v-else-if="column.key === 'linkNumber'">
            {{ record.linkNumber || '--' }}
          </template>
          <template v-else-if="column.key === 'materialsList'">
            <div class="materials-cell">
              {{ record.materialsList || '--' }}
            </div>
          </template>
          <template v-else-if="column.key === 'materialCount'">
            {{ formatNumber(record.materialCount, 3) }}
          </template>
          <template v-else-if="column.key === 'totalPrice'">
            {{ formatNumber(record.totalTaxLastMoney || record.totalPrice) }}
          </template>
          <template v-else-if="column.key === 'changeAmount'">
            {{ formatNumber(record.changeAmount) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <span
              :class="['status-pill', getStatusMeta(record.status).className]"
            >
              {{ getStatusMeta(record.status).text }}
            </span>
          </template>
        </template>
        <template #emptyText>
          <a-empty description="当前筛选条件下暂无采购订单" />
        </template>
      </a-table>
    </a-card>
  </div>
</template>
