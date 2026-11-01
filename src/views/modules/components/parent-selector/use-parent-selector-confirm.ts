import { useRef, useState } from 'react'
import { getBusinessModuleDetail } from '@/api/business/business-crud'
import { isDeletedModuleRecord } from '@/module-system/record/module-record-deletion'
import type {
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import { message } from '@/utils/antd-app'
import type { ParentSelectorTranslator } from './parent-selector-mode'
import { buildSelectedSummary } from './parent-selector-mode'
import { needsParentDetail } from './use-parent-selector-data'

async function resolveParentImportRecords(
  parentModuleKey: string,
  records: ModuleRecord[],
  candidateStatementModuleKey?: string,
  candidateQueryType?: ModuleParentImportDefinition['candidateQueryType'],
) {
  if (candidateStatementModuleKey || candidateQueryType) {
    return records
  }
  const resolvedRecords = await Promise.all(
    records.map(async (record) => {
      if (!record.id || !needsParentDetail(record)) {
        return record
      }
      const detail = await getBusinessModuleDetail(
        parentModuleKey,
        String(record.id),
      )
      return detail
    }),
  )
  return resolvedRecords
}

export interface UseParentSelectorConfirmParams {
  parentModuleKey: string
  candidateStatementModuleKey?: 'customer-statement' | 'freight-statement'
  candidateQueryType?: ModuleParentImportDefinition['candidateQueryType']
  selectedRows: ModuleRecord[]
  displayFieldKey: string
  allowMultipleSelection: boolean
  t: ParentSelectorTranslator
  /**
   * 确认导入回调。
   *
   * <p>返回 Promise 时，弹层会保持打开、锁定动作区并等待导入真正落地后才关闭；
   * 返回 void 时按"同步完成"处理。编辑器把 `handleImportParentRecord` 的 Promise
   * 透传上来，因此「导入还没回填完就关弹层」不会发生。</p>
   */
  onSelect: (records: ModuleRecord[]) => void | Promise<void>
  onClose: () => void
}

export function useParentSelectorConfirm({
  parentModuleKey,
  candidateStatementModuleKey,
  candidateQueryType,
  selectedRows,
  displayFieldKey,
  allowMultipleSelection,
  t,
  onSelect,
  onClose,
}: UseParentSelectorConfirmParams) {
  const selectedSummary = buildSelectedSummary({
    allowMultipleSelection,
    selectedRows,
    displayFieldKey,
    t,
  })
  /*
   * 导入 in-flight 守卫：同一份弹层里「确认导入」只允许执行一次。
   *
   * <p>用 ref 而不是只看 state：连点两次时两次事件可能落在同一个渲染批次内，
   * state 还来不及变成 true。ref 同步生效，state 只负责驱动按钮 loading。</p>
   */
  const importingRef = useRef(false)
  const [importing, setImporting] = useState(false)

  const handleImportRecords = async (recordsToImport: ModuleRecord[]) => {
    if (importingRef.current) {
      return
    }
    importingRef.current = true
    setImporting(true)
    try {
      const resolvedRecords = await resolveParentImportRecords(
        parentModuleKey,
        recordsToImport,
        candidateStatementModuleKey,
        candidateQueryType,
      )
      if (resolvedRecords.some(isDeletedModuleRecord)) {
        message.error(t('common.importParentFailed'))
        return
      }
      /*
       * 等导入真正落地再关弹层：`onSelect` 由编辑器传入，内部要拉父单详情、
       * 合并明细并写回表单。提前 close 会让用户看到「已关闭但稍后又冒出明细」，
       * 也给了「关掉之后再点保存」的窗口。
       */
      await onSelect(resolvedRecords)
      onClose()
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : t('common.importParentFailed'),
      )
    } finally {
      importingRef.current = false
      setImporting(false)
    }
  }

  return {
    selectedSummary,
    importing,
    handleImportRecords,
  }
}
