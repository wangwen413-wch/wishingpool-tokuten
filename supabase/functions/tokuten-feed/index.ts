// 公開窗口：只吐出「遮過名字」且「已排好順位」的特典卡資料。
// 不含：完整姓名、金額、電話、門市、客人編號、付款狀態。
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CHANNELS = ["HL SHOP", "APPLE MUSIC 預購", "APPLE MUSIC 線上", "APPLE MUSIC 線下", "OFFIK", "SOUNDWAVE"];
const MEMBER_CHAR: Record<string, number> = { 斗: 0, 耀: 1, 燮: 1, 光: 2, 雲: 3, 東: 3 };
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Cache-Control": "public, max-age=30",
  "Content-Type": "application/json; charset=utf-8",
};

const mask = (n: string) =>
  n.length >= 3 ? n[0] + "O".repeat(n.length - 2) + n[n.length - 1] : n.length === 2 ? n[0] + "O" : n;

function parsePref(line: string): number[] {
  const m = line.match(/特典卡順序:\s*([^)]*)\)/);
  const out: number[] = [];
  if (m) for (const ch of m[1]) { const i = MEMBER_CHAR[ch]; if (i !== undefined && !out.includes(i)) out.push(i); }
  for (let i = 0; i < 4; i++) if (!out.includes(i)) out.push(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await db
    .from("orders")
    .select("id, customer_id, customer_name, amount, status, created_at, items, project_name")
    .like("project_name", "年曆%2027%")
    .not("status", "like", "%取消%");
  if (error) return new Response(JSON.stringify({ error: "unavailable" }), { status: 500, headers: cors });

  const cust: Record<string, { name: string; cal: number; amount: number; first: number }> = {};
  const lines: { key: string; order: string; created: string; qty: number; channel: string | null; pref: number[] }[] = [];
  for (const r of data ?? []) {
    const key = String(r.customer_id ?? r.customer_name);
    const c = (cust[key] ??= { name: r.customer_name ?? "", cal: 0, amount: 0, first: Infinity });
    c.amount += Number(r.amount) || 0;
    const order = String(r.id).replace(/^#/, "").split("-")[0];
    for (const ln of String(r.items ?? "").split("\n")) {
      if (!/年曆本體|單買純年曆/.test(ln)) continue;
      const qty = Number(ln.match(/x(\d+)\s*$/)?.[1] ?? 1);
      c.cal += qty;
      c.first = Math.min(c.first, +new Date(r.created_at));
      const cm = ln.match(/(HL SHOP|OFFIK|SOUNDWAVE)\s*預購特典|APPLE MUSIC\s*(預購|線上|線下)/);
      const channel = cm ? (cm[1] ?? "APPLE MUSIC " + cm[2]) : (/無特典/.test(ln) ? null : "?");
      lines.push({ key, order, created: r.created_at, qty, channel, pref: parsePref(ln) });
    }
  }
  const ranked = Object.keys(cust).sort((a, b) => {
    const A = cust[a], B = cust[b];
    return B.cal - A.cal || B.amount - A.amount || A.first - B.first;
  });
  const rank = Object.fromEntries(ranked.map((k, i) => [k, i + 1]));

  const units: unknown[] = [];
  const pure: unknown[] = [];
  for (const l of lines) {
    for (let i = 0; i < l.qty; i++) {
      if (l.channel && CHANNELS.includes(l.channel))
        units.push({ channel: l.channel, order: l.order, mask: mask(cust[l.key].name), rank: rank[l.key], created: l.created, pref: l.pref });
      else if (l.channel === null) pure.push({ order: l.order, created: l.created });
    }
  }
  const updated = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false });
  return new Response(JSON.stringify({ updated, units, pure }), { headers: cors });
});
