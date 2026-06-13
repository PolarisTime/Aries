import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useIdleActivation } from '@/hooks/useIdleActivation'
import type { ModulePageConfig } from '@/types/module-page'
import {
  loadModuleEditorWorkspace,
  loadModuleRecordDetailOverlay,
} from '@/views/modules/components/business-grid-overlay-loaders'

interface Options {
  canUpdateRecord: boolean
  canViewRecords: boolean
  config?: ModulePageConfig | null
}

export function useBusinessGridOverlayPreload({
  canUpdateRecord,
  canViewRecords,
  config,
}: Options) {
  const idleReady = useIdleActivation(Boolean(config), 2000)

  useQuery({
    queryKey: QUERY_KEYS.businessGridOverlayPreload('editor-workspace'),
    queryFn: loadModuleEditorWorkspace,
    enabled: Boolean(config && !config.readOnly && canUpdateRecord),
    staleTime: Infinity,
    gcTime: Infinity,
  })

  useQuery({
    queryKey: QUERY_KEYS.businessGridOverlayPreload('record-detail-overlay'),
    queryFn: loadModuleRecordDetailOverlay,
    enabled: Boolean(idleReady && config && canViewRecords),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
