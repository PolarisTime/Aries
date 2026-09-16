import { Alert, Button } from 'antd'
import { useTranslation } from 'react-i18next'
import type { EditLockView } from './useSheetsStore'

type Props = {
  lock: EditLockView
  onTakeover: () => void
}

/** 批次编辑签出状态横幅: 提示本人编辑中或他人占用并可申请接管。 */
export function PriceCompareEditLockBanner({ lock, onTakeover }: Props) {
  const { t } = useTranslation()
  return (
    <Alert
      className="price-compare-edit-lock"
      type={lock.mine ? 'success' : 'warning'}
      showIcon
      message={
        lock.mine
          ? t('priceCompare.view.editingByMe')
          : lock.ownerName
            ? t('priceCompare.view.editingByOther', { name: lock.ownerName })
            : t('priceCompare.view.editingByOtherUnknown')
      }
      action={
        lock.mine ? undefined : (
          <Button size="small" onClick={onTakeover}>
            {t('priceCompare.view.requestTakeover')}
          </Button>
        )
      }
    />
  )
}
