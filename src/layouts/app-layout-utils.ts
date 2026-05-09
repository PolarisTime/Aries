import type { ThemeConfig } from 'antd'
import type { CSSProperties } from 'react'
import { buildAntdTheme } from '@/styles/antd-theme'
import { appTitle } from '@/utils/env'

interface BuildAppLayoutStylesOptions {
  appliedFontSize: number
  collapsed: boolean
  companyName: string
  currentUserName: string
  currentUserLoginName: string
  isTopNavigationLayout: boolean
  clockText: string
}

export interface AppLayoutStyles {
  antdTheme: ThemeConfig
  fixedWidthStyle: CSSProperties
  headerClassName: string
  mainStyle: CSSProperties | undefined
  rootClassName: string
  shellFontStyle: CSSProperties
  siderWidth: number
  topBrandMark: string
  topBrandName: string
}

export interface AppLayoutUserInfo {
  currentUserLoginName: string
  currentUserName: string
}

export function buildAppLayoutUserInfo(
  user?: {
    userName?: string
    loginName?: string
  } | null,
): AppLayoutUserInfo {
  return {
    currentUserName: user?.userName || user?.loginName || '未登录',
    currentUserLoginName: user?.loginName || '当前账号',
  }
}

export function buildClockText(value: { format: (token: string) => string }) {
  return value.format('HH:mm:ss')
}

export function buildAppLayoutStyles(
  options: BuildAppLayoutStylesOptions,
): AppLayoutStyles {
  const siderWidth = options.collapsed ? 60 : 180
  const rootClassName = [
    'app-shell',
    'leo-shell',
    options.isTopNavigationLayout ? 'app-shell-top-nav' : 'app-shell-side-nav',
  ].join(' ')
  const headerClassName = [
    'leo-header',
    'app-fixed-header',
    options.isTopNavigationLayout
      ? 'app-top-header'
      : options.collapsed
        ? 'app-side-closed'
        : 'app-side-opened',
  ].join(' ')

  const mainStyle = options.isTopNavigationLayout
    ? undefined
    : { paddingLeft: `${siderWidth}px` }
  const fixedWidthStyle = options.isTopNavigationLayout
    ? { width: '100%' }
    : { width: `calc(100% - ${siderWidth}px)` }
  const shellFontStyle = { fontSize: `${options.appliedFontSize}px` }
  const topBrandName = options.companyName || appTitle
  const topBrandMark = topBrandName.trim().charAt(0).toUpperCase() || 'L'

  return {
    rootClassName,
    headerClassName,
    mainStyle,
    fixedWidthStyle,
    shellFontStyle,
    siderWidth,
    topBrandName,
    topBrandMark,
    antdTheme: {
      ...buildAntdTheme({
        borderRadius: 0,
        fontSize: options.appliedFontSize,
      }),
    },
  }
}
