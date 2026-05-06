import { Card, Statistic, Row, Col, Flex, Typography } from 'antd'
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
  const summaryCards = [
    { key: 'customers', title: '客户数量', value: summary?.totalCustomers ?? '--' },
    { key: 'suppliers', title: '供应商数量', value: summary?.totalSuppliers ?? '--' },
    { key: 'materials', title: '商品种类', value: summary?.totalMaterials ?? '--' },
    { key: 'orders', title: '待处理订单', value: summary?.pendingOrders ?? '--' },
    { key: 'inbounds', title: '今日入库', value: summary?.todayInbounds ?? '--' },
    { key: 'outbounds', title: '今日出库', value: summary?.todayOutbounds ?? '--' },
  ]

  return (
    <Flex vertical gap={24} className="page-stack">
      <div>
        <Typography.Title level={3} style={{ marginBottom: 8 }}>
          {appTitle}
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          欢迎使用钢材贸易业务中台
        </Typography.Paragraph>
      </div>

      <Row gutter={[12, 12]}>
        {summaryCards.map((item) => (
          <Col key={item.key} xs={24} sm={12} lg={8}>
            <Card
              className="dashboard-card"
              style={{ borderColor: 'var(--theme-card-border)' }}
            >
              <Statistic title={item.title} value={item.value} />
            </Card>
          </Col>
        ))}
      </Row>
    </Flex>
  )
}
