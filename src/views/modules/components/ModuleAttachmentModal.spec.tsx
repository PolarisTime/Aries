import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  can: vi.fn().mockReturnValue(true),
  getAttachmentBindings: vi
    .fn()
    .mockResolvedValue({ data: { attachments: [] } }),
  message: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
  modalProps: undefined as Record<string, any> | undefined,
  pdfModalProps: undefined as Record<string, any> | undefined,
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

vi.mock('@/utils/formatters', () => ({
  formatDateTime: vi.fn().mockReturnValue('2024-01-01'),
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: vi.fn((value: unknown) => String(value ?? '')),
}))

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
      onClick={() => preview?.onVisibleChange?.(false)}
    >
      {children}
    </div>
  )
  const Image = ({ preview: _preview, ...props }: any) => <img {...props} />
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
    mocks.can.mockReturnValue(true)
    mocks.getAttachmentBindings.mockResolvedValue({ data: { attachments: [] } })
    mocks.modalProps = undefined
    mocks.pdfModalProps = undefined
    mocks.uploadProps = undefined
    mocks.uploadAttachment.mockResolvedValue({ data: { id: '123' } })
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
          }),
          attachment({
            contentType: 'text/plain',
            id: 'txt-1',
            originalFileName: 'readme.txt',
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
    expect(screen.getByText('PDF')).toBeTruthy()
    expect(screen.getByText('PaperClipOutlined')).toBeTruthy()
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
      expect(mocks.uploadAttachment).toHaveBeenCalledWith(file, 'test-module')
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

  it('previews image and pdf attachments and downloads files', async () => {
    mocks.getAttachmentBindings.mockResolvedValue({
      data: {
        attachments: [
          attachment({
            downloadUrl: 'https://cdn.example.com/photo.png',
            id: 'img-1',
            originalFileName: 'photo.png',
            previewUrl: 'https://cdn.example.com/photo-preview.png',
          }),
          attachment({
            contentType: 'application/pdf',
            downloadUrl: 'https://cdn.example.com/contract.pdf',
            id: 'pdf-1',
            originalFileName: 'contract.pdf',
            previewUrl: 'https://cdn.example.com/contract-preview.pdf',
          }),
        ],
      },
    })
    render(<ModuleAttachmentModal {...defaultProps} />)
    await act(async () => {
      mocks.modalProps!.afterOpenChange(true)
    })

    fireEvent.click((await screen.findAllByAltText('photo.png'))[0])
    expect(screen.getByTestId('preview-group')).toHaveAttribute(
      'data-visible',
      'true',
    )

    fireEvent.click(screen.getByText('PDF'))
    expect(
      screen.getByTestId('modal-modules.attachment.pdfPreview'),
    ).toBeTruthy()
    expect(screen.getByTitle('PDF Preview')).toHaveAttribute(
      'src',
      'https://cdn.example.com/contract-preview.pdf',
    )

    fireEvent.click(screen.getAllByText('DownloadOutlined')[0])
    expect(window.open).toHaveBeenCalledWith(
      'https://cdn.example.com/photo.png',
      '_blank',
      'noopener,noreferrer',
    )
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

    fireEvent.click((await screen.findAllByAltText('photo.png'))[0])
    fireEvent.click(screen.getByText('DownloadOutlined'))

    expect(mocks.message.warning).toHaveBeenCalledWith(
      'modules.attachment.noPreviewUrl',
    )
    expect(mocks.message.warning).toHaveBeenCalledWith(
      'modules.attachment.noDownloadUrl',
    )
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
