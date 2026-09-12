import { Tour } from 'antd'
import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { TOUR_KEY } from './price-compare-support'

export function PriceCompareTour({
  onClose,
  open,
  spotRef,
}: {
  onClose: () => void
  open: boolean
  spotRef: RefObject<HTMLSpanElement | null>
}) {
  const { t } = useTranslation()
  return (
    <Tour
      open={open}
      onClose={() => {
        onClose()
        localStorage.setItem(TOUR_KEY, '1')
      }}
      steps={[
        {
          title: t('priceCompare.tour.selectTitle'),
          description: t('priceCompare.tour.selectDesc'),
          target: () => document.body,
        },
        {
          title: t('priceCompare.tour.entryTitle'),
          description: t('priceCompare.tour.entryDesc'),
          target: () => spotRef.current ?? document.body,
        },
      ]}
    />
  )
}
