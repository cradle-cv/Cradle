import { db, checkKey, askClaude } from '../util';

const EXTRACT_PROMPT = `你是一個證券分析報告結構化引擎。將用戶提供的盤面總結抽取為 JSON,只輸出 JSON,不要任何前言、解釋或 Markdown 圍欄。

JSON 結構:
{
  "market": {
    "advancers": 上漲家數(整數或null),
    "decliners": 下跌家數(整數或null),
    "limit_down": 跌停家數(整數或null),
    "turnover_yi": 成交額億元(數字或null),
    "turnover_chg": 較前日增減億元,縮量為負(數字或null),
    "tone": "盤面定性,30字內"
  },
  "themes": [
    {
      "name": "主題名",
      "stance": "bullish|bearish|neutral|diverge",
      "logic": "核心邏輯,60字內",
      "tickers": ["提及個股名"],
      "verifiable": "high|medium|low",
      "verify_window_days": 建議驗證窗口天數(整數),
      "verify_metric": "驗證方法,例:對照XX指數未來N日相對滬指表現"
    }
  ],
  "stocks": [
    { "code": "代碼如600549.SH(不確定填null)", "name": "個股名", "context": "提及語境20字內", "sentiment": "positive|negative|neutral" }
  ],
  "knowledge_cards": [
    { "title": "標題", "body": "內容原文整理", "topic": "所屬領域" }
  ],
  "lexicon": [
    { "term": "分析師自創概念詞", "definition": "本篇給出的定義" }
  ],
  "style_tags": ["風格標籤,如:供給端邏輯主導/給出具體數據/有風險提示/自有框架"]
}

規則:
1. verifiable 標 low 的情形:「波動延續」「注意安全邊際」這類無法量化驗證的話術。
2. knowledge_cards 只收產業鏈映射、壟斷格局清單這類長期參考素材,不收多空觀點。
3. lexicon 只在分析師明確定義了自創概念時填,沒有就空陣列。
4. 個股代碼不確定就填 null,寧缺勿錯。`;

export async function POST(request) {
  const denied = checkKey(request);
  if (denied) return denied;

  const { trade_date, session, raw_text } = await request.json();
  if (!trade_date || !session || !raw_text?.trim()) {
    return Response.json({ error: 'missing fields' }, { status: 400 });
  }

  // 同日同時段重貼 = 覆蓋
  const { data: report, error: repErr } = await db
    .from('gustock_reports')
    .upsert({ trade_date, session, raw_text, extracted: false },
            { onConflict: 'trade_date,session' })
    .select().single();
  if (repErr) return Response.json({ error: repErr.message }, { status: 500 });

  // 覆蓋時清掉舊抽取
  await db.from('gustock_extractions').delete().eq('report_id', report.id);

  let parsed;
  try {
    parsed = await askClaude(EXTRACT_PROMPT, raw_text);
  } catch (e) {
    return Response.json({ error: '抽取解析失敗:' + e.message }, { status: 500 });
  }

  const { data: ext, error: extErr } = await db
    .from('gustock_extractions')
    .insert({
      report_id: report.id,
      trade_date, session,
      advancers: parsed.market?.advancers ?? null,
      decliners: parsed.market?.decliners ?? null,
      limit_down: parsed.market?.limit_down ?? null,
      turnover_yi: parsed.market?.turnover_yi ?? null,
      turnover_chg: parsed.market?.turnover_chg ?? null,
      market_tone: parsed.market?.tone ?? null,
      themes: parsed.themes ?? [],
      stocks: parsed.stocks ?? [],
      style_tags: parsed.style_tags ?? []
    })
    .select().single();
  if (extErr) return Response.json({ error: extErr.message }, { status: 500 });

  for (const card of parsed.knowledge_cards ?? []) {
    await db.from('gustock_knowledge_cards').insert({
      report_id: report.id, title: card.title, body: card.body, topic: card.topic
    });
  }

  for (const item of parsed.lexicon ?? []) {
    await db.from('gustock_lexicon').upsert(
      { term: item.term, definition: item.definition,
        first_seen: trade_date, report_id: report.id,
        updated_at: new Date().toISOString() },
      { onConflict: 'term' }
    );
  }

  for (const t of parsed.themes ?? []) {
    if (t.verifiable !== 'low' && (t.verify_window_days ?? 0) > 5) {
      await db.from('gustock_watch_pool').insert({
        extraction_id: ext.id,
        claim: `${t.name}:${t.logic}`,
        theme: t.name,
        open_date: trade_date,
        window_days: t.verify_window_days,
        verify_metric: t.verify_metric
      });
    }
  }

  await db.from('gustock_reports').update({ extracted: true }).eq('id', report.id);
  return Response.json({ ok: true, extraction: ext });
}
