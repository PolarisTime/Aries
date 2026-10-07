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
