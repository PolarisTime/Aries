import {
  AccountBookOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  BankOutlined,
  CalculatorOutlined,
  CarOutlined,
  CreditCardOutlined,
  DatabaseOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  FileSyncOutlined,
  FileTextOutlined,
  HomeOutlined,
  InboxOutlined,
  PrinterOutlined,
  ProfileOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
  TableOutlined,
  TagsOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import type { ComponentType } from 'react'
import type { AppIconKey } from '@/config/navigation-registry'

export const appIconMap: Record<AppIconKey, ComponentType> = {
  AccountBookOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  BankOutlined,
  CalculatorOutlined,
  CarOutlined,
  CreditCardOutlined,
  DatabaseOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  FileSyncOutlined,
  FileTextOutlined,
  HomeOutlined,
  InboxOutlined,
  PrinterOutlined,
  ProfileOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
  TableOutlined,
  TagsOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
}

export function resolveAppIcon(iconKey: AppIconKey): ComponentType {
  return appIconMap[iconKey]
}

export function isKnownAppIconKey(
  iconKey: string | null | undefined,
): iconKey is AppIconKey {
  return Boolean(
    iconKey && Object.prototype.hasOwnProperty.call(appIconMap, iconKey),
  )
}
