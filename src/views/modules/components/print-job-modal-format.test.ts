import { describe, expect, it } from 'vitest'
import {
  formattedTotal,
  numericTotal,
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

/**
 * 打印作业的合计口径：件数/重量必须走十进制累加与 HALF_UP 格式化。
 *
 * <p>原先 `reduce((sum, v) => sum + Number(v))` 会把 0.1 + 0.2 累成
 * 0.30000000000000004；`toFixed` 则按 IEEE-754 真实值舍入，9.995 会显示成 9.99。</p>
 */
describe('合计的十进制口径', () => {
  it('合计重量按十进制精确累加', () => {
    expect(numericTotal([0.1, 0.2])).toBe(0.3)
    expect(numericTotal(['0.1', '0.2'])).toBe(0.3)
    expect(numericTotal([0, 0])).toBeNull()
  })

  it('合计值按 HALF_UP 展示，不随 IEEE-754 舍入', () => {
    expect(formattedTotal(2.675, 2)).toBe('2.68')
    expect(formattedTotal(9.995, 2)).toBe('10')
    expect(formattedTotal(100, 0)).toBe('100')
    expect(formattedTotal(null)).toBe('-')
  })
})
