import { useNavigate } from '@tanstack/react-router'
import Button from 'antd/es/button'
import type { ResultProps } from 'antd/es/result'
import Result from 'antd/es/result'

const PRESET_COPY: Record<string, { title: string; subTitle: string }> = {
  '403': { title: '403', subTitle: '抱歉，您没有权限访问此页面' },
  '404': { title: '404', subTitle: '抱歉，您访问的页面不存在' },
  '500': { title: '500', subTitle: '抱歉，服务器出错了' },
  success: { title: '操作成功', subTitle: '' },
  error: { title: '操作失败', subTitle: '请稍后重试' },
  info: { title: '提示', subTitle: '' },
  warning: { title: '警告', subTitle: '' },
}

interface AppResultProps extends Omit<ResultProps, 'extra'> {
  title?: ResultProps['title']
  subTitle?: ResultProps['subTitle']
  extra?: ResultProps['extra']
  showHomeButton?: boolean
  showBackButton?: boolean
  homeButtonText?: string
  backButtonText?: string
}

export function AppResult({
  status = 'info',
  title,
  subTitle,
  extra,
  showHomeButton,
  showBackButton,
  homeButtonText = '返回首页',
  backButtonText = '返回上页',
  ...rest
}: AppResultProps) {
  const navigate = useNavigate()
  const preset = PRESET_COPY[String(status)]

  const resolvedTitle = title ?? preset?.title ?? String(status)
  const resolvedSubTitle = subTitle ?? preset?.subTitle

  const actions = (
    <>
      {extra}
      {showBackButton ? (
        <Button onClick={() => window.history.back()}>{backButtonText}</Button>
      ) : null}
      {showHomeButton ? (
        <Button
          type="primary"
          onClick={() => {
            void navigate({ to: '/dashboard' as '/' })
          }}
        >
          {homeButtonText}
        </Button>
      ) : null}
    </>
  )

  return (
    <Result
      status={status}
      title={resolvedTitle}
      subTitle={resolvedSubTitle}
      extra={actions}
      {...rest}
    />
  )
}
