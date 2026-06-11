import { db, checkKey, askClaude } from '../util';

const COMPARE_PROMPT = `你是盤面觀點驗證引擎。用戶提供同一交易日的多個時段(早盤/午盤/收盤)的結構化抽取結果。請生成「盤中觀點 vs 收盤兌現」對照,只輸出 JSON,無前言無圍欄:

{
  "rows": [
    { "claim": "盤中判斷摘要", "session": "morning|midday", "outcome": "收盤實況摘要",
      "result": "hit|miss|partial|uncovered", "note": "20字內備註,可空字串" }
  ],
  "consistency": "跨時段一致性檢測:同一主線是否有論據疊加或觀點反轉,80字內",
  "summary": "全天一句話總結,50字內"
}

規則:
1. 只驗證可對照的判斷;收盤未提及的盤中觀點標 uncovered。
2. result 判定須基於收盤篇的實際數據與表述,不要臆測行情。
3. 若僅有收盤篇而無盤中篇,rows 為空陣列,consistency 說明無法對照。`;

export async function POST(request) {
  const denied = checkKey(request);
  if (denied) return denied;

  const { date } = await request.json();
  if (!date) return Response.json({ error: 'missing date' }, { status: 400 });

  const { data: exts } = await db
    .from('gustock_extractions').select('*').eq('trade_date', date);
  if (!exts?.length) {
    return Response.json({ error: '該日無抽取數據' }, { status: 404 });
  }

  let content;
  try {
    content = await askClaude(COMPARE_PROMPT, JSON.stringify(exts), 3000);
  } catch (e) {
    return Response.json({ error: '對照生成失敗:' + e.message }, { status: 500 });
  }

  await db.from('gustock_compares').upsert(
    { trade_date: date, content, created_at: new Date().toISOString() },
    { onConflict: 'trade_date' }
  );
  return Response.json({ ok: true, compare: content });
}
