import { useTranslation } from 'react-i18next'
import { useRequestError } from '@/hooks/useRequestError'
import { CustomerProjectManager } from '@/module-system/customer/CustomerProjectManager'
import { parseEntityId } from '@/types/entity-id'
import type { ModuleRecord } from '@/types/module-page'
import { message, modal } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'

interface Props {
  selectedRows: ModuleRecord[]
  refreshModuleQueries: () => Promise<void>
}

export function useBusinessGridCustomerProjectActions({
  selectedRows,
  refreshModuleQueries,
}: Props) {
  const { t } = useTranslation()
  const { showError } = useRequestError()

  const openCustomerProjects = () => {
    if (selectedRows.length !== 1) {
      message.info(t('hooks.customerProjectActions.selectedCustomerRequired'))
      return
    }

    try {
      const selectedCustomer = selectedRows[0]
      const customer = {
        id: parseEntityId(selectedCustomer.id, 'customer.id'),
        code: asString(selectedCustomer.customerCode).trim(),
        name: asString(selectedCustomer.customerName).trim(),
      }
      modal.info({
        title: t('hooks.customerProjectActions.title', {
          name: customer.name,
        }),
        width: 1080,
        icon: null,
        footer: null,
        closable: true,
        mask: { closable: false },
        content: (
          <CustomerProjectManager
            customer={customer}
            onChanged={refreshModuleQueries}
          />
        ),
      })
    } catch (error) {
      showError(error)
    }
  }

  return { openCustomerProjects }
}
