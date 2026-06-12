import { db, checkKey, askClaude } from '../util';

export const maxDuration = 60;

const CROSS_PROMPT = `你是跨市場映射引擎。用戶提供當日A股盤面報告的結構化主題。請基於這些主題,映射出台灣上市櫃與美股市場的關聯標的。只輸出 JSON,無前言無圍欄:

{
  "tw": [
    { "name": "公司名", "ticker": "代號如2313(不確定填null)", "theme": "對應的A股主題",
      "link": "關聯邏輯,50字內", "risk": "風險點,30字內", "strength": "strong|medium|weak" }
  ],
  "us": [
    { "name": "公司名", "ticker": "代號如RKLB(不確定填null)", "theme": "對應的A股主題",
      "link": "關聯邏輯,50字內", "risk": "風險點,30字內", "strength": "strong|medium|weak" }
  ],
  "note": "整體提醒,60字內"
}

規則:
1. 每個市場最多6檔,只選關聯邏輯紮實的;沾邊勉強的不如不列。
2. 嚴禁輸出股價、本益比、殖利率、漲跌幅等任何行情數據——你沒有即時數據,編造即失信。
3. ticker 不確定就填 null,寧缺勿錯。
4. strength 誠實評估:strong=產業鏈直接對應,medium=同主題不同環節,weak=情緒聯動。
5. 主題在台股/美股確實沒有對應標的時,允許該市場列表較短甚至為空。`;

export async function POST(request) {
  const denied = checkKey(request);
  if (denied) return denied;

  const { date } = await request.json();
  if (!date) return Response.json({ error: 'missing date' }, { status: 400 });

  const { data: exts } = await db
    .from('gustock_extractions').select('session, themes, market_tone').eq('trade_date', date);
  if (!exts?.length) {
    return Response.json({ error: '該日無抽取數據' }, { status: 404 });
  }

  let content;
  try {
    content = await askClaude(CROSS_PROMPT, JSON.stringify(exts), 3000);
  } catch (e) {
    return Response.json({ error: '映射生成失敗:' + e.message }, { status: 500 });
  }

  await db.from('gustock_crossmarket').upsert(
    { trade_date: date, content, created_at: new Date().toISOString() },
    { onConflict: 'trade_date' }
  );
  return Response.json({ ok: true, cross: content });
}
