import { Alert, Button, Popconfirm, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import type { EditLockView } from './useSheetsStore'

type Props = {
  /** 当前批次的签出状态; null 表示没有可展示的锁状态(例如锁已被他人接管)。 */
  lock: EditLockView | null
  /** 保存遇到 409 锁冲突: 本地改动未落库且刷新被挡住, 需要给用户出口。 */
  conflict: boolean
  onTakeover: () => void
  onDiscardLocal: () => void
}

/**
 * 批次编辑签出状态横幅:
 * - 本人签出: success;
 * - 他人占用: warning + 「申请接管」;
 * - 保存遇到锁冲突(409): warning, 并额外提供「放弃我的改动并重新加载」——
 *   否则本地改动会一直挡住服务端刷新(静默 skipped), 用户既看不到说明也没有出口。
 */
export function PriceCompareEditLockBanner({
  conflict,
  lock,
  onDiscardLocal,
  onTakeover,
}: Props) {
  const { t } = useTranslation()
  const mine = Boolean(lock?.mine)
  const message = conflict
    ? t('priceCompare.view.lockConflict')
    : mine
      ? t('priceCompare.view.editingByMe')
      : lock?.ownerName
        ? t('priceCompare.view.editingByOther', { name: lock.ownerName })
        : t('priceCompare.view.editingByOtherUnknown')

  return (
    <Alert
      className="price-compare-edit-lock"
      type={mine && !conflict ? 'success' : 'warning'}
      showIcon
      message={message}
      action={
        <Space size="small">
          {mine && !conflict ? null : (
            <Button size="small" onClick={onTakeover}>
              {t('priceCompare.view.requestTakeover')}
            </Button>
          )}
          {conflict ? (
            <Popconfirm
              cancelText={t('common.cancel')}
              description={t('priceCompare.view.discardLocalConfirmContent')}
              okButtonProps={{ danger: true }}
              okText={t('common.confirm')}
              onConfirm={onDiscardLocal}
              title={t('priceCompare.view.discardLocalConfirmTitle')}
            >
              <Button danger size="small" type="primary">
                {t('priceCompare.view.discardLocalAndReload')}
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      }
    />
  )
}
