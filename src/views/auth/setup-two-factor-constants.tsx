import {
  CheckCircleOutlined,
  LockOutlined,
  ScanOutlined,
} from '@ant-design/icons'
import type { TFunction } from 'i18next'

export function buildSetupSecurityHighlights(t: TFunction): Array<{
  title: string
  description: string
}> {
  return [
    {
      title: t('auth.setup2fa.highlights.scanTitle'),
      description: t('auth.setup2fa.highlights.scanDescription'),
    },
    {
      title: t('auth.setup2fa.highlights.secretTitle'),
      description: t('auth.setup2fa.highlights.secretDescription'),
    },
    {
      title: t('auth.setup2fa.highlights.effectiveTitle'),
      description: t('auth.setup2fa.highlights.effectiveDescription'),
    },
  ]
}

export function buildSetupTwoFactorSteps(t: TFunction): Array<{
  key: string
  icon: React.JSX.Element
  title: string
  description: string
}> {
  return [
    {
      key: 'scan',
      icon: <ScanOutlined />,
      title: t('auth.setup2fa.steps.scanTitle'),
      description: t('auth.setup2fa.steps.scanDescription'),
    },
    {
      key: 'secret',
      icon: <LockOutlined />,
      title: t('auth.setup2fa.steps.secretTitle'),
      description: t('auth.setup2fa.steps.secretDescription'),
    },
    {
      key: 'verify',
      icon: <CheckCircleOutlined />,
      title: t('auth.setup2fa.steps.verifyTitle'),
      description: t('auth.setup2fa.steps.verifyDescription'),
    },
  ]
}
