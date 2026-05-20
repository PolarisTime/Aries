import { CheckCircleFilled, ExclamationCircleFilled, LoadingOutlined } from '@ant-design/icons'
import Tooltip from 'antd/es/tooltip'
import Typography from 'antd/es/typography'
import { useEffect, useState } from 'react'
import { loadCLodop } from '@/utils/clodop'

type Status = 'loading' | 'ready' | 'unavailable'

export function ClodopStatusBadge() {
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    let cancelled = false
    void loadCLodop().then((available) => {
      if (cancelled) return
      setStatus(available ? 'ready' : 'unavailable')
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'loading') {
    return (
      <Typography.Text style={{ fontSize: 12, color: '#8c8c8c', whiteSpace: 'nowrap' }}>
        <LoadingOutlined style={{ marginRight: 4 }} />
        CLodop
      </Typography.Text>
    )
  }

  const ready = status === 'ready'
  return (
    <Tooltip
      title={
        ready
          ? 'CLodop 打印服务已就绪'
          : 'CLodop 未检测到，打印功能可能不可用'
      }
    >
      <Typography.Text
        style={{
          fontSize: 12,
          color: ready ? '#52c41a' : '#ff4d4f',
          cursor: 'default',
          whiteSpace: 'nowrap',
        }}
      >
        {ready ? (
          <CheckCircleFilled style={{ marginRight: 4 }} />
        ) : (
          <ExclamationCircleFilled style={{ marginRight: 4 }} />
        )}
        CLodop
      </Typography.Text>
    </Tooltip>
  )
}
