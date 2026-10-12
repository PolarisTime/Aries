import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useMaterialBrands } from '@/hooks/useMaterialBrands'
import { MasterDataListPage } from './MasterDataListPage'
import type { MasterOption } from './master-data-types'
import { buildSupplierSpec } from './supplier-page-spec'

export function SupplierPage() {
  const { t } = useTranslation()
  const materialBrands = useMaterialBrands()
  const brandOptions = useMemo<MasterOption[]>(
    () => materialBrands.map((brand) => ({ label: brand, value: brand })),
    [materialBrands],
  )
  const spec = useMemo(
    () => buildSupplierSpec(t, brandOptions),
    [t, brandOptions],
  )
  return <MasterDataListPage spec={spec} />
}
