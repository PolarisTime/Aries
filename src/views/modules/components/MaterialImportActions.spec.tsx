import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('antd/es/button', () => ({
  default: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('antd/es/space', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/upload', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('@ant-design/icons', () => ({
  DownloadOutlined: () => <span>DownloadOutlined</span>,
  UploadOutlined: () => <span>UploadOutlined</span>,
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
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
})
