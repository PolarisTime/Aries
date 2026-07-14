import type { TableColumnsType } from 'antd'
import { Button, Col, Empty, Flex, Row, Spin } from 'antd'
import { useTranslation } from 'react-i18next'
import { renderModuleRecordStatus } from '@/components/ModuleRecordStatus'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import { useModuleRecordHelpers } from '@/hooks/useModuleRecordHelpers'
import { resolveModuleActionIcon } from '@/module-system/module-action-icons'
import { shouldDisplayPieceWeightAsDash } from '@/module-system/module-line-item-display'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { padLabel } from '@/utils/label-utils'
import { ModuleItemsPanel } from './ModuleItemsPanel'
import { ModuleItemsTable } from './ModuleItemsTable'
import { WorkspaceOverlay } from './WorkspaceOverlay'

interface Props {
  open: boolean
  config: ModulePageConfig
  record: ModuleRecord | null
  loading: boolean
  canPrint?: boolean
  onClose: () => void
}

export function ModuleRecordDetailOverlay({
  open,
  config,
  record,
  loading,
  canPrint = false,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const { formatCellValue } = useModuleDisplaySupport()
  const { getPrimaryNo } = useModuleRecordHelpers({
    moduleKey: config.key,
    config,
  })
  const detailItemColumns = config.detailItemColumns || config.itemColumns || []
  const detailTableColumns: TableColumnsType<ModuleLineItem> =
    detailItemColumns.map((column) => ({
      title: column.title,
      dataIndex: column.dataIndex,
      key: column.dataIndex,
      width: column.width,
      align: 'center',
      render: (value: unknown, record: ModuleLineItem) =>
        column.dataIndex === 'pieceWeightTon' &&
        shouldDisplayPieceWeightAsDash(record)
          ? '-'
          : formatCellValue(value, column.type),
    }))
  const detailFields = config.detailFields || []
  const colSpan = Math.max(
    6,
    Math.min(12, 24 / Math.max(1, Math.min(detailFields.length || 1, 4))),
  )

  return (
    <WorkspaceOverlay
      open={open}
      title={
        record
          ? `${config.title}${t('modules.detail.titleSuffix')} - ${getPrimaryNo(record)}`
          : t('modules.detail.recordDetail')
      }
      onClose={onClose}
    >
      {loading ? (
        <Flex justify="center" align="center" className="py-64">
          <Spin />
        </Flex>
      ) : !record ? (
        <Empty description={t('modules.detail.noData')} />
      ) : (
        <>
          {detailFields.length ? (
            <Row gutter={[12, 12]}>
              {detailFields.map((field) => {
                const colDef = config.columns.find(
                  (c) => c.dataIndex === field.key,
                )
                const fieldType = colDef?.type || field.type
                return (
                  <Col
                    key={field.key}
                    xs={field.fullRow ? 24 : 24}
                    sm={field.fullRow ? 24 : 12}
                    lg={field.fullRow ? 24 : colSpan}
                  >
                    <div className="bill-detail-item">
                      <span className="bill-detail-label">
                        {padLabel(field.label)}
                      </span>
                      <span className="bill-detail-value">
                        {field.key === 'pieceWeightTon' &&
                        shouldDisplayPieceWeightAsDash(record)
                          ? '-'
                          : fieldType === 'status'
                            ? renderModuleRecordStatus({
                                record,
                                statusKey: field.key,
                                statusMap: config.statusMap,
                                renderFallback: (status) =>
                                  formatCellValue(status, fieldType),
                              })
                            : colDef?.render
                              ? colDef.render(record[field.key], record)
                              : formatCellValue(record[field.key], fieldType)}
                      </span>
                    </div>
                  </Col>
                )
              })}
            </Row>
          ) : null}

          {detailItemColumns.length ? (
            <ModuleItemsPanel
              title={config.detailItemTitle}
              className="module-detail-items-panel"
              items={record.items || []}
              itemColumns={detailItemColumns}
              actions={
                <>
                  <Button
                    className="overlay-action-button"
                    icon={resolveModuleActionIcon('关闭')}
                    onClick={onClose}
                  >
                    {t('modules.detail.close')}
                  </Button>
                  {canPrint ? (
                    <Button
                      className="overlay-action-button"
                      icon={resolveModuleActionIcon('打印')}
                    >
                      {t('modules.detail.print')}
                    </Button>
                  ) : null}
                </>
              }
            >
              <ModuleItemsTable
                columns={detailTableColumns}
                dataSource={record.items || []}
                emptyText={t('modules.detail.noDetailItems')}
              />
            </ModuleItemsPanel>
          ) : (
            <div className="mt-20">
              <Button
                className="overlay-action-button"
                icon={resolveModuleActionIcon('关闭')}
                onClick={onClose}
              >
                {t('modules.detail.close')}
              </Button>
              {canPrint && (
                <Button
                  className="overlay-action-button ml-8"
                  icon={resolveModuleActionIcon('打印')}
                >
                  {t('modules.detail.print')}
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </WorkspaceOverlay>
  )
}
