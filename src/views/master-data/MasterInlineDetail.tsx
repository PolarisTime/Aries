import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Col, Row, Spin } from 'antd'
import { useTranslation } from 'react-i18next'
import { getBusinessModuleDetail } from '@/api/business/business-crud'
import { StatusTag } from '@/components/StatusTag'
import { statusMap } from '@/config/business-pages/shared/shared-status'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { LegacyModuleRecord } from '@/types/module-record'
import { asString } from '@/utils/type-narrowing'
import type { MasterDataPageSpec } from './master-data-types'
import { formatMasterValue } from './master-data-utils'

export function MasterInlineDetail({
  spec,
  recordId,
}: {
  spec: MasterDataPageSpec
  recordId: string
}) {
  const { t } = useTranslation()
  const detail = useQuery({
    queryKey: QUERY_KEYS.businessGridDetail(spec.moduleKey, recordId),
    queryFn: ({ signal }) =>
      getBusinessModuleDetail(spec.moduleKey, recordId, signal),
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
  return (
    <div className="module-record-detail-inline module-record-detail-inline-fields">
      <Row gutter={[12, 12]}>
        {spec.detailFields.map((field) => (
          <Col key={field.key} span={6}>
            <div className="bill-detail-item">
              <span className="bill-detail-label">{field.label}</span>
              <span className="bill-detail-value">
                {field.status ? (
                  <StatusTag
                    status={asString(record[field.key])}
                    statusMap={statusMap}
                  />
                ) : field.render ? (
                  field.render(record)
                ) : (
                  formatMasterValue(record[field.key])
                )}
              </span>
            </div>
          </Col>
        ))}
      </Row>
    </div>
  )
}
