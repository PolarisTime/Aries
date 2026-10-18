import { Space, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import { getStatusColor } from '@/constants/document-status'
import { DOCUMENT_STATUS } from '@/constants/status-constants'
import type { ModulePageConfig } from '@/types/module-page'

/**
 * 编辑器弹层的标题：模块标题 + 新增/编辑模式 + 财务单据的状态标签。
 *
 * <p>从 ModuleEditorWorkspace 抽出：标题里的「模式文案」「是否渲染状态标签」
 * 「状态标签颜色」「草稿兜底」是四个独立分支，内联在大组件里既推高分支数也
 * 推高行数（react-doctor/no-high-complexity-react-function 与
 * no-giant-component）。Space/Tag 结构与文案保持逐字不变。</p>
 *
 * <p><b>状态颜色必须走 {@link getStatusColor}</b>：此前这里是自写的
 * `currentStatus === AUDITED ? 'success' : 'default'` 三元，导致同一条「草稿」在
 * 编辑器标题上渲染成灰色、在列表里渲染成金色（列表走 `DOCUMENT_STATUS_REGISTRY`）。
 * 同一业务状态两种颜色会让用户以为是两个不同状态。现在颜色只有
 * `document-status.ts` 一个出口，编辑器与列表必然一致。</p>
 */

interface Props {
  config: ModulePageConfig
  currentStatus?: string
  financeLayout: boolean
  isEdit: boolean
}

export function ModuleEditorWorkspaceTitle({
  config,
  currentStatus,
  financeLayout,
  isEdit,
}: Props) {
  const { t } = useTranslation()
  // 新增态还没有后端状态，用草稿顶替；两者都经同一出口取色
  const statusLabel = currentStatus || DOCUMENT_STATUS.DRAFT

  return (
    <Space size={8}>
      <span>
        {t('modules.editor.title', {
          mode: isEdit ? t('modules.editor.edit') : t('modules.editor.create'),
          title: config.title,
        })}
      </span>
      {financeLayout ? (
        <Tag color={getStatusColor(statusLabel)}>{statusLabel}</Tag>
      ) : null}
    </Space>
  )
}
