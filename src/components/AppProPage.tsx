import { PageContainer } from '@ant-design/pro-components/es/layout/components/PageContainer'
import type { ReactNode } from 'react'
import '@/styles/pro-components.css'

const pageContainerToken = {
  paddingInlinePageContainerContent: 16,
  paddingBlockPageContainerContent: 16,
}

interface Props {
  children: ReactNode
  className?: string
  description?: ReactNode
  embedded?: boolean
  title: ReactNode
}

export function AppProPage({
  children,
  className,
  description,
  embedded = false,
  title,
}: Props): React.JSX.Element {
  if (embedded) {
    return <>{children}</>
  }

  const rootClassName = ['app-pro-page', className].filter(Boolean).join(' ')

  return (
    <PageContainer
      breadcrumbRender={false}
      className={rootClassName}
      content={description}
      title={title}
      token={pageContainerToken}
    >
      {children}
    </PageContainer>
  )
}
