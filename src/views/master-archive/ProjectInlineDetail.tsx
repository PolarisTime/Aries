import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Col, Row, Spin } from 'antd'
import { useTranslation } from 'react-i18next'
import { getBusinessModuleDetail } from '@/api/business/business-crud'
import { StatusTag } from '@/components/StatusTag'
import { resolveProjectCustomerDisplay } from '@/config/business-pages/master/project-page-utils'
import { statusMap } from '@/config/business-pages/shared/shared-status'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { ModuleKey } from '@/module-system/core/module-key'
import { getCustomerOptions } from '@/queries/master/customer-options'
import type { EntityId } from '@/types/entity-id'
import type { LegacyModuleRecord } from '@/types/module-record'

import { asString } from '@/utils/type-narrowing'
import {
  displayProjectValue as displayValue,
  toAllowedSpecValues,
} from './project-page-columns'

const MODULE_KEY: ModuleKey = 'project'

export function ProjectInlineDetail({ recordId }: { recordId: EntityId }) {
  const { t } = useTranslation()
  const detail = useQuery({
    queryKey: QUERY_KEYS.businessGridDetail(MODULE_KEY, recordId),
    queryFn: ({ signal }) =>
      getBusinessModuleDetail(MODULE_KEY, recordId, signal),
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
    { key: 'projectCode', label: t('modules.pages.project.projectCode') },
    { key: 'projectName', label: t('modules.pages.project.projectName') },
    {
      key: 'projectNameAbbr',
      label: t('modules.pages.project.projectNameAbbr'),
    },
    { key: 'customerCode', label: t('modules.pages.project.customer') },
    {
      key: 'settlementCompanyName',
      label: t('modules.pages.project.settlementCompany'),
    },
    {
      key: 'projectManager',
      label: t('modules.pages.project.projectManager'),
    },
    { key: 'projectAddress', label: t('modules.pages.project.projectAddress') },
    { key: 'allowedBrands', label: t('modules.pages.project.allowedBrands') },
    {
      key: 'allowedMaterials',
      label: t('modules.pages.project.allowedMaterials'),
    },
    { key: 'remark', label: t('modules.columns.remark') },
  ]

  // 多值列以顿号拼接展示; 未配置时显示「不限制」而不是空白, 避免被误读成漏配。
  const renderDetailValue = (field: { key: string; label: string }) => {
    if (field.key === 'customerCode') {
      return resolveProjectCustomerDisplay(record, getCustomerOptions())
    }
    if (field.key === 'allowedBrands' || field.key === 'allowedMaterials') {
      const values = toAllowedSpecValues(record[field.key])
      return values.length
        ? values.join('、')
        : t('modules.pages.project.allowedSpecUnlimited')
    }
    return displayValue(record[field.key])
  }

  return (
    <div className="module-record-detail-inline module-record-detail-inline-fields">
      <Row gutter={[12, 12]}>
        {detailRows.map((field) => (
          <Col key={field.key} span={6}>
            <div className="bill-detail-item">
              <span className="bill-detail-label">{field.label}</span>
              <span className="bill-detail-value">
                {renderDetailValue(field)}
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
