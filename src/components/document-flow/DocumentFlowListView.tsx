import { Card, Empty, Flex, Tag, Typography } from 'antd'
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

const { Text, Title } = Typography

interface Props {
  currentNodeKey: string | null
  groups: DocumentFlowListGroup[]
  relations: DocumentFlowListRelation[]
  t: DocumentFlowTranslator
}

function ListRowMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="document-flow-list-row-metric">
      <Text className="document-flow-list-row-metric-label" type="secondary">
        {label}
      </Text>
      <Text className="document-flow-list-row-metric-value" strong>
        {value}
      </Text>
    </span>
  )
}

/**
 * 一个单据类型分组：antd `Card`（小尺寸）承载，内部是语义化 `ul/li` 行。
 *
 * <p>为什么行不用 antd 的列表组件：v6 已把 `List` 标为废弃，官方替代 `Listy` 是**虚拟滚动**
 * 列表（必须给定 `height`），为十来条单据撑一个固定高度反而更差；而这里的分组清单既要保留
 * 列表语义（读屏能念出「N 项」与项位置），又要跟着内容自适应高度。因此外观交给
 * `Card` + `Typography` + `Tag` + `Flex`，结构保留 `ul/li` —— 与时间线视图同一套取舍。</p>
 */
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
    <Card
      className="document-flow-list-group"
      size="small"
      title={
        <Text className="document-flow-list-group-title" strong>
          {t('documentFlow.typeCount', {
            type: documentFlowTypeLabel(t, group.type),
            count: group.entries.length,
          })}
        </Text>
      }
    >
      <ul className="document-flow-list-rows">
        {group.entries.map(({ key, node }) => {
          const isCurrent = key === currentNodeKey
          const amountText = formatDocumentFlowAmount(node.amount)
          const weightText = formatDocumentFlowWeight(node.weight)
          return (
            <li
              key={key}
              aria-current={isCurrent ? 'true' : undefined}
              className={`document-flow-list-row${
                isCurrent ? ' document-flow-list-row-current' : ''
              }`}
            >
              <Flex align="center" gap={8} wrap>
                <Text className="document-flow-list-row-no" strong>
                  {node.no ?? node.id}
                </Text>
                {node.status ? (
                  <Tag
                    className="document-flow-list-row-status"
                    variant="filled"
                  >
                    {node.status}
                  </Tag>
                ) : null}
                {node.date ? (
                  <Text
                    className="document-flow-list-row-date"
                    type="secondary"
                  >
                    {formatDate(node.date)}
                  </Text>
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
                  <Tag
                    className="document-flow-list-row-badge"
                    color="processing"
                    variant="filled"
                  >
                    {t('documentFlow.currentBadge')}
                  </Tag>
                ) : null}
              </Flex>
            </li>
          )
        })}
      </ul>
    </Card>
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
      <Flex align="center" gap={8} wrap>
        <Text className="document-flow-list-relation-no" strong>
          {relation.fromNo}
        </Text>
        <span
          aria-label={t('documentFlow.relationTo')}
          className="document-flow-list-relation-arrow"
          role="img"
        >
          →
        </span>
        <Text className="document-flow-list-relation-no" strong>
          {relation.toNo}
        </Text>
        {linkType ? (
          <Tag className="document-flow-list-relation-type" variant="filled">
            {linkType}
          </Tag>
        ) : null}
        {/* 数量/重量缺失（后端只对四条明细链路填充）时整段不渲染 */}
        {metric ? (
          <Text className="document-flow-list-metric" type="secondary">
            {metric}
          </Text>
        ) : null}
      </Flex>
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
        <Title className="document-flow-list-title" level={5}>
          {t('documentFlow.listGroupsTitle')}
        </Title>
        <div className="document-flow-list-groups">
          {groups.map((group) => (
            <DocumentFlowListGroupBlock
              key={group.type}
              currentNodeKey={currentNodeKey}
              group={group}
              t={t}
            />
          ))}
        </div>
      </section>
      <section className="document-flow-list-section">
        <Title className="document-flow-list-title" level={5}>
          {t('documentFlow.listRelationsTitle')}
        </Title>
        <Card className="document-flow-list-relations-card" size="small">
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
        </Card>
      </section>
    </div>
  )
}
