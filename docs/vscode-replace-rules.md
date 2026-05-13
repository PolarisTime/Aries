# VSCode 全局替换规则 — 旧代码 unknown/any → 类型收窄函数

在 VSCode 中按 `Ctrl+Shift+H` 打开全局搜索替换，勾选正则表达式 `.*`，逐条执行。

## 规则 1: `value ?? ''` → `asString(value)`（最常用，~150处）

**Find** (regex ON):
```
(\w+(?:\[[^\]]+\]|\.\w+)*)\s*\?\?\s*''(\s*[,;)\]:}\n])
```
**Replace**:
```
asString($1)$2
```
**注意**: 首次替换可能过度匹配，需逐文件确认。建议先替换以下子集：
- `record\.(\w+)\s*\?\?\s*''` → `asString(record.$1)`
- `item\.(\w+)\s*\?\?\s*''` → `asString(item.$1)`

## 规则 2: `value || ''` → `asString(value)`

**Find** (regex ON):
```
(\w+(?:\[[^\]]+\]|\.\w+)*)\s*\|\|\s*''(\s*[,;)\]:}\n])
```
**Replace**:
```
asString($1)$2
```

## 规则 3: `Number(value \|\| 0)` → `asNumber(value)`

**Find** (regex ON):
```
Number\((\w+(?:\[[^\]]+\]|\.\w+)*)\s*\|\|\s*0\s*\)
```
**Replace**:
```
asNumber($1)
```

## 规则 4: `String(value \|\| '')` → `asString(value)`

**Find** (regex ON):
```
String\((\w+(?:\[[^\]]+\]|\.\w+)*)\s*\|\|\s*''\s*\)
```
**Replace**:
```
asString($1)
```

## 规则 5: `Array\.isArray\(x\) \? x : \[\]` → `asArray(x)`

**Find** (regex ON):
```
Array\.isArray\((\w+)\)\s*\?\s*\1\s*:\s*\[\]
```
**Replace**:
```
asArray($1)
```

## 规则 6: `as string` / `as number` 强制断言 → 收窄函数

**Find** (regex ON):
```
as string
```
**Replace** (仅在类型收窄场景):
```
// 手动检查后用 asString() 替代
```

## 规则 7: `Record<string, unknown>` 访问 → `safe()` 访问器

**Find** (regex ON):
```
import \{ Record \} from
```
**Replace**:
```
// 考虑替换为 import { safe } from '@/utils/type-narrowing'
```

## 规则 8: 文件级导入替换

在每个使用上述规则的文件顶部添加：
```ts
import { asString, asNumber, asBoolean, asArray, asId, safe } from '@/utils/type-narrowing'
```

**Find** (regex ON):
```
^(import .+ from '[^']+'\n)(?!import \{ asString)
```
**Replace**:
```
$1import { asString } from '@/utils/type-narrowing'\n
```
（手动调整添加你需要的具体函数）

## 执行顺序建议

1. 先执行规则 1-5（机械替换，批量安全）
2. ESLint auto-fix: `npx eslint src/ --fix`
3. 统计剩余 `Record<string, unknown>`: `grep -rn "Record<string, unknown>" src/ -l | wc -l`
4. 逐个文件迁移剩余的 `any` 类型
5. 对 API 边界添加 Zod 校验

## 迁移进度追踪

运行以下命令查看进度：
```bash
# 剩余 Record<string, unknown> 文件数
grep -rn "Record<string, unknown>" src/ -l | wc -l

# 剩余 any 使用数  
grep -rn ": any\|as any" src/ | grep -v node_modules | wc -l

# ESLint 剩余问题
npx eslint src/ --format stylish 2>&1 | tail -1
```
