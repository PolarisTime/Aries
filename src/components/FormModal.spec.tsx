import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FormModal } from './FormModal'

describe('FormModal', () => {
  const defaultProps = {
    title: '编辑表单',
    open: true,
    onClose: vi.fn(),
  }

  it('renders modal with title and children', () => {
    render(
      <FormModal {...defaultProps}>
        <input placeholder="name" />
      </FormModal>,
    )
    expect(screen.getByText('编辑表单')).toBeTruthy()
    expect(screen.getByPlaceholderText('name')).toBeTruthy()
  })

  it('calls onClose when cancel button clicked', () => {
    const onClose = vi.fn()
    render(
      <FormModal {...defaultProps} onClose={onClose}>
        content
      </FormModal>,
    )
    fireEvent.click(screen.getByText('common.cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onSave when ok button clicked', () => {
    const onSave = vi.fn()
    render(
      <FormModal {...defaultProps} onSave={onSave}>
        content
      </FormModal>,
    )
    fireEvent.click(screen.getByText('common.save'))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('shows confirm loading state', () => {
    render(
      <FormModal {...defaultProps} confirmLoading onSave={vi.fn()}>
        content
      </FormModal>,
    )
    expect(screen.getByText('common.save')).toBeTruthy()
  })

  it('renders with forceRender when open is false', () => {
    render(
      <FormModal {...defaultProps} open={false}>
        content
      </FormModal>,
    )
    expect(screen.getByText('编辑表单')).toBeTruthy()
  })

  it('renders with custom width', () => {
    render(
      <FormModal {...defaultProps} width={800}>
        content
      </FormModal>,
    )
    expect(screen.getByText('编辑表单')).toBeTruthy()
  })

  it('renders custom footer', () => {
    render(
      <FormModal {...defaultProps} footer={<span>custom footer</span>}>
        content
      </FormModal>,
    )
    expect(screen.getByText('custom footer')).toBeTruthy()
  })

  it('renders with custom okText and cancelText', () => {
    render(
      <FormModal
        {...defaultProps}
        okText="确认保存"
        cancelText="取消编辑"
        onSave={vi.fn()}
      >
        content
      </FormModal>,
    )
    expect(screen.getByText('确认保存')).toBeTruthy()
    expect(screen.getByText('取消编辑')).toBeTruthy()
  })

  it('adds danger prop to ok button', () => {
    render(
      <FormModal {...defaultProps} danger onSave={vi.fn()}>
        content
      </FormModal>,
    )
    expect(screen.getByText('common.save')).toBeTruthy()
  })
})
