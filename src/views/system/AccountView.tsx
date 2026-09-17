import { useTranslation } from 'react-i18next'
import { AppProPage } from '@/components/AppProPage'
import {
  AccountPasswordPanel,
  AccountProfilePanel,
} from '@/views/system/account-panels'

/**
 * 个人账号页面（/account）。内容已并入右上角「个人设置」弹窗，
 * 此路由保留以兼容旧链接与直达访问，角色分配已移除（改由用户管理页管理员维护）。
 */
export function AccountView(): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <AppProPage title={t('system.account.title')}>
      <div className="page-stack account-page">
        <section className="account-section">
          <h2 className="account-section-title">
            {t('system.account.profileSection')}
          </h2>
          <AccountProfilePanel />
        </section>
        <section className="account-section">
          <h2 className="account-section-title">
            {t('system.account.passwordSection')}
          </h2>
          <AccountPasswordPanel />
        </section>
      </div>
    </AppProPage>
  )
}
