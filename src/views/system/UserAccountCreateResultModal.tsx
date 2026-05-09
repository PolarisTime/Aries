import { CopyOutlined } from '@ant-design/icons'
import { Button, Modal, Typography } from 'antd'
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
  return (
    <Modal
      title="用户创建成功"
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      mask={{ closable: false }}
    >
      {result && (
        <div style={{ padding: '16px 0' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ color: '#666', fontSize: 12 }}>账号</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                {result.user.loginName}
              </div>
            </div>
            <Button
              icon={<CopyOutlined />}
              onClick={() => onCopy(result.user.loginName, '账号')}
            >
              复制账号
            </Button>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ color: '#666', fontSize: 12 }}>初始密码</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#f5222d' }}>
                {result.initialPassword}
              </div>
            </div>
            <Button
              type="primary"
              icon={<CopyOutlined />}
              onClick={() => onCopy(result.initialPassword, '密码')}
            >
              复制密码
            </Button>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: '#666', fontSize: 12 }}>所属部门</div>
            <div>{result.user.departmentName || '--'}</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#666', fontSize: 12 }}>所属角色</div>
            <div>{result.user.roleNames?.join('、') || '--'}</div>
          </div>
          <Typography.Text type="warning">
            请妥善保存初始密码，关闭后将不再展示。
          </Typography.Text>
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button type="primary" onClick={onClose}>
              知道了
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
