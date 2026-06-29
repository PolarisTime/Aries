import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  downloadMaterialImportTemplate,
  importMaterialFile,
} from '@/api/materials'
import { message } from '@/utils/antd-app'

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  uploadProps: undefined as Record<string, any> | undefined,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('antd', () => ({
  Button: ({ children, icon, loading: _loading, ...props }: any) => (
    <button {...props}>
      {icon}
      {children}
    </button>
  ),
  Space: ({ children, wrap: _wrap, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
  Upload: ({ beforeUpload, children, ...props }: any) => {
    mocks.uploadProps = { beforeUpload, ...props }
    return <div {...props}>{children}</div>
  },
}))

vi.mock('@ant-design/icons', () => ({
  DownloadOutlined: () => <span>DownloadOutlined</span>,
  UploadOutlined: () => <span>UploadOutlined</span>,
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueries,
  }),
}))

vi.mock('@/api/materials', () => ({
  downloadMaterialImportTemplate: vi.fn(),
  importMaterialFile: vi.fn(),
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: {
    masterOptions: { material: ['material'] },
  },
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { MaterialImportActions } from '@/views/modules/components/MaterialImportActions'

describe('MaterialImportActions', () => {
  const defaultProps = {
    canDownloadTemplate: true,
    canImport: true,
    onImported: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.uploadProps = undefined
    vi.mocked(downloadMaterialImportTemplate).mockResolvedValue(undefined)
    vi.mocked(importMaterialFile).mockResolvedValue({
      totalRows: 3,
      successCount: 2,
      createdCount: 1,
      updatedCount: 1,
      failCount: 1,
      errors: [],
    })
  })

  it('renders download template button', () => {
    render(<MaterialImportActions {...defaultProps} />)
    expect(
      screen.getByText('modules.pages.material.downloadTemplate'),
    ).toBeTruthy()
  })

  it('renders import button', () => {
    render(<MaterialImportActions {...defaultProps} />)
    expect(screen.getByText('common.import')).toBeTruthy()
  })

  it('returns null when no permissions', () => {
    const { container } = render(
      <MaterialImportActions
        canDownloadTemplate={false}
        canImport={false}
        onImported={vi.fn()}
      />,
    )
    expect(container.textContent).toBe('')
  })

  it('downloads material template when button is clicked', async () => {
    render(<MaterialImportActions {...defaultProps} />)

    fireEvent.click(screen.getByText('modules.pages.material.downloadTemplate'))

    await waitFor(() => {
      expect(downloadMaterialImportTemplate).toHaveBeenCalled()
    })
  })

  it('shows error when template download fails', async () => {
    vi.mocked(downloadMaterialImportTemplate).mockRejectedValueOnce(
      new Error('下载失败'),
    )
    render(<MaterialImportActions {...defaultProps} />)

    fireEvent.click(screen.getByText('modules.pages.material.downloadTemplate'))

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('下载失败')
    })
  })

  it('imports material file and refreshes caches', async () => {
    const onImported = vi.fn().mockResolvedValue(undefined)
    render(<MaterialImportActions {...defaultProps} onImported={onImported} />)
    const file = new File(['xlsx'], 'materials.xlsx')

    mocks.uploadProps!.beforeUpload(file)

    await waitFor(() => {
      expect(importMaterialFile).toHaveBeenCalledWith(file)
      expect(onImported).toHaveBeenCalled()
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['material'],
      })
      expect(message.success).toHaveBeenCalledWith(
        'modules.pages.material.importSuccessSummary',
      )
    })
  })

  it('shows error when material import fails', async () => {
    vi.mocked(importMaterialFile).mockRejectedValueOnce(new Error('导入失败'))
    render(<MaterialImportActions {...defaultProps} />)

    mocks.uploadProps!.beforeUpload(new File(['xlsx'], 'materials.xlsx'))

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('导入失败')
    })
  })
})
