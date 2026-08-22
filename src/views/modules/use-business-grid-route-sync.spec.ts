import { describe, expect, it } from 'vitest'
import type { ModulePageConfig } from '@/types/module-page'
import {
  parseRouteParams,
  supportsFilterField,
} from '@/views/modules/use-business-grid-route-sync'

describe('parseRouteParams', () => {
  it('解析详情深链参数', () => {
    const params = parseRouteParams('?docNo=PO-001&openDetail=1')
    expect(params.docNo).toBe('PO-001')
    expect(params.shouldOpenDetail).toBe(true)
    expect(params.routeKeyword).toBe('PO-001')
  })

  it('解析 trackId 与来源模块', () => {
    const params = parseRouteParams(
      '?trackId=1983421000000000001&sourceModule=material&sourceRecordId=100&openDetail=1',
    )
    expect(params.trackId).toBe('1983421000000000001')
    expect(params.sourceModule).toBe('material')
    expect(params.sourceRecordId).toBe('100')
  })

  it('解析待处理筛选意图 status', () => {
    const params = parseRouteParams('?status=待审核')
    expect(params.status).toBe('待审核')
    expect(params.routeKeyword).toBe('')
    expect(params.shouldOpenDetail).toBe(false)
  })

  it('空查询串返回全空值', () => {
    const params = parseRouteParams('')
    expect(params.docNo).toBe('')
    expect(params.trackId).toBe('')
    expect(params.status).toBe('')
    expect(params.shouldOpenDetail).toBe(false)
  })
})

describe('supportsFilterField', () => {
  const configWithStatus = {
    filters: [{ key: 'status' }, { key: 'keyword' }],
  } as unknown as ModulePageConfig

  it('白名单命中返回 true', () => {
    expect(supportsFilterField(configWithStatus, 'status')).toBe(true)
  })

  it('白名单未命中或 config 缺失返回 false', () => {
    expect(supportsFilterField(configWithStatus, 'unknown')).toBe(false)
    expect(supportsFilterField(undefined, 'status')).toBe(false)
  })
})
