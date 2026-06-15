import { describe, expect, it } from 'vitest'
import {
  AUDIT_STATUS_LABEL,
  BILL_STATUS_LABEL,
  CARRIER_NAME_LABEL,
  CONTRACT_NO_FILTER_LABEL,
  CUSTOMER_NAME_LABEL,
  FREIGHT_NO_FILTER_LABEL,
  INBOUND_NO_FILTER_LABEL,
  ORDER_NO_FILTER_LABEL,
  OUTBOUND_NO_FILTER_LABEL,
  SIGN_STATUS_LABEL,
  SUPPLIER_NAME_LABEL,
} from './filter-labels'

describe('filter-labels', () => {
  it('exports all filter label constants as non-empty strings', () => {
    const labels = [
      BILL_STATUS_LABEL,
      AUDIT_STATUS_LABEL,
      SIGN_STATUS_LABEL,
      CUSTOMER_NAME_LABEL,
      SUPPLIER_NAME_LABEL,
      CARRIER_NAME_LABEL,
      ORDER_NO_FILTER_LABEL,
      CONTRACT_NO_FILTER_LABEL,
      OUTBOUND_NO_FILTER_LABEL,
      INBOUND_NO_FILTER_LABEL,
      FREIGHT_NO_FILTER_LABEL,
    ]
    for (const label of labels) {
      expect(label).toBeTruthy()
    }
  })
})
