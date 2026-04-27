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
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons-vue'
import type { Component } from 'vue'
import type { AppIconKey } from '@/config/navigation-registry'

export const appIconMap: Record<AppIconKey, Component> = {
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
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
}

export function resolveAppIcon(iconKey: AppIconKey) {
  return appIconMap[iconKey]
}

export function isKnownAppIconKey(
  iconKey: string | null | undefined,
): iconKey is AppIconKey {
  return Boolean(
    iconKey && Object.prototype.hasOwnProperty.call(appIconMap, iconKey),
  )
}
