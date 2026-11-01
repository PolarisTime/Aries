import { useRef, useState } from 'react'
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
import { asString } from '@/utils/type-narrowing'
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
  /*
   * 导入 in-flight 锁（同步生效）。
   *
   * <p>两次导入若并发执行，各自读到的 `items` 是同一份渲染快照，后完成的一次
   * `replaceItems` 会把前一次的结果整体覆盖——明细静默丢一组。state 只用于禁用按钮，
   * 拦截必须靠 ref：连点/双击可能落在同一渲染批次里，state 还来不及翻 true。</p>
   */
  const parentImportingRef = useRef(false)
  const finishParentImport = () => {
    parentImportingRef.current = false
    setParentImporting(false)
  }

  const handleImportParentRecord = async (selectedRecords: ModuleRecord[]) => {
    if (parentImportingRef.current) {
      return
    }
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

    parentImportingRef.current = true
    setParentImporting(true)
    try {
      const parentDetails = await Promise.all(
        selectedRecords.map(async (selectedRecord) => {
          if (parentImportConfig.useCandidateSnapshot) {
            return { data: selectedRecord }
          }
          try {
            return {
              data: await getBusinessModuleDetail(
                parentImportConfig.parentModuleKey,
                String(selectedRecord.id),
              ),
            }
          } catch (error) {
            /*
             * 父单详情 404/已删除/无权限：必须带上单号，否则用户只看到
             * 「加载失败」却不知道是哪一张单据需要处理。
             */
            const parentNo =
              asString(
                selectedRecord[parentImportConfig.parentDisplayFieldKey],
              ).trim() || String(selectedRecord.id)
            throw new Error(
              t('common.parentDocumentLoadFailed', { no: parentNo }),
              { cause: error },
            )
          }
        }),
      )

      let nextValues = form.getFieldsValue(true)
      let nextItems = items
      let importedParentCount = 0
      let importedItemCount = 0
      let importValidationError = ''
      // 导入前的明细行以引用身份判定「本次新增行」: buildParentImportState 复用既有行对象,
      // 只把新导入的行作为新对象写回, 因此无需按来源 ID 再写一套去重规则。
      const beforeItemSet = new Set(items)

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
        finishParentImport()
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
      // 非阻断预警: 导入已生效, 提示人工复核(如品牌/材质超出项目约定范围)。
      const importWarning = parentImportConfig.warnParentImport?.({
        currentRecord: nextValues,
        importedItems: nextItems.filter((item) => !beforeItemSet.has(item)),
        parentRecords: parentDetails.map((detail) => detail.data),
      })
      if (importWarning) {
        message.warning(importWarning)
      }
      finishParentImport()
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : t('common.importParentFailed'),
      )
      finishParentImport()
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
