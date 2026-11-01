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
import { withFinally } from '@/utils/with-finally'
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

/** 父单详情请求超时（毫秒）。 */
export const PARENT_DETAIL_TIMEOUT_MS = 10_000

type ParentDetailTranslator = (
  key: string,
  options?: Record<string, unknown>,
) => string

/**
 * 拉取父单详情：10s 超时 + 可中断。
 *
 * <p>导入进行中弹层与保存按钮是锁定的，详情请求一旦挂起就会把用户永久锁在导入态，
 * 因此这里必须给上限。超时与失败分开提示（前者可重试、后者多为已删除/无权限），
 * 两者都带单号——只提示「加载失败」用户无法定位是哪一张单据。</p>
 */
export async function fetchParentDetailWithTimeout({
  moduleKey,
  recordId,
  parentNo,
  t,
}: {
  moduleKey: string
  recordId: string
  parentNo: string
  t: ParentDetailTranslator
}): Promise<ModuleRecord> {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, PARENT_DETAIL_TIMEOUT_MS)
  try {
    return await getBusinessModuleDetail(moduleKey, recordId, controller.signal)
  } catch (error) {
    throw new Error(
      timedOut
        ? t('common.parentDocumentLoadTimeout', { no: parentNo })
        : t('common.parentDocumentLoadFailed', { no: parentNo }),
      { cause: error },
    )
  } finally {
    clearTimeout(timer)
  }
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
    /*
     * 收尾用 withFinally 而不是 try/finally：React Compiler 不支持带 finally 的
     * TryStatement（react-doctor `react-hooks-js/todo`），命中后整个 Hook 会失去自动记忆化；
     * 而导入的每条退出路径（成功 / 校验失败提前 return / 异常 / 详情超时）都必须解锁。
     */
    await withFinally(async () => {
      try {
        const parentDetails = await Promise.all(
          selectedRecords.map(async (selectedRecord) => {
            if (parentImportConfig.useCandidateSnapshot) {
              return { data: selectedRecord }
            }
            // 父单详情 404/已删除/超时都必须带单号，用户才知道该处理哪一张。
            const parentNo =
              asString(
                selectedRecord[parentImportConfig.parentDisplayFieldKey],
              ).trim() || String(selectedRecord.id)
            return {
              data: await fetchParentDetailWithTimeout({
                moduleKey: parentImportConfig.parentModuleKey,
                recordId: String(selectedRecord.id),
                parentNo,
                t,
              }),
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
      } catch (error) {
        message.error(
          error instanceof Error
            ? error.message
            : t('common.importParentFailed'),
        )
      }
    }, finishParentImport)
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
