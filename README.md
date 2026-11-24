# HIGHLIGHT 2027 年曆團｜特典卡分配

靜態網頁（GitHub Pages）。資料從 Supabase 的 `tokuten-feed` 窗口即時讀取，窗口只輸出遮名、已排序的資料。

- `index.html`：頁面
- `images/`：各通路卡面預覽（順序：斗、耀、光、雲）
- `data/stock.json`：到貨後填各通路各成員張數，例如 `{"OFFIK":[2,1,1,0]}`（順序：斗、耀、光、雲）
- `data/feed.json`：窗口讀不到時的備援快照
- `supabase/functions/tokuten-feed/index.ts`：窗口的原始碼
