import { UnorderedListOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { EntityId } from '@/types/entity-id'
import { message } from '@/utils/antd-app'
import { loadPurchaseOrderPickupListOverlay } from '@/views/modules/components/business-grid-overlay-loaders'
import { OverlayLazyFallback } from '@/views/modules/components/OverlayLazyFallback'

const PurchaseOrderPickupListOverlay = lazy(loadPurchaseOrderPickupListOverlay)

interface Props {
  selectedOrderIds: EntityId[]
}

export function PurchaseOrderPickupListAction({ selectedOrderIds }: Props) {
  const { t } = useTranslation()
  const [openOrderIds, setOpenOrderIds] = useState<EntityId[]>([])

  const handleOpen = () => {
    if (selectedOrderIds.length > 50) {
      message.warning(t('modules.purchasePickupList.tooManyOrders'))
      return
    }
    setOpenOrderIds([...selectedOrderIds])
  }

  return (
    <>
      <Button icon={<UnorderedListOutlined />} onClick={handleOpen}>
        {t('modules.purchasePickupList.action', {
          count: selectedOrderIds.length,
        })}
      </Button>
      {openOrderIds.length ? (
        <Suspense fallback={<OverlayLazyFallback />}>
          <PurchaseOrderPickupListOverlay
            open
            orderIds={openOrderIds}
            onClose={() => setOpenOrderIds([])}
          />
        </Suspense>
      ) : null}
    </>
  )
}
