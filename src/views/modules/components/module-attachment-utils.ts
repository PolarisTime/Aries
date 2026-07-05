import type { AttachmentRecord } from '@/api/business'

function getAttachmentFileName(attachment: AttachmentRecord) {
  return String(
    attachment.originalFileName || attachment.fileName || attachment.name || '',
  ).toLowerCase()
}

export function isImageAttachment(attachment: AttachmentRecord) {
  if (attachment.previewType === 'image') return true
  if (attachment.contentType?.startsWith('image/')) return true
  return /\.(png|jpe?g|gif|bmp|webp|svg)$/.test(
    getAttachmentFileName(attachment),
  )
}

export function isPdfAttachment(attachment: AttachmentRecord) {
  if (attachment.previewType === 'pdf') return true
  if (attachment.contentType === 'application/pdf') return true
  return getAttachmentFileName(attachment).endsWith('.pdf')
}

export function getAttachmentDisplayName(attachment: AttachmentRecord) {
  return attachment.originalFileName || attachment.fileName || attachment.name
}

export function getPreviewCandidateUrl(attachment: AttachmentRecord) {
  return attachment.previewUrl || attachment.downloadUrl || ''
}

export function getStorageLabel(attachment: AttachmentRecord) {
  if (attachment.storageLabel?.trim()) {
    return attachment.storageLabel.trim()
  }
  return attachment.storageType === 's3' ? 'S3存储' : '本机存储'
}

export function getStorageTagColor(attachment: AttachmentRecord) {
  return attachment.storageType === 's3' ? 'blue' : 'default'
}
