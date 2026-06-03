import type { FormInstance } from 'antd/es/form'
import { describe, expect, it, vi } from 'vitest'
import { getFormString, validateForm } from './antd-form'

function createMockForm(
  overrides: Partial<{
    getFieldValue: (field: string) => unknown
    validateFields: (fields?: string[]) => Promise<unknown>
    setFieldsValue: (values: unknown) => void
  }> = {},
): FormInstance<Record<string, unknown>> {
  return {
    getFieldValue: vi.fn(),
    validateFields: vi.fn(),
    setFieldsValue: vi.fn(),
    ...overrides,
  } as unknown as FormInstance<Record<string, unknown>>
}

describe('getFormString', () => {
  it('returns string value when field value is string', () => {
    const form = createMockForm({
      getFieldValue: vi.fn().mockReturnValue('hello'),
    })
    const result = getFormString(form, 'name')
    expect(result).toBe('hello')
  })

  it('returns empty string when field value is not string', () => {
    const form = createMockForm({
      getFieldValue: vi.fn().mockReturnValue(123),
    })
    const result = getFormString(form, 'age')
    expect(result).toBe('')
  })

  it('returns empty string when field value is null', () => {
    const form = createMockForm({
      getFieldValue: vi.fn().mockReturnValue(null),
    })
    const result = getFormString(form, 'name')
    expect(result).toBe('')
  })

  it('returns empty string when field value is undefined', () => {
    const form = createMockForm({
      getFieldValue: vi.fn().mockReturnValue(undefined),
    })
    const result = getFormString(form, 'name')
    expect(result).toBe('')
  })

  it('returns empty string when field value is boolean', () => {
    const form = createMockForm({
      getFieldValue: vi.fn().mockReturnValue(true),
    })
    const result = getFormString(form, 'active')
    expect(result).toBe('')
  })

  it('calls getFieldValue with correct field name', () => {
    const getFieldValue = vi.fn().mockReturnValue('')
    const form = createMockForm({ getFieldValue })
    getFormString(form, 'email')
    expect(getFieldValue).toHaveBeenCalledWith('email')
  })
})

describe('validateForm', () => {
  it('validates all fields when no specific fields provided', async () => {
    const formData = { name: 'test', email: 'test@example.com' }
    const form = createMockForm({
      validateFields: vi.fn().mockResolvedValue(formData),
    })
    const result = await validateForm(form)
    expect(result).toEqual(formData)
    expect(form.validateFields).toHaveBeenCalledWith()
  })

  it('validates specific fields when provided', async () => {
    const partialData = { name: 'test' }
    const form = createMockForm({
      validateFields: vi.fn().mockResolvedValue(partialData),
    })
    const result = await validateForm(form, ['name'])
    expect(result).toEqual(partialData)
    expect(form.validateFields).toHaveBeenCalledWith(['name'])
  })

  it('returns full type after validation', async () => {
    interface TestForm {
      name: string
      age: number
    }
    const formData = { name: 'test', age: 25 }
    const form = createMockForm({
      validateFields: vi.fn().mockResolvedValue(formData),
    }) as unknown as FormInstance<TestForm>
    const result = await validateForm<TestForm>(form)
    expect(result.name).toBe('test')
    expect(result.age).toBe(25)
  })

  it('throws when validation fails', async () => {
    const form = createMockForm({
      validateFields: vi.fn().mockRejectedValue(new Error('Validation failed')),
    })
    await expect(validateForm(form)).rejects.toThrow('Validation failed')
  })

  it('handles empty fields array', async () => {
    const formData = { name: 'test' }
    const form = createMockForm({
      validateFields: vi.fn().mockResolvedValue(formData),
    })
    const result = await validateForm(form, [])
    expect(result).toEqual(formData)
    expect(form.validateFields).toHaveBeenCalledWith([])
  })
})
