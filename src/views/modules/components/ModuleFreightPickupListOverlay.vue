<script setup lang="ts">
import type { ModuleColumnDefinition, ModuleRecord } from '@/types/module-page'
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
  quantityColumn: ModuleColumnDefinition
}>()

defineEmits<{
  close: []
}>()
</script>

<template>
  <ModuleSelectionOverlay
    :visible="visible"
    title="提货清单"
    panel-title="物流提货清单"
    hint="按所选物流单已保存明细直接生成，字段保留品牌、材质、规格、长度、数量、重量、仓库和客户信息。"
    :rows="rows"
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
      <span>总重 {{ formatWeight(totalWeight) }}</span>
    </template>

    <a-table-column key="brand" title="品牌" data-index="brand" width="100" />
    <a-table-column key="material" title="材质" data-index="material" width="110" />
    <a-table-column key="spec" title="规格" data-index="spec" width="100" />
    <a-table-column key="length" title="长度" data-index="length" width="100" />
    <a-table-column key="quantity" title="数量" width="100" align="right">
      <template #default="{ record }">
        {{ formatCount(record.quantity) }}
      </template>
    </a-table-column>
    <a-table-column key="quantityUnit" title="数量单位" data-index="quantityUnit" width="100" />
    <a-table-column key="totalWeight" title="总重" width="110" align="right">
      <template #default="{ record }">
        {{ formatWeight(record.totalWeight) }}
      </template>
    </a-table-column>
    <a-table-column key="weightUnit" title="重量单位" data-index="weightUnit" width="100" align="center" />
    <a-table-column key="warehouseName" title="仓库名称" data-index="warehouseName" width="140" />
    <a-table-column key="customerName" title="客户名" data-index="customerName" width="160" />
  </ModuleSelectionOverlay>
</template>
