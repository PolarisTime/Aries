import { useNavigate } from '@tanstack/react-router'
import { Button, Result, Typography } from 'antd'
import type { ResultProps } from 'antd/es/result'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import '@/styles/app-result.css'

interface AppResultProps extends Omit<ResultProps, 'extra'> {
  title?: ResultProps['title']
  subTitle?: ResultProps['subTitle']
  extra?: ResultProps['extra']
  showHomeButton?: boolean
  showBackButton?: boolean
  homeButtonText?: string
  backButtonText?: string
  traceId?: string
}

export function AppResult({
  status = 'info',
  title,
  subTitle,
  extra,
  showHomeButton,
  showBackButton,
  homeButtonText,
  backButtonText,
  traceId,
  className,
  classNames,
  ...rest
}: AppResultProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const PRESET_COPY: Record<string, { title: string; subTitle: string }> = {
    '403': { title: '403', subTitle: t('result.403.subTitle') },
    '404': { title: '404', subTitle: t('result.404.subTitle') },
    '500': { title: '500', subTitle: t('result.500.subTitle') },
    success: { title: t('result.success.title'), subTitle: '' },
    error: {
      title: t('result.error.title'),
      subTitle: t('result.error.subTitle'),
    },
    info: { title: t('result.info.title'), subTitle: '' },
    warning: { title: t('result.warning.title'), subTitle: '' },
  }

  const preset = PRESET_COPY[String(status)]

  const resolvedTitle = title ?? preset?.title ?? String(status)
  const resolvedSubTitle = subTitle ?? preset?.subTitle
  const resolvedTraceId = typeof traceId === 'string' ? traceId.trim() : ''

  const resolvedHomeButtonText = homeButtonText ?? t('result.homeButton')
  const resolvedBackButtonText = backButtonText ?? t('result.backButton')

  const actions = (
    <>
      {extra}
      {showBackButton ? (
        <Button onClick={() => window.history.back()}>
          {resolvedBackButtonText}
        </Button>
      ) : null}
      {showHomeButton ? (
        <Button
          type="primary"
          onClick={() => {
            void navigate({ to: '/dashboard' as '/' })
          }}
        >
          {resolvedHomeButtonText}
        </Button>
      ) : null}
    </>
  )

  const subtitleNode: ReactNode = resolvedTraceId ? (
    <>
      {resolvedSubTitle ? <div>{resolvedSubTitle}</div> : null}
      <Typography.Text
        type="secondary"
        copyable={{ text: resolvedTraceId }}
        className="font-mono text-[11px]"
      >
        Trace ID: {resolvedTraceId}
      </Typography.Text>
    </>
  ) : (
    resolvedSubTitle
  )

  const resolvedClassNames: NonNullable<ResultProps['classNames']> = (info) => {
    const customClassNames =
      typeof classNames === 'function' ? classNames(info) : classNames
    const mergeClassName = (base: string, custom?: string) =>
      [base, custom].filter(Boolean).join(' ')

    return {
      ...customClassNames,
      root: mergeClassName('app-result', customClassNames?.root),
      icon: mergeClassName('app-result__icon', customClassNames?.icon),
      title: mergeClassName('app-result__title', customClassNames?.title),
      subTitle: mergeClassName(
        'app-result__subtitle',
        customClassNames?.subTitle,
      ),
      extra: mergeClassName('app-result__extra', customClassNames?.extra),
      body: mergeClassName('app-result__body', customClassNames?.body),
    }
  }

  return (
    <Result
      className={['app-result', className].filter(Boolean).join(' ')}
      classNames={resolvedClassNames}
      status={status}
      title={resolvedTitle}
      subTitle={subtitleNode}
      extra={actions}
      {...rest}
    />
  )
}
