import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Alert, Spin } from 'antd'
import { useMemo } from 'react'
import { getDashboardSummary } from '@/api/dashboard'
import { DashboardFlowCard } from '@/views/dashboard/DashboardFlowCard'
import { DashboardInfoPanels } from '@/views/dashboard/DashboardInfoPanels'
import {
  buildDashboardInfoItems,
  buildWorkflowSections,
} from '@/views/dashboard/dashboard-view-utils'
import { useDashboardServerTime } from '@/views/dashboard/useDashboardServerTime'

export function DashboardView() {
  const navigate = useNavigate()
  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
    refetchInterval: 120000,
  })

  const summary = summaryQuery.data
  const animatedServerTime = useDashboardServerTime(summary?.serverTime)
  const workflowSections = useMemo(
    () => buildWorkflowSections(summary),
    [summary],
  )
  const infoItems = useMemo(() => buildDashboardInfoItems(summary), [summary])

  return (
    <div className="page-stack dashboard-root">
      <Spin spinning={summaryQuery.isPending}>
        {summaryQuery.isError ? (
          <Alert
            type="error"
            showIcon
            title="工作台数据加载失败，请刷新页面重试"
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <DashboardInfoPanels
          animatedServerTime={animatedServerTime}
          infoItems={infoItems}
          summary={summary}
        />

        <DashboardFlowCard
          navigate={navigate}
          workflowSections={workflowSections}
        />
      </Spin>
    </div>
  )
}
