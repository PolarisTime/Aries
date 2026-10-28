import { ApartmentOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DocumentFlowModal } from '@/components/DocumentFlowModal'
import { getPageDefinition, getPageRoutePath } from '@/config/page-registry'
import { useTabOpen } from '@/layouts/tabs/use-tab-open'
import type { DocumentFlowNode } from '@/shared/schemas/document-flow'
import type { ModuleRecord } from '@/types/module-page'
import { message } from '@/utils/antd-app'

interface Props {
  selectedRows: ModuleRecord[]
}

/**
 * 采购单据通用工具栏入口：选中恰好 1 行时打开通用单据流弹窗。
 * 点击流向图节点复用 AppLayout 的「点节点跳详情」语义。
 *
 * <p><b>没勾选时不渲染</b>：单据流是"针对某一张单"的动作，工具栏常驻一个灰着的按钮只会占位置、
 * 让用户点了才知道要先选行（实测反馈"按钮太多、看不出哪些现在能用"）。现在默认不出现，
 * 勾选后才出现；勾了多行时保留按钮但置灰并说明"只能选一条"，避免选择过程中按钮忽隐忽现。</p>
 */
export function PurchaseOrderDocumentFlowAction({ selectedRows }: Props) {
  const { t } = useTranslation()
  const openTab = useTabOpen()
  const [open, setOpen] = useState(false)
  const target = selectedRows.length === 1 ? selectedRows[0] : null
  // 采购订单主编号为 orderNo，采购入库为 inboundNo；两者共用同一入口。
  const documentNo = String(target?.orderNo ?? target?.inboundNo ?? '')
  const canOpen = selectedRows.length === 1 && Boolean(documentNo)

  const handleOpen = () => {
    if (!canOpen) {
      return
    }
    setOpen(true)
  }

  const handleOpenNode = (node: DocumentFlowNode) => {
    const targetPage = getPageDefinition(node.type)
    if (!targetPage) {
      message.warning(t('layouts.routePage.businessPageNotFound'))
      return
    }
    const query = new URLSearchParams({ docNo: node.no ?? '', openDetail: '1' })
    if (node.id) {
      query.set('trackId', node.id)
    }
    openTab({
      pathname: `/${getPageRoutePath(targetPage)}`,
      search: query.toString(),
      forceSearch: true,
    })
    setOpen(false)
  }

  // 无勾选时不渲染（放在所有 hook 之后, 保持 hook 调用顺序稳定）
  if (selectedRows.length === 0) return null

  const disabledReason = canOpen
    ? undefined
    : t('modules.toolbarActions.singleSelectionOnly', {
        action: t('documentFlow.title'),
      })

  return (
    <>
      <Tooltip title={disabledReason}>
        <Button
          aria-disabled={!canOpen}
          icon={<ApartmentOutlined />}
          onClick={handleOpen}
          style={canOpen ? undefined : { opacity: 0.5, cursor: 'not-allowed' }}
        >
          {t('documentFlow.title')}
        </Button>
      </Tooltip>
      <DocumentFlowModal
        open={open}
        documentNo={documentNo}
        onClose={() => setOpen(false)}
        onOpenNode={handleOpenNode}
      />
    </>
  )
}
