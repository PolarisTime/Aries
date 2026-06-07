import { useEffect } from 'react'
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

  useEffect(() => {
    if (!config) {
      return
    }

    if (!config.readOnly && canUpdateRecord) {
      void loadModuleEditorWorkspace()
    }
  }, [canUpdateRecord, config])

  useEffect(() => {
    if (!idleReady || !config) {
      return
    }

    if (canViewRecords) {
      void loadModuleRecordDetailOverlay()
    }
  }, [canViewRecords, config, idleReady])
}
