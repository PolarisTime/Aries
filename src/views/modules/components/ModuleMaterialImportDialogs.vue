<script setup lang="ts">
import { computed } from 'vue'
import type { UploadProps } from 'ant-design-vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'
import type { MaterialImportFailure, MaterialImportResult } from '@/types/material'
import { useDataTable } from '@/composables/use-data-table'
import DataTable from '@/components/DataTable.vue'

const props = defineProps<{
  importVisible: boolean
  importLoading: boolean
  importFile: File | null
  resultVisible: boolean
  result: MaterialImportResult | null
  beforeUpload: NonNullable<UploadProps['beforeUpload']>
}>()

defineEmits<{
  cancelImport: []
  submitImport: []
  closeResult: []
}>()

const failures = computed(() => props.result?.failures ?? [])

const columnHelper = createColumnHelper<MaterialImportFailure>()

const columns = computed<ColumnDef<MaterialImportFailure, unknown>[]>(() => [
  columnHelper.accessor('rowNumber', {
    header: () => '失败行',
    meta: { width: 100, align: 'right' },
  }),
  columnHelper.accessor('materialCode', {
    header: () => '商品编码',
    meta: { width: 180 },
  }),
  columnHelper.accessor('reason', {
    header: () => '失败原因',
  }),
])

const { table } = useDataTable({
  data: failures,
  columns,
  getRowId: (row) => `${row.rowNumber}-${row.materialCode}-${row.reason}`,
  manualPagination: false,
  initialPageSize: 8,
  enableSorting: false,
})
</script>

<template>
  <a-modal
    :open="importVisible"
    title="导入商品资料"
    ok-text="确认导入"
    cancel-text="取消"
    :confirm-loading="importLoading"
    @ok="$emit('submitImport')"
    @cancel="$emit('cancelImport')"
  >
    <a-alert
      type="info"
      show-icon
      message="请上传 CSV 文件"
      description="建议先用当前页面导出的 CSV 作为模板，导入时会按商品编码自动新增或更新。"
    />
    <div style="margin-top: 16px">
      <a-upload
        :before-upload="beforeUpload"
        :show-upload-list="false"
        accept=".csv,text/csv"
      >
        <a-button :loading="importLoading">选择 CSV 文件</a-button>
      </a-upload>
      <div style="margin-top: 12px; color: rgba(0, 0, 0, 0.65)">
        {{ importFile ? `已选择：${importFile.name}` : '尚未选择文件' }}
      </div>
    </div>
  </a-modal>

  <a-modal
    :open="resultVisible"
    title="导入结果"
    width="880px"
    @cancel="$emit('closeResult')"
  >
    <template v-if="result">
      <a-row :gutter="12">
        <a-col :span="6">
          <a-statistic title="导入总行数" :value="result.totalRows" />
        </a-col>
        <a-col :span="6">
          <a-statistic title="成功行数" :value="result.successCount" />
        </a-col>
        <a-col :span="6">
          <a-statistic title="新增" :value="result.createdCount" />
        </a-col>
        <a-col :span="6">
          <a-statistic title="更新" :value="result.updatedCount" />
        </a-col>
      </a-row>
      <div style="margin-top: 12px">
        <a-alert
          :type="result.failedCount > 0 ? 'warning' : 'success'"
          show-icon
          :message="result.failedCount > 0
            ? `失败 ${result.failedCount} 行，请按明细修正后重新导入`
            : '本次导入全部成功'"
        />
      </div>
      <div v-if="result.failedCount > 0" style="margin-top: 16px">
        <DataTable :table="table" size="small" />
      </div>
    </template>
    <template #footer>
      <a-button type="primary" @click="$emit('closeResult')">关闭</a-button>
    </template>
  </a-modal>
</template>
