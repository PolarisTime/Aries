USE `jsh_erp_steel`;

SET NAMES utf8mb4;

/*
  商品主表导入脚本
  只处理：jsh_material
  不处理：jsh_material_extend / 条码 / 采购价 / 销售价

  当前库检查结果：
  1. 主表：jsh_material
  2. 现网分类名存在重复（如“盘螺”“线材”），导入必须使用 category_id，不能只传分类名称
  3. 现网可用于去重的组合键已验证无重复：
     category_id + name + mfrs + model + standard + brand

  当前可用分类示例：
  29 = 螺纹钢
  30 = 盘螺
  31 = 线材
  32 = 直条
  33 = 盘螺
  34 = 线材

  使用方式：
  1. 修改下面 tmp_material_import 的 INSERT 示例数据
  2. 在 mysql 客户端中执行本脚本
  3. 查看脚本最后的导入结果汇总
*/

SET @default_tenant_id := 148;

DROP TEMPORARY TABLE IF EXISTS tmp_material_import;
CREATE TEMPORARY TABLE tmp_material_import (
  row_no BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  mfrs VARCHAR(50) NULL,
  model VARCHAR(100) NULL,
  standard VARCHAR(100) NULL,
  brand VARCHAR(100) NULL,
  mnemonic VARCHAR(100) NULL,
  color VARCHAR(50) NULL,
  unit VARCHAR(50) NULL,
  unit_id BIGINT NULL,
  remark VARCHAR(500) NULL,
  weight DECIMAL(24,6) NULL,
  enabled TINYINT(1) NULL DEFAULT 1,
  other_field1 VARCHAR(500) NULL,
  other_field2 VARCHAR(500) NULL,
  other_field3 VARCHAR(500) NULL,
  enable_serial_number CHAR(1) NULL DEFAULT '0',
  enable_batch_number CHAR(1) NULL DEFAULT '0',
  position VARCHAR(100) NULL,
  attribute VARCHAR(1000) NULL,
  tenant_id BIGINT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*
  在这里填写待导入商品。
  注意：
  1. category_id 必填
  2. tenant_id 可为空，空时默认写入 @default_tenant_id
  3. enabled：1=启用，0=禁用
*/
INSERT INTO tmp_material_import (
  category_id,
  name,
  mfrs,
  model,
  standard,
  brand,
  mnemonic,
  color,
  unit,
  unit_id,
  remark,
  weight,
  enabled,
  other_field1,
  other_field2,
  other_field3,
  enable_serial_number,
  enable_batch_number,
  position,
  attribute,
  tenant_id
) VALUES
  (32, '示例商品A', NULL, 'HRB400E', '18', NULL, 'slspa', NULL, '吨', NULL, '按需修改后再执行', 1.998000, 1, NULL, NULL, NULL, '0', '0', NULL, NULL, 148),
  (32, '示例商品B', NULL, 'HRB400E', '20', NULL, 'slspb', NULL, '吨', NULL, '按需修改后再执行', 2.045000, 1, NULL, NULL, NULL, '0', '0', NULL, NULL, 148);

DROP TEMPORARY TABLE IF EXISTS tmp_material_import_error;
CREATE TEMPORARY TABLE tmp_material_import_error (
  row_no BIGINT NOT NULL,
  reason VARCHAR(500) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO tmp_material_import_error (row_no, reason)
SELECT row_no, 'name 不能为空'
FROM tmp_material_import
WHERE TRIM(IFNULL(name, '')) = '';

INSERT INTO tmp_material_import_error (row_no, reason)
SELECT s.row_no, CONCAT('category_id 不存在或已删除: ', s.category_id)
FROM tmp_material_import s
LEFT JOIN jsh_material_category c
  ON c.id = s.category_id
 AND IFNULL(c.delete_flag, '0') = '0'
WHERE c.id IS NULL;

INSERT INTO tmp_material_import_error (row_no, reason)
SELECT s.row_no, CONCAT('unit_id 不存在或已删除: ', s.unit_id)
FROM tmp_material_import s
LEFT JOIN jsh_unit u
  ON u.id = s.unit_id
 AND IFNULL(u.delete_flag, '0') = '0'
WHERE s.unit_id IS NOT NULL
  AND u.id IS NULL;

INSERT INTO tmp_material_import_error (row_no, reason)
SELECT s.row_no, '导入数据内部存在重复商品，请保留一条'
FROM tmp_material_import s
JOIN (
  SELECT
    category_id,
    name,
    IFNULL(mfrs, '') AS mfrs_key,
    IFNULL(model, '') AS model_key,
    IFNULL(standard, '') AS standard_key,
    IFNULL(brand, '') AS brand_key,
    COUNT(*) AS cnt
  FROM tmp_material_import
  GROUP BY
    category_id,
    name,
    IFNULL(mfrs, ''),
    IFNULL(model, ''),
    IFNULL(standard, ''),
    IFNULL(brand, '')
  HAVING COUNT(*) > 1
) d
  ON d.category_id = s.category_id
 AND d.name = s.name
 AND d.mfrs_key = IFNULL(s.mfrs, '')
 AND d.model_key = IFNULL(s.model, '')
 AND d.standard_key = IFNULL(s.standard, '')
 AND d.brand_key = IFNULL(s.brand, '');

DROP TEMPORARY TABLE IF EXISTS tmp_material_valid;
CREATE TEMPORARY TABLE tmp_material_valid AS
SELECT s.*
FROM tmp_material_import s
WHERE NOT EXISTS (
  SELECT 1
  FROM tmp_material_import_error e
  WHERE e.row_no = s.row_no
);

DROP TEMPORARY TABLE IF EXISTS tmp_material_match;
CREATE TEMPORARY TABLE tmp_material_match AS
SELECT
  v.row_no,
  m.id AS material_id
FROM tmp_material_valid v
LEFT JOIN jsh_material m
  ON m.category_id = v.category_id
 AND m.name = v.name
 AND IFNULL(m.mfrs, '') = IFNULL(v.mfrs, '')
 AND IFNULL(m.model, '') = IFNULL(v.model, '')
 AND IFNULL(m.standard, '') = IFNULL(v.standard, '')
 AND IFNULL(m.brand, '') = IFNULL(v.brand, '')
 AND IFNULL(m.delete_flag, '0') = '0';

UPDATE jsh_material m
JOIN tmp_material_match x
  ON x.material_id = m.id
JOIN tmp_material_valid v
  ON v.row_no = x.row_no
SET
  m.mnemonic = v.mnemonic,
  m.color = v.color,
  m.unit = v.unit,
  m.unit_id = v.unit_id,
  m.remark = v.remark,
  m.weight = v.weight,
  m.enabled = IF(COALESCE(v.enabled, 1) = 1, b'1', b'0'),
  m.other_field1 = v.other_field1,
  m.other_field2 = v.other_field2,
  m.other_field3 = v.other_field3,
  m.enable_serial_number = COALESCE(v.enable_serial_number, '0'),
  m.enable_batch_number = COALESCE(v.enable_batch_number, '0'),
  m.position = v.position,
  m.attribute = v.attribute,
  m.tenant_id = COALESCE(v.tenant_id, @default_tenant_id),
  m.delete_flag = '0'
WHERE x.material_id IS NOT NULL;

INSERT INTO jsh_material (
  category_id,
  name,
  mfrs,
  model,
  standard,
  brand,
  mnemonic,
  color,
  unit,
  remark,
  unit_id,
  weight,
  enabled,
  other_field1,
  other_field2,
  other_field3,
  enable_serial_number,
  enable_batch_number,
  position,
  attribute,
  tenant_id,
  delete_flag
)
SELECT
  v.category_id,
  v.name,
  v.mfrs,
  v.model,
  v.standard,
  v.brand,
  v.mnemonic,
  v.color,
  v.unit,
  v.remark,
  v.unit_id,
  v.weight,
  IF(COALESCE(v.enabled, 1) = 1, b'1', b'0'),
  v.other_field1,
  v.other_field2,
  v.other_field3,
  COALESCE(v.enable_serial_number, '0'),
  COALESCE(v.enable_batch_number, '0'),
  v.position,
  v.attribute,
  COALESCE(v.tenant_id, @default_tenant_id),
  '0'
FROM tmp_material_valid v
LEFT JOIN tmp_material_match x
  ON x.row_no = v.row_no
WHERE x.material_id IS NULL;

DROP TEMPORARY TABLE IF EXISTS tmp_material_import_result;
CREATE TEMPORARY TABLE tmp_material_import_result AS
SELECT
  e.row_no,
  'skip' AS action_type,
  NULL AS material_id,
  e.reason
FROM tmp_material_import_error e
UNION ALL
SELECT
  x.row_no,
  'update' AS action_type,
  x.material_id,
  '按组合键匹配到现有商品并更新附加字段' AS reason
FROM tmp_material_match x
WHERE x.material_id IS NOT NULL
UNION ALL
SELECT
  v.row_no,
  'insert' AS action_type,
  m.id AS material_id,
  '新增商品主档' AS reason
FROM tmp_material_valid v
JOIN tmp_material_match x
  ON x.row_no = v.row_no
JOIN jsh_material m
  ON m.category_id = v.category_id
 AND m.name = v.name
 AND IFNULL(m.mfrs, '') = IFNULL(v.mfrs, '')
 AND IFNULL(m.model, '') = IFNULL(v.model, '')
 AND IFNULL(m.standard, '') = IFNULL(v.standard, '')
 AND IFNULL(m.brand, '') = IFNULL(v.brand, '')
 AND IFNULL(m.delete_flag, '0') = '0'
WHERE x.material_id IS NULL;

SELECT
  action_type,
  COUNT(*) AS row_count
FROM tmp_material_import_result
GROUP BY action_type
ORDER BY action_type;

SELECT
  row_no,
  action_type,
  material_id,
  reason
FROM tmp_material_import_result
ORDER BY row_no, action_type, material_id;
