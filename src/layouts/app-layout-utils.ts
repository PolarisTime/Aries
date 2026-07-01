import type { TFunction } from 'i18next'
import type { CSSProperties } from 'react'
import { appTitle } from '@/utils/env'

interface BuildAppLayoutStylesOptions {
  appliedFontSize: number
  collapsed: boolean
  isTopNavigationLayout: boolean
}

export interface AppLayoutStyles {
  fixedWidthStyle: CSSProperties
  headerClassName: string
  mainStyle: CSSProperties | undefined
  rootClassName: string
  shellFontStyle: CSSProperties
  topBrandMark: string
}

export interface AppLayoutUserInfo {
  currentUserLoginName: string
  currentUserName: string
}

export interface AppLayoutClockDisplay {
  dateText: string
  timeText: string
}

export function buildAppLayoutUserInfo(
  t: TFunction,
  user?: {
    userName?: string
    loginName?: string
  } | null,
): AppLayoutUserInfo {
  return {
    currentUserName:
      user?.userName || user?.loginName || t('layouts.userInfo.notLoggedIn'),
    currentUserLoginName:
      user?.loginName || t('layouts.userInfo.currentAccount'),
  }
}

export function buildClockDisplay(value: {
  format: (token: string) => string
}): AppLayoutClockDisplay {
  return {
    dateText: value.format('YYYY年MM月DD日'),
    timeText: value.format('HH时mm分ss秒'),
  }
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
  const topBrandMark = appTitle.trim().charAt(0).toUpperCase() || 'L'

  return {
    rootClassName,
    headerClassName,
    mainStyle,
    fixedWidthStyle,
    shellFontStyle,
    topBrandMark,
  }
}
