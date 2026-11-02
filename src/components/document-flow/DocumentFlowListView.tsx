import { Empty, Tag } from 'antd'
import { formatDate } from '@/utils/formatters'
import type {
  DocumentFlowListGroup,
  DocumentFlowListRelation,
} from './document-flow-list-model'
import {
  type DocumentFlowTranslator,
  documentFlowEdgeMetricLabel,
  documentFlowLinkTypeLabel,
  documentFlowTypeLabel,
  formatDocumentFlowAmount,
  formatDocumentFlowWeight,
} from './document-flow-meta'

interface Props {
  currentNodeKey: string | null
  groups: DocumentFlowListGroup[]
  relations: DocumentFlowListRelation[]
  t: DocumentFlowTranslator
}

function ListRowMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="document-flow-list-row-metric">
      <span className="document-flow-list-row-metric-label">{label}</span>
      <span className="document-flow-list-row-metric-value">{value}</span>
    </span>
  )
}

function DocumentFlowListGroupBlock({
  currentNodeKey,
  group,
  t,
}: {
  currentNodeKey: string | null
  group: DocumentFlowListGroup
  t: DocumentFlowTranslator
}) {
  return (
    <div className="document-flow-list-group">
      <div className="document-flow-list-group-title">
        {t('documentFlow.typeCount', {
          type: documentFlowTypeLabel(t, group.type),
          count: group.entries.length,
        })}
      </div>
      <ul className="document-flow-list-rows">
        {group.entries.map(({ key, node }) => {
          const isCurrent = key === currentNodeKey
          const amountText = formatDocumentFlowAmount(node.amount)
          const weightText = formatDocumentFlowWeight(node.weight)
          return (
            <li
              key={key}
              className={`document-flow-list-row${isCurrent ? ' document-flow-list-row-current' : ''}`}
              aria-current={isCurrent ? 'true' : undefined}
            >
              <span className="document-flow-list-row-no">
                {node.no ?? node.id}
              </span>
              {node.status ? (
                <Tag className="document-flow-list-row-status">
                  {node.status}
                </Tag>
              ) : null}
              {node.date ? (
                <span className="document-flow-list-row-date">
                  {formatDate(node.date)}
                </span>
              ) : null}
              {amountText ? (
                <ListRowMetric
                  label={t('documentFlow.amount')}
                  value={amountText}
                />
              ) : null}
              {weightText ? (
                <ListRowMetric
                  label={t('documentFlow.weight')}
                  value={weightText}
                />
              ) : null}
              {isCurrent ? (
                <span className="document-flow-list-row-badge">
                  {t('documentFlow.currentBadge')}
                </span>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function DocumentFlowListRelationRow({
  relation,
  t,
}: {
  relation: DocumentFlowListRelation
  t: DocumentFlowTranslator
}) {
  const metric = documentFlowEdgeMetricLabel(t, relation)
  const linkType = documentFlowLinkTypeLabel(t, relation.linkType)
  return (
    <li className="document-flow-list-relation">
      <span className="document-flow-list-relation-no">{relation.fromNo}</span>
      <span
        className="document-flow-list-relation-arrow"
        role="img"
        aria-label={t('documentFlow.relationTo')}
      >
        →
      </span>
      <span className="document-flow-list-relation-no">{relation.toNo}</span>
      {linkType ? (
        <span className="document-flow-list-relation-type">{linkType}</span>
      ) : null}
      {/* 数量/重量缺失（后端只对四条明细链路填充）时整段不渲染 */}
      {metric ? (
        <span className="document-flow-list-metric">{metric}</span>
      ) : null}
    </li>
  )
}

/**
 * 列表视图：按类型分组的单据清单 + 单据关系清单。
 *
 * <p>与图视图共用同一份 `data.nodes/links`，纯展示、不额外请求；切换视图不改变
 * 弹层其它状态（查询、滚动位置由外层保留）。</p>
 */
export function DocumentFlowListView({
  currentNodeKey,
  groups,
  relations,
  t,
}: Props) {
  return (
    <div className="document-flow-list">
      <section className="document-flow-list-section">
        <h4 className="document-flow-list-title">
          {t('documentFlow.listGroupsTitle')}
        </h4>
        {groups.map((group) => (
          <DocumentFlowListGroupBlock
            key={group.type}
            currentNodeKey={currentNodeKey}
            group={group}
            t={t}
          />
        ))}
      </section>
      <section className="document-flow-list-section">
        <h4 className="document-flow-list-title">
          {t('documentFlow.listRelationsTitle')}
        </h4>
        {relations.length ? (
          <ul className="document-flow-list-relations">
            {relations.map((relation) => (
              <DocumentFlowListRelationRow
                key={relation.key}
                relation={relation}
                t={t}
              />
            ))}
          </ul>
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
