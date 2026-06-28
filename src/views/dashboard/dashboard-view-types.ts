import type { ComponentType, CSSProperties } from 'react'

interface DashboardIconProps {
  className?: string
  style?: CSSProperties
}

interface WorkflowNode {
  key: string
  title: string
  path: string
  icon: ComponentType<DashboardIconProps>
  hint: string
  metric?: string
}

export interface WorkflowSection {
  key: string
  title: string
  description: string
  nodes: WorkflowNode[]
}

export interface DashboardInfoItem {
  key: string
  label: string
  value: string
  icon: ComponentType<DashboardIconProps>
}
