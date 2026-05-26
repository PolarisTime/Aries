import { ReloadOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Button from 'antd/es/button'
import Typography from 'antd/es/typography'
import { getDatabaseStatus } from '@/api/database-admin'
import { QUERY_KEYS } from '@/constants/query-keys'
import { usePermissionStore } from '@/stores/permissionStore'
import { DatabaseMonitoringPanel } from '@/views/system/DatabaseMonitoringPanel'
import { DatabaseStatusOverview } from '@/views/system/DatabaseStatusOverview'

export function DatabaseBackupView() {
  const queryClient = useQueryClient()
  const permissionStore = usePermissionStore()
  const canViewMonitoring = permissionStore.can('database', 'read')

  const { data: dbStatus, isLoading: statusLoading } = useQuery({
    queryKey: QUERY_KEYS.databaseStatus,
    queryFn: getDatabaseStatus,
  })

  const refreshStatus = () =>
    void queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.databaseStatus,
    })

  return (
    <div className="page-stack database-status-page">
      <div className="database-status-header">
        <div>
          <Typography.Title level={4} className="database-status-title">
            数据库运行状态
          </Typography.Title>
          <Typography.Text type="secondary">
            PostgreSQL 与 Redis 服务健康、容量和性能指标
          </Typography.Text>
        </div>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          loading={statusLoading}
          onClick={refreshStatus}
        >
          刷新状态
        </Button>
      </div>

      <DatabaseStatusOverview dbStatus={dbStatus} loading={statusLoading} />

      <DatabaseMonitoringPanel visible={canViewMonitoring} />
    </div>
  )
}
