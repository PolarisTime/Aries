import type { ModuleRecord } from '@/types/module-page'
import { http } from '@/api/http'
import { ENDPOINTS } from '@/constants/endpoints'

const MATERIAL_CSV_HEADERS = [
  '商品编码',
  '品牌',
  '材质',
  '类别',
  '规格',
  '长度',
  '单位',
  '数量单位',
  '件重(吨)',
  '每件支数',
  '单价',
  '批号管理',
  '备注',
]

export function exportMaterialsToCsv(rows: ModuleRecord[], title = '商品资料') {
  const lines = [
    MATERIAL_CSV_HEADERS,
    ...rows.map((row) => [
      stringValue(row.materialCode),
      stringValue(row.brand),
      stringValue(row.material),
      stringValue(row.category),
      stringValue(row.spec),
      stringValue(row.length),
      stringValue(row.unit),
      stringValue(row.quantityUnit),
      decimalValue(row.pieceWeightTon, 3),
      integerValue(row.piecesPerBundle),
      decimalValue(row.unitPrice, 2),
      booleanValue(row.batchNoEnabled),
      stringValue(row.remark),
    ]),
  ]
  const csv = lines.map((line) => line.map(escapeCsvCell).join(',')).join('\r\n')
  const blob = new Blob([`﻿${csv}`], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const date = new Date()
  const suffix = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  link.href = url
  link.download = `${title}_${suffix}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function downloadMaterialImportTemplate() {
  const blob = await http.get<Blob>(ENDPOINTS.MATERIALS_TEMPLATE, { responseType: 'blob' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = '商品资料导入模板.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function stringValue(value: unknown) {
  return value == null ? '' : String(value)
}

function integerValue(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? String(Math.trunc(number)) : ''
}

function decimalValue(value: unknown, scale: number) {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(scale) : ''
}

function booleanValue(value: unknown) {
  return value === true ? '是' : '否'
}

function escapeCsvCell(value: string) {
  if (!/[",\r\n]/.test(value)) {
    return value
  }
  return `"${value.replaceAll('"', '""')}"`
}
