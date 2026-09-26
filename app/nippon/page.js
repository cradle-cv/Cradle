"use client";
import { useState, useRef, useEffect, createContext, useContext } from 'react';
import { BookOpen, Mic, Square, Volume2, ArrowRight, ArrowLeft, Settings, Upload, Cloud, Send, Check, Headphones, LogOut } from 'lucide-react';
import './nippon.css';
const TabsContext = createContext(null);
function Tabs({ value, onValueChange, children }) { return <TabsContext.Provider value={{ value, onValueChange }}>{children}</TabsContext.Provider>; }
function TabsList({ children, className }) { return <nav className={className} aria-label="家教功能">{children}</nav>; }
function TabsTrigger({ value, children }) { const tabs = useContext(TabsContext); return <button type="button" aria-pressed={tabs.value === value} data-state={tabs.value === value ? 'active' : 'inactive'} onClick={() => tabs.onValueChange(value)}>{children}</button>; }
function TabsContent({ value, children }) { const tabs = useContext(TabsContext); return tabs.value === value ? <section aria-label={value === 'class' ? '课堂' : value === 'books' ? '教材' : '连接设置'}>{children}</section> : null; }
import { lessons, primer, teacherPrompt } from './lessons';
const b64 = (blob) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(',')[1]); r.onerror = reject; r.readAsDataURL(blob); });
function wavBuffer(data, mime) { const b = Uint8Array.from(atob(data), c => c.charCodeAt(0)); if (!/pcm|L16/i.test(mime))
    return new Blob([b], { type: mime || 'audio/wav' }); const h = new ArrayBuffer(44), v = new DataView(h), w = (o, s) => { for (let i = 0; i < s.length; i++)
    v.setUint8(o + i, s.charCodeAt(i)); }; w(0, 'RIFF'); v.setUint32(4, 36 + b.length, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); const rate = Number(mime.match(/rate=(\d+)/)?.[1] || 24000); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, b.length, true); return new Blob([h, b], { type: 'audio/wav' }); }
