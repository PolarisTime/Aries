<script setup lang="ts">
import { computed, h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'
import ModuleSelectionOverlay from './ModuleSelectionOverlay.vue'
import StatusTag from '@/components/StatusTag.vue'
import type { ModuleRecord } from '@/types/module-page'

const props = defineProps<{
  supplierVisible: boolean
  supplierRows: ModuleRecord[]
  supplierLoading: boolean
  supplierRowSelection: { selectedRowKeys: (string | number)[]; onChange: (keys: (string | number)[], rows: ModuleRecord[]) => void }
  supplierSummary: { count: number; supplierName?: string; amount: number }
  customerVisible: boolean
  customerRows: ModuleRecord[]
  customerLoading: boolean
  customerRowSelection: { selectedRowKeys: (string | number)[]; onChange: (keys: (string | number)[], rows: ModuleRecord[]) => void }
  customerSummary: { count: number; customerName?: string; projectName?: string; amount: number }
  freightVisible: boolean
  freightRows: ModuleRecord[]
  freightLoading: boolean
  freightRowSelection: { selectedRowKeys: (string | number)[]; onChange: (keys: (string | number)[], rows: ModuleRecord[]) => void }
  freightSummary: { count: number; carrierName?: string; weight: number; freight: number }
  formatWeight: (value: unknown) => string
  formatAmount: (value: unknown) => string
  formatCellValue: (column: { title: string; dataIndex: string; type?: string }, value: unknown) => string
  getStatusMeta: (status: string) => { color: string; text: string }
}>()

const emit = defineEmits<{
  closeSupplier: []
  generateSupplier: []
  closeCustomer: []
  generateCustomer: []
  closeFreight: []
  generateFreight: []
}>()

const helper = createColumnHelper<ModuleRecord>()

function statusCell(status: unknown) {
  const meta = props.getStatusMeta(String(status ?? ''))
  return h(StatusTag, { status: meta.text, color: meta.color })
}

const supplierColumns = computed<ColumnDef<ModuleRecord, unknown>[]>(() => [
  helper.accessor('inboundNo', { header: () => '采购入库单号', meta: { width: 160 } }),
  helper.accessor('supplierName', { header: () => '供应商', meta: { width: 140 } }),
  helper.accessor('warehouseName', { header: () => '仓库', meta: { width: 120 } }),
  helper.accessor('inboundDate', {
    header: () => '入库日期',
    cell: (info) => props.formatCellValue({ title: '入库日期', dataIndex: 'inboundDate', type: 'date' }, info.getValue()),
    meta: { width: 120 },
  }),
  helper.accessor('settlementMode', { header: () => '结算方式', meta: { width: 100 } }),
  helper.accessor('totalWeight', {
    header: () => '总重量（吨）',
    cell: (info) => props.formatWeight(info.getValue()),
    meta: { width: 120, align: 'right' },
  }),
  helper.accessor('totalAmount', {
    header: () => '总金额',
    cell: (info) => props.formatAmount(info.getValue()),
    meta: { width: 110, align: 'right' },
  }),
  helper.accessor('status', {
    header: () => '状态',
    cell: (info) => statusCell(info.getValue()),
    meta: { width: 110, align: 'center' },
  }),
])

const customerColumns = computed<ColumnDef<ModuleRecord, unknown>[]>(() => [
  helper.accessor('orderNo', { header: () => '销售订单号', meta: { width: 160 } }),
  helper.accessor('customerName', { header: () => '客户', meta: { width: 140 } }),
  helper.accessor('projectName', { header: () => '项目' }),
  helper.accessor('deliveryDate', {
    header: () => '送货日期',
    cell: (info) => props.formatCellValue({ title: '送货日期', dataIndex: 'deliveryDate', type: 'date' }, info.getValue()),
    meta: { width: 120 },
  }),
  helper.accessor('salesName', { header: () => '销售员', meta: { width: 100 } }),
  helper.accessor('totalWeight', {
    header: () => '总重量（吨）',
    cell: (info) => props.formatWeight(info.getValue()),
    meta: { width: 120, align: 'right' },
  }),
  helper.accessor('totalAmount', {
    header: () => '总金额',
    cell: (info) => props.formatAmount(info.getValue()),
    meta: { width: 110, align: 'right' },
  }),
  helper.accessor('status', {
    header: () => '状态',
    cell: (info) => statusCell(info.getValue()),
    meta: { width: 110, align: 'center' },
  }),
])

const freightColumns = computed<ColumnDef<ModuleRecord, unknown>[]>(() => [
  helper.accessor('billNo', { header: () => '物流单号', meta: { width: 150 } }),
  helper.accessor('carrierName', { header: () => '物流商', meta: { width: 140 } }),
  helper.accessor('customerName', { header: () => '客户', meta: { width: 140 } }),
  helper.accessor('projectName', { header: () => '项目' }),
  helper.accessor('billTime', {
    header: () => '单据日期',
    cell: (info) => props.formatCellValue({ title: '单据日期', dataIndex: 'billTime', type: 'date' }, info.getValue()),
    meta: { width: 120 },
  }),
  helper.accessor('totalWeight', {
    header: () => '总重量（吨）',
    cell: (info) => props.formatWeight(info.getValue()),
    meta: { width: 120, align: 'right' },
  }),
  helper.accessor('totalFreight', {
    header: () => '运费',
    cell: (info) => props.formatAmount(info.getValue()),
    meta: { width: 110, align: 'right' },
  }),
  helper.accessor('status', {
    header: () => '状态',
    cell: (info) => statusCell(info.getValue()),
    meta: { width: 110, align: 'center' },
  }),
])
</script>

<template>
  <ModuleSelectionOverlay
    :visible="supplierVisible"
    title="生成供应商对账单"
    panel-title="采购入库单选择"
    hint="选择采购入库单生成供应商对账单草稿；仅支持同一供应商合并。启用系统开关时默认按所选采购单据总金额全额付款，关闭后按账期自动汇总已付款记录。"
    :rows="supplierRows"
    :columns="supplierColumns"
    :loading="supplierLoading"
    :row-selection="supplierRowSelection"
    empty-description="当前没有可生成对账单的采购入库单"
    confirm-text="生成草稿"
    @cancel="emit('closeSupplier')"
    @confirm="emit('generateSupplier')"
  >
    <template #summary>
      <span>已选 {{ supplierSummary.count }} 张</span>
      <span v-if="supplierSummary.supplierName">供应商 {{ supplierSummary.supplierName }}</span>
      <span>采购金额 {{ formatAmount(supplierSummary.amount) }}</span>
    </template>
  </ModuleSelectionOverlay>

  <ModuleSelectionOverlay
    :visible="customerVisible"
    title="生成客户对账单"
    panel-title="销售订单选择"
    hint="选择已完成销售的销售订单生成客户对账单草稿；仅支持同一客户同一项目合并。启用系统开关时默认按所选销售订单总金额挂账，关闭后默认按所选销售订单总金额收款。"
    :rows="customerRows"
    :columns="customerColumns"
    :loading="customerLoading"
    :row-selection="customerRowSelection"
    empty-description="当前没有可生成对账单的销售订单"
    confirm-text="生成草稿"
    @cancel="emit('closeCustomer')"
    @confirm="emit('generateCustomer')"
  >
    <template #summary>
      <span>已选 {{ customerSummary.count }} 张</span>
      <span v-if="customerSummary.customerName">客户 {{ customerSummary.customerName }}</span>
      <span v-if="customerSummary.projectName">项目 {{ customerSummary.projectName }}</span>
      <span>金额 {{ formatAmount(customerSummary.amount) }}</span>
    </template>
  </ModuleSelectionOverlay>

  <ModuleSelectionOverlay
    :visible="freightVisible"
    title="生成物流对账单"
    panel-title="物流单选择"
    hint="选择物流单生成对账单草稿；同一物流商可合并生成，已被占用的物流单不会重复显示。"
    :rows="freightRows"
    :columns="freightColumns"
    :loading="freightLoading"
    :row-selection="freightRowSelection"
    empty-description="当前没有可生成对账单的物流单"
    confirm-text="生成草稿"
    @cancel="emit('closeFreight')"
    @confirm="emit('generateFreight')"
  >
    <template #summary>
      <span>已选 {{ freightSummary.count }} 张</span>
      <span v-if="freightSummary.carrierName">物流商 {{ freightSummary.carrierName }}</span>
      <span>总重量（吨） {{ formatWeight(freightSummary.weight) }}</span>
      <span>运费 {{ formatAmount(freightSummary.freight) }}</span>
    </template>
  </ModuleSelectionOverlay>
</template>
