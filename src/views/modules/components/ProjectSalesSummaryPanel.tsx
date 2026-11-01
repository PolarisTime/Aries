import { ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Skeleton, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ProjectSalesSummary } from '@/api/sales/project-sales-summary'
import {
  type ProjectSalesSummaryError,
  useProjectSalesSummary,
} from '@/views/modules/use-project-sales-summary'
import { ProjectSalesSummaryContent } from './ProjectSalesSummaryContent'
import '@/styles/project-sales-summary.css'

export interface ProjectSalesSummaryPanelProps {
  /** 项目雪花 ID（字符串）；空值表示未选项目，面板整体不渲染也不发请求。 */
  projectId: string
  /** 编辑态排除本单，避免已保存的本单与本次草稿被重复计入。 */
  excludeOrderId?: string
  /** 含本单待保存金额（编辑器草稿合计，与保存载荷同口径）。 */
  pendingAmount?: number
  /** 含本单待保存吨位（编辑器草稿合计，与保存载荷同口径）。 */
  pendingTonnage?: number
  /** 编辑器内嵌 / 只读详情面（详情弹层、列表行展开）。 */
  variant?: 'editor' | 'detail'
  className?: string
}

/** 项目不存在/已停用（后端 404）：业务状态，不是可重试的加载失败。 */
const PROJECT_NOT_FOUND = 404

function ProjectSalesSummaryErrorState({
  error,
  onRetry,
}: {
  error: ProjectSalesSummaryError
  onRetry: () => void
}) {
  const { t } = useTranslation()

  if (error.status === PROJECT_NOT_FOUND) {
    return (
      <Alert
        className="project-sales-summary__error"
        type="warning"
        showIcon
        title={t('modules.projectSalesSummary.projectUnavailable')}
      />
    )
  }

  return (
    <Alert
      className="project-sales-summary__error"
      type="error"
      showIcon
      title={t('modules.projectSalesSummary.loadFailed')}
      description={
        error.message ? (
          <span className="project-sales-summary__error-detail">
            {error.message}
          </span>
        ) : undefined
      }
      action={
        <Button
          size="small"
          icon={<ReloadOutlined />}
          onClick={onRetry}
          className="project-sales-summary__retry"
        >
          {t('modules.projectSalesSummary.retry')}
        </Button>
      }
    />
  )
}

interface StateAreaProps {
  error: ProjectSalesSummaryError | null
  loading: boolean
  summary: ProjectSalesSummary | null
  retry: () => void
  variant: 'editor' | 'detail'
  pendingAmount?: number
  pendingTonnage?: number
}

/**
 * 面板主体的三种状态：加载中（骨架）/ 失败（可重试）/ 有数据。
 *
 * <p>拆成独立函数而不是在外壳 JSX 里叠条件：外壳只负责标题与容器，
 * 状态判定集中在一处（`error` 优先，其次骨架，最后数据）。</p>
 */
function ProjectSalesSummaryStateArea({
  error,
  loading,
  summary,
  retry,
  variant,
  pendingAmount,
  pendingTonnage,
}: StateAreaProps) {
  if (error) {
    return <ProjectSalesSummaryErrorState error={error} onRetry={retry} />
  }
  if (loading && !summary) {
    return (
      <Skeleton
        active
        title={false}
        paragraph={{ rows: 2 }}
        className="project-sales-summary__skeleton"
      />
    )
  }
  if (!summary) return null
  return (
    <ProjectSalesSummaryContent
      summary={summary}
      variant={variant}
      {...(pendingAmount === undefined ? {} : { pendingAmount })}
      {...(pendingTonnage === undefined ? {} : { pendingTonnage })}
    />
  )
}

/**
 * 销售订单的「项目数据」面板：订单/送货/未对账/合同额度汇总，**只读**。
 *
 * <p>三处共用同一个组件与同一个请求出口：</p>
 * <ol>
 *   <li>销售订单编辑器（新建/编辑）—— 传入草稿合计作为 `pending*`、本单 id 作为
 *     `excludeOrderId`，因此「合计金额」显示的是"保存后"的项目合计；</li>
 *   <li>订单详情弹层；</li>
 *   <li>列表行「+」展开区。</li>
 * </ol>
 *
 * <p>组件不持有任何写能力：不调用保存、不写表单字段、不触发审核。数据加载失败只影响本面板。</p>
 */
export function ProjectSalesSummaryPanel({
  projectId,
  excludeOrderId,
  pendingAmount,
  pendingTonnage,
  variant = 'detail',
  className,
}: ProjectSalesSummaryPanelProps) {
  const { t } = useTranslation()
  const { summary, loading, error, retry } = useProjectSalesSummary({
    projectId,
    ...(excludeOrderId ? { excludeOrderId } : {}),
    ...(pendingAmount === undefined ? {} : { pendingAmount }),
    ...(pendingTonnage === undefined ? {} : { pendingTonnage }),
  })

  const projectIdText = String(projectId ?? '').trim()
  if (!projectIdText) return null

  const title = t('modules.projectSalesSummary.title')
  const rootClassName = [
    'project-sales-summary',
    `project-sales-summary--${variant}`,
    ...(className ? [className] : []),
  ].join(' ')

  return (
    <section className={rootClassName} aria-label={title}>
      <div className="project-sales-summary__header">
        <Typography.Text strong className="project-sales-summary__title">
          {title}
        </Typography.Text>
        {summary?.projectName ? (
          <Typography.Text
            type="secondary"
            className="project-sales-summary__project-name"
          >
            {summary.projectName}
          </Typography.Text>
        ) : null}
      </div>

      <ProjectSalesSummaryStateArea
        error={error}
        loading={loading}
        summary={summary}
        retry={retry}
        variant={variant}
        {...(pendingAmount === undefined ? {} : { pendingAmount })}
        {...(pendingTonnage === undefined ? {} : { pendingTonnage })}
      />
    </section>
  )
}
