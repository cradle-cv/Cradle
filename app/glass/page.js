import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export const revalidate = 120;
export const metadata = { title: '海玻璃 · Cove' };

// 海玻璃：被海水磨了很多年的碎玻璃，冲上岸时棱角没了，颜色还在。
// 每一枚封着一首诗，和一段从这首诗里长出来的音乐。
export default async function GlassPage() {
  const { data: poems } = await supabase
    .from('cove_poems')
    .select('id, poet_name, title, body, glass_color, audio_src, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  return (
    <main className="sheet">
      <div className="sheet-head">
        <div className="no">Sea Glass</div>
        <div className="th">海玻璃</div>
        <div className="sub">
          被海水磨了很多年的碎玻璃，颜色还在。<br />
          每一枚里封着一首诗，和从这首诗里长出来的一段音乐。
        </div>
        <div className="hairline" />
      </div>

      {poems && poems.length > 0 ? (
        <div className="beach">
          {poems.map((p, i) => (
            <Link key={p.id} href={`/glass/${p.id}`}
              className={`glass g-${p.glass_color} tilt-${i % 5}`}>
              <span className="g-title">{p.title}</span>
              <span className="g-line">{firstLine(p.body)}</span>
              <span className="g-poet">{p.poet_name}</span>
              {Array.isArray(p.audio_src) && p.audio_src.length ? (
                <span className="g-sound" aria-label="有音乐" />
              ) : null}
            </Link>
          ))}
        </div>
      ) : (
        <p className="dredging">滩上还没有捡到东西</p>
      )}

      <p className="glass-submit-line">
        写诗的人，可以<Link href="/glass/submit">把一枚放到滩上</Link>
      </p>
    </main>
  );
}

function firstLine(body) {
  const l = (body || '').split('\n').map((x) => x.trim()).filter(Boolean)[0] || '';
  return l.length > 18 ? l.slice(0, 18) + '…' : l;
}
