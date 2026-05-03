<script setup lang="ts">
import { computed } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'
import type { ModuleRecord } from '@/types/module-page'
import ModuleSelectionOverlay from './ModuleSelectionOverlay.vue'

function formatWeight(value: unknown) {
  const weight = Number(value)
  return Number.isFinite(weight) ? weight.toFixed(3) : '--'
}

function formatCount(value: unknown) {
  const count = Number(value)
  return Number.isFinite(count) ? String(count) : '--'
}

defineProps<{
  visible: boolean
  rows: ModuleRecord[]
  loading: boolean
  selectedBillCount: number
  carrierNames: string[]
  billNos: string[]
  totalWeight: number
}>()

defineEmits<{
  close: []
}>()

const columnHelper = createColumnHelper<ModuleRecord>()

const columns = computed<ColumnDef<ModuleRecord, unknown>[]>(() => [
  columnHelper.accessor('brand', { header: () => '品牌', meta: { width: 100 } }),
  columnHelper.accessor('material', { header: () => '材质', meta: { width: 110 } }),
  columnHelper.accessor('spec', { header: () => '规格', meta: { width: 100 } }),
  columnHelper.accessor('length', { header: () => '长度', meta: { width: 100 } }),
  columnHelper.accessor('quantity', {
    header: () => '数量',
    cell: (info) => formatCount(info.getValue()),
    meta: { width: 100, align: 'right' },
  }),
  columnHelper.accessor('quantityUnit', { header: () => '数量单位', meta: { width: 100 } }),
  columnHelper.accessor('totalWeight', {
    header: () => '总重量（吨）',
    cell: (info) => formatWeight(info.getValue()),
    meta: { width: 120, align: 'right' },
  }),
  columnHelper.accessor('weightUnit', { header: () => '重量单位', meta: { width: 100, align: 'center' } }),
  columnHelper.accessor('warehouseName', { header: () => '仓库名称', meta: { width: 140 } }),
  columnHelper.accessor('customerName', { header: () => '客户名', meta: { width: 160 } }),
])
</script>

<template>
  <ModuleSelectionOverlay
    :visible="visible"
    title="提货清单"
    panel-title="物流提货清单"
    hint="按所选物流单已保存明细直接生成，字段保留品牌、材质、规格、长度、数量、重量、仓库和客户信息。"
    :rows="rows"
    :columns="columns"
    :loading="loading"
    :pagination="false"
    empty-description="暂无提货清单明细"
    cancel-text="关闭"
    :confirm-visible="false"
    @cancel="$emit('close')"
  >
    <template #summary>
      <span>已选物流单 {{ selectedBillCount }} 张</span>
      <span v-if="carrierNames.length">物流商 {{ carrierNames.join('、') }}</span>
      <span v-if="billNos.length">物流单号 {{ billNos.join('、') }}</span>
      <span>明细 {{ rows.length }} 行</span>
      <span>总重量（吨） {{ formatWeight(totalWeight) }}</span>
    </template>
  </ModuleSelectionOverlay>
</template>
