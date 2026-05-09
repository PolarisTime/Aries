import { Button, Col, Empty, Flex, Row, Spin, Typography } from 'antd'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import { useModuleRecordHelpers } from '@/hooks/useModuleRecordHelpers'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { padLabel } from '@/utils/label-utils'
import { resolveModuleActionIcon } from '@/views/modules/module-action-icons'
import { EditorItemsSummary } from './EditorItemsSummary'
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
  const { formatCellValue } = useModuleDisplaySupport()
  const { getPrimaryNo } = useModuleRecordHelpers({
    moduleKey: config.key,
    config,
  })
  const detailFields = config.detailFields || []
  const colSpan = Math.max(
    6,
    Math.min(12, 24 / Math.max(1, Math.min(detailFields.length || 1, 4))),
  )

  return (
    <WorkspaceOverlay
      open={open}
      title={
        record ? `${config.title}详情 - ${getPrimaryNo(record)}` : '记录详情'
      }
      onClose={onClose}
    >
      {loading ? (
        <Flex justify="center" align="center" style={{ paddingBlock: 64 }}>
          <Spin />
        </Flex>
      ) : !record ? (
        <Empty description="暂无数据" />
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

          <div
            className={`editor-items-head ${config.itemColumns?.length ? '' : 'editor-items-head-standalone'}`}
            style={{ marginTop: 20, justifyContent: 'flex-start', gap: 16 }}
          >
            <div className="editor-items-actions">
              <Button
                className="overlay-action-button"
                icon={resolveModuleActionIcon('关闭')}
                onClick={onClose}
              >
                关闭
              </Button>
              {canPrint && (
                <Button
                  className="overlay-action-button"
                  icon={resolveModuleActionIcon('打印')}
                >
                  打印
                </Button>
              )}
            </div>
            <div className="editor-items-title-block">
              <Typography.Title level={5} className="detail-section-title">
                {config.itemColumns?.length ? '明细列表' : '操作'}
              </Typography.Title>
            </div>
            {config.itemColumns?.length ? (
              <EditorItemsSummary
                items={record.items || []}
                className="editor-items-summary-inline"
              />
            ) : null}
          </div>

          {config.itemColumns?.length ? (
            record.items?.length ? (
              <div className="module-detail-table">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {config.itemColumns.map((column) => (
                        <th key={column.dataIndex}>{column.title}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {record.items.map((item) => (
                      <tr key={item.id}>
                        {config.itemColumns?.map((column) => (
                          <td key={column.dataIndex}>
                            {formatCellValue(
                              item[column.dataIndex],
                              column.type,
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty description="暂无明细数据" />
            )
          ) : null}
        </>
      )}
    </WorkspaceOverlay>
  )
}
