import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getBusinessModuleDetail } from '@/api/business/business-crud'
import {
  buildParentImportState,
  resolveParentImportDefinition,
} from '@/module-system/adapter/module-adapter-parent-import'
import { parseParentRelationNos } from '@/module-system/adapter/module-adapter-shared'
import type { SearchParams } from '@/types/api-raw'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import { message } from '@/utils/antd-app'
import { cloneLineItems } from '@/utils/clone-utils'
import {
  syncEditorFormValues,
  type WorkspaceFormApi,
} from '@/views/modules/module-editor-workspace-support'

interface ParentImportSession {
  editorSessionKey: string
  moduleKey: string
  config: ModulePageConfig
}

interface ParentImportWorkspace {
  items: ModuleLineItem[]
  replaceItems: (items: ModuleLineItem[]) => void
  invalidateSubmission: () => void
  onDirty: () => void
}

interface Options {
  session: ParentImportSession
  form: WorkspaceFormApi
  workspace: ParentImportWorkspace
}

export function useParentImportController({
  session,
  form,
  workspace,
}: Options) {
  const { editorSessionKey, moduleKey, config } = session
  const { items, replaceItems, invalidateSubmission, onDirty } = workspace
  const [parentSelectorSessionKey, setParentSelectorSessionKey] = useState<
    string | null
  >(null)
  const [parentSelectorFilters, setParentSelectorFilters] =
    useState<SearchParams>({})
  const [parentSelectorDefinition, setParentSelectorDefinition] =
    useState<ModuleParentImportDefinition | null>(null)
  const [parentImporting, setParentImporting] = useState(false)
  const { t } = useTranslation()
  const parentSelectorOpen = parentSelectorSessionKey === editorSessionKey

  const handleImportParentRecord = async (selectedRecords: ModuleRecord[]) => {
    const parentImportConfig =
      parentSelectorDefinition ||
      (config.parentImport
        ? resolveParentImportDefinition(
            config.parentImport,
            form.getFieldsValue(true),
          )
        : undefined)
    if (!parentImportConfig) {
      return
    }
    if (!selectedRecords.length) {
      message.warning(
        t('common.pleaseSelectWith', { label: parentImportConfig.label }),
      )
      return
    }

    setParentImporting(true)
    try {
      const parentDetails = await Promise.all(
        selectedRecords.map(async (selectedRecord) => ({
          data: parentImportConfig.useCandidateSnapshot
            ? selectedRecord
            : (
                await getBusinessModuleDetail(
                  parentImportConfig.parentModuleKey,
                  String(selectedRecord.id),
                )
              ).data,
        })),
      )

      let nextValues = form.getFieldsValue(true)
      let nextItems = items
      let importedParentCount = 0
      let importedItemCount = 0
      let importValidationError = ''

      for (const parentDetail of parentDetails) {
        const parentRecord = parentDetail.data
        const currentParentNos = parseParentRelationNos(
          nextValues[parentImportConfig.parentFieldKey],
        )
        const validationError = parentImportConfig.validateParentImport?.({
          currentRecord: nextValues,
          currentItems: nextItems,
          currentParentNos,
          parentRecord,
        })
        if (validationError) {
          importValidationError = validationError
          break
        }
        const importState = buildParentImportState({
          parentImportConfig,
          parentRecord,
          currentParentNos,
          currentItems: nextItems,
          cloneLineItems,
        })

        nextValues = {
          ...nextValues,
          [parentImportConfig.parentFieldKey]: importState.parentNosText,
        }
        if (importState.shouldApplyMappedValues) {
          Object.assign(nextValues, importState.mappedValues)
        }
        nextItems = importState.nextItems
        importedParentCount += importState.hasImportedCurrentParent ? 0 : 1
        importedItemCount += importState.importedItemCount
      }

      if (importValidationError) {
        message.error(importValidationError)
        setParentImporting(false)
        return
      }

      syncEditorFormValues({
        config,
        form,
        moduleKey,
        items: nextItems,
        changedValues: nextValues,
      })
      invalidateSubmission()
      onDirty()
      replaceItems(nextItems)
      setParentSelectorSessionKey(null)
      setParentSelectorDefinition(null)
      message.success(
        importedParentCount > 1
          ? t('common.importParentSuccess', {
              parentCount: importedParentCount,
              itemCount: importedItemCount,
            })
          : t('common.importParentSuccessSimple', {
              itemCount: importedItemCount,
            }),
      )
      setParentImporting(false)
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : t('common.importParentFailed'),
      )
      setParentImporting(false)
    }
  }

  const openParentSelector = () => {
    const parentImportConfig = config.parentImport
    if (!parentImportConfig) {
      return
    }
    const currentValues = form.getFieldsValue(true)
    const validationError =
      parentImportConfig.validateBeforeOpen?.(currentValues)
    if (validationError) {
      message.warning(validationError)
      return
    }
    const effectiveParentImportConfig = resolveParentImportDefinition(
      parentImportConfig,
      currentValues,
    )
    const nextParentFilters =
      effectiveParentImportConfig.buildParentFilters?.(currentValues) || {}
    setParentSelectorFilters(nextParentFilters)
    setParentSelectorDefinition(effectiveParentImportConfig)
    setParentSelectorSessionKey(editorSessionKey)
  }

  return {
    closeParentSelector: () => {
      setParentSelectorSessionKey(null)
      setParentSelectorDefinition(null)
    },
    handleImportParentRecord,
    openParentSelector,
    parentImporting,
    parentSelectorDisplayFieldKey:
      parentSelectorDefinition?.parentDisplayFieldKey ||
      config.parentImport?.parentDisplayFieldKey,
    parentSelectorFilters,
    parentSelectorModuleKey:
      parentSelectorDefinition?.parentModuleKey ||
      config.parentImport?.parentModuleKey,
    parentSelectorOpen,
  }
}
