import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useModuleDisplaySupport } from './useModuleDisplaySupport'

describe('useModuleDisplaySupport', () => {
  it('returns dash for null/undefined values', () => {
    const { result } = renderHook(() => useModuleDisplaySupport())
    expect(result.current.formatCellValue(null)).toBe('--')
    expect(result.current.formatCellValue(undefined)).toBe('--')
  })

  it('formats amount/number with zh-CN locale', () => {
    const { result } = renderHook(() => useModuleDisplaySupport())
    const formatted = result.current.formatCellValue(1234567.89, 'amount')
    expect(formatted).toContain('1,234,567.89')
  })

  it('formats weight with 3 decimal places', () => {
    const { result } = renderHook(() => useModuleDisplaySupport())
    const formatted = result.current.formatCellValue(1234.5678, 'weight')
    expect(formatted).toContain('1,234.568')
  })

  it('formats integer/count with zh-CN locale', () => {
    const { result } = renderHook(() => useModuleDisplaySupport())
    const formatted = result.current.formatCellValue(10000, 'integer')
    expect(formatted).toBe('10,000')
  })

  it('formats count with zh-CN locale', () => {
    const { result } = renderHook(() => useModuleDisplaySupport())
    const formatted = result.current.formatCellValue(5000000, 'count')
    expect(formatted).toBe('5,000,000')
  })

  it('formats date values', () => {
    const { result } = renderHook(() => useModuleDisplaySupport())
    const formatted = result.current.formatCellValue('2024-06-15', 'date')
    expect(formatted).toBe('2024-06-15')
  })

  it('formats datetime values', () => {
    const { result } = renderHook(() => useModuleDisplaySupport())
    const formatted = result.current.formatCellValue(
      '2024-06-15 10:30:00',
      'datetime',
    )
    expect(formatted).toBe('2024-06-15 10:30:00')
  })

  it('formats boolean true', () => {
    const { result } = renderHook(() => useModuleDisplaySupport())
    const formatted = result.current.formatCellValue(true, 'boolean')
    expect(formatted).toBe('hooks.displaySupport.yes')
  })

  it('formats boolean false', () => {
    const { result } = renderHook(() => useModuleDisplaySupport())
    const formatted = result.current.formatCellValue(false, 'boolean')
    expect(formatted).toBe('hooks.displaySupport.no')
  })

  it('returns asString for unknown column type', () => {
    const { result } = renderHook(() => useModuleDisplaySupport())
    expect(result.current.formatCellValue('hello', 'unknown')).toBe('hello')
    expect(result.current.formatCellValue(42, 'unknown')).toBe('42')
  })

  it('handles NaN for number type', () => {
    const { result } = renderHook(() => useModuleDisplaySupport())
    const formatted = result.current.formatCellValue(NaN, 'amount')
    expect(formatted).toBeDefined()
  })

  it('formats number type same as amount', () => {
    const { result } = renderHook(() => useModuleDisplaySupport())
    const formatted = result.current.formatCellValue(1234.56, 'number')
    expect(formatted).toContain('1,234.56')
  })

  it('handles NaN for weight type', () => {
    const { result } = renderHook(() => useModuleDisplaySupport())
    const formatted = result.current.formatCellValue(NaN, 'weight')
    expect(formatted).toBeDefined()
  })

  it('handles NaN for count type', () => {
    const { result } = renderHook(() => useModuleDisplaySupport())
    const formatted = result.current.formatCellValue(NaN, 'count')
    expect(formatted).toBeDefined()
  })

  it('handles NaN for integer type', () => {
    const { result } = renderHook(() => useModuleDisplaySupport())
    const formatted = result.current.formatCellValue(NaN, 'integer')
    expect(formatted).toBeDefined()
  })

  it('returns string value for default type', () => {
    const { result } = renderHook(() => useModuleDisplaySupport())
    expect(result.current.formatCellValue('test')).toBe('test')
    expect(result.current.formatCellValue(123)).toBe('123')
  })
})
