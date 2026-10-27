import { ReloadOutlined } from '@ant-design/icons'
import type { DescriptionsProps } from 'antd'
import { Button, Descriptions, Empty, Flex, Spin } from 'antd'
import { useTranslation } from 'react-i18next'
import { AppResult } from '@/components/AppResult'
import {
  formatDocumentReferenceText,
  isDocumentReferenceField,
} from '@/components/document-reference/document-reference-utils'
import { renderModuleRecordStatus } from '@/components/ModuleRecordStatus'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import { resolveModuleActionIcon } from '@/module-system/presentation/module-action-icons'
import { shouldDisplayPieceWeightAsDash } from '@/module-system/presentation/module-line-item-display'
import type {
  ModuleDetailField,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { ModuleItemGroupsView } from './ModuleItemGroupsView'
import { ModuleItemsPanel } from './ModuleItemsPanel'
import { buildModuleItemGroups } from './module-item-groups'
import { buildDetailItemColumns } from './module-record-detail-columns'

/**
 * 详情弹窗的内容区：加载中 / 加载失败 / 无数据 / 详情字段 + 只读明细。
 *
 * <p>从 ModuleRecordDetailOverlay 抽出的原因有两条：一是弹窗外壳（标题、关闭）
 * 与内容加载态是两件独立的事；二是原来「三态嵌套三元 + 字段网格的
 * 五层嵌套三元」让这个函数的嵌套深度达到 5，超出 react-doctor 阈值
 * (no-high-complexity-react-function)。这里改成早返回 + 每个字段一个取值组件，
 * 嵌套深度回到 1~2，DOM 结构与类名逐字保持原样。</p>
 */

interface Props {
  config: ModulePageConfig
  error: unknown
  loading: boolean
  onClose: () => void
  onRetry: () => void
  record: ModuleRecord | null
  canPrint?: boolean
}

function getDetailErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }
  if (typeof error === 'string' && error.trim()) {
    return error.trim()
  }
  return fallback
}

interface FieldValueProps {
  config: ModulePageConfig
  field: ModuleDetailField
  formatCellValue: (value: unknown, columnType?: string) => string
  record: ModuleRecord
}

/** 单个详情字段的取值：单重占位 / 单据引用 / 状态 / 列自定义渲染 / 通用格式化。 */
function ModuleRecordDetailFieldValue({
  config,
  field,
  formatCellValue,
  record,
}: FieldValueProps) {
  if (
    field.key === 'pieceWeightTon' &&
    shouldDisplayPieceWeightAsDash(record)
  ) {
    return <>-</>
  }
  const colDef = config.columns.find((c) => c.dataIndex === field.key)
  const fieldType = colDef?.type || field.type
  if (isDocumentReferenceField(field.key)) {
    // 单据引用字段只展示单号纯文本（文本口径见 formatDocumentReferenceText）
    return formatDocumentReferenceText(record[field.key]) || '-'
  }
  if (fieldType === 'status') {
    return renderModuleRecordStatus({
      record,
      statusKey: field.key,
      statusMap: config.statusMap,
      renderFallback: (status) => formatCellValue(status, fieldType),
    })
  }
  if (colDef?.render) {
    return colDef.render(record[field.key], record)
  }
  return formatCellValue(record[field.key], fieldType)
}

interface FieldGridProps {
  config: ModulePageConfig
  fields: ModuleDetailField[]
  formatCellValue: (value: unknown, columnType?: string) => string
  record: ModuleRecord
}

/** 详情字段网格最多几列（与改造前的 24 栅格上限一致）。 */
const DETAIL_FIELD_MAX_COLUMNS = 4
/** 值超过这个字符数就让出两列（纯展示口径，按值字面长度，不参与业务计算）。 */
const DETAIL_FIELD_WIDE_TEXT_LENGTH = 24

/**
 * 单个字段占几列：`fullRow` 占满整行，长文本占两列，其余一列。
 *
 * <p>跨列是安全的：网格现在是 `table-layout: fixed` + `width: 100%`，列宽由第一行决定，
 * 后面行即使有 `colspan` 也不会反过来按内容重分布（之前 auto 布局下就会，把 18 位单号
 * 挤进 100px 的内容格里折行）。</p>
 */
