import { Button } from 'antd'
import { useTranslation } from 'react-i18next'
import { resolveModuleActionIcon } from '@/module-system/presentation/module-action-icons'

interface Props {
  onClick: () => void
}

/**
 * 列表页「重置」按钮 —— 全站唯一出口。
 *
 * <p>位置有两处（筛选区末端、工具行右侧 —— 由调用方决定），但**形态只在这里定义**：
 * 图标（`resolveModuleActionIcon('重置')`）、文案（`common.reset`）与尺寸（跟随全局
 * `--app-control-height`，不写 `size`）都不允许各自再写一遍。</p>
 *
 * <p>此前筛选区那份是 `type="text" size="small"`（24px 高），而同行的筛选胶囊是 32px，
 * 同一行里矮一截且无边框，看起来像"没对齐的次级控件"；这正是本次要修掉的显示问题。</p>
 */
export function ModuleResetButton({ onClick }: Props) {
  const { t } = useTranslation()
  return (
    <Button
      className="module-filter-reset-button"
      icon={resolveModuleActionIcon('重置')}
      onClick={onClick}
    >
      {t('common.reset')}
    </Button>
  )
}
