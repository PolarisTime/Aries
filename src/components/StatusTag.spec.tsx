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
    render(<StatusTag status="unknown" statusMap={statusMap} fallback="未定义" />)
    expect(screen.getByText('未定义')).toBeTruthy()
  })

  it('uses status value when label and text are not set', () => {
    const map = { active: { color: 'blue' } }
    render(<StatusTag status="active" statusMap={map} />)
    expect(screen.getByText('active')).toBeTruthy()
  })
})
