import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, Switch, message } from 'antd'
import { http } from '@/api/client'
import type { ApiResponse } from '@/types/api'

interface DisplaySwitches {
  weightOnlyView?: boolean
  showSnowflakeId?: boolean
  [key: string]: boolean | undefined
}

export function GeneralSettingsView() {
  const queryClient = useQueryClient()

  const { data: switches, isLoading } = useQuery({
    queryKey: ['general-settings', 'display-switches'],
    queryFn: async () => {
      const res = await http.get<ApiResponse<DisplaySwitches>>('/general-settings/display-switches')
      return res.data || {}
    },
    staleTime: 30000,
  })

  const handleToggle = async (key: string, value: boolean) => {
    try {
      await http.put('/general-settings/display-switches', { [key]: value })
      message.success('设置已更新')
      queryClient.invalidateQueries({ queryKey: ['general-settings', 'display-switches'] })
    } catch (err) {
      message.error(err instanceof Error ? err.message : '设置失败')
    }
  }

  return (
    <div className="page-stack">
      <Card title="通用设置" loading={isLoading}>
        <div className="flex flex-col gap-4 max-w-md">
          <div className="flex items-center justify-between gap-4">
            <span>仅显示重量视图</span>
            <Switch checked={!!switches?.weightOnlyView} onChange={(v) => handleToggle('weightOnlyView', v)} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>显示 Snowflake ID</span>
            <Switch checked={!!switches?.showSnowflakeId} onChange={(v) => handleToggle('showSnowflakeId', v)} />
          </div>
        </div>
      </Card>
    </div>
  )
}
