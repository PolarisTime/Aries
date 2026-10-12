import { useTranslation } from 'react-i18next'
import type { SearchParams } from '@/types/api-raw'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { ModuleParentSelectorOverlay } from './ModuleParentSelectorOverlay'

/**
 * 父单选择弹层宿主：只在模块配置了 parentImport 时挂载。
 *
 * <p>从 ModuleEditorItemsSection 抽出：配置回退链（外部覆盖 → 模块配置）与
 * 文案回退是一组独立分支，内联在明细区里会加重该函数的控制流复杂度
 * (react-doctor/no-high-complexity-react-function)。这里把「没有 parentImport
 * 就什么都不渲染」变成早返回，语义不变。</p>
 */

interface Props {
  config: ModulePageConfig
  onCloseParentSelector: () => void
  onImportParentRecord: (records: ModuleRecord[]) => void
  open: boolean
  parentSelectorDisplayFieldKey?: string
  parentSelectorFilters: SearchParams
  parentSelectorModuleKey?: string
}

export function ModuleParentSelectorHost({
  config,
  onCloseParentSelector,
  onImportParentRecord,
  open,
  parentSelectorDisplayFieldKey,
  parentSelectorFilters,
  parentSelectorModuleKey,
}: Props) {
  const { t } = useTranslation()
  const parentImport = config.parentImport
  if (!parentImport) {
    return null
  }

  return (
    <ModuleParentSelectorOverlay
      open={open}
      parentModuleKey={parentSelectorModuleKey || parentImport.parentModuleKey}
      parentDisplayFieldKey={
        parentSelectorDisplayFieldKey || parentImport.parentDisplayFieldKey
      }
      allowMultipleSelection={parentImport.allowMultipleSelection}
      candidateStatementModuleKey={parentImport.candidateStatementModuleKey}
      candidateQueryType={parentImport.candidateQueryType}
      hiddenSelectorColumnKeys={parentImport.hiddenSelectorColumnKeys}
      fixedFilters={parentSelectorFilters}
      title={t('modules.itemsSection.selectParent', {
        label: parentImport.label || t('modules.itemsSection.parentDoc'),
      })}
      onSelect={onImportParentRecord}
      onClose={onCloseParentSelector}
    />
  )
}