export function resolveDetailFieldSpan({
  fullRow,
  textLength,
  columnCount,
}: {
  fullRow?: boolean
  textLength: number
  columnCount: number
}) {
  if (fullRow) return columnCount
  if (textLength > DETAIL_FIELD_WIDE_TEXT_LENGTH)
    return Math.min(2, columnCount)
  return 1
}

/**
 * 详情字段网格：用 antd `Descriptions`（`bordered` + `size="small"`）呈现。
 *
 * <p>此前是「每个字段一个带边框的小卡片」：一屏八九个等重的方块，标签还用全角空格右补白，
 * 左缘参差、长文本（项目名称）在窄卡片里折成三行，整块读起来像表单而不是"单据详情"。
 * 换成 Descriptions 后是 antd 标准的「标签列 + 内容列」表格：标签统一右对齐、等宽、
 * 底色区分，值按列宽自动换行，整屏只剩一套边框。</p>
 *
 * <p>列数按字段数收敛（1~4），并对长文本让出双列：长文本按字面长度判断，纯展示口径，
 * 不涉及任何业务计算。</p>
 */
function ModuleRecordDetailFieldGrid({
  config,
  fields,
  formatCellValue,
  record,
}: FieldGridProps) {
  const columnCount = Math.max(
    1,
    Math.min(DETAIL_FIELD_MAX_COLUMNS, fields.length),
  )
  const items: DescriptionsProps['items'] = fields.map((field) => {
    const value = (
      <ModuleRecordDetailFieldValue
        key={field.key}
        config={config}
        field={field}
        formatCellValue={formatCellValue}
        record={record}
      />
    )
    return {
      key: field.key,
      label: field.label,
      children: value,
      span: resolveDetailFieldSpan({
        fullRow: field.fullRow,
        textLength: String(record[field.key] ?? '').length,
        columnCount,
      }),
    }
  })
  return (
    <Descriptions
      className="module-record-detail-descriptions"
      bordered
      size="small"
      /* 窄屏逐级降列：详情弹层在小屏上不再横向挤成一条 */
      column={{ xs: 1, sm: 2, md: 2, lg: 3, xl: columnCount, xxl: columnCount }}
      items={items}
    />
  )
}

export function ModuleRecordDetailContent({
  config,
  error,
  loading,
  onClose,
  onRetry,
  record,
  canPrint = false,
}: Props) {
  const { t } = useTranslation()
  const { formatCellValue } = useModuleDisplaySupport()

  if (loading) {
    return (
      <Flex justify="center" align="center" className="py-64">
        <Spin />
      </Flex>
    )
  }

  if (error != null) {
    return (
      <AppResult
        className="app-result--workspace"
        status="error"
        title={t('api.loadFailed')}
        subTitle={getDetailErrorMessage(error, t('result.error.subTitle'))}
        extra={
          <Button type="primary" icon={<ReloadOutlined />} onClick={onRetry}>
            {t('errorBoundary.retry')}
          </Button>
        }
      />
    )
  }

  if (!record) {
    return <Empty description={t('modules.detail.noData')} />
  }

  const detailItemColumns = config.detailItemColumns || config.itemColumns || []
  const detailFields = config.detailFields || []
  const detailItemGroups = buildModuleItemGroups(config.key, record.items || [])
  const detailTableColumns = buildDetailItemColumns({
    columns: detailItemColumns,
    formatCellValue,
  })

  return (
    <>
      {/* 只读详情面的模块级附加节点(如销售订单网价核查): 无 UI, 只负责准备派生展示的数据。 */}
      {config.renderDetailExtras?.({ record })}
      {detailFields.length ? (
        <ModuleRecordDetailFieldGrid
          config={config}
          fields={detailFields}
          formatCellValue={formatCellValue}
          record={record}
        />
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
          <ModuleItemGroupsView
            groups={detailItemGroups}
            moduleKey={config.key}
            columns={detailTableColumns}
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
  )
}
