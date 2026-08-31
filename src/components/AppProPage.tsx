import { PageContainer } from '@ant-design/pro-components/es/layout/components/PageContainer'
import type { ReactNode } from 'react'
import '@/styles/pro-components.css'

const pageContainerToken = {
  paddingInlinePageContainerContent: 16,
  paddingBlockPageContainerContent: 8,
}

interface Props {
  children: ReactNode
  className?: string
  description?: ReactNode
  extra?: ReactNode
  title: ReactNode
}

export function AppProPage({
  children,
  className,
  description,
  extra,
  title,
}: Props): React.JSX.Element {
  const rootClassName = ['app-pro-page', className].filter(Boolean).join(' ')

  return (
    <PageContainer
      className={rootClassName}
      pageHeaderRender={false}
      token={pageContainerToken}
    >
      <div className="app-pro-page-accessible-header">
        <h1>{title}</h1>
        {description ? <div>{description}</div> : null}
      </div>
      {extra ? <div className="app-pro-page-extra">{extra}</div> : null}
      {children}
    </PageContainer>
  )
}
