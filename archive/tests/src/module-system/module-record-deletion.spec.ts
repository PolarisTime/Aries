import { describe, expect, it } from 'vitest'
import {
  getDisplayStatus,
  isDeletedModuleRecord,
} from './module-record-deletion'

describe('module-record-deletion', () => {
  describe('isDeletedModuleRecord', () => {
    it.each([
      ['deletedFlag', { id: '1', deletedFlag: true }],
      ['deleteFlag', { id: '1', deleteFlag: true }],
      ['deleted_flag', { id: '1', deleted_flag: true }],
    ])('treats %s strict true as deleted', (_label, record) => {
      expect(isDeletedModuleRecord(record)).toBe(true)
    })

    it.each([
      ['missing flag', { id: '1' }],
      ['deletedFlag false', { id: '1', deletedFlag: false }],
      ['deleteFlag number', { id: '1', deleteFlag: 1 }],
      ['deleted_flag string', { id: '1', deleted_flag: 'true' }],
      ['null record', null],
    ])('does not treat %s as deleted', (_label, record) => {
      expect(isDeletedModuleRecord(record)).toBe(false)
    })
  })

  describe('getDisplayStatus', () => {
    it('returns 已删除 when the record is marked deleted', () => {
      expect(
        getDisplayStatus({ id: '1', status: '已审核', deletedFlag: true }),
      ).toBe('已删除')
    })

    it('returns the original status string when the record is not deleted', () => {
      expect(getDisplayStatus({ id: '1', status: '已审核' })).toBe('已审核')
    })

    it('reads status from a custom status key', () => {
      expect(
        getDisplayStatus({ id: '1', auditStatus: '待审核' }, 'auditStatus'),
      ).toBe('待审核')
    })

    it('normalizes non-string statuses to strings', () => {
      expect(getDisplayStatus({ id: '1', status: 404 })).toBe('404')
    })
  })
})
