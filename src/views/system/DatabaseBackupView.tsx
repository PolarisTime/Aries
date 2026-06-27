import { ReloadOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { getDatabaseStatus } from '@/api/database-admin'
import { QUERY_KEYS } from '@/constants/query-keys'
import { usePermissionStore } from '@/stores/permissionStore'
import { DatabaseMonitoringPanel } from '@/views/system/DatabaseMonitoringPanel'
import { DatabaseStatusOverview } from '@/views/system/DatabaseStatusOverview'

export function DatabaseBackupView() {
  const { t } = useTranslation()
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
            {t('system.database.title')}
          </Typography.Title>
          <Typography.Text type="secondary">
            {t('system.database.description')}
          </Typography.Text>
        </div>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          loading={statusLoading}
          onClick={refreshStatus}
        >
          {t('system.database.refreshStatus')}
        </Button>
      </div>

      <DatabaseStatusOverview dbStatus={dbStatus} loading={statusLoading} />

      <DatabaseMonitoringPanel visible={canViewMonitoring} />
    </div>
  )
}
