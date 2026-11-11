import { Empty, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { formatDate } from '@/utils/formatters'
import type {
  DocumentFlowListGroup,
  DocumentFlowListRelation,
} from './document-flow-list-model'
import {
  DOCUMENT_FLOW_TYPE_META,
  type DocumentFlowTranslator,
  documentFlowEdgeMetricLabel,
  documentFlowLinkTypeLabel,
  documentFlowTypeLabel,
  formatDocumentFlowAmount,
  formatDocumentFlowWeight,
} from './document-flow-meta'

const { Text } = Typography

interface Props {
  currentNodeKey: string | null
  groups: DocumentFlowListGroup[]
  relations: DocumentFlowListRelation[]
  t: DocumentFlowTranslator
}

/** 单据表的一行：把分组结构摊平成表格数据，分组信息落到「类型」列。 */
interface DocumentRow {
  key: string
  type: string
  no: string
  status?: string | null
  date?: string | null
  amountText: string
  weightText: string
}

/**
 * 列表视图：单据清单表 + 单据关系表。
 *
 * <p>两个都用 antd `Table`（`size="small"`、无分页）：列表视图的价值就在于**列对齐**与
 * 表头——把「类型 / 单号 / 状态 / 日期 / 金额 / 重量」竖着对齐，一眼能横向比较；
 * 原先按类型分组成一堆 Card、每张卡一行内联文字，既费纵向空间又看不出结构。
 * 当前查询单据通过 `rowClassName` 高亮（与图视图的当前节点同一含义）。</p>
 *
 * <p>汇总口径仍复用 {@link formatDocumentFlowAmount} / {@link formatDocumentFlowWeight}，
 * 与图、时间线视图同一处出口；缺失值渲染成 `—` 而不是 0。</p>
 */
export function DocumentFlowListView({
  currentNodeKey,
  groups,
  relations,
  t,
}: Props) {
  const rows: DocumentRow[] = groups.flatMap((group) =>
    group.entries.map(({ key, node }) => ({
      key,
      type: node.type,
      no: node.no ?? node.id,
      status: node.status,
      date: node.date,
      amountText: formatDocumentFlowAmount(node.amount),
      weightText: formatDocumentFlowWeight(node.weight),
    })),
  )

  const columns: ColumnsType<DocumentRow> = [
    {
      dataIndex: 'type',
      key: 'type',
      title: t('documentFlow.columnType'),
      width: 132,
      render: (type: string) => {
        const meta = DOCUMENT_FLOW_TYPE_META[type]
        return (
          <Tag color={meta?.color} variant="filled">
            {documentFlowTypeLabel(t, type)}
          </Tag>
        )
      },
    },
    {
      dataIndex: 'no',
      key: 'no',
      title: t('documentFlow.columnNo'),
      render: (no: string) => (
        <Text className="document-flow-list-no" strong>
          {no}
        </Text>
      ),
    },
    {
      dataIndex: 'status',
      key: 'status',
      title: t('documentFlow.columnStatus'),
      width: 104,
      render: (status: string | null | undefined) =>
        status ? (
          <Tag variant="filled">{status}</Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      dataIndex: 'date',
      key: 'date',
      title: t('documentFlow.columnDate'),
      width: 128,
      render: (date: string | null | undefined) => (
        <Text className="document-flow-list-date" type="secondary">
          {date ? formatDate(date) : '—'}
        </Text>
      ),
    },
    {
      align: 'right',
      dataIndex: 'amountText',
      key: 'amount',
      title: t('documentFlow.amount'),
      width: 132,
      render: (value: string) =>
        value ? (
          <Text className="document-flow-list-number" strong>
            {value}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      align: 'right',
      dataIndex: 'weightText',
      key: 'weight',
      title: t('documentFlow.weight'),
      width: 112,
      render: (value: string) =>
        value ? (
          <Text className="document-flow-list-number">{value}</Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
  ]

  const relationColumns: ColumnsType<DocumentFlowListRelation> = [
    {
      dataIndex: 'fromNo',
      key: 'fromNo',
      title: t('documentFlow.columnFromNo'),
      render: (no: string) => (
        <Text className="document-flow-list-no" strong>
          {no}
        </Text>
      ),
    },
    {
      align: 'center',
      key: 'arrow',
      title: '',
      width: 48,
      render: () => (
        <span
          aria-label={t('documentFlow.relationTo')}
          className="document-flow-list-relation-arrow"
          role="img"
        >
          →
        </span>
      ),
    },
    {
      dataIndex: 'toNo',
      key: 'toNo',
      title: t('documentFlow.columnToNo'),
      render: (no: string) => (
        <Text className="document-flow-list-no" strong>
          {no}
        </Text>
      ),
    },
    {
      dataIndex: 'linkType',
      key: 'linkType',
      title: t('documentFlow.columnRelation'),
      width: 104,
      render: (linkType: string | undefined) => {
        const label = documentFlowLinkTypeLabel(t, linkType)
        return label ? (
          <Tag variant="filled">{label}</Tag>
        ) : (
          <Text type="secondary">—</Text>
        )
      },
    },
    {
      align: 'right',
      key: 'metric',
      title: t('documentFlow.columnQuantityWeight'),
      width: 168,
      render: (_, relation) => {
        const metric = documentFlowEdgeMetricLabel(t, relation)
        // 数量/重量缺失（后端只对四条明细链路填充）时渲染占位，不补 0
        return metric ? (
          <Text className="document-flow-list-metric">{metric}</Text>
        ) : (
          <Text type="secondary">—</Text>
        )
      },
    },
  ]

  const rowClassName = (record: DocumentRow) =>
    record.key === currentNodeKey ? 'document-flow-list-row-current' : ''

  return (
    <div className="document-flow-list">
      <section className="document-flow-list-section">
        <Text className="document-flow-list-title" strong>
          {t('documentFlow.listGroupsTitle')}
        </Text>
        <Table<DocumentRow>
          className="document-flow-list-table document-flow-list-doc-table"
          columns={columns}
          dataSource={rows}
          pagination={false}
          rowClassName={rowClassName}
          rowKey="key"
          size="small"
          scroll={{ y: 288 }}
        />
      </section>
      <section className="document-flow-list-section">
        <Text className="document-flow-list-title" strong>
          {t('documentFlow.listRelationsTitle')}
        </Text>
        {relations.length ? (
          <Table<DocumentFlowListRelation>
            className="document-flow-list-table document-flow-list-relation-table"
            columns={relationColumns}
            dataSource={relations}
            pagination={false}
            rowKey="key"
            size="small"
            scroll={{ y: 200 }}
          />
        ) : (
          <Empty
            className="document-flow-list-empty"
            description={t('documentFlow.listRelationsEmpty')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </section>
    </div>
  )
}
