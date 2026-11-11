import {
  ApartmentOutlined,
  ClockCircleOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { Alert, Flex, Segmented, Tag, Typography } from 'antd'
import type { DocumentFlowTranslator } from './document-flow-meta'

export type DocumentFlowView = 'graph' | 'list' | 'timeline'

interface Props {
  isFetching: boolean
  nodeCount: number
  onViewChange: (view: DocumentFlowView) => void
  t: DocumentFlowTranslator
  truncated?: boolean
  view: DocumentFlowView
}

/**
 * 单据流弹层工具栏：单据数 + 方向图例 + 「图 / 列表 / 时间线」视图切换 + 截断提示。
 *
 * <p>列表视图是图视图的读屏替代与大图备用，时间线按日期升序看链路先后；三个视图共用
 * 同一份数据，切换只改渲染，不触发额外请求。</p>
 *
 * <p>排版全部交给 antd：`Flex` 负责两端对齐与换行，`Segmented` 承担视图切换（带图标、
 * 默认尺寸而不是 `small` —— 三个中文标签挤在 24px 高的控件里视觉上像被"压扁"），
 * `Tag` 承担图例、`Typography.Text` 承担计数。原先这一行是手写 flex + 12px 灰字拼的，
 * 与弹层其它部分（antd 组件）不成体系。</p>
 */
export function DocumentFlowToolbar({
  isFetching,
  nodeCount,
  onViewChange,
  t,
  truncated,
  view,
}: Props) {
  return (
    <>
      <Flex
        align="center"
        className="document-flow-toolbar"
        gap={12}
        justify="space-between"
        wrap
      >
        <Flex align="center" gap={8} wrap>
          <Typography.Text
            className="document-flow-summary-count"
            type="secondary"
          >
            {t('documentFlow.documentCount', { count: nodeCount })}
            {isFetching ? ' …' : ''}
          </Typography.Text>
          <span className="document-flow-legend">
            <Tag variant="filled">{t('documentFlow.legendUpstream')}</Tag>
            <span
              aria-label={t('documentFlow.legendLabel')}
              className="document-flow-legend-arrow"
              role="img"
            >
              →
            </span>
            <Tag variant="filled">{t('documentFlow.legendDownstream')}</Tag>
          </span>
        </Flex>
        {/*
          antd Segmented 根节点自带 role="radiogroup"（@rc-component/segmented），
          restProps 在默认 aria-label 之后展开，这里可以直接覆盖成业务可访问名。
        */}
        <Segmented<DocumentFlowView>
          aria-label={t('documentFlow.viewSwitchLabel')}
          className="document-flow-view-switch"
          onChange={(next) => onViewChange(next)}
          options={[
            {
              icon: <ApartmentOutlined />,
              label: t('documentFlow.viewGraph'),
              value: 'graph',
            },
            {
              icon: <UnorderedListOutlined />,
              label: t('documentFlow.viewList'),
              value: 'list',
            },
            {
              icon: <ClockCircleOutlined />,
              label: t('documentFlow.viewTimeline'),
              value: 'timeline',
            },
          ]}
          value={view}
        />
      </Flex>
      {/* 服务端达到节点/关系上限会截断；不提示就等于让用户以为这就是全部。 */}
      {truncated ? (
        <Alert
          className="document-flow-truncated"
          showIcon
          type="warning"
          title={t('documentFlow.truncated')}
        />
      ) : null}
    </>
  )
}
