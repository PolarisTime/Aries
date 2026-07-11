import { describe, expect, it } from 'vitest'
import { isKnownAppIconKey, resolveAppIcon } from './app-icons'

describe('app-icons', () => {
  describe('resolveAppIcon', () => {
    it('returns a component for known icon key', () => {
      const icon = resolveAppIcon('HomeOutlined')
      expect(icon).toBeDefined()
    })

    it('returns component for each known icon key', () => {
      const keys = [
        'AccountBookOutlined',
        'ApartmentOutlined',
        'AppstoreOutlined',
        'BarChartOutlined',
        'BankOutlined',
        'CalculatorOutlined',
        'CarOutlined',
        'CreditCardOutlined',
        'DatabaseOutlined',
        'FileDoneOutlined',
        'FileSearchOutlined',
        'FileSyncOutlined',
        'FileTextOutlined',
        'HomeOutlined',
        'InboxOutlined',
        'PrinterOutlined',
        'ProfileOutlined',
        'RollbackOutlined',
        'SafetyCertificateOutlined',
        'SettingOutlined',
        'ShopOutlined',
        'ShoppingCartOutlined',
        'SwapOutlined',
        'TableOutlined',
        'TagsOutlined',
        'TeamOutlined',
        'UserOutlined',
        'WalletOutlined',
      ] as const

      for (const key of keys) {
        expect(resolveAppIcon(key)).toBeDefined()
      }
    })
  })

  describe('isKnownAppIconKey', () => {
    it('returns true for known icon key', () => {
      expect(isKnownAppIconKey('HomeOutlined')).toBe(true)
    })

    it('returns false for unknown icon key', () => {
      expect(isKnownAppIconKey('UnknownIcon')).toBe(false)
    })

    it('returns false for null', () => {
      expect(isKnownAppIconKey(null)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isKnownAppIconKey(undefined)).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(isKnownAppIconKey('')).toBe(false)
    })
  })
})
