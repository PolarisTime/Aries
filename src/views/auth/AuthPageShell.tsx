import Col from 'antd/es/col'
import Row from 'antd/es/row'
import type { ReactNode } from 'react'
import { AppAntdProvider } from '@/components/AppAntdProvider'

interface Props {
  hero: ReactNode
  children: ReactNode
}

export function AuthPageShell({ hero, children }: Props) {
  return (
    <AppAntdProvider>
      <Row className="min-h-screen">
        <Col xs={24} lg={10} className="login-hero">
          {hero}
        </Col>
        <Col xs={24} lg={14} className="login-form-panel">
          {children}
        </Col>
      </Row>
    </AppAntdProvider>
  )
}
