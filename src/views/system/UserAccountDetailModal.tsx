import { Descriptions, Modal, Spin, Tag } from 'antd'
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
  return (
    <Modal
      title="用户详情"
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
    >
      <Spin spinning={loading}>
        {record && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="登录账号">
              {record.loginName}
            </Descriptions.Item>
            <Descriptions.Item label="用户姓名">
              {record.userName}
            </Descriptions.Item>
            <Descriptions.Item label="手机号">
              {record.mobile || '--'}
            </Descriptions.Item>
            <Descriptions.Item label="所属部门">
              {record.departmentName || '--'}
            </Descriptions.Item>
            <Descriptions.Item label="数据范围">
              {record.dataScope || '--'}
            </Descriptions.Item>
            <Descriptions.Item label="所属角色" span={2}>
              {record.roleNames?.length ? record.roleNames.join('、') : '--'}
            </Descriptions.Item>
            <Descriptions.Item label="权限摘要" span={2}>
              {record.permissionSummary || '--'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={getStatusColor(record.status)}>{record.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="2FA 状态">
              <Tag color={getTotpColor(record.totpEnabled)}>
                {record.totpEnabled ? '已启用' : '未启用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="最近登录" span={2}>
              {record.lastLoginDate || '--'}
            </Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>
              {record.remark || '--'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Spin>
    </Modal>
  )
}
