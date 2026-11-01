import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Empty, Modal, Skeleton } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getDocumentFlow } from '@/api/system/document-flow'
import { DocumentFlowColumnHeaders } from '@/components/document-flow/DocumentFlowColumnHeaders'
import { DocumentFlowEdges } from '@/components/document-flow/DocumentFlowEdges'
import { DocumentFlowListView } from '@/components/document-flow/DocumentFlowListView'
import { DocumentFlowNodes } from '@/components/document-flow/DocumentFlowNodeCard'
import {
  DocumentFlowToolbar,
  type DocumentFlowView,
} from '@/components/document-flow/DocumentFlowToolbar'
import { buildDocumentFlowListModel } from '@/components/document-flow/document-flow-list-model'
import {
  flowNodeKey,
  layoutDocumentFlow,
} from '@/components/document-flow/flow-layout'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { DocumentFlowNode } from '@/shared/schemas/document-flow'
import './document-flow/document-flow.css'

interface Props {
  open: boolean
  documentNo: string
  onClose: () => void
  /** 点击节点打开对应单据详情；未提供时节点不可点击。 */
  onOpenNode?: (node: DocumentFlowNode) => void
}

/**
 * 单据流向弹层：查询 + 布局 + 「图 / 列表」切换。
 *
 * <p>渲染拆到 `document-flow/` 下的四个子组件（列头 / 连线层 / 节点卡 / 列表视图），
 * 本组件只保留「取数 → 布局 → 组合」：既压掉 giant component，也让列表视图与图视图
 * 共享同一份 layout/data。DOM class 名是既有契约（见 DocumentFlowModal.spec.tsx）。</p>
 */
export function DocumentFlowModal({
  open,
  documentNo,
  onClose,
  onOpenNode,
}: Props) {
  const { t } = useTranslation()
  const [view, setView] = useState<DocumentFlowView>('graph')
  const { data, error, isError, isFetching, isPending, refetch } = useQuery({
    queryKey: QUERY_KEYS.documentFlow(documentNo),
    queryFn: ({ signal }) => getDocumentFlow(documentNo, signal),
    enabled: open && Boolean(documentNo),
    staleTime: 0,
  })

  const nodes = data?.nodes ?? []
  const layout = useMemo(
    () => layoutDocumentFlow(data?.nodes ?? [], data?.links ?? []),
    [data],
  )
  // 列表视图与图视图共享同一份数据，切换不额外请求。
  const listModel = useMemo(
    () => buildDocumentFlowListModel(data?.nodes ?? [], data?.links ?? []),
    [data],
  )
  const currentNodeKey = useMemo(() => {
    if (!data) return null
    const target = data.nodes.find(
      (item) =>
        item.no === data.documentNo ||
        (item.no == null && String(item.id) === data.documentNo),
    )
    return target ? flowNodeKey(target) : null
  }, [data])
  const currentNodeRef = useRef<HTMLButtonElement | null>(null)
  // 数据到达后把当前起始单据滚动进可视区并居中（仅图视图；从列表切回时重新定位）。
  useEffect(() => {
    if (!open || !currentNodeKey || view !== 'graph') return
    const target = currentNodeRef.current
    if (typeof target?.scrollIntoView === 'function') {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      })
    }
  }, [open, currentNodeKey, view])

  return (
    <Modal
      open={open}
      title={t('documentFlow.titleWithNo', { no: documentNo || '--' })}
      /*
       * 5 列以上（采购单→入库→销售单→出库→退货）时画布宽度约 1350px，
       * 1280 会横向裁掉最后一列只能靠滚动；放宽到 1560 让常见链路一屏看完。
       */
      width="min(1560px, 96vw)"
      footer={null}
      onCancel={onClose}
      className="document-flow-modal"
    >
      {isPending && nodes.length === 0 ? <Skeleton active /> : null}
      {isError ? (
        <Alert
          showIcon
          type="error"
          title={
            error instanceof Error
              ? error.message
              : t('documentFlow.loadFailed')
          }
          action={
            <Button size="small" onClick={() => void refetch()}>
              {t('error.retry')}
            </Button>
          }
        />
      ) : null}
      {!isPending && !isError && nodes.length === 0 ? (
        <Empty description={t('documentFlow.empty')} />
      ) : null}
      {nodes.length > 0 ? (
        <>
          <DocumentFlowToolbar
            isFetching={isFetching}
            nodeCount={nodes.length}
            onViewChange={setView}
            t={t}
            truncated={data?.truncated}
            view={view}
          />
          {view === 'list' ? (
            <DocumentFlowListView
              currentNodeKey={currentNodeKey}
              groups={listModel.groups}
              relations={listModel.relations}
              t={t}
            />
          ) : (
            <div className="document-flow-viewport">
              <div
                className="document-flow-canvas"
                style={{ width: layout.width, height: layout.height }}
              >
                <DocumentFlowColumnHeaders headers={layout.headers} t={t} />
                <DocumentFlowEdges
                  edges={layout.edges}
                  height={layout.height}
                  t={t}
                  width={layout.width}
                />
                <DocumentFlowNodes
                  currentNodeKey={currentNodeKey}
                  currentNodeRef={currentNodeRef}
                  nodes={layout.nodes}
                  onOpenNode={onOpenNode}
                  t={t}
                />
              </div>
            </div>
          )}
        </>
      ) : null}
    </Modal>
  )
}
