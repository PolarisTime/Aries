import type { TableColumnsType } from 'antd'
import Button from 'antd/es/button'
import Col from 'antd/es/col'
import Empty from 'antd/es/empty'
import Flex from 'antd/es/flex'
import Row from 'antd/es/row'
import Spin from 'antd/es/spin'
import { useTranslation } from 'react-i18next'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import { shouldDisplayPieceWeightAsDash } from '@/module-system/module-line-item-display'
import { useModuleRecordHelpers } from '@/hooks/useModuleRecordHelpers'
import { resolveModuleActionIcon } from '@/module-system/module-action-icons'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { padLabel } from '@/utils/label-utils'
import { asString } from '@/utils/type-narrowing'
import { ModuleItemsPanel } from './ModuleItemsPanel'
import { ModuleItemsTable } from './ModuleItemsTable'
import { PieceWeightPopover } from './PieceWeightPopover'
import { resolvePieceWeightLookupSource } from './piece-weight-source'
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
      align: column.align,
      render:
        column.dataIndex === 'weightTon'
          ? (value: unknown, record: ModuleLineItem) => {
              const lookupSource = resolvePieceWeightLookupSource(
                config.key,
                record,
              )
              return (
                <PieceWeightPopover
                  itemId={record.id}
                  weightTon={asString(value)}
                  category={
                    typeof record.category === 'string'
                      ? record.category
                      : undefined
                  }
                  inboundItemId={lookupSource.inboundItemId}
                  purchaseOrderItemId={lookupSource.purchaseOrderItemId}
                  salesOrderItemId={lookupSource.salesOrderItemId}
                />
              )
            }
          : (value: unknown, record: ModuleLineItem) =>
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
          <Row gutter={[12, 12]}>
            {detailFields.map((field) => {
              const colDef = config.columns.find(
                (c) => c.dataIndex === field.key,
              )
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
                      {formatCellValue(
                        record[field.key],
                        colDef?.type || field.type,
                      )}
                    </span>
                  </div>
                </Col>
              )
            })}
          </Row>

          {detailItemColumns.length ? (
            <ModuleItemsPanel
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
