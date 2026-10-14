import {
  ArrowRightOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useNavigate } from '@tanstack/react-router'
import { Button } from 'antd'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import type { ModuleKey } from '@/module-system/core/module-key'
import { buildRouterHref } from '@/utils/router-search'
import {
  NEXT_MODULE_PATHS,
  type SaveResultActionKind,
} from './save-result-overlay-utils'

/**
 * 保存回执的操作区。
 *
 * <p>从 SaveResultOverlay 抽出的原因：这里同时承担「下一模块快捷跳转」「继续新建」
 * 「并发冲突重载」「上传回单」四类动作与它们的状态守卫，内联在弹窗里会把弹窗的
 * 控制流复杂度推过 react-doctor 阈值 (no-high-complexity-react-function)。</p>
 *
 * <p>本次改造：按钮集合不再写死，改由 {@link resolveSaveResultActions} 按
 * 「本次动作 + 单据是否已生效」派生后传入。原先无论草稿保存还是保存并审核都渲染同一组按钮，
 * 草稿也会出现「创建下一模块」——而下游单据无法关联一张尚未生效的草稿。</p>
 */

interface Props<Key extends ModuleKey> {
  /** 本次回执允许出现的动作（顺序即渲染顺序，由共享派生函数给出）。 */
  actions: readonly SaveResultActionKind[]
  isConflict: boolean
  moduleKey: Key
  onClear: () => void
  onCreateAnother: () => void
  onOpenAttachments: () => void
  onResolveConflict: () => void
  recordId: string
  resolvingConflict: boolean
  status: 'success' | 'error' | 'warning'
}

export function SaveResultActionBar<Key extends ModuleKey>({
  actions,
  isConflict,
  moduleKey,
  onClear,
  onCreateAnother,
  onOpenAttachments,
  onResolveConflict,
  recordId,
  resolvingConflict,
  status,
}: Props<Key>) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const nextModuleTemplate = NEXT_MODULE_PATHS[moduleKey]
  const nextModule = nextModuleTemplate
    ? { label: t(nextModuleTemplate.labelKey), path: nextModuleTemplate.path }
    : null

  const handleCreateNext = (targetModule: { label: string; path: string }) => {
    onClear()
    void navigate({
      to: buildRouterHref(targetModule.path, {
        sourceModule: moduleKey,
        sourceRecordId: recordId,
      }),
    } as never)
  }

  const closeLabel = isConflict
    ? t('modules.saveResult.reloadLatest')
    : status === 'error'
      ? t('modules.saveResult.backToEdit')
      : t('modules.saveResult.close')

  // 每个动作一个元素，最后按共享派生给出的顺序取用：把「动作 → 按钮」的映射与
  // 「哪些动作出现」解耦，避免在 JSX 里堆叠 includes 条件把本函数的控制流推过阈值。
  const elements: Partial<Record<SaveResultActionKind, ReactElement>> = {
    'upload-attachment': (
      <Button key="upload-attachment" onClick={onOpenAttachments}>
        上传回单/凭证
      </Button>
    ),
    'next-module': nextModule ? (
      <Button
        key="next-module"
        type="primary"
        icon={<ArrowRightOutlined />}
        onClick={() => handleCreateNext(nextModule)}
      >
        {nextModule.label}
      </Button>
    ) : undefined,
    'create-another': (
      <Button
        key="create-another"
        icon={<PlusOutlined />}
        onClick={onCreateAnother}
      >
        {t('modules.saveResult.createAnother')}
      </Button>
    ),
    close: (
      <Button
        key="close"
        type="primary"
        icon={isConflict ? <ReloadOutlined /> : undefined}
        loading={isConflict && resolvingConflict}
        onClick={isConflict ? onResolveConflict : onClear}
      >
        {closeLabel}
      </Button>
    ),
  }

  return <>{actions.map((action) => elements[action] ?? null)}</>
}
