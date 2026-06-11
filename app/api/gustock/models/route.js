export async function GET(request) {
  const k = new URL(request.url).searchParams.get('k');
  if (k !== process.env.GUSTOCK_KEY) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const res = await fetch(`${process.env.LLM_BASE_URL}/models`, {
    headers: { 'Authorization': `Bearer ${process.env.LLM_API_KEY}` }
  });
  return Response.json(await res.json());
}
