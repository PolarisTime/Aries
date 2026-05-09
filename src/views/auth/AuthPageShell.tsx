import { Col, Row } from 'antd'
import type { ReactNode } from 'react'

interface Props {
  hero: ReactNode
  children: ReactNode
}

export function AuthPageShell({ hero, children }: Props) {
  return (
    <Row style={{ minHeight: '100vh' }}>
      <Col xs={24} lg={10} className="login-hero">
        {hero}
      </Col>
      <Col xs={24} lg={14} className="login-form-panel">
        {children}
      </Col>
    </Row>
  )
}
