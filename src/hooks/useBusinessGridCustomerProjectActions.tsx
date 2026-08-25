import { useTranslation } from 'react-i18next'
import { useRequestError } from '@/hooks/useRequestError'
import { useTabOpen } from '@/layouts/tabs/use-tab-open'
import { parseEntityId } from '@/types/entity-id'
import type { ModuleRecord } from '@/types/module-page'
import { message } from '@/utils/antd-app'

interface Props {
  selectedRows: ModuleRecord[]
}

export function useBusinessGridCustomerProjectActions({ selectedRows }: Props) {
  const { t } = useTranslation()
  const { showError } = useRequestError()
  const openTab = useTabOpen()

  const openCustomerProjects = () => {
    if (selectedRows.length !== 1) {
      message.info(t('hooks.customerProjectActions.selectedCustomerRequired'))
      return
    }

    try {
      const customerId = parseEntityId(selectedRows[0].id, 'customer.id')
      const search = new URLSearchParams({ customerId })
      openTab({
        pathname: '/project',
        search: search.toString(),
        forceSearch: true,
      })
    } catch (error) {
      showError(error)
    }
  }

  return { openCustomerProjects }
}
