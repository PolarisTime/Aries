import { useLoaderData, useLocation } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'
import Empty from 'antd/es/empty'
import { primeBusinessPageConfig } from '@/config/business-page-loader'
import {
  getPageDefinition,
  type AppPageDefinition,
} from '@/config/page-registry'
import type { ModulePageConfig } from '@/types/module-page'
import { BusinessGridPage } from '@/views/modules/BusinessGridPage'

export function resolveBusinessGridInitialConfig(
  pageDef: AppPageDefinition | undefined,
  loaderConfig?: ModulePageConfig,
) {
  if (!pageDef?.moduleKey || loaderConfig?.key !== pageDef.moduleKey) {
    return undefined
  }
  return loaderConfig
}

export function BusinessGridView() {
  const location = useLocation()
  const loaderConfig = useLoaderData({
    strict: false,
  })
  const pageDef = useMemo(() => {
    return getPageDefinition(location.pathname)
  }, [location.pathname])
  const initialConfig = useMemo(
    () => resolveBusinessGridInitialConfig(pageDef, loaderConfig),
    [loaderConfig, pageDef],
  )

  useEffect(() => {
    if (pageDef?.moduleKey && initialConfig) {
      primeBusinessPageConfig(pageDef.moduleKey, initialConfig)
    }
  }, [initialConfig, pageDef?.moduleKey])

  if (!pageDef?.moduleKey) {
    return <Empty description="页面配置未找到" style={{ marginTop: 96 }} />
  }

  return (
    <BusinessGridPage
      key={pageDef.moduleKey}
      pageDef={pageDef}
      initialConfig={initialConfig}
    />
  )
}
