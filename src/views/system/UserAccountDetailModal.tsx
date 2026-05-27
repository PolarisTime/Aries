import Descriptions from 'antd/es/descriptions'
import Modal from 'antd/es/modal'
import Spin from 'antd/es/spin'
import Tag from 'antd/es/tag'
import { useTranslation } from 'react-i18next'
import type { UserAccountRecord } from '@/types/user-account'

interface Props {
  open: boolean
  loading: boolean
  record: UserAccountRecord | null
  getStatusColor: (value: string) => string
  getTotpColor: (enabled: boolean) => string
  onClose: () => void
}

export function UserAccountDetailModal({
  open,
  loading,
  record,
  getStatusColor,
  getTotpColor,
  onClose,
}: Props) {
  const { t } = useTranslation()
  return (
    <Modal
      title={t('system.userAccountDetail.title')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
    >
      <Spin spinning={loading}>
        {record && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label={t('system.userAccountDetail.loginName')}>
              {record.loginName}
            </Descriptions.Item>
            <Descriptions.Item label={t('system.userAccountDetail.userName')}>
              {record.userName}
            </Descriptions.Item>
            <Descriptions.Item label={t('system.userAccountDetail.mobile')}>
              {record.mobile || '--'}
            </Descriptions.Item>
            <Descriptions.Item label={t('system.userAccountDetail.department')}>
              {record.departmentName || '--'}
            </Descriptions.Item>
            <Descriptions.Item label={t('system.userAccountDetail.dataScope')}>
              {record.dataScope || '--'}
            </Descriptions.Item>
            <Descriptions.Item label={t('system.userAccountDetail.roles')} span={2}>
              {record.roleNames?.length ? record.roleNames.join('、') : '--'}
            </Descriptions.Item>
            <Descriptions.Item label={t('system.userAccountDetail.permSummary')} span={2}>
              {record.permissionSummary || '--'}
            </Descriptions.Item>
            <Descriptions.Item label={t('system.userAccountDetail.status')}>
              <Tag color={getStatusColor(record.status)}>{record.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('system.userAccountDetail.totpStatus')}>
              <Tag color={getTotpColor(record.totpEnabled)}>
                {record.totpEnabled ? t('system.userAccountDetail.totpEnabled') : t('system.userAccountDetail.totpDisabled')}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('system.userAccountDetail.lastLogin')} span={2}>
              {record.lastLoginDate || '--'}
            </Descriptions.Item>
            <Descriptions.Item label={t('system.userAccountDetail.remark')} span={2}>
              {record.remark || '--'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Spin>
    </Modal>
  )
}
