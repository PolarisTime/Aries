import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import {
  getAttachmentBindings,
  updateAttachmentBindings,
  uploadAttachment,
} from '@/api/business'
import { http } from '@/api/client'
import { apiBaseUrl } from '@/utils/env'
import type { ModuleRecord } from '@/types/module-page'

export interface AttachmentItem {
  id: string
  name: string
  uploader: string
  uploadTime: string
  previewSupported?: boolean
  previewType?: string
  previewUrl?: string
  downloadUrl?: string
  originalFileName?: string
}

interface UseAttachmentSupportOptions {
  activeRecord: Ref<ModuleRecord | null>
  canManageAttachments: Ref<boolean>
  isReadOnly: Ref<boolean>
  isSuccessCode: (code: unknown) => boolean
  getCurrentOperatorName: () => string
  moduleKey: Ref<string>
  showRequestError: (error: unknown, fallbackMessage: string) => void
}

import { cloneRecord } from '@/utils/clone-utils'

export function useAttachmentSupport(options: UseAttachmentSupportOptions) {
  const attachmentVisible = ref(false)
  const attachmentSaving = ref(false)
  const attachmentRecord = ref<ModuleRecord | null>(null)
  const attachmentDraftName = ref('')
  const attachmentPasteEnabled = computed(() => true)

  function buildAttachmentItems(record: ModuleRecord | null) {
    if (!record) {
      return []
    }

    const rawAttachments = Array.isArray(record.attachments) ? record.attachments : []
    if (rawAttachments.length) {
      return rawAttachments.map((item, index) => ({
        id: String(item.id || `attachment-${index + 1}`),
        name: String(item.name || item.fileName || `附件${index + 1}`),
        uploader: String(item.uploader || item.operatorName || options.getCurrentOperatorName()),
        uploadTime: String(item.uploadTime || item.createTime || dayjs().format('YYYY-MM-DD HH:mm:ss')),
        previewSupported: Boolean(item.previewSupported),
        previewType: String(item.previewType || ''),
        previewUrl: item.previewUrl ? String(item.previewUrl) : '',
        downloadUrl: item.downloadUrl ? String(item.downloadUrl) : '',
        originalFileName: item.originalFileName ? String(item.originalFileName) : '',
      }))
    }

    return String(record.attachment || '')
      .split(/[，,]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((name, index) => ({
        id: `legacy-${index + 1}`,
        name,
        uploader: options.getCurrentOperatorName(),
        uploadTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        previewSupported: false,
        previewType: '',
        previewUrl: '',
        downloadUrl: '',
        originalFileName: name,
      }))
  }

  const attachmentRows = computed(() => buildAttachmentItems(attachmentRecord.value))

  function closeAttachmentDialog() {
    attachmentVisible.value = false
    attachmentSaving.value = false
    attachmentDraftName.value = ''
    attachmentRecord.value = null
  }

  function normalizeAttachmentRequestUrl(url: string) {
    if (!url) {
      return url
    }

    const base = apiBaseUrl.replace(/\/$/, '')
    if (url.startsWith(base + '/')) {
      return url.slice(base.length)
    }

    return url
  }

  function withAttachmentModuleKey(url: string) {
    const normalizedUrl = normalizeAttachmentRequestUrl(url)
    if (!normalizedUrl || !options.moduleKey.value) {
      return normalizedUrl
    }
    if (!normalizedUrl.startsWith('/attachments/') && !normalizedUrl.startsWith('/api/attachments/')) {
      return normalizedUrl
    }
    if (/[?&]moduleKey=/.test(normalizedUrl)) {
      return normalizedUrl
    }

    const joiner = normalizedUrl.includes('?') ? '&' : '?'
    return `${normalizedUrl}${joiner}moduleKey=${encodeURIComponent(options.moduleKey.value)}`
  }

  function withRecordAttachments(record: ModuleRecord, attachments: unknown[]) {
    const nextRecord = cloneRecord(record)
    const normalizedAttachments = Array.isArray(attachments) ? attachments : []
    nextRecord.attachments = normalizedAttachments
    nextRecord.attachment = normalizedAttachments
      .map((item: unknown) => String((item as Record<string, unknown>).name || (item as Record<string, unknown>).fileName || ''))
      .filter(Boolean)
      .join(', ')
    nextRecord.attachmentIds = normalizedAttachments
      .map((item: unknown) => String((item as Record<string, unknown>).id || '').trim())
      .filter((value: string) => /^\d+$/.test(value) && value !== '0')
    return nextRecord
  }

  async function fetchAttachmentBlob(url: string) {
    return http.get(withAttachmentModuleKey(url), {
      responseType: 'blob',
    }) as unknown as Blob
  }

  function openBlobPreview(blob: Blob) {
    const objectUrl = URL.createObjectURL(blob)
    const opened = window.open(objectUrl, '_blank', 'noopener,noreferrer')
    if (!opened) {
      message.warning('浏览器拦截了预览窗口，请允许弹窗后重试')
      URL.revokeObjectURL(objectUrl)
      return
    }
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  }

  function triggerBlobDownload(blob: Blob, fileName: string) {
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = fileName
    link.click()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 5_000)
  }

  async function saveAttachmentList(nextAttachments: AttachmentItem[]) {
    if (!options.canManageAttachments.value) {
      message.warning('暂无附件维护权限')
      return
    }
    if (!attachmentRecord.value) {
      return
    }

    attachmentSaving.value = true
    try {
      const response = await updateAttachmentBindings(
        options.moduleKey.value,
        attachmentRecord.value.id,
        nextAttachments
          .map((item) => String(item.id).trim())
          .filter((value) => /^\d+$/.test(value) && value !== '0'),
      )
      if (!options.isSuccessCode(response.code) || !response.data) {
        throw new Error(response.message || '附件保存失败')
      }

      const savedRecord = withRecordAttachments(
        attachmentRecord.value,
        Array.isArray(response.data.attachments) ? response.data.attachments : [],
      )
      attachmentRecord.value = savedRecord
      if (options.activeRecord.value?.id === savedRecord.id) {
        options.activeRecord.value = savedRecord
      }
    } finally {
      attachmentSaving.value = false
    }
  }

  async function handleAddAttachment() {
    if (!options.canManageAttachments.value) {
      message.warning('暂无附件维护权限')
      return
    }
    if (attachmentPasteEnabled.value) {
      message.info('物流对账单附件请使用上传或直接粘贴文件')
      return
    }

    const name = attachmentDraftName.value.trim()
    if (!name) {
      message.warning('请先输入附件名称')
      return
    }

    try {
      await saveAttachmentList([
        ...attachmentRows.value,
        {
          id: `attachment-${Date.now()}`,
          name,
          uploader: options.getCurrentOperatorName(),
          uploadTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        },
      ])
      attachmentDraftName.value = ''
      message.success('附件已保存')
    } catch (error) {
      options.showRequestError(error, '附件保存失败')
    }
  }

  async function handlePreviewAttachment(item: AttachmentItem) {
    if (!item.previewSupported || !item.previewUrl) {
      message.warning('该附件暂不支持预览')
      return
    }

    try {
      attachmentSaving.value = true
      const blob = await fetchAttachmentBlob(item.previewUrl)
      openBlobPreview(blob)
    } catch (error) {
      options.showRequestError(error, '附件预览失败')
    } finally {
      attachmentSaving.value = false
    }
  }

  async function handleDownloadAttachment(item: AttachmentItem) {
    if (!item.downloadUrl) {
      message.warning('该附件暂不支持下载')
      return
    }

    try {
      attachmentSaving.value = true
      const blob = await fetchAttachmentBlob(item.downloadUrl)
      triggerBlobDownload(blob, item.originalFileName || item.name)
    } catch (error) {
      options.showRequestError(error, '附件下载失败')
    } finally {
      attachmentSaving.value = false
    }
  }

  async function uploadAttachmentFiles(files: File[], sourceType = 'PAGE_UPLOAD') {
    if (!options.canManageAttachments.value) {
      message.warning('暂无附件维护权限')
      return
    }
    if (!attachmentRecord.value) {
      return
    }
    if (!files.length) {
      return
    }

    attachmentSaving.value = true
    try {
      const nextAttachments = [...attachmentRows.value]
      for (const file of files) {
        const response = await uploadAttachment(file, options.moduleKey.value, sourceType)
        if (!options.isSuccessCode(response.code) || !response.data) {
          throw new Error(response.message || '附件上传失败')
        }
        nextAttachments.push({
          id: String(response.data.id || ''),
          name: String(response.data.name || response.data.fileName || file.name),
          uploader: String(response.data.uploader || options.getCurrentOperatorName()),
          uploadTime: String(response.data.uploadTime || dayjs().format('YYYY-MM-DD HH:mm:ss')),
          previewSupported: Boolean(response.data.previewSupported),
          previewType: String(response.data.previewType || ''),
          previewUrl: response.data.previewUrl ? String(response.data.previewUrl) : '',
          downloadUrl: response.data.downloadUrl ? String(response.data.downloadUrl) : '',
          originalFileName: String(response.data.originalFileName || file.name),
        })
      }

      await saveAttachmentList(nextAttachments)
      message.success(`已上传 ${files.length} 个附件`)
    } finally {
      attachmentSaving.value = false
    }
  }

  async function handleAttachmentBeforeUpload(file: File) {
    try {
      await uploadAttachmentFiles([file], 'PAGE_UPLOAD')
    } catch (error) {
      options.showRequestError(error, '附件上传失败')
    }
    return false
  }

  async function handleAttachmentPaste(event: ClipboardEvent) {
    if (!attachmentVisible.value || !attachmentPasteEnabled.value) {
      return
    }

    const clipboardItems = Array.from(event.clipboardData?.items || [])
    const files = clipboardItems
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file))

    if (!files.length) {
      return
    }

    event.preventDefault()
    try {
      await uploadAttachmentFiles(files, 'CLIPBOARD_PASTE')
    } catch (error) {
      options.showRequestError(error, '粘贴上传失败')
    }
  }

  async function handleRemoveAttachment(attachmentId: string) {
    if (!options.canManageAttachments.value) {
      message.warning('暂无附件维护权限')
      return
    }

    try {
      await saveAttachmentList(attachmentRows.value.filter((item) => item.id !== attachmentId))
      message.success('附件已删除')
    } catch (error) {
      options.showRequestError(error, '附件删除失败')
    }
  }

  async function openAttachmentDialog(record: ModuleRecord) {
    if (!options.canManageAttachments.value) {
      message.warning('暂无附件维护权限')
      return
    }
    if (options.isReadOnly.value) {
      message.warning('当前模块为只读模式')
      return
    }

    attachmentRecord.value = withRecordAttachments(record, Array.isArray(record.attachments) ? record.attachments : [])
    attachmentDraftName.value = ''
    attachmentVisible.value = true
    attachmentSaving.value = true
    try {
      const response = await getAttachmentBindings(options.moduleKey.value, record.id)
      if (!options.isSuccessCode(response.code) || !response.data) {
        throw new Error(response.message || '加载附件失败')
      }
      const attachments = Array.isArray(response.data.attachments) && response.data.attachments.length
        ? response.data.attachments
        : (Array.isArray(record.attachments) ? record.attachments : [])
      attachmentRecord.value = withRecordAttachments(record, attachments)
      if (options.activeRecord.value?.id === record.id) {
        options.activeRecord.value = attachmentRecord.value
      }
    } catch (error) {
      options.showRequestError(error, '加载附件失败')
    } finally {
      attachmentSaving.value = false
    }
  }

  watch(attachmentVisible, (visible) => {
    if (typeof window === 'undefined') {
      return
    }
    if (visible && attachmentPasteEnabled.value) {
      window.addEventListener('paste', handleAttachmentPaste)
      return
    }
    window.removeEventListener('paste', handleAttachmentPaste)
  })

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('paste', handleAttachmentPaste)
    }
  })

  return {
    attachmentDraftName,
    attachmentPasteEnabled,
    attachmentRecord,
    attachmentRows,
    attachmentSaving,
    attachmentVisible,
    closeAttachmentDialog,
    handleAddAttachment,
    handleAttachmentBeforeUpload,
    handleDownloadAttachment,
    handlePreviewAttachment,
    handleRemoveAttachment,
    openAttachmentDialog,
  }
}
