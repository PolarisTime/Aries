import { Typography } from 'antd'
import {
  type DocumentFlowTranslator,
  documentFlowTypeLabel,
} from './document-flow-meta'
import { FLOW_HEADER_HEIGHT, type FlowLayoutHeader } from './flow-layout'

interface Props {
  headers: FlowLayoutHeader[]
  t: DocumentFlowTranslator
}

/**
 * 列头层：每列顶部「单据类型 · N 张」（同层混排按类型分组拼接）。
 *
 * <p>与节点同列、随画布横向滚动，因此绝对定位在画布顶部预留的列头带里
 * （高度见 {@link FLOW_HEADER_HEIGHT}）。文字用 antd `Typography.Text` 的次要色 + 加粗，
 * 与节点卡里同类信息的层级一致，不再手写 12px 灰字。</p>
 */
export function DocumentFlowColumnHeaders({ headers, t }: Props) {
  return (
    <>
      {headers.map((header) => (
        <div
          key={`level:${header.level}`}
          className="document-flow-column-header"
          style={{
            left: header.x,
            width: header.width,
            height: FLOW_HEADER_HEIGHT,
          }}
        >
          <Typography.Text className="document-flow-column-header-text" strong>
            {header.types
              .map((group) =>
                t('documentFlow.typeCount', {
                  type: documentFlowTypeLabel(t, group.type),
                  count: group.count,
                }),
              )
              .join(' · ')}
          </Typography.Text>
        </div>
      ))}
    </>
  )
}
