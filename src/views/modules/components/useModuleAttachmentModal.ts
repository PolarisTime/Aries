import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getAttachmentBindings,
  getAttachmentBlob,
  getPresignedAttachmentBlob,
  resolveAttachmentAccessUrl,
  updateAttachmentBindings,
  uploadAttachment,
} from '@/api/business/business-attachments'
import type { AttachmentRecord } from '@/api/business/business-types'
import { usePatchState } from '@/hooks/usePatchState'
import { message } from '@/utils/antd-app'
import { downloadBlob } from '@/utils/download'
import { asString } from '@/utils/type-narrowing'
import {
  getAttachmentDisplayName,
  getPreviewCandidateUrl,
  isImageAttachment,
} from './module-attachment-utils'

interface UseModuleAttachmentModalParams {
  open: boolean
  moduleKey: string
  recordId: string
  initialFiles?: readonly File[]
}

interface AttachmentModalState {
  attachments: AttachmentRecord[]
  loadError: string
  loading: boolean
  uploading: boolean
  uploadFileName: string
  uploadProgress: number
  previewOpen: boolean
  previewSource: string
  previewUrlByAttachmentId: Record<string, string>
  pdfPreviewUrl: string
  pdfPreviewOpen: boolean
}

const attachmentModalInitialState: AttachmentModalState = {
  attachments: [],
  loadError: '',
  loading: false,
  uploading: false,
  uploadFileName: '',
  uploadProgress: 0,
  previewOpen: false,
  previewSource: '',
  previewUrlByAttachmentId: {},
  pdfPreviewUrl: '',
  pdfPreviewOpen: false,
}

async function fetchAttachmentList(moduleKey: string, recordId: string) {
  const response = await getAttachmentBindings(moduleKey, recordId)
  return response.attachments
}

