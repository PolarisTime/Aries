import {
  ArrowRightOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useNavigate } from '@tanstack/react-router'
import { Button } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ModuleKey } from '@/module-system/core/module-key'
import { buildRouterHref } from '@/utils/router-search'

/**
 * 保存回执的操作区。
 *
 * <p>从 SaveResultOverlay 抽出的原因：这里同时承担「下一模块快捷跳转」「继续新建」
 * 「并发冲突重载」「上传回单」四类动作与它们的状态守卫，内联在弹窗里会把弹窗的
 * 控制流复杂度推过 react-doctor 阈值 (no-high-complexity-react-function)。
 * 按钮顺序、文案与主题色保持逐字不变。</p>
 */

const NEXT_MODULE_PATHS: Record<string, { labelKey: string; path: string }> = {
  'purchase-order': {
    labelKey: 'modules.nextModule.createPurchaseInbound',
    path: '/purchase-inbound',
  },
  'sales-order': {
    labelKey: 'modules.nextModule.createSalesOutbound',
    path: '/sales-outbound',
  },
}

interface Props<Key extends ModuleKey> {
  canCreateAnother: boolean
  canUploadAttachment: boolean
  isConflict: boolean
  isSuccess: boolean
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
  canCreateAnother,
  canUploadAttachment,
  isConflict,
  isSuccess,
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

  const nextModuleTemplate = isSuccess ? NEXT_MODULE_PATHS[moduleKey] : null
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

  return (
    <>
      {canUploadAttachment ? (
        <Button onClick={onOpenAttachments}>上传回单/凭证</Button>
      ) : null}
      {nextModule ? (
        <Button
          type="primary"
          icon={<ArrowRightOutlined />}
          onClick={() => handleCreateNext(nextModule)}
        >
          {nextModule.label}
        </Button>
      ) : null}
      {isSuccess && canCreateAnother ? (
        <Button icon={<PlusOutlined />} onClick={onCreateAnother}>
          {t('modules.saveResult.createAnother')}
        </Button>
      ) : null}
      <Button
        type="primary"
        icon={isConflict ? <ReloadOutlined /> : undefined}
        loading={isConflict && resolvingConflict}
        onClick={isConflict ? onResolveConflict : onClear}
      >
        {isConflict
          ? t('modules.saveResult.reloadLatest')
          : status === 'error'
            ? t('modules.saveResult.backToEdit')
            : t('modules.saveResult.close')}
      </Button>
    </>
  )
}
