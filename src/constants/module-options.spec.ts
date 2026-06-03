import { describe, expect, it } from 'vitest'
import {
  enabledStatusValues,
  enabledStatusOptions,
  statementStatusOptions,
  userAccountDataScopeOptions,
  roleDataScopeValues,
  roleTypeValues,
  buildValueOptions,
} from './module-options'

describe('module-options constants', () => {
  describe('enabledStatusValues', () => {
    it('has 正常 and 禁用', () => {
      expect(enabledStatusValues).toEqual(['正常', '禁用'])
    })
  })

  describe('enabledStatusOptions', () => {
    it('creates label-value pairs', () => {
      expect(enabledStatusOptions).toEqual([
        { label: '正常', value: '正常' },
        { label: '禁用', value: '禁用' },
      ])
    })
  })

  describe('statementStatusOptions', () => {
    it('has 待确认 and 已确认', () => {
      expect(statementStatusOptions).toEqual([
        { label: '待确认', value: '待确认' },
        { label: '已确认', value: '已确认' },
      ])
    })
  })

  describe('userAccountDataScopeOptions', () => {
    it('has four options', () => {
      expect(userAccountDataScopeOptions).toHaveLength(4)
    })
  })

  describe('roleDataScopeValues', () => {
    it('equals userAccountDataScopeValues', () => {
      expect(roleDataScopeValues).toEqual(['全部数据', '全部', '本部门', '本人'])
    })
  })

  describe('roleTypeValues', () => {
    it('has four role types', () => {
      expect(roleTypeValues).toEqual(['平台角色', '系统角色', '业务角色', '财务角色'])
    })
  })

  describe('buildValueOptions', () => {
    it('creates option list from values', () => {
      expect(buildValueOptions('草稿', '已审核', '完成入库')).toEqual([
        { label: '草稿', value: '草稿' },
        { label: '已审核', value: '已审核' },
        { label: '完成入库', value: '完成入库' },
      ])
    })

    it('returns empty array when no values', () => {
      expect(buildValueOptions()).toEqual([])
    })
  })
})
