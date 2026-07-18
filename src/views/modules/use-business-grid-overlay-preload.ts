import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useIdleActivation } from '@/hooks/useIdleActivation'
import type { ModulePageConfig } from '@/types/module-page'
import {
  loadModuleEditorWorkspace,
  loadModuleRecordDetailOverlay,
} from '@/views/modules/components/business-grid-overlay-loaders'

interface Options {
  config?: ModulePageConfig | null
}

export function useBusinessGridOverlayPreload({ config }: Options) {
  const idleReady = useIdleActivation(Boolean(config), 2000)

  useQuery({
    queryKey: QUERY_KEYS.businessGridOverlayPreload('editor-workspace'),
    queryFn: loadModuleEditorWorkspace,
    enabled: Boolean(config && !config.readOnly),
    staleTime: Infinity,
    gcTime: Infinity,
  })

  useQuery({
    queryKey: QUERY_KEYS.businessGridOverlayPreload('record-detail-overlay'),
    queryFn: loadModuleRecordDetailOverlay,
    enabled: Boolean(idleReady && config),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
