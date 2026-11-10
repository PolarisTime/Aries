import { Alert, Segmented } from 'antd'
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
      <div className="document-flow-summary">
        <span className="document-flow-summary-count">
          {t('documentFlow.documentCount', { count: nodeCount })}
          {isFetching ? ' …' : ''}
        </span>
        <span className="document-flow-legend">
          <span className="document-flow-legend-item">
            {t('documentFlow.legendUpstream')}
          </span>
          <span
            className="document-flow-legend-arrow"
            role="img"
            aria-label={t('documentFlow.legendLabel')}
          >
            →
          </span>
          <span className="document-flow-legend-item">
            {t('documentFlow.legendDownstream')}
          </span>
        </span>
        {/*
          antd Segmented 根节点自带 role="radiogroup"（@rc-component/segmented），
          restProps 在默认 aria-label 之后展开，这里可以直接覆盖成业务可访问名。
        */}
        <Segmented<DocumentFlowView>
          aria-label={t('documentFlow.viewSwitchLabel')}
          className="document-flow-view-switch"
          value={view}
          onChange={(next) => onViewChange(next)}
          options={[
            { label: t('documentFlow.viewGraph'), value: 'graph' },
            { label: t('documentFlow.viewList'), value: 'list' },
            { label: t('documentFlow.viewTimeline'), value: 'timeline' },
          ]}
          size="small"
        />
      </div>
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
