import { createClient } from '@supabase/supabase-js';

export const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 驗證請求密鑰;不通過則返回 Response,通過返回 null
export function checkKey(request) {
  const key = request.headers.get('x-gustock-key');
  if (!key || key !== process.env.GUSTOCK_KEY) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  return null;
}

// 調用 OpenAI 兼容格式的 LLM API(Kimi/DeepSeek/智譜均可),要求純 JSON 輸出並解析
// 函數名保留 askClaude,後續檔案不需任何改動;換供應商只改環境變數
export async function askClaude(system, userText, maxTokens = 4000) {
  const res = await fetch(`${process.env.LLM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LLM_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userText }
      ]
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  const text = data.choices?.[0]?.message?.content ?? '';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}
