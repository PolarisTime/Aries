import { Descriptions, Modal, Spin } from 'antd'
import { useTranslation } from 'react-i18next'
import { StatusTag } from '@/components/StatusTag'
import type { UserAccountRecord } from '@/types/user-account'
import { formatDateTime } from '@/utils/formatters'

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
          <Descriptions column={{ xs: 1, md: 2 }} bordered size="small">
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
            <Descriptions.Item
              label={t('system.userAccountDetail.roles')}
              span="filled"
            >
              {record.roleNames?.length ? record.roleNames.join('、') : '--'}
            </Descriptions.Item>
            <Descriptions.Item
              label={t('system.userAccountDetail.permSummary')}
              span="filled"
            >
              {record.permissionSummary || '--'}
            </Descriptions.Item>
            <Descriptions.Item label={t('system.userAccountDetail.status')}>
              <StatusTag
                status={record.status}
                statusMap={{
                  [record.status]: {
                    color: getStatusColor(record.status),
                    label: record.status,
                  },
                }}
              />
            </Descriptions.Item>
            <Descriptions.Item label={t('system.userAccountDetail.totpStatus')}>
              <StatusTag
                status={record.totpEnabled ? 'enabled' : 'disabled'}
                statusMap={{
                  enabled: {
                    color: getTotpColor(true),
                    label: t('system.userAccountDetail.totpEnabled'),
                  },
                  disabled: {
                    color: getTotpColor(false),
                    label: t('system.userAccountDetail.totpDisabled'),
                  },
                }}
              />
            </Descriptions.Item>
            <Descriptions.Item
              label={t('system.userAccountDetail.lastLogin')}
              span="filled"
            >
              {formatDateTime(record.lastLoginDate, '--')}
            </Descriptions.Item>
            <Descriptions.Item
              label={t('system.userAccountDetail.remark')}
              span="filled"
            >
              {record.remark || '--'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Spin>
    </Modal>
  )
}
