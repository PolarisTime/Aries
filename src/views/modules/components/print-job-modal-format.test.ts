import { describe, expect, it } from 'vitest'
import {
  projectSummary,
  recordProjectId,
} from '@/views/modules/components/print-job-modal-format'

describe('recordProjectId', () => {
  it('返回记录的项目 id', () => {
    expect(recordProjectId({ id: '1', projectId: '9001' })).toBe('9001')
  })

  it('无项目或空白返回空串', () => {
    expect(recordProjectId({ id: '1' })).toBe('')
    expect(recordProjectId({ id: '1', projectId: '   ' })).toBe('')
    expect(recordProjectId(undefined)).toBe('')
  })
})

/**
 * 打印中心的项目摘要与四条业务列表的项目列共用同一个格式化出口
 * (`utils/project-display`), 这里只锁"确实走同一口径", 具体格式由该模块自己的单测覆盖。
 */
describe('projectSummary', () => {
  it('有简称时显示「简称（全称）」', () => {
    expect(
      projectSummary({
        id: '1',
        projectNameAbbr: '东钢',
        projectName: '广东东钢供应链有限公司',
      }),
    ).toBe('东钢（广东东钢供应链有限公司）')
  })

  it('无简称时只显示全称', () => {
    expect(
      projectSummary({ id: '1', projectName: '广东东钢供应链有限公司' }),
    ).toBe('广东东钢供应链有限公司')
  })

  it('无记录或无项目时返回空串（打印模板里不显示占位符）', () => {
    expect(projectSummary(undefined)).toBe('')
    expect(projectSummary({ id: '1' })).toBe('')
  })
})
