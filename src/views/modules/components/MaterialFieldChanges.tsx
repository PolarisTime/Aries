import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { MaterialFieldChange } from '@/api/master/materials'
import { resolveMaterialFieldLabel } from './material-field-labels'

interface Props {
  changes: MaterialFieldChange[]
  emptyText?: string
}

/** 字段差异展示：before → after，空值以占位符降级。 */
export function MaterialFieldChanges({ changes, emptyText }: Props) {
  const { t } = useTranslation()
  if (!changes.length) {
    return (
      <Typography.Text type="secondary">
        {emptyText ?? t('modules.pages.material.versionHistoryNoChange')}
      </Typography.Text>
    )
  }
  const empty = t('modules.pages.material.versionHistoryFieldEmpty')
  return (
    <div className="flex flex-col gap-1">
      {changes.map((change) => (
        <span key={change.field} className="text-xs">
          <Typography.Text>
            {resolveMaterialFieldLabel(change.field, change.label, t)}
          </Typography.Text>
          {': '}
          <Typography.Text type="secondary">
            {change.before ?? empty}
          </Typography.Text>
          <span aria-hidden="true"> {'→'} </span>
          <Typography.Text type={change.after == null ? 'danger' : 'success'}>
            {change.after ?? empty}
          </Typography.Text>
        </span>
      ))}
    </div>
  )
}