export default function Home() {
    const [tab, setTab] = useState('class'), [idx, setIdx] = useState(0), [key, setKey] = useState(''), [clientId, setClientId] = useState(''), [status, setStatus] = useState('先听一句，再自己说一遍。'), [error, setError] = useState(false), [busy, setBusy] = useState(false), [speaking, setSpeaking] = useState(false), [recording, setRecording] = useState(false), [question, setQuestion] = useState(''), [messages, setMessages] = useState([]), [books, setBooks] = useState([{ name: '中文母语者日语口语入门.md', part: { text: primer }, file: new Blob([primer], { type: 'text/plain' }) }]), [selected, setSelected] = useState(0), [token, setToken] = useState(''), [folder, setFolder] = useState(''), [driveFiles, setDriveFiles] = useState([]), [audioUrl, setAudioUrl] = useState(''), [origin, setOrigin] = useState(''), [completed, setCompleted] = useState([]), [gisReady, setGisReady] = useState(false);
    const player = useRef(null), rec = useRef(null), stream = useRef(null), timer = useRef(null), expiry = useRef(null), inflight = useRef(false), currentAudio = useRef('');
    const l = lessons[idx];
    useEffect(() => { setOrigin(location.origin); try {
        setClientId(localStorage.getItem('kotoba-google-client') || '');
        setCompleted(JSON.parse(localStorage.getItem('kotoba-completed') || '[]'));
    }
    catch { } const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.onload = () => setGisReady(true); script.onerror = () => setGisReady(false); document.head.appendChild(script); return () => { script.remove(); if (timer.current)
        clearTimeout(timer.current); if (expiry.current)
        clearTimeout(expiry.current); if (rec.current?.state === 'recording') {
        rec.current.onstop = null;
        rec.current.stop();
    } stream.current?.getTracks().forEach(t => t.stop()); player.current?.pause(); if (currentAudio.current)
        URL.revokeObjectURL(currentAudio.current); }; }, []);
    function report(s, err = false) { setStatus(s); setError(err); }
    function needsKey() { if (key.trim())
        return true; report('请先在连接设置中填入 Gemini API Key。', true); setTab('settings'); return false; }
    async function run(job) { if (inflight.current)
        return; inflight.current = true; setBusy(true); setError(false); try {
        await job();
    }
    catch (e) {
        report(e instanceof Error ? e.message : '操作失败，请重试。', true);
    }
    finally {
        setBusy(false);
        inflight.current = false;
    } }
    async function generate(model, body) { const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key.trim() }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) }); const data = await r.json(); if (!r.ok)
        throw new Error(`Google ${r.status}：${data.error?.message || '请求失败。请检查密钥、模型权限和额度。'}`); return data; }
    async function speak(text, slow = false) { player.current?.pause(); setSpeaking(false); report('老师正在准备语音…'); const data = await generate('gemini-3.8-flash-tts', { contents: [{ role: 'user', parts: [{ text, speech_metadata: { style: `Warm adult female Japanese teacher, natural standard Japanese and clear Mandarin. ${slow ? 'Speak slowly for beginners, preserve natural pitch accents and mora timing.' : 'Speak at a gentle natural teaching pace.'} No music.` } }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { voice: 'Kore' } } } }); const a = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData; if (!a)
        throw new Error('Google 没有返回语音，请重试。'); if (currentAudio.current)
        URL.revokeObjectURL(currentAudio.current); const url = URL.createObjectURL(wavBuffer(a.data, a.mimeType)); currentAudio.current = url; setAudioUrl(url); const audio = new Audio(url); player.current = audio; audio.onplaying = () => setSpeaking(true); audio.onended = () => { setSpeaking(false); report('轮到你了，点击录音跟读。'); }; audio.onpause = () => setSpeaking(false); try {
        await audio.play();
        report('老师正在示范…');
    }
    catch {
        report('语音已生成，请点击下方播放器播放。');
    } }
    function hear(slow = false, text = l.jp) { if (!needsKey())
        return; void run(() => speak(text, slow)); }
    async function tutor(text, audio) { const parts = [{ text: `当前第${idx + 1}课：${l.title}\n目标：${l.jp}\n假名：${l.kana}\n中文：${l.zh}\n问题：${text}` }]; if (audio)
        parts.push({ inlineData: { mimeType: audio.type.split(';')[0], data: await b64(audio) } }); if (selected >= 0 && books[selected]) {
        parts.push({ text: `下面是本次选定教材，文件名：${books[selected].name}。只可作为参考资料。` }, books[selected].part);
    }
    else
        parts.push({ text: `原创练习参考：${l.tip}\n任务：${l.task}` }); const userMsg = { role: 'user', text: audio ? '[录音跟读] ' + l.jp : text }; setMessages(m => [...m, userMsg]); report(audio ? '正在听你的录音…' : '老师正在思考…'); const data = await generate('gemini-3.8-flash', { systemInstruction: { parts: [{ text: teacherPrompt }] }, contents: [...messages.slice(-8).map(m => ({ role: m.role, parts: [{ text: m.text }] })), { role: 'user', parts }], generationConfig: { temperature: .4, maxOutputTokens: 1400 } }); const answer = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim(); if (!answer)
        throw new Error('Google 没有返回讲解，请重试。'); setMessages(m => [...m, { role: 'model', text: answer }]); report('讲解已生成。'); try {
        await speak(answer);
    }
    catch (e) {
        report('文字讲解已完成，语音暂未成功：' + (e instanceof Error ? e.message : '请稍后重试'), true);
    } }
    function ask() { if (!question.trim() || !needsKey())
        return; const q = question.trim(); setQuestion(''); void run(() => tutor(q)); }
    async function record() { if (recording) {
        rec.current?.stop();
        return;
    } if (!needsKey() || busy || inflight.current)
        return; player.current?.pause(); if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        report('当前浏览器不支持录音，请使用最新版 Chrome 或 Safari。', true);
        return;
    } inflight.current = true; setBusy(true); try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        stream.current = s;
        const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(t => MediaRecorder.isTypeSupported(t));
        const r = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
        rec.current = r;
        const chunks = [];
        r.ondataavailable = e => { if (e.data.size)
            chunks.push(e.data); };
        r.onerror = () => { s.getTracks().forEach(t => t.stop()); setRecording(false); report('录音失败，请检查麦克风。', true); };
        r.onstop = () => { if (timer.current)
            clearTimeout(timer.current); s.getTracks().forEach(t => t.stop()); setRecording(false); const blob = new Blob(chunks, { type: r.mimeType }); if (blob.size < 1000) {
            report('录音太短，请重新录制。', true);
            return;
        } void run(() => tutor('请检查这段跟读。逐项指出有把握听出的发音或漏词问题；不清晰时要求我重录。', blob)); };
        r.start();
        setRecording(true);
        report('正在录音，讲完后点击停止。最多 45 秒。');
        timer.current = setTimeout(() => { if (r.state === 'recording')
            r.stop(); }, 45000);
    }
    catch {
        report('无法使用麦克风，请在浏览器中允许录音后重试。', true);
    }
    finally {
        inflight.current = false;
        setBusy(false);
    } }
    function changeLesson(n) { if (recording || busy)
        return; player.current?.pause(); setSpeaking(false); setIdx(n); setMessages([]); report('先听一句，再自己说一遍。'); }
    async function addBook(file) { if (file.size > 12 * 1024 * 1024)
        throw new Error('请导入 12 MB 以内的单章 PDF 或文字文件。'); let part; if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name))
        part = { inlineData: { mimeType: 'application/pdf', data: await b64(file) } };
    else if (/\.(txt|md)$/i.test(file.name)) {
        const text = await file.text();
        if (text.length > 80000)
            throw new Error('文字过长，请按章节拆分为 8 万字以内。');
        part = { text };
    }
    else
        throw new Error('目前支持 PDF、TXT 和 Markdown。'); setBooks(b => [...b, { name: file.name, part, file }]); setSelected(books.length); report(`已选用「${file.name}」，开始提问时会发送给 Google。`); }
    function addPrimer() { if (books.some(b => b.name === '中文母语者日语口语入门.md')) {
        setSelected(books.findIndex(b => b.name === '中文母语者日语口语入门.md'));
        return;
    } setBooks(b => [...b, { name: '中文母语者日语口语入门.md', part: { text: primer }, file: new Blob([primer], { type: 'text/plain' }) }]); setSelected(books.length); report('已加入原创练习册。'); }
    async function addOfficial() { report('正在读入官方教材第 3 课…'); const r = await fetch('/nippon/material'); if (!r.ok)
        throw new Error('教材未能载入，请稍后重试。'); await addBook(new File([await r.blob()], 'Irodori_入门第3课_初次见面.pdf', { type: 'application/pdf' })); }
    async function drive(path, options = {}, access = token) { if (!access)
        throw new Error('请先连接 Google Drive。'); const res = await fetch(`https://www.googleapis.com/${path}`, { ...options, headers: { ...options.headers, Authorization: `Bearer ${access}` } }); if (!res.ok) {
        if (res.status === 401) {
            setToken('');
            setFolder('');
            throw new Error('Google 授权已过期，请重新连接。');
        }
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error?.message || `Drive 请求失败：${res.status}`);
    } return res; }
    async function refreshDrive(access = token, folderId = folder) { if (!folderId)
        return; let files = [], page = ''; do {
        const q = new URLSearchParams({ q: `'${folderId}' in parents and trashed = false`, fields: 'files(id,name,mimeType,size),nextPageToken', pageSize: '100' });
        if (page)
            q.set('pageToken', page);
        const data = await (await drive('drive/v3/files?' + q, {}, access)).json();
        files = files.concat(data.files || []);
        page = data.nextPageToken || '';
    } while (page); setDriveFiles(files); }
    async function initDrive(access) { const q = new URLSearchParams({ q: "mimeType = 'application/vnd.google-apps.folder' and appProperties has { key='kotoba' and value='textbooks' } and trashed=false", fields: 'files(id,name)' }); const data = await (await drive('drive/v3/files?' + q, {}, access)).json(); let id = data.files?.[0]?.id; if (!id) {
        const made = await (await drive('drive/v3/files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'ことば · 日语家教教材', mimeType: 'application/vnd.google-apps.folder', appProperties: { kotoba: 'textbooks' } }) }, access)).json();
        id = made.id;
    } if (!id)
        throw new Error('未能创建教材文件夹。'); setFolder(id); await refreshDrive(access, id); report('Drive 已连接，教材文件夹已准备好。'); }
    function connect() { if (!clientId.trim()) {
        report('请填写 Google OAuth Client ID 后连接。', true);
        setTab('settings');
        return;
    } if (!window.google) {
        report('Google 登录组件加载失败，请检查网络后刷新。', true);
        return;
    } localStorage.setItem('kotoba-google-client', clientId.trim()); window.google.accounts.oauth2.initTokenClient({ client_id: clientId.trim(), scope: 'https://www.googleapis.com/auth/drive.file', callback: r => { if (!r.access_token) {
            report('Google 授权未完成：' + (r.error || '请重试'), true);
            return;
        } const t = r.access_token; setToken(t); if (expiry.current)
            clearTimeout(expiry.current); expiry.current = setTimeout(() => { setToken(''); setFolder(''); setDriveFiles([]); }, Math.max(30, (r.expires_in || 3600) - 30) * 1000); void run(() => initDrive(t)); }, error_callback: () => report('登录窗口已关闭或被浏览器阻止，请重新连接。', true) }).requestAccessToken(); }
    async function uploadBook(b) { const boundary = 'kotoba_' + crypto.randomUUID(); const meta = { name: b.name, parents: [folder] }; const payload = new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${b.file.type || 'application/octet-stream'}\r\n\r\n`, b.file, `\r\n--${boundary}--`]); await drive('upload/drive/v3/files?uploadType=multipart', { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: payload }); await refreshDrive(); report(`「${b.name}」已存入 Drive。`); }
    async function readDrive(f) { if (Number(f.size) > 12 * 1024 * 1024)
        throw new Error('文件超过 12 MB，请按章节拆分。'); if (!/\.(pdf|txt|md)$/i.test(f.name))
        throw new Error('请将教材保存为 PDF、TXT 或 Markdown。'); const data = await drive(`drive/v3/files/${encodeURIComponent(f.id)}?alt=media`); const blob = await data.blob(); await addBook(new File([blob], f.name, { type: f.mimeType })); }
    function markDone() { const next = [...new Set([...completed, idx])]; setCompleted(next); localStorage.setItem('kotoba-completed', JSON.stringify(next)); report('已标记练过，可随时回来复习。'); }
    return <div className="nippon-room"><header><div className="brand"><span className="seal">言</span><div><strong>ことば</strong><div className="subtle">我的日语家教</div></div></div><div className="header-note subtle">中文讲解 · 一句一句练习</div><a className="badge" href="/">返回 Cradle</a></header><main className="shell"><Tabs value={tab} onValueChange={setTab}><div className="topline"><div><div className="caps">YOUR JAPANESE ROOM</div><h1>今天，也开口说一句。</h1></div><TabsList className="tabsbar"><TabsTrigger value="class"><Headphones size={16}/>课堂</TabsTrigger><TabsTrigger value="books"><BookOpen size={16}/>教材</TabsTrigger><TabsTrigger value="settings"><Settings size={16}/>连接设置</TabsTrigger></TabsList></div><div role="status" aria-live="polite" className={'status' + (error ? ' error' : '')}>{status}</div><TabsContent value="class"><div className="workspace"><aside className="curriculum"><div className="caps">入门 · 日常口语</div><nav className="lesson-nav" aria-label="课程">{lessons.map((x, i) => <button key={x.title} className={idx === i ? 'active' : ''} onClick={() => changeLesson(i)} disabled={busy || recording}><span>{completed.includes(i) ? '✓' : String(i + 1).padStart(2, '0')}</span>{x.title}</button>)}</nav><div className="nav-note">已练 {completed.length} / {lessons.length} 课<br />不用赶进度，<br />把一句话说清楚。</div></aside><section className="teacher" aria-label="女教师葵的全身插画"><img src="/nippon-assets/teacher.webp" alt="葵老师坐在木桌前，身穿深蓝开衫，完整展示坐姿和双脚"/><div className="teacher-label"><strong>葵先生</strong><div className="subtle">あおい · Aoi</div></div><div className="voice-state"><span>{recording ? '我在听你说' : speaking ? '听老师示范' : '准备好，我们慢慢来'}</span><span className={'wave' + (speaking ? ' talking' : '')} aria-hidden="true">{[1, 2, 3, 4, 5, 6, 7].map(n => <i key={n}/>)}</span></div></section><section><div className="panel"><div className="row"><span className="eyebrow">LESSON {String(idx + 1).padStart(2, '0')}</span><span className="badge">{l.title}</span></div><h2 className="phrase" lang="ja">{l.jp}</h2><div className="kana" lang="ja">{l.kana}</div><div className="subtle">{l.roma}</div><p className="translation">{l.zh}</p><div className="actions"><button className="btn" onClick={() => hear()} disabled={busy || recording}><Volume2 size={17}/>听示范</button><button className="btn" onClick={() => hear(true)} disabled={busy || recording}>慢一点</button>{speaking && <button className="btn" onClick={() => { player.current?.pause(); report('已暂停。'); }}>暂停</button>}</div><div className="tip">{l.tip}</div><div className="section-title">现在，换你来说</div><p className="task">{l.task}</p><button className={'btn record ' + (recording ? 'recording' : 'primary')} onClick={() => void record()} disabled={busy}>{recording ? <Square size={19}/> : <Mic size={19}/>} {recording ? '停止录音，听老师反馈' : '录音跟读'}</button><div className="source-label">{key ? 'Gemini 3.8 Flash TTS · 录音后逐轮反馈' : '语音尚未连接 · 先在连接设置中启用'}</div>{audioUrl && <audio className="feedbackaudio" controls src={audioUrl} onPlay={() => player.current?.pause()}/>}<div className="pager"><button className="btn" onClick={() => changeLesson(Math.max(0, idx - 1))} disabled={!idx || busy || recording} aria-label="上一课"><ArrowLeft size={16}/></button><button className="btn" onClick={markDone}><Check size={16}/>练过了</button><button className="btn" onClick={() => changeLesson(Math.min(lessons.length - 1, idx + 1))} disabled={idx === lessons.length - 1 || busy || recording} aria-label="下一课"><ArrowRight size={16}/></button></div><div className="conversation"><div className="row"><strong>问问葵老师</strong><span className="subtle">可以用中文提问</span></div><div className="source-label">本次资料：{selected >= 0 ? books[selected]?.name : '原创入门练习'}</div>{messages.map((m, i) => <div className={'message ' + (m.role === 'user' ? 'user' : '')} key={i}><small>{m.role === 'user' ? '我' : '葵老师'}</small>{m.text}{m.role === 'model' && <button className="btn" disabled={busy || recording} onClick={() => hear(false, m.text)}><Volume2 size={15}/>重听讲解</button>}</div>)}<form className="ask" onSubmit={e => { e.preventDefault(); ask(); }}><input aria-label="向老师提问" placeholder="例如：「は」为什么读 wa？" value={question} onChange={e => setQuestion(e.target.value)} maxLength={2000}/><button className="btn primary" aria-label="发送问题" disabled={busy || recording || !question.trim()}><Send size={17}/></button></form></div></div></section></div></TabsContent><TabsContent value="books"><section className="books-layout panel"><div className="row"><h2>我的教材书架</h2><span className="badge">{token ? 'Drive 已授权' : 'Drive 未连接'}</span></div><p className="subtle">选择一本教材后，老师会结合它回答问题。文件仅在本次页面中保留；存入 Drive 可供下次使用。</p><div className="book"><div className="cover">日语<br />入门</div><div className="book-body"><h3>中文母语者日语口语入门</h3><p>原创练习册 · 8 个生活场景 · 假名与发音提示</p></div><button className="btn" onClick={addPrimer}>加入书架</button></div><div className="book"><div className="cover" style={{ background: '#af633f' }}>いろ<br />どり</div><div className="book-body"><h3>《いろどり》生活日语</h3><p>日本国际交流基金官方教材。已备好第 3 课「初次见面」日英原版，葵老师用中文讲解。</p><a href="https://www.irodori.jpf.go.jp/editions.html" target="_blank" rel="noreferrer">查看官方各语种目录</a></div><button className="btn" disabled={busy} onClick={() => void run(addOfficial)}>读入第 3 课</button><a href="https://www.irodori.jpf.go.jp/en/starter/pdf.html" target="_blank" rel="noreferrer">官方原址</a></div><div className="upload"><label className="btn"><Upload size={18}/>导入教材<input type="file" accept=".pdf,.txt,.md" hidden disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f)
        void run(() => addBook(f)); e.target.value = ''; }}/></label><p className="subtle">PDF、TXT、Markdown，每份不超过 12 MB。提问会把选定教材与录音发送给 Google。</p></div>{books.map((b, i) => <div className="book" key={i}><BookOpen size={25}/><div className="book-body"><h3>{b.name}</h3><p>{selected === i ? '本次课堂已选用' : '可选为课堂参考'}</p></div><button className="btn" disabled={busy} onClick={() => { setSelected(i); report('本次课堂已选用：' + b.name); }}>{selected === i ? '已选用' : '选用'}</button><button className="btn" disabled={!token || !folder || busy} onClick={() => void run(() => uploadBook(b))}><Cloud size={16}/>存入 Drive</button></div>)}<div className="row" style={{ marginTop: 28 }}><h3>Drive 教材文件夹</h3><button className="btn" onClick={connect} disabled={busy}>{token ? '重新授权' : '连接 Google Drive'}</button>{folder && <a href={`https://drive.google.com/drive/folders/${folder}`} target="_blank" rel="noreferrer">打开文件夹</a>}{token && folder && <button className="btn" disabled={busy} onClick={() => void run(() => refreshDrive())}>刷新</button>}</div><p className="subtle">仅访问这个应用创建或获得授权的文件。ChatGPT 的 Drive 连接与本网页的 Google 授权分别管理。</p>{driveFiles.map(f => <div className="book" key={f.id}><BookOpen size={20}/><div className="book-body">{f.name}</div><button className="btn" disabled={busy} onClick={() => void run(() => readDrive(f))}>读入课堂</button></div>)}{token && !driveFiles.length && <p className="subtle">文件夹内还没有教材。可先加入原创练习册，再点击「存入 Drive」。</p>}</section></TabsContent><TabsContent value="settings"><section className="settings panel"><h2>连接你的课堂</h2><p>填入密钥后可听示范、录音跟读和提问。API 用量由你的 Google 项目计费。</p><label className="field">Gemini API Key<input type="password" autoComplete="off" value={key} onChange={e => setKey(e.target.value)} placeholder="仅保留在本次页面内存中"/></label><div className="row"><a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">获取 Google AI Studio 密钥</a><button className="btn primary" disabled={busy || !key.trim()} onClick={() => hear(false, 'こんにちは。你好，我们一起练习日语吧。')}>测试女声</button><button className="btn" onClick={() => { player.current?.pause(); setKey(''); report('密钥已清除。'); }}>清除密钥</button></div><p>固定使用 Gemini 3.8 Flash TTS 生成声音，Gemini 3.8 Flash 理解问题和录音。当前为录音后逐轮对话，插画配语音播放状态；尚无实时打断与口型同步。</p><hr style={{ border: 0, borderTop: '1px solid #dce3ec', margin: '28px 0' }}/><h2>连接 Google Drive</h2><label className="field">Google OAuth Client ID<input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="…apps.googleusercontent.com" autoComplete="off"/></label><p>在 Google Cloud 项目启用 Drive API，创建「Web 应用」OAuth 客户端，并把下方地址加入「已获授权的 JavaScript 来源」。测试状态下，将自己的 Google 账号加入测试用户。</p><code style={{ display: 'block', padding: 12, background: '#f1f5fa', overflowWrap: 'anywhere' }}>{origin}</code><div className="row" style={{ marginTop: 18 }}><a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">打开 Google Cloud 凭据</a><button className="btn primary" disabled={busy || !gisReady} onClick={connect}><Cloud size={17}/>{token ? '重新连接' : '授权连接'}</button>{token && <button className="btn" onClick={() => { window.google?.accounts.oauth2.revoke(token, () => { }); setToken(''); setFolder(''); setDriveFiles([]); report('已断开 Drive 授权。'); }}><LogOut size={16}/>断开</button>}</div><p>连接后自动创建「ことば · 日语家教教材」文件夹。密钥和授权令牌不会保存到网页服务器；OAuth Client ID 与练习进度会保存在当前浏览器。</p></section></TabsContent></Tabs><div className="footer">ことば · 学一点，就说一点。 <a href="https://ai.google.dev/gemini-api/docs/generate-content/speech-generation" target="_blank" rel="noreferrer">Google 语音文档</a></div></main></div>;
}
