import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('antd/es/button', () => ({
  default: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

vi.mock('antd/es/space', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('@ant-design/icons', () => ({
  AuditOutlined: () => <span>AuditOutlined</span>,
  CloseOutlined: () => <span>CloseOutlined</span>,
  SaveOutlined: () => <span>SaveOutlined</span>,
}))

import { EditorFooterActions } from '@/views/modules/components/EditorFooterActions'

describe('EditorFooterActions', () => {
  const defaultProps = {
    canSave: true,
    canAudit: true,
    saving: false,
    onCancel: vi.fn(),
    onSave: vi.fn(),
  }

  it('renders cancel button', () => {
    render(<EditorFooterActions {...defaultProps} />)
    expect(screen.getByText('modules.editorFooter.cancel')).toBeTruthy()
  })

  it('renders save button when canSave is true', () => {
    render(<EditorFooterActions {...defaultProps} />)
    expect(screen.getByText('modules.editorFooter.save')).toBeTruthy()
  })

  it('hides save button when canSave is false', () => {
    render(<EditorFooterActions {...defaultProps} canSave={false} />)
    expect(screen.queryByText('modules.editorFooter.save')).toBeNull()
  })

  it('renders audit button when canAudit is true', () => {
    render(<EditorFooterActions {...defaultProps} />)
    expect(screen.getByText('modules.editorFooter.saveAndAudit')).toBeTruthy()
  })

  it('hides audit button when canAudit is false', () => {
    render(<EditorFooterActions {...defaultProps} canAudit={false} />)
    expect(screen.queryByText('modules.editorFooter.saveAndAudit')).toBeNull()
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(<EditorFooterActions {...defaultProps} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('modules.editorFooter.cancel'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('calls onSave(false) when save button is clicked', () => {
    const onSave = vi.fn()
    render(<EditorFooterActions {...defaultProps} onSave={onSave} />)
    fireEvent.click(screen.getByText('modules.editorFooter.save'))
    expect(onSave).toHaveBeenCalledWith(false)
  })

  it('calls onSave(true) when audit button is clicked', () => {
    const onSave = vi.fn()
    render(<EditorFooterActions {...defaultProps} onSave={onSave} />)
    fireEvent.click(screen.getByText('modules.editorFooter.saveAndAudit'))
    expect(onSave).toHaveBeenCalledWith(true)
  })
})
