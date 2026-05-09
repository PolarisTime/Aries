import {
  CheckCircleOutlined,
  LockOutlined,
  ScanOutlined,
} from '@ant-design/icons'

export const setupSecurityHighlights = [
  {
    title: '扫码绑定',
    description:
      '使用 Microsoft Authenticator、Google Authenticator 或兼容应用扫描二维码。',
  },
  {
    title: '密钥备份',
    description: '二维码无法识别时，可直接录入密钥完成绑定。',
  },
  {
    title: '绑定即生效',
    description: '提交 6 位动态码后，当前账户会立即启用强制二次验证。',
  },
]

export const setupTwoFactorSteps = [
  {
    key: 'scan',
    icon: <ScanOutlined />,
    title: '步骤 1',
    description: '打开手机上的 Authenticator 应用，扫描左侧二维码。',
  },
  {
    key: 'secret',
    icon: <LockOutlined />,
    title: '步骤 2',
    description: '如果无法扫码，可使用下方密钥手动添加账户并生成验证码。',
  },
  {
    key: 'verify',
    icon: <CheckCircleOutlined />,
    title: '步骤 3',
    description: '输入当前 6 位动态码，验证成功后本账户立即启用 2FA。',
  },
]
