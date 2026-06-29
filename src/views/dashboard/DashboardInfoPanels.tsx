import type { DashboardSummary } from '@/api/dashboard'
import { DashboardSidebarPanels } from '@/views/dashboard/DashboardSidebarPanels'
import { DashboardWorkplaceHeader } from '@/views/dashboard/DashboardWorkplaceHeader'
import type { DashboardInfoItem } from '@/views/dashboard/dashboard-view-types'

interface Props {
  animatedServerTime: string
  infoItems: DashboardInfoItem[]
  summary?: DashboardSummary
}

export { DashboardSidebarPanels } from '@/views/dashboard/DashboardSidebarPanels'
export { DashboardWorkplaceHeader } from '@/views/dashboard/DashboardWorkplaceHeader'

export function DashboardInfoPanels(props: Props) {
  return (
    <>
      <DashboardWorkplaceHeader
        animatedServerTime={props.animatedServerTime}
        summary={props.summary}
      />
      <DashboardSidebarPanels
        infoItems={props.infoItems}
        summary={props.summary}
      />
    </>
  )
}
