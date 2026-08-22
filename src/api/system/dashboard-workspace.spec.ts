import { describe, expect, it } from 'vitest'
import {
  DASHBOARD_METRIC_TARGETS,
  fetchDashboardNotices,
  fetchDashboardPendingMetrics,
  fetchDashboardTodoItems,
} from '@/api/system/dashboard-workspace'
import { EMPTY_TODO_ITEMS } from '@/api/system/dashboard-workspace-fixtures'

describe('工作台 mock 契约', () => {
  it('指标卡 fixtures 通过 schema 且覆盖四个指标键', async () => {
    const metrics = await fetchDashboardPendingMetrics()
    expect(metrics.map((metric) => metric.key)).toEqual([
      'purchase-audit',
      'outbound-task',
      'receivable',
      'stock-alert',
    ])
    for (const metric of metrics) {
      expect(Number.isFinite(metric.count)).toBe(true)
      expect(metric.count).toBeGreaterThanOrEqual(0)
      if (metric.amount !== null) {
        expect(Number.isFinite(metric.amount)).toBe(true)
      }
    }
  })

  it('待办清单：雪花 ID 一律为正整数字符串且不超 Long 范围', async () => {
    const items = await fetchDashboardTodoItems('all')
    expect(items.length).toBeGreaterThan(0)
    for (const item of items) {
      expect(typeof item.id).toBe('string')
      expect(item.id).toMatch(/^[1-9]\d*$/)
      expect(BigInt(item.id) <= BigInt('9223372036854775807')).toBe(true)
      // 极端值：超长单据号不丢字段
      expect(item.docNo.length).toBeGreaterThan(0)
    }
  })

  it('待办按类目过滤；all 返回全量', async () => {
    const all = await fetchDashboardTodoItems('all')
    const purchase = await fetchDashboardTodoItems('purchase-audit')
    expect(purchase.every((item) => item.category === 'purchase-audit')).toBe(
      true,
    )
    expect(purchase.length).toBeLessThan(all.length)
    expect(EMPTY_TODO_ITEMS).toHaveLength(0)
  })

  it('公告 fixtures 通过 schema：level 合法、内容非空', async () => {
    const notices = await fetchDashboardNotices()
    expect(notices.length).toBeGreaterThan(0)
    for (const notice of notices) {
      expect(['info', 'warn', 'critical']).toContain(notice.level)
      expect(notice.title.length).toBeGreaterThan(0)
      expect(notice.content.length).toBeGreaterThan(0)
    }
  })

  it('指标卡跳转目标均为已注册页面路径', () => {
    for (const target of Object.values(DASHBOARD_METRIC_TARGETS)) {
      expect(target.pathname).toMatch(/^\/[a-z-]+$/)
    }
  })
})
