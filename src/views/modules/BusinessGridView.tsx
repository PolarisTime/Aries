import { useLoaderData, useLocation } from '@tanstack/react-router'
import Empty from 'antd/es/empty'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { primeBusinessPageConfig } from '@/config/business-page-loader'
import { getPageDefinition } from '@/config/page-registry'
import type { ModulePageConfig } from '@/types/module-page'
import { BusinessGridPage } from '@/views/modules/BusinessGridPage'
import { resolveBusinessGridInitialConfig } from '@/views/modules/business-grid-view-utils'

export function BusinessGridView() {
  const { t } = useTranslation()
  const location = useLocation()
  const loaderConfig = useLoaderData({
    strict: false,
  })
  const pageDef = getPageDefinition(location.pathname)
  const initialConfig = resolveBusinessGridInitialConfig(
    pageDef,
    loaderConfig && typeof loaderConfig === 'object' && 'key' in loaderConfig
      ? (loaderConfig as ModulePageConfig)
      : undefined,
  )

  useEffect(() => {
    if (pageDef?.moduleKey && initialConfig) {
      primeBusinessPageConfig(pageDef.moduleKey, initialConfig)
    }
  }, [initialConfig, pageDef?.moduleKey])

  if (!pageDef?.moduleKey) {
    return (
      <Empty description={t('modules.page.configNotFound')} className="mt-96" />
    )
  }

  return (
    <BusinessGridPage
      key={pageDef.moduleKey}
      pageDef={pageDef}
      initialConfig={initialConfig}
    />
  )
}
