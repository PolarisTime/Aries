// @vitest-environment jsdom

import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { bindAntdAppApi } from '@/utils/antd-app'
import {
  BATCH_FAILURE_LINES,
  showBatchFailureNotification,
} from './batch-failure-notification'

/**
 * 批量失败提示的契约：**卡片式通知 + 逐条失败清单**。
 *
 * <p>回归的真实缺陷：批量审核/删除失败时只弹一句 toast「失败 N 条；首条错误…」，
 * 其余失败记录的原因直接丢失，用户只能一条条重试去猜。卡片要列出失败单据号与原因，
 * 并且比 toast 停得久（能读完、能手动关）。</p>
 *
 * <p>两个失败出口（业务单据批量操作、主数据批量删除）共用本函数，形状只在这里钉一次。</p>
 */
describe('showBatchFailureNotification', () => {
  const warningMock = vi.fn()

  beforeEach(() => {
    warningMock.mockReset()
    bindAntdAppApi({
      notification: {
        open: vi.fn(),
        success: vi.fn(),
        info: vi.fn(),
        warning: warningMock,
        error: vi.fn(),
        destroy: vi.fn(),
      },
      message: {
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
        info: vi.fn(),
        loading: vi.fn(),
        destroy: vi.fn(),
      },
      modal: { confirm: vi.fn() },
    } as never)
  })

  const failures = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      no: `SO-${index + 1}`,
      reason: `原因${index + 1}`,
    }))

  /** 读出上一条警告的入参，并把 description 渲染成纯文本，便于断言清单内容。 */
  function readLastNotice() {
    const options = warningMock.mock.calls.at(-1)?.[0] as {
      message: string
      duration?: number
      description: ReactElement
    }
    const html = renderToStaticMarkup(options.description)
    const text = html.replace(/<[^>]+>/g, '\n')
    return { options, lines: text.split('\n').filter(Boolean) }
  }

  it('标题只放统计，比 toast 停得更久', () => {
    showBatchFailureNotification({
      title: '审核完成：成功 3 条，失败 2 条',
      failures: failures(2),
    })

    expect(warningMock).toHaveBeenCalledTimes(1)
    const { options } = readLastNotice()
    expect(options.message).toBe('审核完成：成功 3 条，失败 2 条')
    // 缺省 8 秒：够读完清单，也和「点完即走」的 toast 区分开
    expect(options.duration).toBe(8)
  })

  it('逐条列出失败单据号与原因', () => {
    showBatchFailureNotification({
      title: '批量删除完成：成功 0 条，失败 2 条',
      failures: [
        { no: 'SO-1', reason: '被出库单引用' },
        { no: 'SO-2', reason: '已审核，不可删除' },
      ],
    })

    const { lines } = readLastNotice()
    expect(lines.some((text) => text.includes('SO-1：被出库单引用'))).toBe(true)
    expect(lines.some((text) => text.includes('SO-2：已审核，不可删除'))).toBe(
      true,
    )
  })

  it('失败行超过上限时只列前 N 条，其余用「另有」收口', () => {
    const total = BATCH_FAILURE_LINES + 2
    showBatchFailureNotification({
      title: '审核完成：成功 0 条，失败 7 条',
      failures: failures(total),
    })

    const { lines } = readLastNotice()
    for (let index = 1; index <= BATCH_FAILURE_LINES; index += 1) {
      expect(
        lines.some((text) => text.includes(`SO-${index}：原因${index}`)),
      ).toBe(true)
    }
    // 超出的失败不逐条列（否则卡片被撑爆），只给一句合计
    expect(lines.some((text) => text.includes(`SO-${total}`))).toBe(false)
    expect(lines.some((text) => text.includes(`另有 2 条失败`))).toBe(true)
  })
})
