import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (opts) return `${key}:${JSON.stringify(opts)}`
      return key
    },
  }),
}))

const mockGetAttachmentBindings = vi
  .fn()
  .mockResolvedValue({ data: { attachments: [] } })
const mockUpdateAttachmentBindings = vi.fn().mockResolvedValue({})
const mockUploadAttachment = vi.fn().mockResolvedValue({ data: { id: '123' } })

vi.mock('@/api/business', () => ({
  getAttachmentBindings: (...args: any[]) => mockGetAttachmentBindings(...args),
  updateAttachmentBindings: (...args: any[]) =>
    mockUpdateAttachmentBindings(...args),
  uploadAttachment: (...args: any[]) => mockUploadAttachment(...args),
}))

vi.mock('@/stores/permissionStore', () => ({
  usePermissionStore: (selector: any) => {
    const state = {
      can: vi.fn().mockReturnValue(true),
    }
    return selector(state)
  },
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('@/utils/formatters', () => ({
  formatDateTime: vi.fn().mockReturnValue('2024-01-01'),
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: vi.fn().mockReturnValue('123'),
}))

vi.mock('antd/es/button', () => ({
  default: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('antd/es/card', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/empty', () => ({
  default: ({ description, ...props }: any) => (
    <div {...props}>{description}</div>
  ),
}))

vi.mock('antd/es/flex', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/image', () => ({
  default: ({ ...props }: any) => <img {...props} />,
  PreviewGroup: ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
}))

vi.mock('antd/es/modal', () => ({
  default: ({ children, title, open, footer, ...props }: any) =>
    open ? (
      <div data-testid="modal" {...props}>
        <div>{title}</div>
        {children}
        {footer}
      </div>
    ) : null,
}))

vi.mock('antd/es/space', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/spin', () => ({
  default: ({ children, ...props }: any) => (
    <div data-testid="spin" {...props}>
      {children}
    </div>
  ),
}))

vi.mock('antd/es/typography', () => ({
  default: {
    Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}))

vi.mock('antd/es/upload', () => ({
  default: ({ children, customRequest, ...props }: any) => {
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
    mockGetAttachmentBindings.mockResolvedValue({ data: { attachments: [] } })
  })

  it('renders modal when open', () => {
    render(<ModuleAttachmentModal {...defaultProps} />)
    expect(screen.getByTestId('modal')).toBeTruthy()
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
    expect(screen.getByTestId('modal')).toBeTruthy()
  })
})
