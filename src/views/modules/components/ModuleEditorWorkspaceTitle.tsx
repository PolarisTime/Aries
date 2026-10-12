import { Space, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import { DOCUMENT_STATUS } from '@/constants/status-constants'
import type { ModulePageConfig } from '@/types/module-page'

/**
 * 编辑器弹层的标题：模块标题 + 新增/编辑模式 + 财务单据的状态标签。
 *
 * <p>从 ModuleEditorWorkspace 抽出：标题里的「模式文案」「是否渲染状态标签」
 * 「状态标签颜色」「草稿兜底」是四个独立分支，内联在大组件里既推高分支数也
 * 推高行数（react-doctor/no-high-complexity-react-function 与
 * no-giant-component）。Space/Tag 结构与文案保持逐字不变。</p>
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

  return (
    <Space size={8}>
      <span>
        {t('modules.editor.title', {
          mode: isEdit ? t('modules.editor.edit') : t('modules.editor.create'),
          title: config.title,
        })}
      </span>
      {financeLayout ? (
        <Tag
          color={
            currentStatus === DOCUMENT_STATUS.AUDITED ? 'success' : 'default'
          }
        >
          {currentStatus || DOCUMENT_STATUS.DRAFT}
        </Tag>
      ) : null}
    </Space>
  )
}
