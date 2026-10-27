import { Spin } from 'antd'
import type { PatchStateUpdater } from '@/hooks/usePatchState'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { ModuleRecordDetailInline } from '../ModuleRecordDetailInline'
import type { ParentSelectorTranslator } from './parent-selector-mode'
import type { ParentSelectorState } from './use-parent-selector-data'
import { needsParentDetail } from './use-parent-selector-data'

export interface UseParentSelectorDetailParams {
  state: ParentSelectorState
  setState: (patch: PatchStateUpdater<ParentSelectorState>) => void
  parentPageConfig?: ModulePageConfig
  displayFieldKey: string
  t: ParentSelectorTranslator
  detailRequestVersionsRef: { current: Map<string, number> }
  loadDetailRecord: (recordId: string) => Promise<void>
}

export function useParentSelectorDetail({
  state,
  setState,
  parentPageConfig,
  displayFieldKey,
  t,
  detailRequestVersionsRef,
  loadDetailRecord,
}: UseParentSelectorDetailParams) {
  const { detailExpandedRowKeys, inlineDetailItems } = state

  const toggleDetail = (record: ModuleRecord) => {
    const recordId = String(record.id || '')
    if (!recordId) return
    if (detailExpandedRowKeys.includes(recordId)) {
      detailRequestVersionsRef.current.delete(recordId)
      setState((prev) => {
        const nextInlineDetailItems = { ...prev.inlineDetailItems }
        delete nextInlineDetailItems[recordId]
        return {
          detailExpandedRowKeys: prev.detailExpandedRowKeys.filter(
            (key) => key !== recordId,
          ),
          inlineDetailItems: nextInlineDetailItems,
        }
      })
      return
    }
    const hasInlineItems = !needsParentDetail(record)
    setState((prev) => ({
      detailExpandedRowKeys: [...prev.detailExpandedRowKeys, recordId],
      inlineDetailItems: {
        ...prev.inlineDetailItems,
        [recordId]: {
          record: hasInlineItems ? record : null,
          loading: !hasInlineItems,
          error: null,
        },
      },
    }))
    if (!hasInlineItems) {
      void loadDetailRecord(recordId)
    }
  }

  const retryDetail = (recordId: string) => {
    if (inlineDetailItems[recordId]) {
      void loadDetailRecord(recordId)
    }
  }

  const renderDetail = (record: ModuleRecord) => {
    const recordId = String(record.id || '')
    const detailRecord = inlineDetailItems[recordId]?.record ?? record
    const lineCount = Array.isArray(detailRecord.items)
      ? detailRecord.items.length
      : 0
    const importableQty = Number(record.importableQuantity)
    const docNo = asString(record[displayFieldKey]).trim() || recordId
    const content = !parentPageConfig ? (
      <div className="module-record-detail-inline-state">
        <Spin size="small" />
      </div>
    ) : (
      (() => {
        const item = inlineDetailItems[recordId]
        return (
          <ModuleRecordDetailInline
            config={parentPageConfig}
            record={item?.record ?? null}
            loading={item?.loading ?? false}
            error={item?.error ?? null}
            onRetry={() => retryDetail(recordId)}
          />
        )
      })()
    )
    return (
      <div className="parent-selector-detail-panel">
        <div className="parent-selector-detail-summary">
          <span>
            {t('modules.parentSelector.detailLines', { count: lineCount })}
          </span>
          {Number.isFinite(importableQty) && importableQty > 0 ? (
            <span>
              {t('modules.parentSelector.detailImportable', {
                count: importableQty,
              })}
            </span>
          ) : null}
          <span>
            {t('modules.parentSelector.column.docNo')}：
            <span className="parent-selector-detail-summary-docno">
              {docNo}
            </span>
          </span>
        </div>
        {content}
      </div>
    )
  }

  return {
    detailExpandedRowKeys,
    toggleDetail,
    renderDetail,
  }
}
