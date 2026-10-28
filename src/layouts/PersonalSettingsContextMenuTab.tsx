import { Button, Checkbox } from 'antd'
import { useTranslation } from 'react-i18next'
import {
  CONTEXT_MENU_ACTIONS,
  type ContextMenuActionDefinition,
  contextMenuActionKeysByGroup,
} from '@/layouts/context-menu-actions'

interface Props {
  /** 被隐藏的动作 key；空数组 = 全部显示。 */
  hiddenActionKeys: string[]
  onToggleAction: (actionKey: string, visible: boolean) => void
  onGroupVisibleChange: (group: 'row' | 'bulk', visible: boolean) => void
  onReset: () => void
  onSave: () => void
}

/**
 * 个人设置 → 右键菜单。
 *
 * <p>菜单项来自固定词表（行级动作 + 批量动作，见 `context-menu-actions.ts`），因此**逐项**开关：
 * 用户可以把「复制单号」「批量删除」这类用不到的项单独关掉，而不是只能整组关。
 * 缺省全显示；关掉只是不再渲染到菜单里，对应的能力仍可从工具栏/可见按钮进入，
 * 因此不会让任何操作变得不可达（WCAG 2.1.1）。</p>
 */
export function PersonalSettingsContextMenuTab({
  hiddenActionKeys,
  onToggleAction,
  onGroupVisibleChange,
  onReset,
  onSave,
}: Props) {
  const { t } = useTranslation()
  const hidden = new Set(hiddenActionKeys)

  const groups: Array<{
    group: 'row' | 'bulk'
    title: string
    description: string
    actions: ContextMenuActionDefinition[]
  }> = [
    {
      group: 'row',
      title: t('layouts.settings.contextMenuRowActions'),
      description: t('layouts.settings.contextMenuRowActionsDesc'),
      actions: CONTEXT_MENU_ACTIONS.filter((action) => action.group === 'row'),
    },
    {
      group: 'bulk',
      title: t('layouts.settings.contextMenuBatchActions'),
      description: t('layouts.settings.contextMenuBatchActionsDesc'),
      actions: CONTEXT_MENU_ACTIONS.filter((action) => action.group === 'bulk'),
    },
  ]

  return (
    <div className="personal-setting-panel">
      {groups.map(({ group, title, description, actions }) => {
        const keys = contextMenuActionKeysByGroup(group)
        const visibleCount = keys.filter((key) => !hidden.has(key)).length
        return (
          <section key={group} className="personal-setting-block">
            <div className="personal-setting-row">
              <span className="personal-setting-label">{title}</span>
              <Checkbox
                checked={visibleCount === keys.length}
                indeterminate={visibleCount > 0 && visibleCount < keys.length}
                aria-label={t('layouts.settings.contextMenuToggleGroup', {
                  group: title,
                })}
                onChange={(event) =>
                  onGroupVisibleChange(group, event.target.checked)
                }
              >
                {t('layouts.settings.contextMenuAll')}
              </Checkbox>
            </div>
            <div className="personal-layout-mode-desc">{description}</div>
            <div className="personal-context-menu-items">
              {actions.map((action) => {
                const label = t(`layouts.settings.${action.labelKey}`)
                return (
                  <Checkbox
                    key={action.key}
                    checked={!hidden.has(action.key)}
                    aria-label={label}
                    onChange={(event) =>
                      onToggleAction(action.key, event.target.checked)
                    }
                  >
                    {label}
                    {action.danger ? (
                      <span className="personal-context-menu-danger">
                        {t('layouts.settings.contextMenuDangerTag')}
                      </span>
                    ) : null}
                  </Checkbox>
                )
              })}
            </div>
          </section>
        )
      })}

      <div className="personal-setting-actions">
        <Button onClick={onReset}>{t('layouts.settings.resetDefault')}</Button>
        <Button type="primary" onClick={onSave}>
          {t('layouts.settings.saveDisplay')}
        </Button>
      </div>
    </div>
  )
}
