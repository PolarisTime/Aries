import type { ProjectSalesSummary } from '@/api/sales/project-sales-summary'
import { ProjectSalesSummaryMetrics } from './ProjectSalesSummaryMetrics'
import { ProjectSalesSummaryQuota } from './ProjectSalesSummaryQuota'

interface Props {
  summary: ProjectSalesSummary
}

/**
 * 面板的「有数据」分支：合同额度 + 分组指标。
 *
 * <p>从 {@link ProjectSalesSummaryPanel} 拆出，一是把外壳的状态分支（加载/失败/无数据）
 * 与数据展示分开，二是让 shell 的控制流复杂度落在 react-doctor 阈值内。</p>
 *
 * <p>编辑器专属的「含本单未保存合计」不在这里：它渲染在面板 header 行右侧，
 * 紧贴单据表单的备注行下方（见 `ProjectSalesSummaryPanel`），避免成为三组指标下方
 * 一条没有视觉归属的小字。</p>
 *
 * <p>**不渲染后端 `summary.message`**：它的三种取值（额度充足 / 已超出… / 未关联有效合同）
 * 已经被本组件的本地化 UI 全部覆盖（进度条 + 超限 Alert + 无合同 Alert），再渲染一遍
 * 只会在英文界面里冒出中文重复句。字段仍保留在 schema 里（后端契约不动、保存前确认弹窗
 * 仍在消费），只是不在本面板展示。</p>
 */
export function ProjectSalesSummaryContent({ summary }: Props) {
  return (
    <>
      <ProjectSalesSummaryQuota summary={summary} />
      <ProjectSalesSummaryMetrics summary={summary} />
    </>
  )
}
