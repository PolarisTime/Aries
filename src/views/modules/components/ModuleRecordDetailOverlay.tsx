import { useTranslation } from 'react-i18next'
import { useModuleRecordHelpers } from '@/hooks/useModuleRecordHelpers'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { ModuleRecordDetailContent } from './ModuleRecordDetailContent'
import { WorkspaceOverlay } from './WorkspaceOverlay'

interface Props {
  open: boolean
  config: ModulePageConfig
  record: ModuleRecord | null
  loading: boolean
  error: unknown
  canPrint?: boolean
  onClose: () => void
  onRetry: () => void
}

/**
 * 单据详情弹窗的外壳：标题与关闭。
 *
 * <p>加载态、详情字段网格与只读明细已移到 ModuleRecordDetailContent，只读列的
 * 构建移到 module-record-detail-columns.tsx。原因：原来三态渲染与字段取值都内联在这里，
 * 嵌套深度达到 5，控制流复杂度也越界
 * (react-doctor/no-high-complexity-react-function)。外壳只保留「打开/关闭 + 头部」，
 * WorkspaceOverlay 的 DOM 与 aria 契约不变。</p>
 *
 * <p>头部「复制单号」按钮已下线：单号只以纯文本呈现，复制交给行操作菜单里的
 * 「复制单号」命令（同一份剪贴板实现），详情弹窗不再有第二个复制入口。</p>
 */
export function ModuleRecordDetailOverlay({
  open,
  config,
  record,
  loading,
  error,
  canPrint = false,
  onClose,
  onRetry,
}: Props) {
  const { t } = useTranslation()
  const { getPrimaryNo } = useModuleRecordHelpers({
    moduleKey: config.key,
    config,
  })

  /*
   * 方案 B 的详情面在**卡片内自带顶栏**（标题 + 单号 + 状态），弹层外壳再带上单号就会
   * 在上下两行里重复同一个 18 位数字。因此 `detailLayout: 'inline'` 的模块只保留模块名；
   * 其余模块（未配置该字段）继续沿用「模块名详情 - 单号」，外观与改造前一致。
   *
   * 弹层标题同时是 `aria-labelledby` 的可见文本，删掉单号不影响对话框的可访问名
   * （读屏读到的仍是「销售订单详情」，具体单据由卡片顶栏与正文交代）。
   */
  const isPlanB = config.detailLayout === 'inline'
  const overlayTitle = record
    ? `${config.title}${t('modules.detail.titleSuffix')}${
        isPlanB ? '' : ` - ${getPrimaryNo(record)}`
      }`
    : t('modules.detail.recordDetail')

  return (
    <WorkspaceOverlay open={open} title={overlayTitle} onClose={onClose}>
      <ModuleRecordDetailContent
        config={config}
        error={error}
        loading={loading}
        onClose={onClose}
        onRetry={onRetry}
        record={record}
        canPrint={canPrint}
      />
    </WorkspaceOverlay>
  )
}
