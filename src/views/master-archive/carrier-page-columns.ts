import type { useTranslation } from 'react-i18next'
import { asString } from '@/utils/type-narrowing'

export const CARRIER_COLUMN_KEYS = [
  'carrierCode',
  'carrierName',
  'contactName',
  'contactPhone',
  'vehicleType',
  'priceMode',
  'defaultSettlementCompanyName',
  'status',
  'remark',
] as const

export type CarrierColumnKey = (typeof CARRIER_COLUMN_KEYS)[number]

export function displayCarrierValue(value: unknown): string {
  const normalized = asString(value).trim()
  return normalized || '-'
}

export function buildCarrierColumnLabels(
  t: ReturnType<typeof useTranslation>['t'],
): Record<CarrierColumnKey, string> {
  return {
    carrierCode: t('modules.pages.carrier.colCarrierCode'),
    carrierName: t('modules.pages.carrier.colCarrierName'),
    contactName: t('modules.pages.carrier.colContactName'),
    contactPhone: t('modules.pages.carrier.colContactPhone'),
    vehicleType: t('modules.pages.carrier.colVehicleType'),
    priceMode: t('modules.pages.carrier.colPriceMode'),
    defaultSettlementCompanyName: t(
      'modules.pages.carrier.colDefaultSettlementCompany',
    ),
    status: t('modules.columns.status'),
    remark: t('modules.columns.remark'),
  }
}
