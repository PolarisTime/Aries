import type { TableColumnsType } from 'antd'
import { Alert, Button, Col, Empty, Row, Spin } from 'antd'
import { useTranslation } from 'react-i18next'
import { AppResult } from '@/components/AppResult'
import { DocumentReferencePopover } from '@/components/DocumentReferencePopover'
import { isDocumentReferenceField } from '@/components/document-reference/document-reference-utils'
import { renderModuleRecordStatus } from '@/components/ModuleRecordStatus'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import { shouldDisplayPieceWeightAsDash } from '@/module-system/presentation/module-line-item-display'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { padLabel } from '@/utils/label-utils'
import { groupCustomerStatementItems } from '@/views/modules/customer-statement-item-groups'
import {
  groupFreightBillItems,
  groupFreightStatementItems,
} from '@/views/modules/freight-statement-item-groups'
import { CustomerStatementItemGroupHeader } from './CustomerStatementItemGroupHeader'
import {
  FreightStatementItemGroupHeader,
  FreightStatementProjectGroupHeader,
} from './FreightStatementItemGroupHeader'
import { ModuleItemsTable } from './ModuleItemsTable'

interface Props {
  config: ModulePageConfig
  record: ModuleRecord | null
  loading: boolean
  error: unknown
  onRetry: () => void
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }
  if (typeof error === 'string' && error.trim()) {
    return error.trim()
  }
  return fallback
}

/** 列表行展开后的轻量详情视图；不创建新的浮层，避免打断列表上下文。 */
export function ModuleRecordDetailInline({
  config,
  record,
  loading,
  error,
  onRetry,
}: Props) {
  const { t } = useTranslation()
  const { formatCellValue } = useModuleDisplaySupport()
  const itemColumns = config.detailItemColumns || config.itemColumns || []
  const tableColumns: TableColumnsType<ModuleLineItem> = itemColumns.map(
    (column) => ({
      title: column.title,
      dataIndex: column.dataIndex,
      key: column.dataIndex,
      width: column.width,
      align: column.align || 'center',
      render: (value: unknown, item: ModuleLineItem) => {
        if (
          column.dataIndex === 'pieceWeightTon' &&
          shouldDisplayPieceWeightAsDash(item)
        ) {
          return '-'
        }
        if (isDocumentReferenceField(column.dataIndex)) {
          return (
            <DocumentReferencePopover
              value={value}
              fieldKey={column.dataIndex}
              contextModuleKey={config.key}
              documentLabel={column.title}
              summary={{
                counterpartyName:
                  typeof item.customerName === 'string'
                    ? item.customerName
                    : typeof item.supplierName === 'string'
                      ? item.supplierName
                      : typeof item.carrierName === 'string'
                        ? item.carrierName
                        : undefined,
                amount:
                  typeof item.amount === 'number' ||
                  typeof item.amount === 'string'
                    ? item.amount
                    : undefined,
                status:
                  typeof item.status === 'string' ? item.status : undefined,
              }}
            />
          )
        }
        return formatCellValue(value, column.type)
      },
    }),
  )

  if (loading) {
    return (
      <div className="module-record-detail-inline-state">
        <Spin size="small" />
        <span>{t('common.loading')}</span>
      </div>
    )
  }

  if (error != null) {
    return (
      <div className="module-record-detail-inline-state">
        <Alert
          type="error"
          showIcon
          title={t('api.loadFailed')}
          description={getErrorMessage(error, t('result.error.subTitle'))}
          action={
            <Button size="small" type="primary" onClick={onRetry}>
              {t('errorBoundary.retry')}
            </Button>
          }
        />
      </div>
    )
  }

  if (!record) {
    return (
      <div className="module-record-detail-inline-state">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('modules.detail.noData')}
        />
      </div>
    )
  }

  if (!tableColumns.length) {
    return (
      <div className="module-record-detail-inline module-record-detail-inline-fields">
        {config.detailFields.length ? (
          <Row gutter={[12, 12]}>
            {config.detailFields.map((field) => {
              const column = config.columns.find(
                (item) => item.dataIndex === field.key,
              )
              const fieldType = column?.type || field.type
              const value = record[field.key]
              return (
                <Col key={field.key} span={field.fullRow ? 24 : 6}>
                  <div className="bill-detail-item">
                    <span className="bill-detail-label">
                      {padLabel(field.label)}
                    </span>
                    <span className="bill-detail-value">
                      {fieldType === 'status'
                        ? renderModuleRecordStatus({
                            record,
                            statusKey: field.key,
                            statusMap: config.statusMap,
                            renderFallback: (status) =>
                              formatCellValue(status, fieldType),
                          })
                        : column?.render
                          ? column.render(value, record)
                          : formatCellValue(value, fieldType)}
                    </span>
                  </div>
                </Col>
              )
            })}
          </Row>
        ) : (
          <AppResult
            status="info"
            title={t('modules.detail.noDetailItems')}
            className="module-record-detail-inline-empty"
          />
        )}
      </div>
    )
  }

  const items = record.items || []
  const renderItems = () => {
    if (config.key === 'freight-bill') {
      const groups = groupFreightBillItems(items)
      if (!groups.length) {
        return (
          <ModuleItemsTable
            columns={tableColumns}
            dataSource={items}
            emptyText={t('modules.detail.noDetailItems')}
          />
        )
      }
      return (
        <div className="module-items-groups">
          {groups.map((group) => (
            <div className="module-items-group" key={group.key}>
              <div className="module-items-project-group">
                <FreightStatementProjectGroupHeader group={group} />
                <ModuleItemsTable
                  columns={tableColumns}
                  dataSource={group.items}
                  emptyText={t('modules.detail.noDetailItems')}
                />
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (config.key === 'freight-statement') {
      const groups = groupFreightStatementItems(items)
      if (!groups.length) {
        return (
          <ModuleItemsTable
            columns={tableColumns}
            dataSource={items}
            emptyText={t('modules.detail.noDetailItems')}
          />
        )
      }
      return (
        <div className="module-items-groups">
          {groups.map((group) => (
            <div className="module-items-group" key={group.key}>
              <FreightStatementItemGroupHeader group={group} />
              {group.projectGroups.map((projectGroup) => (
                <div
                  className="module-items-project-group"
                  key={projectGroup.key}
                >
                  <FreightStatementProjectGroupHeader
                    group={projectGroup}
                    showSubtotal={false}
                  />
                  <ModuleItemsTable
                    columns={tableColumns}
                    dataSource={projectGroup.items}
                    emptyText={t('modules.detail.noDetailItems')}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )
    }

    if (config.key === 'customer-statement') {
      const groups = groupCustomerStatementItems(items)
      if (!groups.length) {
        return (
          <ModuleItemsTable
            columns={tableColumns}
            dataSource={items}
            emptyText={t('modules.detail.noDetailItems')}
          />
        )
      }
      return (
        <div className="module-items-groups">
          {groups.map((group) => (
            <div className="module-items-group" key={group.key}>
              <CustomerStatementItemGroupHeader group={group} />
              <ModuleItemsTable
                columns={tableColumns}
                dataSource={group.items}
                emptyText={t('modules.detail.noDetailItems')}
              />
            </div>
          ))}
        </div>
      )
    }

    return (
      <ModuleItemsTable
        columns={tableColumns}
        dataSource={items}
        emptyText={t('modules.detail.noDetailItems')}
      />
    )
  }

  return <div className="module-record-detail-inline">{renderItems()}</div>
}
