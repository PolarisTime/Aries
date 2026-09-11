import { Tour } from 'antd'
import type { RefObject } from 'react'
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
  return (
    <Tour
      open={open}
      onClose={() => {
        onClose()
        localStorage.setItem(TOUR_KEY, '1')
      }}
      steps={[
        {
          title: '选择项目/批次',
          description: '在顶部切换项目与批次；每个批次对应一次报价',
          target: () => document.body,
        },
        {
          title: '分组与录入',
          description:
            '支持添加分组与拖动排序；录入现货价，按回车或方向键切换行',
          target: () => spotRef.current ?? document.body,
        },
      ]}
    />
  )
}
