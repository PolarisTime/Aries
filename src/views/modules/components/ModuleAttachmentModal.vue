<script setup lang="ts">
import { DownloadOutlined, EyeOutlined, UploadOutlined } from '@ant-design/icons-vue'
import type { UploadProps } from 'ant-design-vue'
import type { AttachmentItem } from '@/composables/use-attachment-support'

defineProps<{
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

    <a-table
      size="small"
      bordered
      row-key="id"
      :data-source="rows"
      :pagination="false"
      :loading="saving"
    >
      <a-table-column key="name" title="附件名称" data-index="name" />
      <a-table-column key="uploader" title="上传人" data-index="uploader" width="120" />
      <a-table-column key="uploadTime" title="上传时间" data-index="uploadTime" width="180" />
      <a-table-column key="action" title="操作" width="180" align="center">
        <template #default="{ record }">
          <div class="attachment-action-group">
            <a
              v-if="record.previewSupported && record.previewUrl"
              @click.prevent="previewAttachment(record)"
            >
              <EyeOutlined />
              <span>预览</span>
            </a>
            <a
              v-if="record.downloadUrl"
              @click.prevent="downloadAttachment(record)"
            >
              <DownloadOutlined />
              <span>下载</span>
            </a>
            <a-popconfirm
              v-if="canManageAttachments"
              title="确定删除该附件吗?"
              @confirm="removeAttachment(String(record.id))"
            >
              <a>删除</a>
            </a-popconfirm>
          </div>
        </template>
      </a-table-column>
      <template #emptyText>
        <a-empty :description="pasteEnabled ? '当前没有附件，可上传文件或直接粘贴' : '当前没有附件，可直接新增'" />
      </template>
    </a-table>

    <template #footer>
      <a-button @click="$emit('cancel')">关闭</a-button>
    </template>
  </a-modal>
</template>
