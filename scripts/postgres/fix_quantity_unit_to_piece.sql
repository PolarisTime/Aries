BEGIN;

-- 1. Add quantity_unit to the current business tables if it does not exist yet.
ALTER TABLE md_material ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(16);

ALTER TABLE po_purchase_order_item ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(16);
ALTER TABLE po_purchase_inbound_item ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(16);
ALTER TABLE so_sales_order_item ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(16);
ALTER TABLE so_sales_outbound_item ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(16);
ALTER TABLE lg_freight_bill_item ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(16);

ALTER TABLE ct_purchase_contract_item ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(16);
ALTER TABLE ct_sales_contract_item ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(16);

ALTER TABLE inv_stock_balance ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(16);
ALTER TABLE inv_stock_io_log ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(16);

-- 2. Normalize quantity_unit to "件".
UPDATE md_material SET quantity_unit = '件' WHERE COALESCE(BTRIM(quantity_unit), '') <> '件';

UPDATE po_purchase_order_item SET quantity_unit = '件' WHERE COALESCE(BTRIM(quantity_unit), '') <> '件';
UPDATE po_purchase_inbound_item SET quantity_unit = '件' WHERE COALESCE(BTRIM(quantity_unit), '') <> '件';
UPDATE so_sales_order_item SET quantity_unit = '件' WHERE COALESCE(BTRIM(quantity_unit), '') <> '件';
UPDATE so_sales_outbound_item SET quantity_unit = '件' WHERE COALESCE(BTRIM(quantity_unit), '') <> '件';
UPDATE lg_freight_bill_item SET quantity_unit = '件' WHERE COALESCE(BTRIM(quantity_unit), '') <> '件';

UPDATE ct_purchase_contract_item SET quantity_unit = '件' WHERE COALESCE(BTRIM(quantity_unit), '') <> '件';
UPDATE ct_sales_contract_item SET quantity_unit = '件' WHERE COALESCE(BTRIM(quantity_unit), '') <> '件';

UPDATE inv_stock_balance SET quantity_unit = '件' WHERE COALESCE(BTRIM(quantity_unit), '') <> '件';
UPDATE inv_stock_io_log SET quantity_unit = '件' WHERE COALESCE(BTRIM(quantity_unit), '') <> '件';

ALTER TABLE md_material ALTER COLUMN quantity_unit SET DEFAULT '件';
ALTER TABLE md_material ALTER COLUMN quantity_unit SET NOT NULL;

ALTER TABLE po_purchase_order_item ALTER COLUMN quantity_unit SET DEFAULT '件';
ALTER TABLE po_purchase_order_item ALTER COLUMN quantity_unit SET NOT NULL;
ALTER TABLE po_purchase_inbound_item ALTER COLUMN quantity_unit SET DEFAULT '件';
ALTER TABLE po_purchase_inbound_item ALTER COLUMN quantity_unit SET NOT NULL;
ALTER TABLE so_sales_order_item ALTER COLUMN quantity_unit SET DEFAULT '件';
ALTER TABLE so_sales_order_item ALTER COLUMN quantity_unit SET NOT NULL;
ALTER TABLE so_sales_outbound_item ALTER COLUMN quantity_unit SET DEFAULT '件';
ALTER TABLE so_sales_outbound_item ALTER COLUMN quantity_unit SET NOT NULL;
ALTER TABLE lg_freight_bill_item ALTER COLUMN quantity_unit SET DEFAULT '件';
ALTER TABLE lg_freight_bill_item ALTER COLUMN quantity_unit SET NOT NULL;

ALTER TABLE ct_purchase_contract_item ALTER COLUMN quantity_unit SET DEFAULT '件';
ALTER TABLE ct_purchase_contract_item ALTER COLUMN quantity_unit SET NOT NULL;
ALTER TABLE ct_sales_contract_item ALTER COLUMN quantity_unit SET DEFAULT '件';
ALTER TABLE ct_sales_contract_item ALTER COLUMN quantity_unit SET NOT NULL;

ALTER TABLE inv_stock_balance ALTER COLUMN quantity_unit SET DEFAULT '件';
ALTER TABLE inv_stock_balance ALTER COLUMN quantity_unit SET NOT NULL;
ALTER TABLE inv_stock_io_log ALTER COLUMN quantity_unit SET DEFAULT '件';
ALTER TABLE inv_stock_io_log ALTER COLUMN quantity_unit SET NOT NULL;

-- 3. Recalculate detail row weights and amounts with:
--    quantity(件) * piece_weight_ton(吨/件) = weight_ton(吨)
UPDATE po_purchase_order_item
SET weight_ton = ROUND(quantity * piece_weight_ton, 3),
    amount = ROUND(quantity * piece_weight_ton * unit_price, 2);

UPDATE po_purchase_inbound_item
SET weight_ton = ROUND(quantity * piece_weight_ton, 3),
    amount = ROUND(quantity * piece_weight_ton * unit_price, 2);

UPDATE so_sales_order_item
SET weight_ton = ROUND(quantity * piece_weight_ton, 3),
    amount = ROUND(quantity * piece_weight_ton * unit_price, 2);

