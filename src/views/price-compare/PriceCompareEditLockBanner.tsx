import { Alert, Button, Popconfirm, Space } from 'antd'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import type { EditLockView } from './useSheetsStore'

type Props = {
  /** 当前批次的签出状态; null 表示没有可展示的锁状态(例如锁已被他人接管)。 */
  lock: EditLockView | null
  /** 保存遇到 409 锁冲突: 本地改动未落库且刷新被挡住, 需要给用户出口。 */
  conflict: boolean
  /** 实时协作已连上且可写：他人持有结构编辑锁时，当前用户仍可协同编辑吨位与备注。 */
  collabTonRemarkWritable?: boolean
  onTakeover: () => void
  onDiscardLocal: () => void
}

function resolveLockBannerContent(
  lock: EditLockView | null,
  conflict: boolean,
  collabTonRemarkWritable: boolean,
  t: TFunction,
): { message: string; type: 'success' | 'info' | 'warning' } {
  const mine = Boolean(lock?.mine)
  if (conflict) {
    return { message: t('priceCompare.view.lockConflict'), type: 'warning' }
  }
  if (mine) {
    return { message: t('priceCompare.view.editingByMe'), type: 'success' }
  }
  if (collabTonRemarkWritable) {
    const message = lock?.ownerName
      ? t('priceCompare.view.editingByOtherWithCollab', {
          name: lock.ownerName,
        })
      : t('priceCompare.view.editingByOtherUnknownWithCollab')
    return { message, type: 'info' }
  }
  const message = lock?.ownerName
    ? t('priceCompare.view.editingByOther', { name: lock.ownerName })
    : t('priceCompare.view.editingByOtherUnknown')
  return { message, type: 'warning' }
}

/**
 * 批次编辑签出状态横幅:
 * - 本人签出: success;
 * - 他人占用（实时协作可写吨位/备注）: info + 「申请接管」;
 * - 他人占用（只读）: warning + 「申请接管」;
 * - 保存遇到锁冲突(409): warning, 并额外提供「放弃我的改动并重新加载」——
 *   否则本地改动会一直挡住服务端刷新(静默 skipped), 用户既看不到说明也没有出口。
 */
export function PriceCompareEditLockBanner({
  collabTonRemarkWritable = false,
  conflict,
  lock,
  onDiscardLocal,
  onTakeover,
}: Props) {
  const { t } = useTranslation()
  const mine = Boolean(lock?.mine)
  const { message, type } = resolveLockBannerContent(
    lock,
    conflict,
    collabTonRemarkWritable,
    t,
  )
  const showTakeover = !(mine && !conflict)

  return (
    <Alert
      className="price-compare-edit-lock"
      type={type}
      showIcon
      title={message}
      action={
        <Space size="small">
          {showTakeover ? (
            <Button size="small" onClick={onTakeover}>
              {t('priceCompare.view.requestTakeover')}
            </Button>
          ) : null}
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
