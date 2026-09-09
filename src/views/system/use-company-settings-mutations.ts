import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  type CompanySettingProfile,
  createCompanySetting,
  deleteCompanySetting,
  updateCompanySetting,
} from '@/api/system/company-settings'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useRequestError } from '@/hooks/useRequestError'
import { message } from '@/utils/antd-app'
import {
  buildPayload,
  type CompanySettingFormValues,
} from './company-settings-form-model'

interface UseCompanySettingsMutationsParams {
  companies: CompanySettingProfile[]
  isDraft: boolean
  selectedId: string
  onSelectSaved: (id: string) => void
  clearDirty: () => void
}

export function useCompanySettingsMutations({
  companies,
  isDraft,
  selectedId,
  onSelectSaved,
  clearDirty,
}: UseCompanySettingsMutationsParams) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { showError } = useRequestError()

  const saveMutation = useMutation({
    mutationFn: async (values: CompanySettingFormValues) => {
      const payload = buildPayload(values)
      return isDraft
        ? createCompanySetting(payload)
        : updateCompanySetting(selectedId, payload)
    },
    onSuccess: (data) => {
      message.success(t('common.saveSuccess'))
      clearDirty()
      if (data) {
        queryClient.setQueryData<CompanySettingProfile[]>(
          QUERY_KEYS.companySettings,
          (current = []) => {
            const exists = current.some((item) => item.id === data.id)
            return exists
              ? current.map((item) => (item.id === data.id ? data : item))
              : [...current, data]
          },
        )
      }
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.companySettings,
      })
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.companySetting,
      })
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.masterOptions.settlementCompany,
      })
      if (data?.id) {
        onSelectSaved(data.id)
      }
    },
    onError: (err: Error) => showError(err, t('api.saveCompanyInfoFailed')),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCompanySetting,
    onSuccess: (_, deletedId) => {
      message.success(t('common.deleteSuccess'))
      const remainingCompanies = companies.filter(
        (item) => item.id !== deletedId,
      )
      queryClient.setQueryData<CompanySettingProfile[]>(
        QUERY_KEYS.companySettings,
        remainingCompanies,
      )
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.companySettings,
      })
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.companySetting,
      })
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.masterOptions.settlementCompany,
      })
      if (selectedId === deletedId) {
        clearDirty()
        const next = remainingCompanies[0]
        onSelectSaved(next?.id ?? '')
      }
    },
    onError: (err: Error) => showError(err, t('api.deleteFailed')),
  })

  return { saveMutation, deleteMutation }
}
