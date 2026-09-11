import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Col, Row, Spin } from 'antd'
import { useTranslation } from 'react-i18next'
import { getBusinessModuleDetail } from '@/api/business/business-crud'
import { StatusTag } from '@/components/StatusTag'
import { statusMap } from '@/config/business-pages/shared/shared-status'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { ModuleKey } from '@/module-system/core/module-key'
import type { EntityId } from '@/types/entity-id'
import type { LegacyModuleRecord } from '@/types/module-record'

import { asString } from '@/utils/type-narrowing'
import { displayCarrierValue as displayValue } from './carrier-page-columns'

const MODULE_KEY: ModuleKey = 'carrier'

export function CarrierInlineDetail({ recordId }: { recordId: EntityId }) {
  const { t } = useTranslation()
  const detail = useQuery({
    queryKey: QUERY_KEYS.businessGridDetail(MODULE_KEY, recordId),
    queryFn: () => getBusinessModuleDetail(MODULE_KEY, recordId),
    enabled: Boolean(recordId),
    staleTime: 5_000,
  })

  if (detail.isLoading) {
    return (
      <div className="module-record-detail-inline-state">
        <Spin size="small" />
      </div>
    )
  }
  if (detail.error != null) {
    return (
      <div className="module-record-detail-inline-state">
        <Alert
          type="error"
          showIcon
          title={t('api.loadFailed')}
          action={
            <Button
              size="small"
              type="primary"
              onClick={() => void detail.refetch()}
            >
              {t('errorBoundary.retry')}
            </Button>
          }
        />
      </div>
    )
  }
  const record: LegacyModuleRecord | undefined = detail.data
  if (!record) {
    return (
      <div className="module-record-detail-inline module-record-detail-inline-fields">
        <Alert type="info" showIcon title={t('modules.detail.noData')} />
      </div>
    )
  }

  const detailRows: Array<{ key: string; label: string }> = [
    { key: 'carrierCode', label: t('modules.pages.carrier.colCarrierCode') },
    { key: 'carrierName', label: t('modules.pages.carrier.colCarrierName') },
    { key: 'contactName', label: t('modules.pages.carrier.colContactName') },
    { key: 'contactPhone', label: t('modules.pages.carrier.colContactPhone') },
    { key: 'vehiclePlate', label: t('modules.pages.carrier.colVehiclePlate') },
    {
      key: 'vehicleContact',
      label: t('modules.pages.carrier.colVehicleContact'),
    },
    { key: 'vehiclePhone', label: t('modules.pages.carrier.colVehiclePhone') },
    {
      key: 'vehiclePlate2',
      label: t('modules.pages.carrier.colVehiclePlate2'),
    },
    {
      key: 'vehicleContact2',
      label: t('modules.pages.carrier.colVehicleContact2'),
    },
    {
      key: 'vehiclePhone2',
      label: t('modules.pages.carrier.colVehiclePhone2'),
    },
    {
      key: 'vehiclePlate3',
      label: t('modules.pages.carrier.colVehiclePlate3'),
    },
    {
      key: 'vehicleContact3',
      label: t('modules.pages.carrier.colVehicleContact3'),
    },
    {
      key: 'vehiclePhone3',
      label: t('modules.pages.carrier.colVehiclePhone3'),
    },
    { key: 'priceMode', label: t('modules.pages.carrier.colPriceMode') },
    {
      key: 'defaultSettlementCompanyName',
      label: t('modules.pages.carrier.colDefaultSettlementCompany'),
    },
    { key: 'remark', label: t('modules.columns.remark') },
  ]

  return (
    <div className="module-record-detail-inline module-record-detail-inline-fields">
      <Row gutter={[12, 12]}>
        {detailRows.map((field) => (
          <Col key={field.key} span={6}>
            <div className="bill-detail-item">
              <span className="bill-detail-label">{field.label}</span>
              <span className="bill-detail-value">
                {displayValue(record[field.key])}
              </span>
            </div>
          </Col>
        ))}
        <Col span={6}>
          <div className="bill-detail-item">
            <span className="bill-detail-label">
              {t('modules.columns.status')}
            </span>
            <span className="bill-detail-value">
              <StatusTag
                status={asString(record.status)}
                statusMap={statusMap}
              />
            </span>
          </div>
        </Col>
      </Row>
    </div>
  )
}
