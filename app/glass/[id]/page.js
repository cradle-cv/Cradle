import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export const revalidate = 300;

export default async function GlassDetail({ params }) {
  const { id } = await params;
  const { data: p } = await supabase
    .from('cove_poems')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();
  if (!p) notFound();

  const audio = Array.isArray(p.audio_src) ? p.audio_src[0] : null;

  return (
    <main className={`sheet glass-detail gd-${p.glass_color}`}>
      <div className="sheet-head">
        <div className="no">Sea Glass</div>
        <div className="th">{p.title}</div>
        <div className="sub">{p.poet_name}</div>
        <div className="hairline" />
      </div>

      <article className="poem-body">
        {p.body.split('\n').map((line, i) =>
          line.trim() ? <p key={i}>{line}</p> : <p key={i} className="blank">&nbsp;</p>
        )}
      </article>

      {audio ? (
        <div className="poem-audio">
          <div className="pa-cap">从这首诗里长出来的音乐</div>
          <audio controls preload="none" src={audio} />
          {p.gen_note ? <p className="pa-note">{p.gen_note}</p> : null}
        </div>
      ) : (
        <p className="poem-noaudio">这一枚还没有配上它的音乐</p>
      )}

      <p className="glass-back"><Link href="/glass">回到滩上 →</Link></p>
    </main>
  );
}
