const API = 'http://localhost:3100/api'
const API_KEY = 'leo_XZlE2ul_DVE-ICfkFP6CrmrD0p0kRV1dCejaCWgqkts'
const COUNT = parseInt(process.argv[2] || '100', 10)
const HEADERS = { 'Content-Type': 'application/json', 'X-API-Key': API_KEY }

async function fetchJSON(url) {
  const res = await fetch(API + url, { headers: HEADERS })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}
async function postJSON(url, body) {
  const res = await fetch(API + url, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok || data.code !== 0)
    throw new Error(data.message || res.statusText)
  return data
}

async function listModule(module) {
  const data = await fetchJSON(`/${module}?pageSize=200`)
  return data?.data?.content || []
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}
function rInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function dateStr(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

async function main() {
  console.log('获取基础数据...')
  const materials = await listModule('materials')
  const suppliers = await listModule('suppliers')
  const customers = await listModule('customers')
  const carriers = await listModule('carriers')
  const warehouses = await listModule('warehouses')
  const warehouse = warehouses[0]?.warehouseName || '升华物流'
  console.log(
    `商品:${materials.length} 供应商:${suppliers.length} 客户:${customers.length} 承运商:${carriers.length} 仓库:${warehouse}`,
  )
  if (!materials.length) {
    console.error('没有商品!')
    return
  }

  function buildItem() {
    const m = pick(materials)
    const q = rInt(1, 50),
      pw = +(m.pieceWeightTon || 2).toFixed(3),
      up = +(Math.random() * 5000 + 100).toFixed(2)
    return {
      materialCode: m.materialCode,
      brand: m.brand || '中天',
      category: m.category || '型材',
      material: m.material || 'HRB400',
      spec: m.spec || '100×100',
      length: m.length || '6m',
      unit: m.unit || '吨',
      warehouseName: warehouse,
      quantity: q,
      quantityUnit: m.quantityUnit || '件',
      pieceWeightTon: pw,
      piecesPerBundle: m.piecesPerBundle || 5,
      weightTon: +(q * pw).toFixed(3),
      unitPrice: up,
      amount: +(q * up).toFixed(2),
    }
  }

  const configs = {
    采购订单: {
      path: '/purchase-orders',
      body() {
        return {
          supplierName: pick(suppliers)?.supplierName || '默认供应商',
          orderDate: dateStr(0),
          items: [buildItem()],
        }
      },
    },
    销售订单: {
      path: '/sales-orders',
      body() {
        return {
          customerName: pick(customers)?.customerName || '默认客户',
          projectName: `项目-${rInt(1, 20)}`,
          deliveryDate: dateStr(7),
          salesName: '销售员A',
          items: [buildItem()],
        }
      },
    },
    采购合同: {
      path: '/purchase-contracts',
      body() {
        return {
          supplierName: pick(suppliers)?.supplierName || '默认供应商',
          signDate: dateStr(-7),
          effectiveDate: dateStr(0),
          expireDate: dateStr(365),
          buyerName: '采购员A',
          items: [buildItem()],
        }
      },
    },
    销售合同: {
      path: '/sales-contracts',
      body() {
        return {
          customerName: pick(customers)?.customerName || '默认客户',
          projectName: `项目-${rInt(1, 20)}`,
          signDate: dateStr(-7),
          effectiveDate: dateStr(0),
          expireDate: dateStr(365),
          salesName: '销售员A',
          items: [buildItem()],
        }
      },
    },
    物流单: {
      path: '/freight-bills',
      body() {
        return {
          carrierName: pick(carriers)?.carrierName || '默认物流',
          customerName: pick(customers)?.customerName || '默认客户',
          projectName: `项目-${rInt(1, 20)}`,
          billTime: dateStr(0),
          unitPrice: +(Math.random() * 500 + 50).toFixed(2),
          items: [buildItem()],
        }
      },
    },
  }

  for (const [name, cfg] of Object.entries(configs)) {
    console.log(`\n[${name}] 创建 ${COUNT} 条...`)
    let ok = 0
    for (let i = 0; i < COUNT; i++) {
      try {
        await postJSON(cfg.path, cfg.body())
        ok++
      } catch (e) {
        if (ok === 0 && i < 2) console.log(`  err: ${e.message.slice(0, 100)}`)
      }
      if (ok && ok % 25 === 0) process.stdout.write(`  ${ok}/${COUNT}\n`)
    }
    console.log(`  ${ok}/${COUNT}`)
  }
  console.log('\nDone!')
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
