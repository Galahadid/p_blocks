---
title: 示例：MySQL 查询突然变慢，索引失效排查
date: 2026-03-18
tags: [mysql, 索引, 性能优化]
---

## 问题现象

线上一条原本 200ms 的列表查询突然涨到 8s+，代码没改过，数据量也只增加了少量。

```sql
SELECT * FROM orders WHERE user_id = 12345 AND status = 'PAID' ORDER BY created_at DESC LIMIT 20;
```

## 排查过程

1. `EXPLAIN` 查看执行计划，`type` 显示 `index`，`key` 为空 —— **没用上索引**
2. 表结构确认 `(user_id, status, created_at)` 联合索引确实存在
3. 进一步 `SHOW INDEX FROM orders`，发现 `cardinality` 严重偏低

## 根因

上周的一次批量数据导入后**没有人执行 ANALYZE TABLE**，优化器统计信息过期，误判走全表扫描更快，导致索引失效。

## 解决方案

```sql
ANALYZE TABLE orders;
```

执行后查询立刻恢复到 300ms 以内。同时在大批量导入任务末尾补上了这条语句。

## 举一反三

- `EXPLAIN` 是排查 SQL 慢的第一步，重点看 `type / key / rows`
- 常见索引失效原因还有：对索引列使用函数、隐式类型转换（字符串列用数字查）、`LIKE '%xx'` 左模糊
- 长期方案：给批量任务加"导入后 ANALYZE"的固定步骤，并配置慢查询日志告警
