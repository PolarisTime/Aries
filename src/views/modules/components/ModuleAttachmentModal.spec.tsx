import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  can: vi.fn().mockReturnValue(true),
  getAttachmentBindings: vi
    .fn()
    .mockResolvedValue({ data: { attachments: [] } }),
  getAttachmentBlob: vi.fn(),
  getPresignedAttachmentBlob: vi.fn(),
  createObjectURL: vi.fn(),
  downloadBlob: vi.fn(),
  revokeObjectURL: vi.fn(),
  message: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
  modalProps: undefined as Record<string, any> | undefined,
  pdfModalProps: undefined as Record<string, any> | undefined,
  resolveAttachmentAccessUrl: vi.fn(),
  updateAttachmentBindings: vi.fn().mockResolvedValue({}),
  uploadAttachment: vi.fn().mockResolvedValue({ data: { id: '123' } }),
  uploadProps: undefined as Record<string, any> | undefined,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (opts) return `${key}:${JSON.stringify(opts)}`
      return key
    },
  }),
}))

vi.mock('@/api/business', () => ({
  getAttachmentBindings: (...args: any[]) =>
    mocks.getAttachmentBindings(...args),
  getAttachmentBlob: (...args: any[]) => mocks.getAttachmentBlob(...args),
  getPresignedAttachmentBlob: (...args: any[]) =>
    mocks.getPresignedAttachmentBlob(...args),
  resolveAttachmentAccessUrl: (...args: any[]) =>
    mocks.resolveAttachmentAccessUrl(...args),
  updateAttachmentBindings: (...args: any[]) =>
    mocks.updateAttachmentBindings(...args),
  uploadAttachment: (...args: any[]) => mocks.uploadAttachment(...args),
}))

vi.mock('@/stores/permissionStore', () => ({
  usePermissionStore: (selector: any) => {
    const state = {
      can: mocks.can,
    }
    return selector(state)
  },
}))

vi.mock('@/utils/antd-app', () => ({
  message: mocks.message,
}))

vi.mock('@/utils/download', () => ({
  downloadBlob: (...args: any[]) => mocks.downloadBlob(...args),
}))

vi.mock('@/utils/formatters', () => ({
  formatDateTime: vi.fn().mockReturnValue('2024-01-01'),
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: vi.fn((value: unknown) => String(value ?? '')),
}))

