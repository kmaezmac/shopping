-- shopping_items: 店舗名・カテゴリ・並び順を追加
ALTER TABLE shopping_items
  ADD COLUMN IF NOT EXISTS store text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- 既存レコードの sort_order を created_at 順で初期化
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1 AS rn
  FROM shopping_items
)
UPDATE shopping_items
SET sort_order = ranked.rn
FROM ranked
WHERE shopping_items.id = ranked.id;

-- shopping_history_items: 店舗名・カテゴリを追加
ALTER TABLE shopping_history_items
  ADD COLUMN IF NOT EXISTS store text,
  ADD COLUMN IF NOT EXISTS category text;
