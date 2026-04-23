<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { getMaterialCategoryTree, listMaterials } from '@/api/materials'
import type { MaterialCategoryNode, MaterialListSearch } from '@/types/material'
import { normalizeTableResponse } from '@/utils/list'

const defaultFilters = (): MaterialListSearch => ({
  categoryId: undefined,
  materialParam: '',
  model: '',
  standard: '',
  enabled: undefined,
})

const filters = reactive(defaultFilters())
const submittedFilters = ref(defaultFilters())
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
})

const materialQuery = useQuery({
  queryKey: computed(() => [
    'materials',
    submittedFilters.value,
    pagination.currentPage,
    pagination.pageSize,
  ]),
  queryFn: () =>
    listMaterials(submittedFilters.value, {
      currentPage: pagination.currentPage,
      pageSize: pagination.pageSize,
    }),
  placeholderData: keepPreviousData,
})

const categoryQuery = useQuery({
  queryKey: ['material-categories'],
  queryFn: getMaterialCategoryTree,
  initialData: [],
})

const materials = computed(() => normalizeTableResponse(materialQuery.data.value))

const categoryTree = computed(() => mapCategoryNodes(categoryQuery.data.value ?? []))

const overviewItems = computed(() => [
  {
    label: '当前页记录',
    value: String(materials.value.rows.length),
  },
  {
    label: '匹配总数',
    value: String(materials.value.total),
  },
  {
    label: '状态筛选',
    value:
      filters.enabled === '1' ? '仅启用' : filters.enabled === '0' ? '仅停用' : '全部',
  },
])

const tablePagination = computed(() => ({
  current: pagination.currentPage,
  pageSize: pagination.pageSize,
  total: materials.value.total,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
}))

const columns = [
  {
    title: '条码',
    dataIndex: 'mBarCode',
    key: 'mBarCode',
    width: 160,
  },
  {
    title: '商品信息',
    dataIndex: 'name',
    key: 'name',
    width: 260,
  },
  {
    title: '分类',
    dataIndex: 'categoryName',
    key: 'categoryName',
    width: 140,
  },
  {
    title: '单位',
    dataIndex: 'unit',
    key: 'unit',
    width: 90,
  },
  {
    title: '库存',
    dataIndex: 'stock',
    key: 'stock',
    width: 110,
    align: 'right' as const,
  },
  {
    title: '采购价',
    dataIndex: 'purchaseDecimal',
    key: 'purchaseDecimal',
    width: 120,
    align: 'right' as const,
  },
  {
    title: '零售价',
    dataIndex: 'commodityDecimal',
    key: 'commodityDecimal',
    width: 120,
    align: 'right' as const,
  },
  {
    title: '销售价',
    dataIndex: 'wholesaleDecimal',
    key: 'wholesaleDecimal',
    width: 120,
    align: 'right' as const,
  },
  {
    title: '状态',
    dataIndex: 'enabled',
    key: 'enabled',
    width: 100,
    align: 'center' as const,
  },
]

function mapCategoryNodes(nodes: MaterialCategoryNode[]): MaterialCategoryNode[] {
  return nodes.map((node) => ({
    ...node,
    value: node.id,
    key: node.id,
    children: node.children ? mapCategoryNodes(node.children) : undefined,
  }))
}

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
}

function handleTableChange(page: { current?: number; pageSize?: number }) {
  pagination.currentPage = page.current || 1
  pagination.pageSize = page.pageSize || 10
}

function formatNumber(value: unknown, digits = 2) {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(digits) : '--'
}

function getStatusMeta(value: unknown) {
  const enabled = String(value) === '1' || value === true
  return {
    text: enabled ? '启用' : '停用',
    className: enabled ? 'status-pill-active' : 'status-pill-muted',
  }
}
</script>

<template>
  <div class="page-stack">
    <a-card :bordered="false" class="page-intro-card">
      <div class="page-intro">
        <div>
          <p class="page-kicker">Master Data</p>
          <h2>商品资料</h2>
          <p class="page-copy">
            已接入真实商品列表接口，先把检索、分页、分类筛选和价格字段稳定下来，后续再叠加编辑弹窗与库存明细。
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
        <div class="filter-grid">
          <a-form-item label="关键字">
            <a-input
              v-model:value="filters.materialParam"
              placeholder="条码 / 名称 / 助记码"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="商品分类">
            <a-tree-select
              v-model:value="filters.categoryId"
              :tree-data="categoryTree"
              allow-clear
              tree-default-expand-all
              placeholder="全部分类"
            />
          </a-form-item>
          <a-form-item label="材质">
            <a-input v-model:value="filters.model" placeholder="例如 Q235B" @press-enter="handleSearch" />
          </a-form-item>
          <a-form-item label="规格">
            <a-input
              v-model:value="filters.standard"
              placeholder="例如 20mm"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="状态">
            <a-select v-model:value="filters.enabled" allow-clear placeholder="全部">
              <a-select-option value="1">启用</a-select-option>
              <a-select-option value="0">停用</a-select-option>
            </a-select>
          </a-form-item>
        </div>
        <a-space>
          <a-button type="primary" @click="handleSearch">查询</a-button>
          <a-button @click="handleReset">重置</a-button>
        </a-space>
      </a-form>
    </a-card>

    <a-card title="商品列表">
      <a-table
        row-key="id"
        :columns="columns"
        :data-source="materials.rows"
        :loading="materialQuery.isFetching.value"
        :pagination="tablePagination"
        :scroll="{ x: 1300 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="cell-stack">
              <strong>{{ record.name || '--' }}</strong>
              <span class="cell-subtle">
                {{ [record.model, record.standard, record.color].filter(Boolean).join(' / ') || '无规格信息' }}
              </span>
            </div>
          </template>
          <template v-else-if="column.key === 'unit'">
            {{ record.unit || record.unitName || '--' }}
          </template>
          <template v-else-if="column.key === 'stock'">
            {{ formatNumber(record.stock, 3) }}
          </template>
          <template v-else-if="column.key === 'purchaseDecimal'">
            {{ formatNumber(record.purchaseDecimal) }}
          </template>
          <template v-else-if="column.key === 'commodityDecimal'">
            {{ formatNumber(record.commodityDecimal) }}
          </template>
          <template v-else-if="column.key === 'wholesaleDecimal'">
            {{ formatNumber(record.wholesaleDecimal) }}
          </template>
          <template v-else-if="column.key === 'enabled'">
            <span
              :class="['status-pill', getStatusMeta(record.enabled).className]"
            >
              {{ getStatusMeta(record.enabled).text }}
            </span>
          </template>
        </template>
        <template #emptyText>
          <a-empty description="当前筛选条件下暂无商品数据" />
        </template>
      </a-table>
    </a-card>
  </div>
</template>