UPDATE so_sales_outbound_item
SET weight_ton = ROUND(quantity * piece_weight_ton, 3),
    amount = ROUND(quantity * piece_weight_ton * unit_price, 2);

UPDATE ct_purchase_contract_item
SET weight_ton = ROUND(quantity * piece_weight_ton, 3),
    amount = ROUND(quantity * piece_weight_ton * unit_price, 2);

UPDATE ct_sales_contract_item
SET weight_ton = ROUND(quantity * piece_weight_ton, 3),
    amount = ROUND(quantity * piece_weight_ton * unit_price, 2);

UPDATE lg_freight_bill_item
SET weight_ton = ROUND(quantity * piece_weight_ton, 3);

-- 4. Recalculate bill header totals from item rows.
UPDATE po_purchase_order h
SET total_weight = COALESCE(agg.total_weight, 0),
    total_amount = COALESCE(agg.total_amount, 0)
FROM (
  SELECT order_id, ROUND(SUM(weight_ton), 3) AS total_weight, ROUND(SUM(amount), 2) AS total_amount
  FROM po_purchase_order_item
  GROUP BY order_id
) agg
WHERE h.id = agg.order_id;

UPDATE po_purchase_inbound h
SET total_weight = COALESCE(agg.total_weight, 0),
    total_amount = COALESCE(agg.total_amount, 0)
FROM (
  SELECT inbound_id, ROUND(SUM(weight_ton), 3) AS total_weight, ROUND(SUM(amount), 2) AS total_amount
  FROM po_purchase_inbound_item
  GROUP BY inbound_id
) agg
WHERE h.id = agg.inbound_id;

UPDATE so_sales_order h
SET total_weight = COALESCE(agg.total_weight, 0),
    total_amount = COALESCE(agg.total_amount, 0)
FROM (
  SELECT order_id, ROUND(SUM(weight_ton), 3) AS total_weight, ROUND(SUM(amount), 2) AS total_amount
  FROM so_sales_order_item
  GROUP BY order_id
) agg
WHERE h.id = agg.order_id;

UPDATE so_sales_outbound h
SET total_weight = COALESCE(agg.total_weight, 0),
    total_amount = COALESCE(agg.total_amount, 0)
FROM (
  SELECT outbound_id, ROUND(SUM(weight_ton), 3) AS total_weight, ROUND(SUM(amount), 2) AS total_amount
  FROM so_sales_outbound_item
  GROUP BY outbound_id
) agg
WHERE h.id = agg.outbound_id;

UPDATE ct_purchase_contract h
SET total_weight = COALESCE(agg.total_weight, 0),
    total_amount = COALESCE(agg.total_amount, 0)
FROM (
  SELECT contract_id, ROUND(SUM(weight_ton), 3) AS total_weight, ROUND(SUM(amount), 2) AS total_amount
  FROM ct_purchase_contract_item
  GROUP BY contract_id
) agg
WHERE h.id = agg.contract_id;

UPDATE ct_sales_contract h
SET total_weight = COALESCE(agg.total_weight, 0),
    total_amount = COALESCE(agg.total_amount, 0)
FROM (
  SELECT contract_id, ROUND(SUM(weight_ton), 3) AS total_weight, ROUND(SUM(amount), 2) AS total_amount
  FROM ct_sales_contract_item
  GROUP BY contract_id
) agg
WHERE h.id = agg.contract_id;

UPDATE lg_freight_bill h
SET total_weight = COALESCE(agg.total_weight, 0),
    total_freight = ROUND(COALESCE(agg.total_weight, 0) * COALESCE(h.unit_price, 0), 2),
    unpaid_amount = ROUND(COALESCE(agg.total_weight, 0) * COALESCE(h.unit_price, 0) - COALESCE(h.paid_amount, 0), 2)
FROM (
  SELECT bill_id, ROUND(SUM(weight_ton), 3) AS total_weight
  FROM lg_freight_bill_item
  GROUP BY bill_id
) agg
WHERE h.id = agg.bill_id;

-- 5. Recalculate stock/report weights by joining the material master piece weight.
WITH material_weight AS (
  SELECT id, material_code, piece_weight_ton
  FROM md_material
)
UPDATE inv_stock_balance b
SET weight_ton = ROUND(b.quantity * mw.piece_weight_ton, 3)
FROM material_weight mw
WHERE (
  b.material_id IS NOT NULL AND b.material_id = mw.id
) OR (
  b.material_id IS NULL AND b.material_code = mw.material_code
);

WITH material_weight AS (
  SELECT id, material_code, piece_weight_ton
  FROM md_material
)
UPDATE inv_stock_io_log l
SET in_weight_ton = ROUND(COALESCE(l.in_quantity, 0) * mw.piece_weight_ton, 3),
    out_weight_ton = ROUND(COALESCE(l.out_quantity, 0) * mw.piece_weight_ton, 3)
FROM material_weight mw
WHERE (
  l.material_id IS NOT NULL AND l.material_id = mw.id
) OR (
  l.material_id IS NULL AND l.material_code = mw.material_code
);

COMMIT;
