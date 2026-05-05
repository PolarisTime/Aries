import { Card, Statistic, Row, Col } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import { appTitle } from '@/utils/env'

interface DashboardSummary {
  totalCustomers?: number
  totalSuppliers?: number
  totalMaterials?: number
  pendingOrders?: number
  todayInbounds?: number
  todayOutbounds?: number
}

export function DashboardView() {
  const { data: summary } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      const res = await http.get<ApiResponse<DashboardSummary>>(ENDPOINTS.DASHBOARD_SUMMARY)
      return res.data || {}
    },
    staleTime: 30000,
  })

  return (
    <div className="page-stack flex flex-col gap-[var(--app-page-gap)]">
      <div>
        <h1 className="dashboard-title text-[#262626] text-[calc(var(--app-font-size)+6px)] font-medium">
          {appTitle}
        </h1>
        <p className="dashboard-subtitle mt-1.5 text-[#666]">
          欢迎使用钢材贸易业务中台
        </p>
      </div>

      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} lg={8}>
          <Card className="dashboard-card border-[var(--theme-card-border)]">
            <Statistic title="客户数量" value={summary?.totalCustomers || '--'} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="dashboard-card border-[var(--theme-card-border)]">
            <Statistic title="供应商数量" value={summary?.totalSuppliers || '--'} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="dashboard-card border-[var(--theme-card-border)]">
            <Statistic title="商品种类" value={summary?.totalMaterials || '--'} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="dashboard-card border-[var(--theme-card-border)]">
            <Statistic title="待处理订单" value={summary?.pendingOrders || '--'} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="dashboard-card border-[var(--theme-card-border)]">
            <Statistic title="今日入库" value={summary?.todayInbounds || '--'} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="dashboard-card border-[var(--theme-card-border)]">
            <Statistic title="今日出库" value={summary?.todayOutbounds || '--'} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