vi.mock('antd', () => {
  const Empty = ({ description, ...props }: any) => (
    <div {...props}>{description}</div>
  )
  Empty.PRESENTED_IMAGE_SIMPLE = 'PRESENTED_IMAGE_SIMPLE'

  const PreviewGroup = ({ children, preview }: any) => (
    <div
      data-current={String(preview?.current)}
      data-testid="preview-group"
      data-visible={String(preview?.visible)}
      onDoubleClick={() => preview?.onVisibleChange?.(true)}
      onClick={() => preview?.onVisibleChange?.(false)}
    >
      {children}
    </div>
  )
  const Image = ({
    alt = 'attachment preview',
    preview: _preview,
    ...props
  }: any) => <img alt={alt} {...props} />
  Image.PreviewGroup = PreviewGroup

  return {
    Button: ({
      children,
      danger: _danger,
      icon,
      loading: _loading,
      ...props
    }: any) => (
      <button {...props}>
        {icon}
        {children}
      </button>
    ),
    Card: ({ children, size: _size, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
    Empty,
    Flex: ({
      align: _align,
      children,
      gap: _gap,
      justify: _justify,
      vertical: _vertical,
      ...props
    }: any) => <div {...props}>{children}</div>,
    Image,
    Modal: ({
      afterOpenChange,
      children,
      destroyOnHidden: _destroyOnHidden,
      footer,
      onCancel,
      open,
      title,
      width: _width,
      ...props
    }: any) => {
      const modalProps = { afterOpenChange, onCancel, open, title, ...props }
      if (title === 'modules.attachment.pdfPreview') {
        mocks.pdfModalProps = modalProps
      } else {
        mocks.modalProps = modalProps
      }
      return open ? (
        <div data-testid={`modal-${title}`} {...props}>
          <div>{title}</div>
          <button type="button" onClick={onCancel}>
            cancel
          </button>
          {children}
          {footer}
        </div>
      ) : null
    },
    Space: ({
      align: _align,
      children,
      orientation: _orientation,
      size: _size,
      ...props
    }: any) => <div {...props}>{children}</div>,
    Spin: ({ children, spinning: _spinning, ...props }: any) => (
      <div data-testid="spin" {...props}>
        {children}
      </div>
    ),
    Progress: ({ percent, status: _status, ...props }: any) => (
      <progress aria-valuenow={percent} value={percent} max={100} {...props}>
        {percent}
      </progress>
    ),
    Tag: ({ children, color: _color, ...props }: any) => (
      <span {...props}>{children}</span>
    ),
    Typography: {
      Text: ({
        children,
        ellipsis: _ellipsis,
        strong: _strong,
        type: _type,
        ...props
      }: any) => <span {...props}>{children}</span>,
    },
    Upload: ({ beforeUpload, children, customRequest, ...props }: any) => {
      mocks.uploadProps = { beforeUpload, customRequest, ...props }
      return (
        <div data-testid="upload" {...props}>
          {children}
        </div>
      )
    },
  }
})

vi.mock('antd/es/button', () => ({
  default: ({
    children,
    danger: _danger,
    icon,
    loading: _loading,
    ...props
  }: any) => (
    <button {...props}>
      {icon}
      {children}
    </button>
  ),
}))

vi.mock('antd/es/card', () => ({
  default: ({ children, size: _size, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
}))

vi.mock('antd/es/empty', () => ({
  default: ({ description, ...props }: any) => (
    <div {...props}>{description}</div>
  ),
}))

vi.mock('antd/es/flex', () => ({
  default: ({
    align: _align,
    children,
    gap: _gap,
    justify: _justify,
    vertical: _vertical,
    ...props
  }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/image', () => {
  const PreviewGroup = ({ children, preview }: any) => (
    <div
      data-current={String(preview?.current)}
      data-testid="preview-group"
      data-visible={String(preview?.visible)}
      onDoubleClick={() => preview?.onVisibleChange?.(true)}
      onClick={() => preview?.onVisibleChange?.(false)}
    >
      {children}
    </div>
  )
  const Image = ({
    alt = 'attachment preview',
    preview: _preview,
    ...props
  }: any) => <img alt={alt} {...props} />
  Image.PreviewGroup = PreviewGroup
  return { default: Image }
})

vi.mock('antd/es/modal', () => ({
  default: ({
    afterOpenChange,
    children,
    destroyOnHidden: _destroyOnHidden,
    footer,
    onCancel,
    open,
    title,
    width: _width,
    ...props
  }: any) => {
    const modalProps = { afterOpenChange, onCancel, open, title, ...props }
    if (title === 'modules.attachment.pdfPreview') {
      mocks.pdfModalProps = modalProps
    } else {
      mocks.modalProps = modalProps
    }
    return open ? (
      <div data-testid={`modal-${title}`} {...props}>
        <div>{title}</div>
        <button type="button" onClick={onCancel}>
          cancel
        </button>
        {children}
        {footer}
      </div>
    ) : null
  },
}))

vi.mock('antd/es/space', () => ({
  default: ({
    align: _align,
    children,
    orientation: _orientation,
    size: _size,
    ...props
  }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/spin', () => ({
  default: ({ children, spinning: _spinning, ...props }: any) => (
    <div data-testid="spin" {...props}>
      {children}
    </div>
  ),
}))

vi.mock('antd/es/progress', () => ({
  default: ({ percent, status: _status, ...props }: any) => (
    <progress aria-valuenow={percent} value={percent} max={100} {...props}>
      {percent}
    </progress>
  ),
}))

vi.mock('antd/es/tag', () => ({
  default: ({ children, color: _color, ...props }: any) => (
    <span {...props}>{children}</span>
  ),
}))

vi.mock('antd/es/typography', () => ({
  default: {
    Text: ({
      children,
      ellipsis: _ellipsis,
      strong: _strong,
      type: _type,
      ...props
    }: any) => <span {...props}>{children}</span>,
  },
}))

vi.mock('antd/es/upload', () => ({
  default: ({ beforeUpload, children, customRequest, ...props }: any) => {
    mocks.uploadProps = { beforeUpload, customRequest, ...props }
    return (
      <div data-testid="upload" {...props}>
        {children}
      </div>
    )
  },
}))

vi.mock('@ant-design/icons', () => ({
  DeleteOutlined: () => <span>DeleteOutlined</span>,
  DownloadOutlined: () => <span>DownloadOutlined</span>,
  EyeOutlined: () => <span>EyeOutlined</span>,
  PaperClipOutlined: () => <span>PaperClipOutlined</span>,
  UploadOutlined: () => <span>UploadOutlined</span>,
}))

import { ModuleAttachmentModal } from '@/views/modules/components/ModuleAttachmentModal'

describe('ModuleAttachmentModal', () => {
  const defaultProps = {
    open: true,
    moduleKey: 'test-module',
    resourceKey: 'test-resource',
    recordId: '123',
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.can.mockReset()
    mocks.can.mockReturnValue(true)
    mocks.getAttachmentBindings.mockReset()
    mocks.getAttachmentBlob.mockReset()
    mocks.getPresignedAttachmentBlob.mockReset()
    mocks.downloadBlob.mockReset()
    mocks.getPresignedAttachmentBlob.mockResolvedValue(
      new Blob(['pdf'], { type: 'application/pdf' }),
    )
    mocks.getAttachmentBindings.mockResolvedValue({ data: { attachments: [] } })
    mocks.modalProps = undefined
    mocks.pdfModalProps = undefined
    mocks.resolveAttachmentAccessUrl.mockImplementation(
      async (url: string, _moduleKey: string, inline: boolean) => ({
        inline,
        presigned: true,
        url,
      }),
    )
    mocks.uploadProps = undefined
    mocks.updateAttachmentBindings.mockReset()
    mocks.updateAttachmentBindings.mockResolvedValue({})
    mocks.uploadAttachment.mockReset()
    mocks.uploadAttachment.mockResolvedValue({ data: { id: '123' } })
    mocks.createObjectURL.mockReset()
    mocks.revokeObjectURL.mockReset()
    mocks.createObjectURL.mockReturnValue(
      'https://blob.example.test/attachment-preview',
    )
    vi.spyOn(URL, 'createObjectURL').mockImplementation(mocks.createObjectURL)
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(mocks.revokeObjectURL)
    window.open = vi.fn()
  })

  it('renders modal when open', () => {
    render(<ModuleAttachmentModal {...defaultProps} />)
    expect(screen.getByTestId('modal-modules.attachment.title')).toBeTruthy()
  })

  it('does not render modal when closed', () => {
    render(<ModuleAttachmentModal {...defaultProps} open={false} />)
    expect(screen.queryByTestId('modal')).toBeNull()
  })

  it('renders upload button', () => {
    render(<ModuleAttachmentModal {...defaultProps} />)
    expect(screen.getByText('modules.attachment.upload')).toBeTruthy()
  })

  it('renders empty state when no attachments', () => {
    render(<ModuleAttachmentModal {...defaultProps} />)
    expect(screen.getByText('modules.attachment.noAttachments')).toBeTruthy()
  })

  it('falls back to an empty attachment list when the binding response has no data', async () => {
    mocks.getAttachmentBindings.mockResolvedValueOnce({})
    render(<ModuleAttachmentModal {...defaultProps} />)

    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    expect(screen.getByText('modules.attachment.noAttachments')).toBeTruthy()
  })

  it('renders with no recordId', () => {
    render(<ModuleAttachmentModal {...defaultProps} recordId="" />)
    expect(screen.getByTestId('modal-modules.attachment.title')).toBeTruthy()
  })

  it('fetches and renders attachments after modal opens', async () => {
    mocks.getAttachmentBindings.mockResolvedValue({
      data: {
        attachments: [
          attachment({ id: 'img-1', originalFileName: 'photo.png' }),
          attachment({
            contentType: 'application/pdf',
            id: 'pdf-1',
            originalFileName: 'contract.pdf',
            storageLabel: 'S3存储',
            storageType: 's3',
          }),
          attachment({
            contentType: 'text/plain',
            id: 'txt-1',
            originalFileName: 'readme.txt',
            storageLabel: '本机存储',
            storageType: 'local',
          }),
        ],
      },
    })
    render(<ModuleAttachmentModal {...defaultProps} />)

    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    expect(mocks.getAttachmentBindings).toHaveBeenCalledWith(
      'test-module',
      '123',
    )
    expect(await screen.findByText('photo.png')).toBeTruthy()
    expect(screen.getByText('contract.pdf')).toBeTruthy()
    expect(screen.getByText('readme.txt')).toBeTruthy()
    expect(screen.getByText('S3存储')).toBeTruthy()
    expect(screen.getAllByText('本机存储')).toHaveLength(2)
    expect(screen.getByText('PDF')).toBeTruthy()
    expect(screen.getAllByText('PaperClipOutlined')).toHaveLength(2)
  })

  it('does not load image thumbnails when attachment modal opens', async () => {
    mocks.getAttachmentBindings.mockResolvedValue({
      data: {
        attachments: [
          attachment({
            downloadUrl:
              '/api/attachments/img-1/download?accessKey=img-key&moduleKey=test-module',
            id: 'img-1',
            originalFileName: 'photo.png',
            previewUrl:
              '/api/attachments/img-1/preview?accessKey=img-key&moduleKey=test-module',
          }),
        ],
      },
    })
    render(<ModuleAttachmentModal {...defaultProps} />)

    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    expect(await screen.findByText('photo.png')).toBeTruthy()
    expect(screen.queryByAltText('photo.png')).toBeNull()
    expect(mocks.resolveAttachmentAccessUrl).not.toHaveBeenCalled()
  })

  it('uploads a file and binds it to the current record', async () => {
    mocks.getAttachmentBindings.mockResolvedValueOnce({
      data: { attachments: [{ id: 'existing-1' }] },
    })
    render(<ModuleAttachmentModal {...defaultProps} />)
    const file = new File(['hello'], 'proof.pdf', { type: 'application/pdf' })

    await act(async () => {
      mocks.uploadProps!.beforeUpload(file)
    })

    await waitFor(() => {
      expect(mocks.uploadAttachment).toHaveBeenCalledWith(
        file,
        'test-module',
        'PAGE_UPLOAD',
        expect.objectContaining({ onProgress: expect.any(Function) }),
      )
      expect(mocks.updateAttachmentBindings).toHaveBeenCalledWith(
        'test-module',
        '123',
        ['existing-1', '123'],
      )
    })
    expect(mocks.message.success).toHaveBeenCalledWith(
      'modules.attachment.uploadBindSuccess',
    )
  })

  it('shows upload progress and status text while upload is running', async () => {
    let resolveUpload: ((value: { data: { id: string } }) => void) | undefined
    mocks.uploadAttachment.mockImplementationOnce(
      async (
        _file: File,
        _moduleKey: string,
        _sourceType: string,
        options?: { onProgress?: (percent: number) => void },
      ) => {
        options?.onProgress?.(35)
        return new Promise((resolve) => {
          resolveUpload = resolve
        })
      },
    )
    render(<ModuleAttachmentModal {...defaultProps} />)
    const file = new File(['hello'], 'proof.pdf', { type: 'application/pdf' })

    await act(async () => {
      mocks.uploadProps!.beforeUpload(file)
      await Promise.resolve()
    })

    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '35',
    )
    expect(
      screen.getByText(
        'modules.attachment.uploadingProgress:{"fileName":"proof.pdf","percent":35}',
      ),
    ).toBeTruthy()

    await act(async () => {
      resolveUpload?.({ data: { id: '123' } })
    })
  })

  it('shows completed upload progress while upload is still resolving', async () => {
    let resolveUpload: ((value: { data: { id: string } }) => void) | undefined
    mocks.uploadAttachment.mockImplementationOnce(
      async (
        _file: File,
        _moduleKey: string,
        _sourceType: string,
        options?: { onProgress?: (percent: number) => void },
      ) => {
        options?.onProgress?.(100)
        return new Promise((resolve) => {
          resolveUpload = resolve
        })
      },
    )
    render(<ModuleAttachmentModal {...defaultProps} />)

    await act(async () => {
      mocks.uploadProps!.beforeUpload(
        new File(['hello'], 'proof.pdf', { type: 'application/pdf' }),
      )
      await Promise.resolve()
    })

    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100',
    )

    await act(async () => {
      resolveUpload?.({ data: { id: '123' } })
    })
  })

  it('shows upload error when uploaded response has no id', async () => {
    mocks.uploadAttachment.mockResolvedValueOnce({ data: { id: '' } })
    render(<ModuleAttachmentModal {...defaultProps} />)

    await act(async () => {
      mocks.uploadProps!.beforeUpload(
        new File(['hello'], 'proof.pdf', { type: 'application/pdf' }),
      )
    })

    await waitFor(() => {
      expect(mocks.message.error).toHaveBeenCalledWith(
        'modules.attachment.uploadNoId',
      )
    })
    expect(mocks.updateAttachmentBindings).not.toHaveBeenCalled()
  })

  it('binds uploads when the latest binding response has no attachments', async () => {
    mocks.getAttachmentBindings.mockResolvedValueOnce({})
    render(<ModuleAttachmentModal {...defaultProps} />)

    await act(async () => {
      mocks.uploadProps!.beforeUpload(
        new File(['hello'], 'proof.pdf', { type: 'application/pdf' }),
      )
    })

    await waitFor(() => {
      expect(mocks.updateAttachmentBindings).toHaveBeenCalledWith(
        'test-module',
        '123',
        ['123'],
      )
    })
  })

  it('shows thrown upload errors', async () => {
    mocks.uploadAttachment.mockRejectedValueOnce(
      new window.Error('upload exploded'),
    )
    render(<ModuleAttachmentModal {...defaultProps} />)

    await act(async () => {
      mocks.uploadProps!.beforeUpload(
        new File(['hello'], 'proof.pdf', { type: 'application/pdf' }),
      )
    })

    await waitFor(() => {
      expect(mocks.message.error).toHaveBeenCalledWith('upload exploded')
    })
  })

  it('previews image and pdf attachments and downloads files through resolved access urls', async () => {
    mocks.getAttachmentBindings.mockResolvedValue({
      data: {
        attachments: [
          attachment({
            downloadUrl:
              '/api/attachments/img-1/download?accessKey=img-key&moduleKey=test-module',
            id: 'img-1',
            originalFileName: 'photo.png',
            previewUrl:
              '/api/attachments/img-1/preview?accessKey=img-key&moduleKey=test-module',
          }),
          attachment({
            contentType: 'application/pdf',
            downloadUrl:
              '/api/attachments/pdf-1/download?accessKey=pdf-key&moduleKey=test-module',
            id: 'pdf-1',
            originalFileName: 'contract.pdf',
            previewUrl:
              '/api/attachments/pdf-1/preview?accessKey=pdf-key&moduleKey=test-module',
          }),
        ],
      },
    })
    mocks.resolveAttachmentAccessUrl.mockImplementation(
      async (url: string, _moduleKey: string, inline: boolean) => ({
        inline,
        presigned: true,
        url: `https://cdn.example.com${url}`,
      }),
    )
    render(<ModuleAttachmentModal {...defaultProps} />)
    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    fireEvent.click((await screen.findAllByText('EyeOutlined'))[0])
    await waitFor(() => {
      expect(mocks.resolveAttachmentAccessUrl).toHaveBeenCalledWith(
        '/api/attachments/img-1/preview?accessKey=img-key&moduleKey=test-module',
        'test-module',
        true,
      )
      expect(screen.getByTestId('preview-group')).toHaveAttribute(
        'data-visible',
        'true',
      )
    })

    await act(async () => {
      fireEvent.click(screen.getByText('PDF'))
    })
    await waitFor(() => {
      expect(
        screen.getByTestId('modal-modules.attachment.pdfPreview'),
      ).toBeTruthy()
      expect(mocks.getPresignedAttachmentBlob).toHaveBeenCalledWith(
        '/api/attachments/pdf-1/preview?accessKey=pdf-key&moduleKey=test-module',
        'test-module',
        true,
      )
      expect(screen.getByTitle('PDF Preview')).toHaveAttribute(
        'src',
        'https://blob.example.test/attachment-preview',
      )
      expect(screen.getByTitle('PDF Preview')).toHaveAttribute('sandbox', '')
    })

    await act(async () => {
      fireEvent.click(screen.getAllByText('DownloadOutlined')[0])
    })
    await waitFor(() => {
      expect(mocks.resolveAttachmentAccessUrl).toHaveBeenCalledWith(
        '/api/attachments/img-1/download?accessKey=img-key&moduleKey=test-module',
        'test-module',
        false,
      )
      expect(window.open).toHaveBeenCalledWith(
        'https://cdn.example.com/api/attachments/img-1/download?accessKey=img-key&moduleKey=test-module',
        '_blank',
        'noopener,noreferrer',
      )
    })
  })

  it('uses authenticated blob fallback when access url cannot be presigned', async () => {
    const blob = new Blob(['file'], { type: 'application/pdf' })
    mocks.getAttachmentBindings.mockResolvedValue({
      data: {
        attachments: [
          attachment({
            contentType: 'application/pdf',
            id: 'pdf-1',
            originalFileName: 'contract.pdf',
            previewUrl:
              '/api/attachments/pdf-1/preview?accessKey=pdf-key&moduleKey=test-module',
          }),
        ],
      },
    })
    mocks.getPresignedAttachmentBlob.mockResolvedValue(blob)
    render(<ModuleAttachmentModal {...defaultProps} />)
    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    await act(async () => {
      fireEvent.click(await screen.findByText('PDF'))
    })

    await waitFor(() => {
      expect(mocks.getPresignedAttachmentBlob).toHaveBeenCalledWith(
        '/api/attachments/pdf-1/preview?accessKey=pdf-key&moduleKey=test-module',
        'test-module',
        true,
      )
      expect(mocks.createObjectURL).toHaveBeenCalledWith(blob)
      expect(screen.getByTitle('PDF Preview')).toHaveAttribute(
        'src',
        'https://blob.example.test/attachment-preview',
      )
    })
  })

  it('warns when preview or download url is missing', async () => {
    mocks.getAttachmentBindings.mockResolvedValue({
      data: {
        attachments: [
          attachment({
            downloadUrl: '',
            id: 'img-1',
            originalFileName: 'photo.png',
            previewUrl: '',
          }),
        ],
      },
    })
    render(<ModuleAttachmentModal {...defaultProps} />)
    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    fireEvent.click(await screen.findByText('EyeOutlined'))
    fireEvent.click(screen.getByText('DownloadOutlined'))

    expect(mocks.message.warning).toHaveBeenCalledWith(
      'modules.attachment.noPreviewUrl',
    )
    expect(mocks.message.warning).toHaveBeenCalledWith(
      'modules.attachment.noDownloadUrl',
    )
  })

  it('warns when an image preview url cannot be resolved', async () => {
    mocks.getAttachmentBindings.mockResolvedValue({
      data: {
        attachments: [
          attachment({
            id: 'img-1',
            originalFileName: 'photo.png',
            previewUrl: 'https://cdn.example.com/preview',
          }),
        ],
      },
    })
    mocks.resolveAttachmentAccessUrl.mockResolvedValue({
      presigned: false,
      url: '',
    })
    mocks.getAttachmentBlob.mockResolvedValueOnce(new Blob([]))
    mocks.createObjectURL.mockReturnValueOnce('')

    render(<ModuleAttachmentModal {...defaultProps} />)
    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    await act(async () => {
      fireEvent.click(await screen.findByText('EyeOutlined'))
    })

    await waitFor(() => {
      expect(mocks.message.warning).toHaveBeenCalledWith(
        'modules.attachment.noPreviewUrl',
      )
    })
  })

  it('warns when an image preview source disappears before url resolution', async () => {
    const volatileAttachment = attachment({
      downloadUrl: '',
      id: 'img-1',
      originalFileName: 'photo.png',
      previewUrl: '',
    })
    let previewUrlReads = 0
    Object.defineProperty(volatileAttachment, 'previewUrl', {
      configurable: true,
      get: () => {
        previewUrlReads += 1
        return previewUrlReads === 1 ? 'https://cdn.example.com/preview' : ''
      },
    })
    mocks.getAttachmentBindings.mockResolvedValue({
      data: {
        attachments: [volatileAttachment],
      },
    })

    render(<ModuleAttachmentModal {...defaultProps} />)
    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    await act(async () => {
      fireEvent.click(await screen.findByText('EyeOutlined'))
    })

    expect(mocks.resolveAttachmentAccessUrl).not.toHaveBeenCalled()
    expect(mocks.message.warning).toHaveBeenCalledWith(
      'modules.attachment.noPreviewUrl',
    )
  })

  it('shows fallback preview errors for non-error image preview failures', async () => {
    mocks.getAttachmentBindings.mockResolvedValue({
      data: {
        attachments: [
          attachment({
            id: 'img-1',
            originalFileName: 'photo.png',
            previewUrl: 'https://cdn.example.com/preview',
          }),
        ],
      },
    })
    mocks.resolveAttachmentAccessUrl.mockRejectedValueOnce('preview failed')

    render(<ModuleAttachmentModal {...defaultProps} />)
    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    await act(async () => {
      fireEvent.click(await screen.findByText('EyeOutlined'))
    })

    await waitFor(() => {
      expect(mocks.message.error).toHaveBeenCalledWith(
        'modules.attachment.previewFailed',
      )
    })
  })

  it('opens pdf previews from the preview icon button', async () => {
    mocks.getAttachmentBindings.mockResolvedValue({
      data: {
        attachments: [
          attachment({
            contentType: 'application/pdf',
            id: 'pdf-1',
            originalFileName: 'contract.pdf',
            previewUrl: 'https://cdn.example.com/contract.pdf',
          }),
        ],
      },
    })

    render(<ModuleAttachmentModal {...defaultProps} />)
    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    await act(async () => {
      fireEvent.click(await screen.findByText('EyeOutlined'))
    })

    await waitFor(() => {
      expect(mocks.getPresignedAttachmentBlob).toHaveBeenCalledWith(
        'https://cdn.example.com/contract.pdf',
        'test-module',
        true,
      )
    })
  })

  it('shows fallback preview errors for non-error pdf preview failures', async () => {
    mocks.getAttachmentBindings.mockResolvedValue({
      data: {
        attachments: [
          attachment({
            contentType: 'application/pdf',
            id: 'pdf-1',
            originalFileName: 'contract.pdf',
            previewUrl: 'https://cdn.example.com/contract.pdf',
          }),
        ],
      },
    })
    mocks.getPresignedAttachmentBlob.mockRejectedValueOnce('pdf failed')

    render(<ModuleAttachmentModal {...defaultProps} />)
    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    await act(async () => {
      fireEvent.click(await screen.findByText('PDF'))
    })

    await waitFor(() => {
      expect(mocks.message.error).toHaveBeenCalledWith(
        'modules.attachment.previewFailed',
      )
    })
  })

  it('removes a binding when delete is clicked', async () => {
    mocks.getAttachmentBindings
      .mockResolvedValueOnce({
        data: {
          attachments: [
            attachment({ id: 'keep-1', originalFileName: 'keep.pdf' }),
            attachment({ id: 'delete-1', originalFileName: 'delete.pdf' }),
          ],
        },
      })
      .mockResolvedValue({ data: { attachments: [] } })
    render(<ModuleAttachmentModal {...defaultProps} />)
    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    fireEvent.click(
      await screen
        .findAllByText('DeleteOutlined')
        .then((buttons) => buttons[1]),
    )

    await waitFor(() => {
      expect(mocks.updateAttachmentBindings).toHaveBeenCalledWith(
        'test-module',
        '123',
        ['keep-1'],
      )
    })
    expect(mocks.message.success).toHaveBeenCalledWith(
      'modules.attachment.unbindSuccess',
    )
  })

  it('shows thrown download and delete errors', async () => {
    mocks.getAttachmentBindings.mockResolvedValue({
      data: {
        attachments: [
          attachment({
            id: 'file-1',
            originalFileName: 'file.txt',
          }),
        ],
      },
    })
    mocks.resolveAttachmentAccessUrl.mockRejectedValueOnce(
      new window.Error('download exploded'),
    )
    mocks.updateAttachmentBindings.mockRejectedValueOnce(
      new window.Error('delete exploded'),
    )

    render(<ModuleAttachmentModal {...defaultProps} />)
    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    await act(async () => {
      fireEvent.click(await screen.findByText('DownloadOutlined'))
    })
    await waitFor(() => {
      expect(mocks.message.error).toHaveBeenCalledWith('download exploded')
    })

    await act(async () => {
      fireEvent.click(screen.getByText('DeleteOutlined'))
    })
    await waitFor(() => {
      expect(mocks.message.error).toHaveBeenCalledWith('delete exploded')
    })
  })

  it('uses zero bytes when attachment size is missing', async () => {
    mocks.getAttachmentBindings.mockResolvedValue({
      data: {
        attachments: [
          attachment({
            fileSize: undefined,
            id: 'file-1',
            originalFileName: 'file.txt',
          }),
        ],
      },
    })

    render(<ModuleAttachmentModal {...defaultProps} />)
    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    expect(
      await screen.findByText(
        (_content, node) =>
          node?.tagName === 'SPAN' &&
          Boolean(node.textContent?.includes('0.0 KB')),
      ),
    ).toBeTruthy()
  })

  it('shows no-permission hint and hides upload/delete controls', async () => {
    mocks.can.mockImplementation(
      (_resource: string, action: string) =>
        action !== 'update' && action !== 'delete',
    )
    mocks.getAttachmentBindings.mockResolvedValue({
      data: {
        attachments: [
          attachment({ id: 'file-1', originalFileName: 'file.pdf' }),
        ],
      },
    })

    render(<ModuleAttachmentModal {...defaultProps} />)
    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    expect(screen.getByText('modules.attachment.noPermissionHint')).toBeTruthy()
    expect(screen.queryByTestId('upload')).toBeNull()
    expect(screen.queryByText('DeleteOutlined')).toBeNull()
  })

  it('resolves file type and storage fallbacks from attachment metadata', async () => {
    mocks.getAttachmentBindings.mockResolvedValue({
      data: {
        attachments: [
          attachment({
            contentType: '',
            id: 'preview-image',
            originalFileName: '',
            previewType: 'image',
            storageLabel: '  ',
            storageType: 's3',
          }),
          attachment({
            contentType: '',
            fileName: '',
            id: 'preview-pdf',
            name: 'fallback.pdf',
            originalFileName: '',
            previewType: 'pdf',
          }),
        ],
      },
    })

    render(<ModuleAttachmentModal {...defaultProps} resourceKey={undefined} />)
    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    expect(mocks.can).toHaveBeenCalledWith('test-module', 'update')
    expect(await screen.findByText('fallback.pdf')).toBeTruthy()
    expect(screen.getByText('S3存储')).toBeTruthy()
    expect(screen.getByText('PDF')).toBeTruthy()
    expect(screen.getAllByText('EyeOutlined')).toHaveLength(2)
  })

  it('opens image previews from thumbnail buttons and reuses cached preview urls', async () => {
    mocks.getAttachmentBindings.mockResolvedValue({
      data: {
        attachments: [
          attachment({
            downloadUrl: '',
            id: 'img-1',
            originalFileName: 'photo.png',
            previewUrl: 'https://cdn.example.com/preview',
          }),
        ],
      },
    })
    render(<ModuleAttachmentModal {...defaultProps} />)
    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    const thumbnailButton = await screen.findByText('PaperClipOutlined')
    await act(async () => {
      fireEvent.click(thumbnailButton.closest('button')!)
    })
    await waitFor(() => {
      expect(screen.getByTestId('preview-group')).toHaveAttribute(
        'data-current',
        '0',
      )
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('preview-group'))
    })
    await act(async () => {
      fireEvent.click(screen.getByText('EyeOutlined'))
    })

    await waitFor(() => {
      expect(mocks.resolveAttachmentAccessUrl).toHaveBeenCalledTimes(1)
    })
  })

  it('falls back to authenticated blob urls for image previews and downloads', async () => {
    const previewBlob = new Blob(['preview'], { type: 'image/png' })
    const downloadBlob = new Blob(['download'], { type: 'text/plain' })
    mocks.getAttachmentBindings.mockResolvedValue({
      data: {
        attachments: [
          attachment({
            downloadUrl: 'https://cdn.example.com/download',
            fileName: '',
            id: 'file-1',
            name: '',
            originalFileName: '',
            previewUrl: 'https://cdn.example.com/preview',
          }),
        ],
      },
    })
    mocks.resolveAttachmentAccessUrl.mockResolvedValue({
      presigned: false,
      url: '',
    })
    mocks.getAttachmentBlob
      .mockResolvedValueOnce(previewBlob)
      .mockResolvedValueOnce(downloadBlob)

    render(<ModuleAttachmentModal {...defaultProps} />)
    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    await act(async () => {
      fireEvent.click(await screen.findByText('EyeOutlined'))
    })
    await waitFor(() => {
      expect(mocks.getAttachmentBlob).toHaveBeenCalledWith(
        'https://cdn.example.com/preview',
      )
      expect(screen.getByTestId('preview-group')).toHaveAttribute(
        'data-visible',
        'true',
      )
    })

    await act(async () => {
      fireEvent.click(screen.getByText('DownloadOutlined'))
    })
    await waitFor(() => {
      expect(mocks.getAttachmentBlob).toHaveBeenCalledWith(
        'https://cdn.example.com/download',
      )
      expect(mocks.downloadBlob).toHaveBeenCalledWith(
        downloadBlob,
        'attachment',
      )
    })
  })

  it('shows fallback warnings and errors for preview, download, upload, and delete failures', async () => {
    mocks.getAttachmentBindings.mockResolvedValue({
      data: {
        attachments: [
          attachment({
            id: 'img-1',
            originalFileName: 'photo.png',
            previewUrl: 'https://cdn.example.com/preview',
          }),
          attachment({
            contentType: 'application/pdf',
            downloadUrl: '',
            id: 'pdf-1',
            originalFileName: 'contract.pdf',
            previewUrl: '',
          }),
        ],
      },
    })
    mocks.resolveAttachmentAccessUrl.mockRejectedValueOnce('download failed')
    mocks.uploadAttachment.mockRejectedValueOnce('upload failed')

    render(<ModuleAttachmentModal {...defaultProps} />)
    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    await act(async () => {
      fireEvent.click(screen.getByText('PDF'))
    })
    expect(mocks.message.warning).toHaveBeenCalledWith(
      'modules.attachment.noPreviewUrl',
    )

    await act(async () => {
      fireEvent.click(screen.getAllByText('DownloadOutlined')[0])
    })
    await waitFor(() => {
      expect(mocks.message.error).toHaveBeenCalledWith(
        'modules.attachment.downloadFailed',
      )
    })

    await act(async () => {
      mocks.uploadProps!.beforeUpload(
        new File(['hello'], 'proof.pdf', { type: 'application/pdf' }),
      )
    })
    await waitFor(() => {
      expect(mocks.message.error).toHaveBeenCalledWith(
        'modules.attachment.uploadFailed',
      )
    })

    mocks.updateAttachmentBindings.mockRejectedValueOnce('delete failed')
    await act(async () => {
      fireEvent.click(screen.getAllByText('DeleteOutlined')[0])
    })
    await waitFor(() => {
      expect(mocks.message.error).toHaveBeenCalledWith(
        'modules.attachment.deleteFailed',
      )
    })
  })

  it('shows thrown error messages for preview and pdf preview failures', async () => {
    mocks.getAttachmentBindings.mockResolvedValue({
      data: {
        attachments: [
          attachment({
            id: 'img-1',
            originalFileName: 'photo.png',
            previewUrl: 'https://cdn.example.com/preview',
          }),
          attachment({
            contentType: 'application/pdf',
            id: 'pdf-1',
            originalFileName: 'contract.pdf',
            previewUrl: 'https://cdn.example.com/contract.pdf',
          }),
        ],
      },
    })
    mocks.resolveAttachmentAccessUrl.mockRejectedValueOnce(
      new window.Error('preview exploded'),
    )
    mocks.getPresignedAttachmentBlob.mockRejectedValueOnce(
      new window.Error('pdf exploded'),
    )

    render(<ModuleAttachmentModal {...defaultProps} />)
    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    await act(async () => {
      fireEvent.click((await screen.findAllByText('EyeOutlined'))[0])
    })
    await waitFor(() => {
      expect(mocks.message.error).toHaveBeenCalledWith('preview exploded')
    })

    await act(async () => {
      fireEvent.click(screen.getByText('PDF'))
    })
    await waitFor(() => {
      expect(mocks.message.error).toHaveBeenCalledWith('pdf exploded')
    })
  })

  it('cleans preview urls when preview layers close or the modal closes', async () => {
    mocks.getAttachmentBindings.mockResolvedValue({
      data: {
        attachments: [
          attachment({
            downloadUrl:
              '/api/attachments/img-1/download?accessKey=img-key&moduleKey=test-module',
            id: 'img-1',
            originalFileName: 'photo.png',
            previewUrl:
              '/api/attachments/img-1/preview?accessKey=img-key&moduleKey=test-module',
          }),
          attachment({
            contentType: 'application/pdf',
            id: 'pdf-1',
            originalFileName: 'contract.pdf',
            previewUrl: 'https://cdn.example.com/contract.pdf',
          }),
        ],
      },
    })
    mocks.resolveAttachmentAccessUrl.mockImplementation(
      async (url: string, _moduleKey: string, inline: boolean) => ({
        inline,
        presigned: true,
        url: `https://cdn.example.com${url}`,
      }),
    )
    const { rerender } = render(<ModuleAttachmentModal {...defaultProps} />)
    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    await act(async () => {
      fireEvent.click((await screen.findAllByText('EyeOutlined'))[0])
    })
    await waitFor(() => {
      expect(screen.getByTestId('preview-group')).toBeTruthy()
    })
    await act(async () => {
      fireEvent.doubleClick(screen.getByTestId('preview-group'))
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId('preview-group'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('PDF'))
    })
    await waitFor(() => {
      expect(screen.getByTitle('PDF Preview')).toBeTruthy()
    })
    await act(async () => {
      mocks.pdfModalProps!.onCancel()
    })
    expect(screen.queryByTitle('PDF Preview')).toBeNull()

    rerender(<ModuleAttachmentModal {...defaultProps} open={false} />)
    await act(async () => {
      mocks.modalProps!.afterOpenChange(false)
    })
    await waitFor(() => {
      expect(mocks.revokeObjectURL).toHaveBeenCalledWith(
        'https://blob.example.test/attachment-preview',
      )
    })
  })

  it('uses download url as inline preview fallback when preview url is missing', async () => {
    mocks.getAttachmentBindings.mockResolvedValue({
      data: {
        attachments: [
          attachment({
            downloadUrl: 'https://cdn.example.com/image-download',
            id: 'img-1',
            originalFileName: 'photo.png',
            previewUrl: '',
          }),
        ],
      },
    })

    render(<ModuleAttachmentModal {...defaultProps} />)
    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    await act(async () => {
      fireEvent.click(await screen.findByText('EyeOutlined'))
    })

    await waitFor(() => {
      expect(mocks.resolveAttachmentAccessUrl).toHaveBeenCalledWith(
        'https://cdn.example.com/image-download',
        'test-module',
        true,
      )
    })
  })

  it('uploads pasted files only when paste happens inside the upload zone', async () => {
    render(<ModuleAttachmentModal {...defaultProps} />)
    const file = new File(['hello'], 'pasted.png', { type: 'image/png' })
    const preventDefault = vi.fn()

    const outsidePaste = new Event('paste', {
      bubbles: true,
      cancelable: true,
    }) as ClipboardEvent
    Object.defineProperty(outsidePaste, 'clipboardData', {
      value: {
        items: [
          {
            getAsFile: () => file,
          },
        ],
      },
    })
    Object.defineProperty(outsidePaste, 'target', {
      value: document.body,
    })
    Object.defineProperty(outsidePaste, 'preventDefault', {
      value: preventDefault,
    })
    window.dispatchEvent(outsidePaste)

    expect(preventDefault).not.toHaveBeenCalled()
    expect(mocks.uploadAttachment).not.toHaveBeenCalled()

    const noClipboardDataPaste = new Event('paste', {
      bubbles: true,
      cancelable: true,
    }) as ClipboardEvent
    Object.defineProperty(noClipboardDataPaste, 'target', {
      value: screen.getByTestId('upload'),
    })
    window.dispatchEvent(noClipboardDataPaste)

    expect(mocks.uploadAttachment).not.toHaveBeenCalled()

    const insidePaste = new Event('paste', {
      bubbles: true,
      cancelable: true,
    }) as ClipboardEvent
    Object.defineProperty(insidePaste, 'clipboardData', {
      value: {
        items: [
          {
            getAsFile: () => file,
          },
          {
            getAsFile: () => null,
          },
        ],
      },
    })
    Object.defineProperty(insidePaste, 'target', {
      value: screen.getByTestId('upload'),
    })
    Object.defineProperty(insidePaste, 'preventDefault', {
      value: preventDefault,
    })

    await act(async () => {
      window.dispatchEvent(insidePaste)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(preventDefault).toHaveBeenCalled()
      expect(mocks.uploadAttachment).toHaveBeenCalledWith(
        file,
        'test-module',
        'PAGE_UPLOAD',
        expect.objectContaining({ onProgress: expect.any(Function) }),
      )
    })
  })

  it('ignores paste events without permission or files', async () => {
    mocks.can.mockImplementation(
      (_resource: string, action: string) => action !== 'update',
    )
    render(<ModuleAttachmentModal {...defaultProps} />)
    const preventDefault = vi.fn()
    const paste = new Event('paste', {
      bubbles: true,
      cancelable: true,
    }) as ClipboardEvent
    Object.defineProperty(paste, 'clipboardData', {
      value: {
        items: [
          {
            getAsFile: () => null,
          },
        ],
      },
    })
    Object.defineProperty(paste, 'target', {
      value: screen.getByText('modules.attachment.noPermissionHint'),
    })
    Object.defineProperty(paste, 'preventDefault', {
      value: preventDefault,
    })

    window.dispatchEvent(paste)

    expect(preventDefault).not.toHaveBeenCalled()
    expect(mocks.uploadAttachment).not.toHaveBeenCalled()
  })

  it('does not fetch when an empty-record modal reports opened', async () => {
    render(<ModuleAttachmentModal {...defaultProps} recordId="" />)

    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    expect(mocks.getAttachmentBindings).not.toHaveBeenCalled()
  })

  it('ignores fetch failures and hidden after-open callbacks', async () => {
    mocks.getAttachmentBindings.mockRejectedValueOnce(new Error('load failed'))
    render(<ModuleAttachmentModal {...defaultProps} />)

    await act(async () => {
      mocks.modalProps!.afterOpenChange(false)
      mocks.modalProps!.afterOpenChange(true)
    })

    expect(screen.getByText('modules.attachment.noAttachments')).toBeTruthy()
  })
})

function attachment(overrides: Record<string, unknown> = {}) {
  return {
    contentType: 'image/png',
    downloadUrl: 'https://cdn.example.com/file',
    fileName: 'file.png',
    fileSize: 2048,
    id: 'file-1',
    name: 'file.png',
    originalFileName: 'file.png',
    previewType: undefined,
    previewUrl: 'https://cdn.example.com/preview',
    uploadTime: '2026-01-01 10:00:00',
    ...overrides,
  }
}
