import { useLocation } from '@tanstack/react-router'
import { Empty } from 'antd'
import { useMemo } from 'react'
import { getPageDefinition } from '@/config/page-registry'
import { BusinessGridPage } from '@/views/modules/BusinessGridPage'

export function BusinessGridView() {
  const location = useLocation()
  const pageDef = useMemo(() => {
    return getPageDefinition(location.pathname)
  }, [location.pathname])

  if (!pageDef?.moduleKey) {
    return <Empty description="页面配置未找到" style={{ marginTop: 96 }} />
  }

  return <BusinessGridPage pageDef={pageDef} />
}
