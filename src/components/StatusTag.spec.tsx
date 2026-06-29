import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusTag } from './StatusTag'

describe('StatusTag', () => {
  const statusMap = {
    pending: { color: 'orange', label: '待审核' },
    approved: { color: 'green', label: '已审核' },
    rejected: { color: 'red', text: '已拒绝' },
  }

  it('renders tag with matching label', () => {
    render(<StatusTag status="pending" statusMap={statusMap} />)
    expect(screen.getByText('待审核')).toBeTruthy()
  })

  it('renders with color and label from statusMap', () => {
    render(<StatusTag status="approved" statusMap={statusMap} />)
    const tag = screen.getByText('已审核')
    expect(tag).toBeTruthy()
  })

  it('uses text field when label is not provided', () => {
    render(<StatusTag status="rejected" statusMap={statusMap} />)
    expect(screen.getByText('已拒绝')).toBeTruthy()
  })

  it('falls back to status string when meta is missing', () => {
    render(<StatusTag status="unknown" statusMap={statusMap} />)
    expect(screen.getByText('unknown')).toBeTruthy()
  })

  it('uses fallback text when meta is missing', () => {
    render(
      <StatusTag status="unknown" statusMap={statusMap} fallback="未定义" />,
    )
    expect(screen.getByText('未定义')).toBeTruthy()
  })

  it('uses status value when label and text are not set', () => {
    const map = { active: { color: 'blue' } }
    render(<StatusTag status="active" statusMap={map} />)
    expect(screen.getByText('active')).toBeTruthy()
  })

  it('normalizes status before reading statusMap', () => {
    render(<StatusTag status=" approved " statusMap={statusMap} />)
    expect(screen.getByText('已审核')).toBeTruthy()
  })

  it('uses fallback color for known statuses when meta is missing', () => {
    render(<StatusTag status="已审核" statusMap={{}} />)
    expect(screen.getByText('已审核')).toHaveClass('ant-tag-processing')
    expect(screen.getByText('已审核')).toHaveClass('ant-tag-outlined')
  })

  it('uses light blue tone when statusMap color is default', () => {
    render(
      <StatusTag
        status="草稿"
        statusMap={{ 草稿: { color: 'default', label: '草稿' } }}
      />,
    )
    expect(screen.getByText('草稿')).toHaveClass('ant-tag-blue')
    expect(screen.getByText('草稿')).toHaveClass('ant-tag-outlined')
    expect(screen.getByText('草稿').style.backgroundColor).toBe('transparent')
  })

  it('normalizes legacy error color aliases to light blue tone', () => {
    render(
      <StatusTag
        status="禁用"
        statusMap={{ 禁用: { color: 'red', label: '禁用' } }}
      />,
    )
    expect(screen.getByText('禁用')).toHaveClass('ant-tag-blue')
    expect(screen.getByText('禁用')).toHaveClass('ant-tag-outlined')
  })

  it('uses light blue fallback tone for pending statuses', () => {
    render(<StatusTag status="未审核" statusMap={{}} />)
    expect(screen.getByText('未审核')).toHaveClass('ant-tag-blue')
    expect(screen.getByText('未审核')).toHaveClass('ant-tag-outlined')
  })

  it('uses light blue fallback tone for disabled statuses', () => {
    render(<StatusTag status="已禁用" statusMap={{}} />)
    expect(screen.getByText('已禁用')).toHaveClass('ant-tag-blue')
    expect(screen.getByText('已禁用')).toHaveClass('ant-tag-outlined')
  })

  it('uses geekblue outlined tone for completed statuses', () => {
    render(<StatusTag status="完成采购" statusMap={{}} />)
    expect(screen.getByText('完成采购')).toHaveClass('ant-tag-geekblue')
    expect(screen.getByText('完成采购')).toHaveClass('ant-tag-outlined')
  })

  it('uses geekblue outlined tone for statuses prefixed with 完成', () => {
    render(<StatusTag status="完成付款" statusMap={{}} />)
    expect(screen.getByText('完成付款')).toHaveClass('ant-tag-geekblue')
    expect(screen.getByText('完成付款')).toHaveClass('ant-tag-outlined')
  })

  it('uses geekblue outlined tone when display text is prefixed with 完成', () => {
    render(
      <StatusTag
        status="completed"
        statusMap={{ completed: { color: 'success', label: '完成对账' } }}
      />,
    )
    expect(screen.getByText('完成对账')).toHaveClass('ant-tag-geekblue')
    expect(screen.getByText('完成对账')).toHaveClass('ant-tag-outlined')
  })

  it('keeps blue status tones distinct without filled backgrounds', () => {
    render(
      <>
        <StatusTag status="草稿" statusMap={{}} />
        <StatusTag status="已审核" statusMap={{}} />
        <StatusTag status="完成采购" statusMap={{}} />
      </>,
    )
    const draft = screen.getByText('草稿')
    const audited = screen.getByText('已审核')
    const completed = screen.getByText('完成采购')

    expect(draft.style.backgroundColor).toBe('transparent')
    expect(audited.style.backgroundColor).toBe('transparent')
    expect(completed.style.backgroundColor).toBe('transparent')
    expect(
      new Set([draft.style.color, audited.style.color, completed.style.color])
        .size,
    ).toBe(3)
    expect(
      new Set([
        draft.style.borderColor,
        audited.style.borderColor,
        completed.style.borderColor,
      ]).size,
    ).toBe(3)
    expect(
      new Set([
        draft.style.fontWeight,
        audited.style.fontWeight,
        completed.style.fontWeight,
      ]).size,
    ).toBe(3)
  })

  it('uses dash for blank status', () => {
    render(<StatusTag status="   " statusMap={{}} />)
    expect(screen.getByText('--')).toBeTruthy()
  })

  it('passes className to rendered tag', () => {
    render(
      <StatusTag
        status="pending"
        statusMap={statusMap}
        className="status-tag-extra"
      />,
    )
    expect(screen.getByText('待审核')).toHaveClass('status-tag-extra')
  })
})
