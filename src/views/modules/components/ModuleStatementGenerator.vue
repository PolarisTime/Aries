<script setup lang="ts">
import ModuleSelectionOverlay from './ModuleSelectionOverlay.vue'
import type { ModuleRecord } from '@/types/module-page'

defineProps<{
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
</script>

<template>
  <ModuleSelectionOverlay
    :visible="supplierVisible"
    title="生成供应商对账单"
    panel-title="采购入库单选择"
    hint="选择采购入库单生成供应商对账单草稿；仅支持同一供应商合并。启用系统开关时默认按所选采购单据总金额全额付款，关闭后按账期自动汇总已付款记录。"
    :rows="supplierRows"
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
    <a-table-column key="inboundNo" title="采购入库单号" data-index="inboundNo" width="160" />
    <a-table-column key="supplierName" title="供应商" data-index="supplierName" width="140" />
    <a-table-column key="warehouseName" title="仓库" data-index="warehouseName" width="120" />
    <a-table-column key="inboundDate" title="入库日期" width="120">
      <template #default="{ record }">
        {{ formatCellValue({ title: '入库日期', dataIndex: 'inboundDate', type: 'date' }, record.inboundDate) }}
      </template>
    </a-table-column>
    <a-table-column key="settlementMode" title="结算方式" data-index="settlementMode" width="100" />
    <a-table-column key="totalWeight" title="总吨位" width="110" align="right">
      <template #default="{ record }">
        {{ formatWeight(record.totalWeight) }}
      </template>
    </a-table-column>
    <a-table-column key="totalAmount" title="总金额" width="110" align="right">
      <template #default="{ record }">
        {{ formatAmount(record.totalAmount) }}
      </template>
    </a-table-column>
    <a-table-column key="status" title="状态" width="110" align="center">
      <template #default="{ record }">
        <a-tag :color="getStatusMeta(record.status).color">
          {{ getStatusMeta(record.status).text }}
        </a-tag>
      </template>
    </a-table-column>
  </ModuleSelectionOverlay>

  <ModuleSelectionOverlay
    :visible="customerVisible"
    title="生成客户对账单"
    panel-title="销售订单选择"
    hint="选择已完成销售的销售订单生成客户对账单草稿；仅支持同一客户同一项目合并。启用系统开关时默认按所选销售订单总金额挂账，关闭后默认按所选销售订单总金额收款。"
    :rows="customerRows"
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
    <a-table-column key="orderNo" title="销售订单号" data-index="orderNo" width="160" />
    <a-table-column key="customerName" title="客户" data-index="customerName" width="140" />
    <a-table-column key="projectName" title="项目" data-index="projectName" />
    <a-table-column key="deliveryDate" title="送货日期" width="120">
      <template #default="{ record }">
        {{ formatCellValue({ title: '送货日期', dataIndex: 'deliveryDate', type: 'date' }, record.deliveryDate) }}
      </template>
    </a-table-column>
    <a-table-column key="salesName" title="销售员" data-index="salesName" width="100" />
    <a-table-column key="totalWeight" title="总吨位" width="110" align="right">
      <template #default="{ record }">
        {{ formatWeight(record.totalWeight) }}
      </template>
    </a-table-column>
    <a-table-column key="totalAmount" title="总金额" width="110" align="right">
      <template #default="{ record }">
        {{ formatAmount(record.totalAmount) }}
      </template>
    </a-table-column>
    <a-table-column key="status" title="状态" width="110" align="center">
      <template #default="{ record }">
        <a-tag :color="getStatusMeta(record.status).color">
          {{ getStatusMeta(record.status).text }}
        </a-tag>
      </template>
    </a-table-column>
  </ModuleSelectionOverlay>

  <ModuleSelectionOverlay
    :visible="freightVisible"
    title="生成物流对账单"
    panel-title="物流单选择"
    hint="选择物流单生成对账单草稿；同一物流商可合并生成，已被占用的物流单不会重复显示。"
    :rows="freightRows"
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
      <span>吨位 {{ formatWeight(freightSummary.weight) }}</span>
      <span>运费 {{ formatAmount(freightSummary.freight) }}</span>
    </template>
    <a-table-column key="billNo" title="物流单号" data-index="billNo" width="150" />
    <a-table-column key="carrierName" title="物流商" data-index="carrierName" width="140" />
    <a-table-column key="customerName" title="客户" data-index="customerName" width="140" />
    <a-table-column key="projectName" title="项目" data-index="projectName" />
    <a-table-column key="billTime" title="单据日期" width="120">
      <template #default="{ record }">
        {{ formatCellValue({ title: '单据日期', dataIndex: 'billTime', type: 'date' }, record.billTime) }}
      </template>
    </a-table-column>
    <a-table-column key="totalWeight" title="吨位" width="110" align="right">
      <template #default="{ record }">
        {{ formatWeight(record.totalWeight) }}
      </template>
    </a-table-column>
    <a-table-column key="totalFreight" title="运费" width="110" align="right">
      <template #default="{ record }">
        {{ formatAmount(record.totalFreight) }}
      </template>
    </a-table-column>
    <a-table-column key="status" title="状态" width="110" align="center">
      <template #default="{ record }">
        <a-tag :color="getStatusMeta(record.status).color">
          {{ getStatusMeta(record.status).text }}
        </a-tag>
      </template>
    </a-table-column>
  </ModuleSelectionOverlay>
</template>
