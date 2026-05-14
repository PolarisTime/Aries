import { CopyOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Typography from 'antd/es/typography'
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
  const loginName = result?.user?.loginName || result?.loginName || ''
  const initialPassword = result?.initialPassword || result?.password || ''

  return (
    <FormModal
      title="用户创建成功"
      open={open}
      onClose={onClose}
      footer={null}
      width={560}
    >
      {result && (
        <div className="py-16">
          <div className="flex justify-between items-center mb-16">
            <div>
              <div className="text-secondary text-xs">账号</div>
              <div className="text-lg font-semibold">{loginName}</div>
            </div>
            <Button
              icon={<CopyOutlined />}
              onClick={() => onCopy(loginName, '账号')}
            >
              复制账号
            </Button>
          </div>
          <div className="flex justify-between items-center mb-16">
            <div>
              <div className="text-secondary text-xs">初始密码</div>
              <div className="text-lg font-semibold text-error">
                {initialPassword}
              </div>
            </div>
            <Button
              type="primary"
              icon={<CopyOutlined />}
              onClick={() => onCopy(initialPassword, '密码')}
            >
              复制密码
            </Button>
          </div>
          <div className="mb-12">
            <div className="text-secondary text-xs">所属部门</div>
            <div>{result.user?.departmentName || '--'}</div>
          </div>
          <div className="mb-4">
            <div className="text-secondary text-xs">所属角色</div>
            <div>{result.user?.roleNames?.join('、') || '--'}</div>
          </div>
          <Typography.Text type="warning">
            请妥善保存初始密码，关闭后将不再展示。
          </Typography.Text>
          <div className="text-right mt-16">
            <Button type="primary" onClick={onClose}>
              知道了
            </Button>
          </div>
        </div>
      )}
    </FormModal>
  )
}