export function useModuleAttachmentModal({
  open,
  moduleKey,
  recordId,
  initialFiles = [],
}: UseModuleAttachmentModalParams) {
  const { t } = useTranslation()
  const [state, setState] = usePatchState<AttachmentModalState>(
    attachmentModalInitialState,
  )
  const {
    attachments,
    loadError,
    loading,
    uploading,
    uploadFileName,
    uploadProgress,
    previewOpen,
    previewSource,
    previewUrlByAttachmentId,
    pdfPreviewUrl,
    pdfPreviewOpen,
  } = state
  const pasteZoneRef = useRef<HTMLDivElement | null>(null)
  const objectUrlRef = useRef<Set<string>>(new Set())
  const attachmentRequestIdRef = useRef(0)
  const initialUploadKeyRef = useRef('')
  const createTrackedObjectUrl = useCallback((blob: Blob) => {
    const objectUrl = URL.createObjectURL(blob)
    objectUrlRef.current.add(objectUrl)
    return objectUrl
  }, [])

  const revokeTrackedObjectUrls = useCallback(() => {
    for (const objectUrl of objectUrlRef.current) {
      URL.revokeObjectURL(objectUrl)
    }
    objectUrlRef.current.clear()
  }, [])

  const resolveAttachmentUrl = useCallback(
    async (attachment: AttachmentRecord) => {
      const sourceUrl = getPreviewCandidateUrl(attachment)
      if (!sourceUrl) {
        return ''
      }

      const access = await resolveAttachmentAccessUrl(
        sourceUrl,
        moduleKey,
        true,
      )
      if (access.url) {
        return access.url
      }

      const blob = await getAttachmentBlob(sourceUrl)
      return createTrackedObjectUrl(blob)
    },
    [createTrackedObjectUrl, moduleKey],
  )

  const cachePreviewUrl = useCallback(
    (attachmentId: string, url: string) => {
      setState((prev) => ({
        previewUrlByAttachmentId: {
          ...prev.previewUrlByAttachmentId,
          [attachmentId]: url,
        },
      }))
    },
    [setState],
  )

  const ensurePreviewUrl = useCallback(
    async (attachment: AttachmentRecord) => {
      const cachedUrl = previewUrlByAttachmentId[attachment.id]
      if (cachedUrl) {
        return cachedUrl
      }

      const url = await resolveAttachmentUrl(attachment)
      if (url) {
        cachePreviewUrl(attachment.id, url)
      }
      return url
    },
    [cachePreviewUrl, previewUrlByAttachmentId, resolveAttachmentUrl],
  )

  const fetchAttachments = useCallback(async () => {
    if (!recordId) return
    const requestId = ++attachmentRequestIdRef.current
    setState({ loadError: '', loading: true })
    try {
      const nextAttachments = await fetchAttachmentList(moduleKey, recordId)
      if (requestId !== attachmentRequestIdRef.current) return
      setState({
        attachments: nextAttachments,
        loadError: '',
        loading: false,
        previewUrlByAttachmentId: {},
      })
    } catch (error) {
      if (requestId !== attachmentRequestIdRef.current) return
      setState({
        attachments: [],
        loadError:
          error instanceof Error
            ? error.message
            : t('modules.attachment.loadFailed'),
        loading: false,
      })
    }
  }, [moduleKey, recordId, setState, t])

  const bindAttachment = useCallback(
    async (attachmentId: string) => {
      const latestBindings = await getAttachmentBindings(moduleKey, recordId)
      const latestAttachmentIds = latestBindings.attachments.map(
        (item) => item.id,
      )
      await updateAttachmentBindings(moduleKey, recordId, [
        ...latestAttachmentIds,
        attachmentId,
      ])
    },
    [moduleKey, recordId],
  )

  const uploadAndBindAttachment = useCallback(
    async (file: File) => {
      setState({
        uploading: true,
        uploadFileName: file.name,
        uploadProgress: 0,
      })
      try {
        const uploadResult = await uploadAttachment(
          file,
          moduleKey,
          'PAGE_UPLOAD',
          {
            onProgress: (percent) => {
              setState({ uploadProgress: percent })
            },
          },
        )
        const attachmentId = asString(uploadResult.id).trim()
        if (!attachmentId) {
          message.error(t('modules.attachment.uploadNoId'))
          setState({ uploading: false, uploadFileName: '', uploadProgress: 0 })
          return false
        }
        await bindAttachment(attachmentId)
        message.success(t('modules.attachment.uploadBindSuccess'))
        await fetchAttachments()
        setState({ uploading: false, uploadFileName: '', uploadProgress: 0 })
      } catch (err) {
        message.error(
          err instanceof Error
            ? err.message
            : t('modules.attachment.uploadFailed'),
        )
        setState({ uploading: false, uploadFileName: '', uploadProgress: 0 })
      }
      return false
    },
    [bindAttachment, fetchAttachments, moduleKey, setState, t],
  )

  useEffect(() => {
    if (!open || !recordId || !initialFiles.length) {
      if (!open) initialUploadKeyRef.current = ''
      return
    }
    const uploadKey = `${recordId}:${initialFiles.map((file) => `${file.name}:${file.size}:${file.lastModified}`).join('|')}`
    if (initialUploadKeyRef.current === uploadKey) return
    initialUploadKeyRef.current = uploadKey
    void (async () => {
      for (const file of initialFiles) {
        await uploadAndBindAttachment(file)
      }
    })()
  }, [initialFiles, open, recordId, uploadAndBindAttachment])

  const openImagePreview = useCallback(
    async (attachment: AttachmentRecord) => {
      const src = getPreviewCandidateUrl(attachment)
      if (!src) {
        message.warning(t('modules.attachment.noPreviewUrl'))
        return
      }
      try {
        const resolvedUrl = await ensurePreviewUrl(attachment)
        if (!resolvedUrl) {
          message.warning(t('modules.attachment.noPreviewUrl'))
          return
        }
        setState({ previewSource: resolvedUrl, previewOpen: true })
      } catch (err) {
        message.error(
          err instanceof Error
            ? err.message
            : t('modules.attachment.previewFailed'),
        )
      }
    },
    [ensurePreviewUrl, setState, t],
  )

  const openPdfPreview = useCallback(
    async (attachment: AttachmentRecord) => {
      const src = getPreviewCandidateUrl(attachment)
      if (!src) {
        message.warning(t('modules.attachment.noPreviewUrl'))
        return
      }
      try {
        const blob = await getPresignedAttachmentBlob(src, moduleKey, true)
        setState({
          pdfPreviewUrl: createTrackedObjectUrl(blob),
          pdfPreviewOpen: true,
        })
      } catch (err) {
        message.error(
          err instanceof Error
            ? err.message
            : t('modules.attachment.previewFailed'),
        )
      }
    },
    [createTrackedObjectUrl, moduleKey, setState, t],
  )

  const handleDownload = useCallback(
    async (attachment: AttachmentRecord) => {
      if (!attachment.downloadUrl) {
        message.warning(t('modules.attachment.noDownloadUrl'))
        return
      }
      try {
        const access = await resolveAttachmentAccessUrl(
          attachment.downloadUrl,
          moduleKey,
          false,
        )
        if (access.url) {
          window.open(access.url, '_blank', 'noopener,noreferrer')
          return
        }
        const blob = await getAttachmentBlob(attachment.downloadUrl)
        downloadBlob(blob, getAttachmentDisplayName(attachment) || 'attachment')
      } catch (err) {
        message.error(
          err instanceof Error
            ? err.message
            : t('modules.attachment.downloadFailed'),
        )
      }
    },
    [moduleKey, t],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await updateAttachmentBindings(
          moduleKey,
          recordId,
          attachments.flatMap((item) =>
            String(item.id) !== id ? [item.id] : [],
          ),
        )
        message.success(t('modules.attachment.unbindSuccess'))
        await fetchAttachments()
      } catch (err) {
        message.error(
          err instanceof Error
            ? err.message
            : t('modules.attachment.deleteFailed'),
        )
        throw err
      }
    },
    [attachments, fetchAttachments, moduleKey, recordId, t],
  )

  const clearPreviewState = useCallback(() => {
    attachmentRequestIdRef.current += 1
    setState({
      attachments: [],
      loading: false,
      previewOpen: false,
      previewSource: '',
      previewUrlByAttachmentId: {},
      pdfPreviewOpen: false,
      pdfPreviewUrl: '',
      loadError: '',
    })
    revokeTrackedObjectUrls()
  }, [revokeTrackedObjectUrls, setState])

  const handleModalOpenChange = useCallback(
    (visible: boolean) => {
      if (!visible) clearPreviewState()
    },
    [clearPreviewState],
  )

  const handlePdfPreviewClose = useCallback(() => {
    setState({
      pdfPreviewOpen: false,
      pdfPreviewUrl: '',
    })
  }, [setState])

  const handleImagePreviewChange = useCallback(
    (visible: boolean) => {
      setState({
        previewOpen: visible,
        previewSource: visible ? previewSource : '',
      })
    },
    [previewSource, setState],
  )

  useEffect(() => {
    if (!open) return
    clearPreviewState()
    void fetchAttachments()
  }, [clearPreviewState, fetchAttachments, open])

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null
      if (!pasteZoneRef.current?.contains(target)) {
        return
      }

      const clipboardItems = Array.from(event.clipboardData?.items || [])
      const files = clipboardItems
        .map((item) => item.getAsFile())
        .filter((file): file is File => Boolean(file))

      if (!files.length) {
        return
      }

      event.preventDefault()
      void (async () => {
        for (const file of files) {
          await uploadAndBindAttachment(file)
        }
      })()
    }

    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('paste', handlePaste)
    }
  }, [open, uploadAndBindAttachment])

  useEffect(() => {
    return () => {
      revokeTrackedObjectUrls()
    }
  }, [revokeTrackedObjectUrls])

  return {
    attachments,
    handleDelete,
    handleDownload,
    handleImagePreviewChange,
    handleModalOpenChange,
    handlePdfPreviewClose,
    imageAttachments: attachments.filter(isImageAttachment),
    loadError,
    loading,
    openImagePreview,
    openPdfPreview,
    pasteZoneRef,
    pdfPreviewOpen,
    pdfPreviewUrl,
    previewOpen,
    previewSource,
    previewUrlByAttachmentId,
    retryAttachments: fetchAttachments,
    t,
    uploadAndBindAttachment,
    uploading,
    uploadFileName,
    uploadProgress,
  }
}
