import { CopyOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Typography from 'antd/es/typography'
import { useTranslation } from 'react-i18next'
import { FormModal } from '@/components/FormModal'
import type { UserAccountCreateResult } from '@/types/user-account'

interface Props {
  open: boolean
  result: UserAccountCreateResult | null
  onCopy: (value: string, label: string) => void
  onClose: () => void
}

export function UserAccountCreateResultModal({
  open,
  result,
  onCopy,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const loginName = result?.user?.loginName || result?.loginName || ''
  const initialPassword = result?.initialPassword || result?.password || ''

  return (
    <FormModal
      title={t('system.userAccount.createSuccess')}
      open={open}
      onClose={onClose}
      footer={null}
      width={560}
    >
      {result && (
        <div className="py-16">
          <div className="flex justify-between items-center mb-16">
            <div>
              <div className="text-secondary text-xs">
                {t('system.userAccount.account')}
              </div>
              <div className="text-lg font-semibold">{loginName}</div>
            </div>
            <Button
              icon={<CopyOutlined />}
              onClick={() => onCopy(loginName, t('system.userAccount.account'))}
            >
              {t('system.userAccount.copyAccount')}
            </Button>
          </div>
          <div className="flex justify-between items-center mb-16">
            <div>
              <div className="text-secondary text-xs">
                {t('system.userAccount.initialPassword')}
              </div>
              <div className="text-lg font-semibold text-error">
                {initialPassword}
              </div>
            </div>
            <Button
              type="primary"
              icon={<CopyOutlined />}
              onClick={() =>
                onCopy(initialPassword, t('system.userAccount.initialPassword'))
              }
            >
              {t('system.userAccount.copyPassword')}
            </Button>
          </div>
          <div className="mb-12">
            <div className="text-secondary text-xs">
              {t('system.userAccount.department')}
            </div>
            <div>{result.user?.departmentName || '--'}</div>
          </div>
          <div className="mb-4">
            <div className="text-secondary text-xs">
              {t('system.userAccount.roleNames')}
            </div>
            <div>{result.user?.roleNames?.join('、') || '--'}</div>
          </div>
          <Typography.Text type="warning">
            {t('system.userAccount.savePasswordHint')}
          </Typography.Text>
          <div className="text-right mt-16">
            <Button type="primary" onClick={onClose}>
              {t('common.ok')}
            </Button>
          </div>
        </div>
      )}
    </FormModal>
  )
}
