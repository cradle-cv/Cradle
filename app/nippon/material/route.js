// Fetch the unchanged public lesson from its publisher for the learner's session.
// Fixed source only: this endpoint never accepts arbitrary URLs or credentials.
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET() {
  try {
    const upstream = await fetch('https://www.irodori.jpf.go.jp/assets/data/starter/pdf/X_L03.pdf', {
      signal: AbortSignal.timeout(45000),
      cache: 'no-store',
    });
    if (!upstream.ok || !upstream.headers.get('content-type')?.includes('application/pdf')) {
      return Response.json({error:'官方教材暂时无法读取，请稍后重试。'}, {status:502});
    }
    return new Response(upstream.body, {headers:{
      'Content-Type':'application/pdf',
      'Content-Disposition':'inline; filename="irodori-starter-03.pdf"',
      'Cache-Control':'private, max-age=3600',
      'X-Content-Type-Options':'nosniff',
      'X-Robots-Tag':'noindex, nofollow',
    }});
  } catch {
    return Response.json({error:'官方教材连接超时，请稍后重试。'}, {status:504});
  }
}
