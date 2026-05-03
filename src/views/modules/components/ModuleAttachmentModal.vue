<script setup lang="ts">
import { computed } from 'vue'
import { DownloadOutlined, EyeOutlined, UploadOutlined } from '@ant-design/icons-vue'
import type { UploadProps } from 'ant-design-vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'
import type { AttachmentItem } from '@/composables/use-attachment-support'
import { useDataTable } from '@/composables/use-data-table'
import DataTable from '@/components/DataTable.vue'

const props = defineProps<{
  visible: boolean
  title: string
  pasteEnabled: boolean
  canManageAttachments: boolean
  draftName: string
  rows: AttachmentItem[]
  saving: boolean
  beforeUpload: NonNullable<UploadProps['beforeUpload']>
  addAttachment: () => unknown
  previewAttachment: (record: AttachmentItem) => unknown
  downloadAttachment: (record: AttachmentItem) => unknown
  removeAttachment: (id: string) => unknown
}>()

defineEmits<{
  cancel: []
  'update:draftName': [value: string]
}>()

const columnHelper = createColumnHelper<AttachmentItem>()

const columns = computed<ColumnDef<AttachmentItem, unknown>[]>(() => [
  columnHelper.accessor('name', { header: () => '附件名称', meta: { ellipsis: true } }),
  columnHelper.accessor('uploader', { header: () => '上传人', meta: { width: 120 } }),
  columnHelper.accessor('uploadTime', { header: () => '上传时间', meta: { width: 180 } }),
  columnHelper.display({
    id: 'action',
    header: () => '操作',
    meta: { width: 180, align: 'center' },
  }),
])

const { table } = useDataTable({
  data: computed(() => props.rows),
  columns,
  getRowId: (row) => row.id,
  manualPagination: false,
  enableSorting: false,
})

const emptyText = computed(() =>
  props.pasteEnabled ? '当前没有附件，可上传文件或直接粘贴' : '当前没有附件，可直接新增',
)
</script>

<template>
  <a-modal
    :open="visible"
    :title="title"
    width="760px"
    :mask-closable="false"
    @cancel="$emit('cancel')"
  >
    <div class="parent-selector-toolbar">
      <template v-if="pasteEnabled && canManageAttachments">
        <a-upload
          :before-upload="beforeUpload"
          :show-upload-list="false"
          :multiple="true"
          accept="image/*,.pdf"
        >
          <a-button type="primary" :loading="saving">
            <template #icon><UploadOutlined /></template>
            上传附件
          </a-button>
        </a-upload>
        <span class="attachment-paste-hint">弹窗打开时可直接粘贴截图或图片，支持图片/PDF预览</span>
      </template>
      <template v-else-if="canManageAttachments">
        <a-input
          :value="draftName"
          allow-clear
          class="parent-selector-search"
          placeholder="输入附件名称并保存到当前单据"
          @update:value="$emit('update:draftName', $event)"
          @press-enter="addAttachment"
        />
        <a-button type="primary" :loading="saving" @click="addAttachment">
          新增附件
        </a-button>
      </template>
    </div>

    <DataTable :table="table" :loading="saving" size="small" :empty-text="emptyText">
      <template #cell-action="{ row }">
        <div class="attachment-action-group">
          <a
            v-if="row.previewSupported && row.previewUrl"
            @click.prevent="previewAttachment(row)"
          >
            <EyeOutlined />
            <span>预览</span>
          </a>
          <a
            v-if="row.downloadUrl"
            @click.prevent="downloadAttachment(row)"
          >
            <DownloadOutlined />
            <span>下载</span>
          </a>
          <a-popconfirm
            v-if="canManageAttachments"
            title="确定删除该附件吗?"
            @confirm="removeAttachment(String(row.id))"
          >
            <a>删除</a>
          </a-popconfirm>
        </div>
      </template>
    </DataTable>

    <template #footer>
      <a-button @click="$emit('cancel')">关闭</a-button>
    </template>
  </a-modal>
</template>
