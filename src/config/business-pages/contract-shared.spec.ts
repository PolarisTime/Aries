import { describe, expect, it } from 'vitest'
import { contractStatusOptions } from './contract-shared'

describe('contractStatusOptions', () => {
  it('has four contract status options', () => {
    expect(contractStatusOptions).toHaveLength(4)
    expect(contractStatusOptions[0]).toEqual({ label: expect.any(String), value: '草稿' })
    expect(contractStatusOptions[1]).toEqual({ label: expect.any(String), value: '执行中' })
    expect(contractStatusOptions[2]).toEqual({ label: expect.any(String), value: '已签署' })
    expect(contractStatusOptions[3]).toEqual({ label: expect.any(String), value: '已归档' })
  })
})
