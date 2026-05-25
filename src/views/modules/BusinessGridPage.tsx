import { lazy, Suspense } from 'react'
import type { AppPageDefinition } from '@/config/page-registry'
import type { ModulePageConfig } from '@/types/module-page'
import { BusinessGridPageSkeleton } from '@/views/modules/components/BusinessGridPageSkeleton'

const BusinessGridRouteContent = lazy(() =>
  import('@/views/modules/BusinessGridRouteContent').then((m) => ({
    default: m.BusinessGridRouteContent,
  })),
)

interface Props {
  pageDef: AppPageDefinition
  initialConfig?: ModulePageConfig
}

export function BusinessGridPage({ pageDef, initialConfig }: Props) {
  return (
    <Suspense fallback={<BusinessGridPageSkeleton />}>
      <BusinessGridRouteContent
        key={pageDef.moduleKey || pageDef.key}
        pageDef={pageDef}
        initialConfig={initialConfig}
      />
    </Suspense>
  )
}
