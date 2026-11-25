// @ts-nocheck
function b64ToBytes(b64: string): Uint8Array {
  const raw = b64.replace(/^data:[^;]+;base64,/, '');
  const bin = atob(raw);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function unzipEntry(zipBytes: Uint8Array, entryName: string): Promise<string | null> {
  const view = new DataView(zipBytes.buffer, zipBytes.byteOffset);
  let offset = 0;
  while (offset < zipBytes.length - 4) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) break;
    const fnLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const compSize = view.getUint32(offset + 18, true);
    const compression = view.getUint16(offset + 8, true);
    const fnBytes = zipBytes.slice(offset + 30, offset + 30 + fnLen);
    const fn = new TextDecoder().decode(fnBytes);
    const dataStart = offset + 30 + fnLen + extraLen;
    if (fn === entryName) {
      const compData = zipBytes.slice(dataStart, dataStart + compSize);
      if (compression === 0) return new TextDecoder().decode(compData);
      if (compression === 8) {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(compData); writer.close();
        const chunks: Uint8Array[] = [];
        const reader = ds.readable.getReader();
        while (true) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); }
        const total = chunks.reduce((s, c) => s + c.length, 0);
        const out = new Uint8Array(total); let pos = 0;
        for (const c of chunks) { out.set(c, pos); pos += c.length; }
        return new TextDecoder().decode(out);
      }
    }
    offset = dataStart + compSize;
  }
  return null;
}

async function listZipEntries(zipBytes: Uint8Array): Promise<string[]> {
  const view = new DataView(zipBytes.buffer, zipBytes.byteOffset);
  const entries: string[] = [];
  let offset = 0;
  while (offset < zipBytes.length - 4) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) break;
    const fnLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const compSize = view.getUint32(offset + 18, true);
    const fnBytes = zipBytes.slice(offset + 30, offset + 30 + fnLen);
    entries.push(new TextDecoder().decode(fnBytes));
    offset = offset + 30 + fnLen + extraLen + compSize;
  }
  return entries;
}

function pText(pXml:string){return (pXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g)||[]).map(t=>t.replace(/<[^>]+>/g,'')).join('').replace(/\s+/g,'')}
function hasT(txt:string,t:any){return !t||txt.includes(String(t).replace(/\s+/g,''))}
function countTexts(items:string[],texts:any){const arr=Array.isArray(texts)?texts:[];if(!arr.length)return items.length;return arr.filter(t=>items.some(x=>hasT(x,t))).length}
const COLORS:Record<string,string[]>={red:['FF0000','C00000','FF0000'],blue:['0070C0','0000FF','00B0F0','1F497D','2F5496','4472C4','002060','0070C0'],yellow:['FFFF00','FFC000'],green:['00B050','008000','92D050'],black:['000000']};
function colorOk(val:string|undefined,want:any){if(!want)return true;if(!val)return false;const v=val.toUpperCase();const list=COLORS[String(want).toLowerCase()]||[String(want).toUpperCase().replace('#','')];return list.includes(v)}
function near(a:number,b:number,tol:number){return Math.abs(a-b)<=tol}
const CM=567; // twips per cm
const attr=(xml:string,tag:string,name:string)=>{const m=xml.match(new RegExp(`<w:${tag}[^>]*\\sw:${name}="([^"]*)"`));return m?m[1]:undefined}

type Doc={xml:string,headers:string[],footers:string[],footnotes:string,styles:string}
function scoreDocx(doc: Doc, rules: any[]) {
  const xml=doc.xml;
  let total = 0;
  const details: any[] = [];
  const paragraphs: {style:string, xml:string, text:string, rprs:string[], inTable:boolean}[] = [];
  // table ranges to know which paragraphs are inside tables
  const tblRanges:[number,number][]=[];{const re=/<w:tbl>[\s\S]*?<\/w:tbl>/g;let m;while((m=re.exec(xml))!==null)tblRanges.push([m.index,m.index+m[0].length])}
  const pRe = /<w:p[ >][\s\S]*?<\/w:p>/g; let pm;
  while ((pm = pRe.exec(xml)) !== null) {
    const pXml = pm[0];
    const styleM = pXml.match(/<w:pStyle w:val="([^"]*)"/i);
    const rprs=(pXml.match(/<w:rPr>[\s\S]*?<\/w:rPr>/g)||[]);
    const inTable=tblRanges.some(([a,b])=>pm!.index>a&&pm!.index<b);
    paragraphs.push({ style: styleM?.[1] || '', xml: pXml, text: pText(pXml), rprs, inTable });
  }
  const body=paragraphs.filter(p=>!p.inTable);
  const findP=(text:any)=>body.filter(p=>p.text&&hasT(p.text,text));
  function isH1(s:string){return /^(1|heading1|heading\s*1|标题1|标题\s*1)$/i.test(s)}
  function isH2(s:string){return /^(2|heading2|heading\s*2|标题2|标题\s*2)$/i.test(s)}
  const h1p=paragraphs.filter(p=>isH1(p.style));
  const h2p=paragraphs.filter(p=>isH2(p.style));
  const boldRuns:string[]=[];
  const rRe=/<w:r[ >]([\s\S]*?)<\/w:r>/g;let rm;
  while((rm=rRe.exec(xml))!==null){const r=rm[1];if(/<w:rPr>[\s\S]*?<w:b(\s[^>]*)?\/>[\s\S]*?<\/w:rPr>/.test(r)||/<w:rPr>[\s\S]*?<w:b\s+w:val="(1|true|on)"[\s\S]*?<\/w:rPr>/.test(r))boldRuns.push(pText(r))}
  const boldParas=paragraphs.filter(p=>/<w:b(\s[^>]*)?\/>/.test(p.xml)||/<w:b\s+w:val="(1|true|on)"/.test(p.xml)).map(p=>p.text);
  const tables=(xml.match(/<w:tbl[ >][\s\S]*?<\/w:tbl>/g)||[]);
  const tbl=tables[0]||'';
  const tblRows=(tbl.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g)||[]);
  const tblCells=tblRows.map(r=>(r.match(/<w:tc>[\s\S]*?<\/w:tc>/g)||[]));
  const cellText=(r:number,c:number)=>pText(tblCells[r]?.[c]||'');
  const h2Color=h2p.filter(p=>/<w:color w:val="(?!auto|000000|FFFFFF|ffffff)[^"]+"/.test(p.xml));
  const centerP=paragraphs.filter(p=>/<w:jc w:val="center"/.test(p.xml));
  const firstIndP=paragraphs.filter(p=>{const m=p.xml.match(/<w:ind[^>]*w:firstLine(Chars)?="(\d+)"/);return m&&parseInt(m[2])>0;});
  const lineHtP=paragraphs.filter(p=>{const m=p.xml.match(/<w:spacing[^>]*w:line="(\d+)"/);return m&&parseInt(m[1])>240;});
  const sBeforeP=paragraphs.filter(p=>{const m=p.xml.match(/<w:spacing[^>]*w:before(Lines)?="(\d+)"/);return m&&parseInt(m[2])>0;});
  const sAfterP=paragraphs.filter(p=>{const m=p.xml.match(/<w:spacing[^>]*w:after(Lines)?="(\d+)"/);return m&&parseInt(m[2])>0;});
  const marginLP=paragraphs.filter(p=>{const m=p.xml.match(/<w:ind[^>]*w:left(Chars)?="(\d+)"/);return m&&parseInt(m[2])>0;});
  const listP=paragraphs.filter(p=>/<w:numPr>/.test(p.xml)||/^(list|ListParagraph|列表|编号|项目符号)/i.test(p.style));
  const sects=(xml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/g)||[]);
  // run-property probe for a paragraph: any rPr (runs or paragraph mark) satisfying each requested prop
  function propCheck(p:{xml:string,rprs:string[]},r:any){
    const props:[string,boolean][]=[];
    const any=(fn:(s:string)=>boolean)=>p.rprs.some(fn);
    if(r.family)props.push(['字体 '+r.family,any(s=>new RegExp(`<w:rFonts[^>]*="[^"]*${r.family}`).test(s))]);
    if(r.size_pt){const want=Math.round(r.size_pt*2);props.push(['字号',any(s=>{const m=s.match(/<w:sz w:val="(\d+)"/);return m?Math.abs(parseInt(m[1])-want)<=1:(want===21&&!/<w:sz /.test(s)&&false)})||(want===21&&!any(s=>/<w:sz w:val="(?!21")\d+"/.test(s))&&p.rprs.length>0)])}
    if(r.bold)props.push(['加粗',any(s=>/<w:b(\s[^>]*)?\/>|<w:b\s+w:val="(1|true|on)"/.test(s))]);
    if(r.italic)props.push(['倾斜',any(s=>/<w:i(\s[^>]*)?\/>|<w:i\s+w:val="(1|true|on)"/.test(s))]);
    if(r.strike)props.push(['删除线',any(s=>/<w:strike(\s[^>]*)?\/>/.test(s))]);
    if(r.color)props.push(['颜色',any(s=>colorOk(attr(s,'color','val'),r.color))]);
    if(r.underline)props.push(['下划线',any(s=>/<w:u /.test(s))]);
    return props;
  }
  for(const rule of rules){
    let got=0,need=1,partial=true;let found:any={};
    switch(rule.type){
      case 'h1':got=rule.text?(h1p.some(p=>hasT(p.text,rule.text))?1:0):(h1p.length?1:0);partial=false;found={count:h1p.length};break;
      case 'h2':need=rule.texts?.length||rule.min||1;got=rule.texts?.length?countTexts(h2p.map(p=>p.text),rule.texts):h2p.length;found={count:h2p.length};break;
      case 'table':{need=2;if(tables.length>0){const rows=tblRows.length;let maxC=0;tblCells.forEach(cs=>{if(cs.length>maxC)maxC=cs.length});got=(rows>=(rule.min_rows||1)&&maxC>=(rule.min_cols||1))?2:1;found={rows,cols:maxC};}break;}
      case 'bold':need=rule.texts?.length||rule.min||1;got=rule.texts?.length?countTexts(boldRuns.concat(boldParas),rule.texts):boldRuns.length;found={boldRuns:boldRuns.length};break;
      case 'color_h2':need=rule.min||1;got=h2Color.length;found={colored:h2Color.length};break;
      case 'align':need=rule.texts?.length||rule.min||1;got=rule.texts?.length?countTexts(centerP.map(p=>p.text),rule.texts):(rule.text?(centerP.some(p=>hasT(p.text,rule.text))?1:0):centerP.length);if(rule.text)need=1;found={centered:centerP.length};break;
      case 'indent_first':need=rule.min||1;got=firstIndP.length;found={count:firstIndP.length};break;
      case 'line_height':{const minL=Math.round((rule.min_value||1.5)*240)-2;const ab=lineHtP.filter(p=>{const m=p.xml.match(/<w:spacing[^>]*w:line="(\d+)"/);return m&&parseInt(m[1])>=minL;});need=rule.min||1;got=ab.length;found={count:ab.length};break;}
      case 'space_before':need=rule.min||1;got=rule.text?(sBeforeP.some(p=>hasT(p.text,rule.text))?1:0):sBeforeP.length;if(rule.text)need=1;found={count:sBeforeP.length};break;
      case 'space_after':need=rule.min||1;got=rule.text?(sAfterP.some(p=>hasT(p.text,rule.text))?1:0):sAfterP.length;if(rule.text)need=1;found={count:sAfterP.length};break;
      case 'indent_block':need=rule.min||1;got=marginLP.length;found={count:marginLP.length};break;
      case 'list':need=rule.min||1;got=listP.length;partial=!!rule.min;found={count:listP.length};break;
      case 'font':{const ps=findP(rule.text);if(!ps.length){found={para:'未找到该段'};need=1;got=0;break}
        let best:[string,boolean][]=[];for(const p of ps){const pr=propCheck(p,rule);if(pr.filter(x=>x[1]).length>best.filter(x=>x[1]).length||!best.length)best=pr}
        need=best.length||1;got=best.filter(x=>x[1]).length;found={missing:best.filter(x=>!x[1]).map(x=>x[0])};break}
      case 'shading':{const ps=findP(rule.text);const ok=ps.some(p=>{const shd=(p.xml.match(/<w:shd [^>]*w:fill="([0-9A-Fa-f]{6})"/g)||[]).some(s=>colorOk(attr(s,'shd','fill'),rule.fill));const hl=!!rule.fill&&(p.xml.match(/<w:highlight w:val="(\w+)"/g)||[]).some(h=>String(rule.fill).toLowerCase()===(attr(h,'highlight','val')||'').toLowerCase());return shd||hl});got=ok?1:0;partial=false;found={paras:ps.length};break}
      case 'border':{const ps=findP(rule.text);const ok=ps.some(p=>{const b=(p.xml.match(/<w:(pBdr>[\s\S]*?<\/w:pBdr|bdr [^>]*\/)>/g)||[]).join('');if(!b)return false;if(rule.shadow&&!/w:shadow="(1|true|on)"/.test(b))return false;if(rule.sz&&!(b.match(/w:sz="(\d+)"/g)||[]).some(s=>parseInt(s.match(/\d+/)![0])>=rule.sz))return false;if(rule.color&&!(b.match(/w:color="([0-9A-Fa-f]{6})"/g)||[]).some(c=>colorOk(c.match(/"(.*)"/)![1],rule.color)))return false;return true});got=ok?1:0;partial=false;found={paras:ps.length};break}
      case 'indent':{const ps=rule.text?findP(rule.text):body.filter(p=>p.text.length>0);need=rule.text?1:(rule.min||1);
        const okP=ps.filter(p=>{const ind=p.xml.match(/<w:ind [^>]*>/);if(!ind)return false;const s=ind[0];
          const chk=(cmKey:string,charKey:string,attrTw:string,attrCh:string)=>{const cm=rule[cmKey],ch=rule[charKey];if(cm==null&&ch==null)return true;const tw=parseInt(attr(s,'ind',attrTw)||'0'),chars=parseInt(attr(s,'ind',attrCh)||'0');if(cm!=null)return near(tw,cm*CM,40);return (chars&&Math.abs(chars-ch*100)<=5)||near(tw,ch*210,ch*60)};
          return chk('left_cm','left_chars','left','leftChars')&&chk('right_cm','right_chars','right','rightChars')&&chk('first_cm','first_chars','firstLine','firstLineChars')});
        got=okP.length;found={ok:okP.length,of:ps.length};break}
      case 'emphasis':{need=rule.min||1;let n=0;const re=/<w:r[ >]([\s\S]*?)<\/w:r>/g;let m;while((m=re.exec(xml))!==null){if(/<w:em w:val="(?!none)/.test(m[1])&&hasT(pText(m[1]),rule.text))n++}got=n;found={runs:n};break}
      case 'para_merge':{const ok=body.some(p=>hasT(p.text,rule.text_start)&&hasT(p.text,rule.text_end));got=ok?1:0;partial=false;break}
      case 'columns':{const ok=sects.some(s=>{const m=s.match(/<w:cols [^>]*>/);if(!m)return false;const num=parseInt(attr(m[0],'cols','num')||'1');if(num!==(rule.num||2))return false;if(rule.sep&&!/w:sep="(1|true|on)"/.test(m[0]))return false;return true});got=ok?1:0;partial=false;found={sects:sects.length};break}
      case 'drop_cap':{const m=xml.match(/<w:framePr [^>]*w:dropCap="(drop|margin)"[^>]*>/);const ok=!!m&&(!rule.lines||parseInt(attr(m[0],'framePr','lines')||'0')===rule.lines);got=ok?1:0;partial=false;break}
      case 'header':{const txt=doc.headers.map(h=>pText(h)).join('|');const styleCentered=(h:string)=>{const sid=h.match(/<w:pStyle w:val="([^"]+)"/)?.[1];if(!sid)return false;const st=doc.styles.match(new RegExp(`<w:style [^>]*w:styleId="${sid}"[\\s\\S]*?</w:style>`));return !!st&&/<w:jc w:val="center"/.test(st[0])};const ok=hasT(txt,rule.text)&&(!rule.center||doc.headers.some(h=>/<w:jc w:val="center"/.test(h)||styleCentered(h)));got=ok?1:0;partial=false;found={header:txt.slice(0,40)};break}
      case 'footer_page':{const ok=doc.footers.some(f=>/PAGE/.test(f)&&/<w:fldSimple|<w:instrText/.test(f))&&(!rule.center||doc.footers.some(f=>/<w:jc w:val="center"/.test(f)));got=ok?1:0;partial=false;break}
      case 'footnote':{const ok=hasT(pText(doc.footnotes),rule.text);got=ok?1:0;partial=false;break}
      case 'margin':{const m=xml.match(/<w:pgMar [^>]*>/g)||[];const checks=['top','bottom','left','right'].filter(k=>rule[k+'_cm']!=null);need=checks.length||1;got=checks.filter(k=>m.some(s=>near(parseInt(attr(s,'pgMar',k)||'0'),rule[k+'_cm']*CM,40))).length;partial=false;found={ok:got,of:need};break}
      case 'doc_grid':{const ok=(xml.match(/<w:docGrid [^>]*>/g)||[]).some(g=>/w:type="linesAndChars"/.test(g));got=ok?1:0;partial=false;break}
      case 'table_center':{got=/<w:tblPr>[\s\S]*?<w:jc w:val="center"/.test(tbl)?1:0;partial=false;break}
      case 'table_border':{const b=(tbl.match(/<w:tblBorders>[\s\S]*?<\/w:tblBorders>/)||[''])[0];const top=b.match(/<w:top [^>]*>/)?.[0]||'';const inner=b.match(/<w:insideH [^>]*>/)?.[0]||'';const checks:[string,boolean][]=[];
        if(rule.outer)checks.push(['外框线型',attr(top,'top','val')===rule.outer]);if(rule.outer_sz)checks.push(['外框粗细',parseInt(attr(top,'top','sz')||'0')===rule.outer_sz]);if(rule.outer_color)checks.push(['外框颜色',colorOk(attr(top,'top','color'),rule.outer_color)]);
        if(rule.inner)checks.push(['内框线型',attr(inner,'insideH','val')===rule.inner]);if(rule.inner_sz)checks.push(['内框粗细',parseInt(attr(inner,'insideH','sz')||'0')===rule.inner_sz]);if(rule.inner_color)checks.push(['内框颜色',colorOk(attr(inner,'insideH','color'),rule.inner_color)]);
        need=checks.length||1;got=checks.filter(c=>c[1]).length;found={missing:checks.filter(c=>!c[1]).map(c=>c[0]),hasBorders:!!b};break}
      case 'table_width':{const cols=(tbl.match(/<w:gridCol w:w="(\d+)"/g)||[]).map(s=>parseInt(s.match(/\d+/)![0]));const want:number[]=rule.cols_cm||[];need=want.length||1;got=want.filter((cm,i)=>cols[i]!=null&&near(cols[i],cm*CM,45)).length;found={cols_cm:cols.map(c=>+(c/CM).toFixed(2))};break}
      case 'row_height':{const hs=tblRows.map(r=>parseInt(attr(r,'trHeight','val')||'0'));need=1;got=hs.length&&hs.filter(h=>near(h,rule.cm*CM,30)).length>=Math.ceil(hs.length/2)?1:0;partial=false;found={rows_cm:hs.map(h=>+(h/CM).toFixed(2))};break}
      case 'cell_align':{let n=0,ok=0;tblCells.forEach(cs=>cs.forEach(c=>{n++;const h=!rule.h||new RegExp(`<w:jc w:val="${rule.h}"`).test(c);const vv=attr(c,'vAlign','val');const v=!rule.v||(rule.v==='top'?(!vv||vv==='top'):vv===rule.v);if(h&&v)ok++}));need=1;got=n&&ok/n>=0.8?1:0;partial=false;found={ok,of:n};break}
      case 'cell_values':{const vals:any[]=rule.values||[];const rows:number[]=rule.rows||vals.map((_,i)=>i+1);need=vals.length||1;got=vals.filter((v,i)=>{const t=cellText(rows[i],rule.col);return t===String(v)||(Number(t)===Number(v)&&t!=='')}).length;found={got:rows.map(r=>cellText(r,rule.col))};break}
      case 'row_style':{const cs=tblCells[rule.row]||[];const checks:[string,boolean][]=[];const rprs=cs.flatMap(c=>c.match(/<w:rPr>[\s\S]*?<\/w:rPr>/g)||[]);const p={xml:cs.join(''),rprs};
        if(cs.length){const pr=propCheck(p,rule);checks.push(...pr);if(rule.fill)checks.push(['底纹',cs.some(c=>(c.match(/<w:shd [^>]*>/g)||[]).some(s=>colorOk(attr(s,'shd','fill'),rule.fill)))]);if(rule.center)checks.push(['居中',cs.filter(c=>/<w:jc w:val="center"/.test(c)).length>=Math.ceil(cs.length/2)])}
        need=checks.length||1;got=checks.filter(c=>c[1]).length;found={missing:checks.filter(c=>!c[1]).map(c=>c[0]),cells:cs.length};break}
      default:continue;
    }
    const g=Math.min(got,need);const ok=g>=need;
    const pts=ok?(rule.pts||0):(partial&&g>0?Math.floor((rule.pts||0)*g/need):0);
    total+=pts;
    details.push({id:rule.id,type:rule.type,desc:rule.desc,pts,max:rule.pts,ok,got,need,found});
  }
  return{total,max:rules.reduce((s:number,r:any)=>s+r.pts,0),details};
}
async function readDoc(bytes:Uint8Array):Promise<Doc|null>{
  const xml=await unzipEntry(bytes,'word/document.xml');if(!xml)return null;
  const entries=await listZipEntries(bytes);
  const headers:string[]=[],footers:string[]=[];
  for(const e of entries){if(/^word\/header\d*\.xml$/.test(e)){const h=await unzipEntry(bytes,e);if(h)headers.push(h)}if(/^word\/footer\d*\.xml$/.test(e)){const f=await unzipEntry(bytes,e);if(f)footers.push(f)}}
  const footnotes=(await unzipEntry(bytes,'word/footnotes.xml'))||'';
  const styles=(await unzipEntry(bytes,'word/styles.xml'))||'';
  return {xml,headers,footers,footnotes,styles};
}

function cellAddrToRC(addr:string):{r:number,c:number}{
  addr=addr.replace(/\$/g,'').toUpperCase();
  const m=addr.match(/^([A-Z]+)(\d+)$/);
  if(!m)return{r:0,c:0};
  const c=m[1].split('').reduce((n,ch)=>n*26+(ch.charCodeAt(0)-64),0)-1;
  return{r:parseInt(m[2])-1,c};
}
function rcToAddr(r:number,c:number):string{
  let col='';let cc=c+1;
  while(cc>0){col=String.fromCharCode(64+cc%26||26)+col;cc=Math.floor((cc-1)/26);}
  return col+(r+1);
}
function getRangeCells(range:string):string[]{
  const[a,b]=range.split(':');
  const from=cellAddrToRC(a),to=cellAddrToRC(b||a);
  const cells:string[]=[];
  for(let r=from.r;r<=to.r;r++)for(let c=from.c;c<=to.c;c++)cells.push(rcToAddr(r,c));
  return cells;
}

async function scoreXlsx(bytes:Uint8Array, rules:any[]) {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(bytes, {type:'array', cellFormula:true, cellStyles:true});
  const ws = wb.Sheets[wb.SheetNames[0]];
  let total = 0;
  const details: any[] = [];

  const entries = await listZipEntries(bytes);
  const chartEntries = entries.filter(e => e.includes('chart') && e.endsWith('.xml'));
  const pivotTableEntries = entries.filter(e => e.startsWith('xl/pivotTables/') && e.endsWith('.xml'));

  let barCount=0, pieCount=0, lineCount=0, totalChartCount=0, pivotChartCount=0;
  for (const entry of chartEntries) {
    const xml = await unzipEntry(bytes, entry);
    if (!xml) continue;
    totalChartCount++;
    if (xml.includes('c:barChart')) barCount++;
    if (xml.includes('c:pieChart') || xml.includes('c:doughnutChart')) pieCount++;
    if (xml.includes('c:lineChart')) lineCount++;
    if (xml.includes('c:pivotSource') || xml.includes('pivotFmt')) pivotChartCount++;
  }
  const pivotTableCount = pivotTableEntries.length;

  for (const rule of rules) {
    if (rule.type === 'chart') {
      let ok = false;
      let found: any = { totalChartCount, barCount, pieCount, lineCount, pivotChartCount, pivotTableCount };

      switch (rule.chart_type) {
        case 'bar':     ok = barCount > 0; break;
        case 'pie':     ok = pieCount > 0; break;
        case 'line':    ok = lineCount > 0; break;
        case 'pivot_table': ok = pivotTableCount > 0; break;
        case 'pivot_chart': ok = pivotChartCount > 0; break;
        case 'any':
        default:        ok = totalChartCount > 0 || pivotTableCount > 0; break;
      }

      if (ok) total += rule.pts;
      details.push({id:rule.id, type:'chart', desc:rule.desc, pts:ok?rule.pts:0, max:rule.pts, ok, found});

    } else if (rule.type === 'style') {
      let headerBold=false, hasFill=false;
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({r:0,c})];
        if (cell?.s?.font?.bold) { headerBold = true; break; }
      }
      for (const addr in ws) {
        if (addr.startsWith('!')) continue;
        const cell = ws[addr];
        if (cell?.s?.fill?.fgColor?.rgb && cell.s.fill.fgColor.rgb !== 'FFFFFF' && cell.s.fill.fgColor.rgb !== '00000000') {
          hasFill = true; break;
        }
      }
      const pts = (headerBold ? Math.ceil(rule.pts/2) : 0) + (hasFill ? Math.floor(rule.pts/2) : 0);
      total += pts;
      details.push({id:rule.id, type:'style', desc:rule.desc, pts, max:rule.pts, ok:pts>0, found:{headerBold,hasFill}});

    } else {
      const cellList = getRangeCells(rule.cells || '');
      const expected = rule.expected || [];
      const kw = (rule.keyword || '').toUpperCase();
      let pts = 0; const items: any[] = [];
      cellList.forEach((addr, i) => {
        const cell = ws[addr];
        const formula = cell?.f || '';
        const value = cell?.v;
        const expVal = expected[i];
        const hasKw = kw ? formula.toUpperCase().includes(kw+'(') : formula.length > 0;
        const valueOk = expVal !== undefined
          ? (String(value) === String(expVal) || Math.abs(Number(value) - Number(expVal)) < 0.01)
          : true;
        const ok = !kw ? (formula.length > 0 && valueOk) : (hasKw && valueOk);
        if (ok) pts += (rule.pts_each || 1);
        items.push({addr, ok, formula: formula ? '='+formula : '', value, expected: expVal});
      });
      const maxPts = rule.total_pts || rule.pts || pts;
      const finalPts = pts >= maxPts ? maxPts : pts;
      total += finalPts;
      details.push({id:rule.id, type:rule.type, desc:rule.desc, pts:finalPts, max:maxPts, ok:finalPts>0, items});
    }
  }

  return { total, max: rules.reduce((s:number,r:any) => s+(r.total_pts||r.pts||0), 0), details };
}

async function ncBinary(zipBytes: Uint8Array, entryName: string): Promise<Uint8Array | null> {
  const view = new DataView(zipBytes.buffer, zipBytes.byteOffset);
  let offset = 0;
  while (offset < zipBytes.length - 4) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) break;
    const fnLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const compSize = view.getUint32(offset + 18, true);
    const compression = view.getUint16(offset + 8, true);
    const fnBytes = zipBytes.slice(offset + 30, offset + 30 + fnLen);
    const fn = new TextDecoder().decode(fnBytes);
    const dataStart = offset + 30 + fnLen + extraLen;
    if (fn === entryName) {
      const compData = zipBytes.slice(dataStart, dataStart + compSize);
      if (compression === 0) return compData;
      if (compression === 8) {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(compData); writer.close();
        const chunks: Uint8Array[] = [];
        const reader = ds.readable.getReader();
        while (true) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); }
        const total = chunks.reduce((s, c) => s + c.length, 0);
        const out = new Uint8Array(total); let pos = 0;
        for (const c of chunks) { out.set(c, pos); pos += c.length; }
        return out;
      }
    }
    offset = dataStart + compSize;
  }
  return null;
}


async function ncAssets(bytes:Uint8Array, hashes){const map:Record<string,string>={};const rel=await unzipEntry(bytes,'word/_rels/document.xml.rels')||'';for(const m of rel.matchAll(/<Relationship\s[^>]*>/g)){const t=m[0].match(/\sTarget="(?:\/word\/)?(media\/[\w. -]+)"/)?.[1],id=m[0].match(/\sId="([^"]+)"/)?.[1];if(!t||!id)continue;const b=await ncBinary(bytes,'word/'+t);if(b){const h=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),c=>c.toString(16).padStart(2,'0')).join('');map[id]=hashes[h]||''}}return map}
// Read standard WordprocessingML paragraphs, run styles, and floating drawings.
function ncScore(doc, rules, assets,config) {
 const tags=(s,n)=>Array.from((s||'').matchAll(new RegExp('<'+n+'(?=[\\s>])[^>]*>[\\s\\S]*?</'+n+'>','g')),m=>m[0]);
 const tag=(s,n)=>(s||'').match(new RegExp('<'+n+'(?=[\\s/>])[^>]*>'))?.[0]||'';
 const at=(s,k)=>s?.match(new RegExp('(?:^|\\s)'+k+'="([^"]*)"'))?.[1];
 const value=(s,n,k='w:val')=>at(tag(s,'w:'+n),k);
 const norm=s=>s.replace(/[\s。．.：:]+$/g,'').replace(/\s/g,'');
 const titles=config.titles;
 const keys=config.keys;
 const styles=new Map(tags(doc.styles,'w:style').map(s=>[at(tag(s,'w:style'),'w:styleId'),s]));
 const defaults=tags(doc.styles,'w:docDefaults')[0]||'';
 const normal=[...styles.values()].find(s=>at(tag(s,'w:style'),'w:type')==='paragraph'&&at(tag(s,'w:style'),'w:default')==='1');
 function chain(id){let out=[],seen=new Set();while(id&&styles.has(id)&&!seen.has(id)){seen.add(id);let s=styles.get(id);out.push(s);id=value(s,'basedOn')}return out}
 const P=tags(doc.xml,'w:p').map((x,i)=>{
 const pp=tags(x,'w:pPr')[0]||'', ps=chain(value(pp,'pStyle')||at(tag(normal,'w:style'),'w:styleId'));
 const para=[pp,...ps.map(s=>tags(s,'w:pPr')[0]),tags(defaults,'w:pPr')[0]].filter(Boolean);
 const runs=tags(x,'w:r').map(r=>{const rp=tags(r,'w:rPr')[0]||'';
 return {t:tags(r,'w:t').map(s=>s.replace(/<[^>]+>/g,'')).join(''),props:[rp,...chain(value(rp,'rStyle')).map(s=>tags(s,'w:rPr')[0]),...ps.map(s=>tags(s,'w:rPr')[0]),tags(defaults,'w:rPr')[0]].filter(Boolean)}}).filter(r=>r.t.trim());
 return {i,x,para,runs,t:norm(runs.map(r=>r.t).join(''))}});
 const title=titles.map(t=>P.find(p=>p.t===t)),body=keys.map((k,i)=>P.find(p=>i?p.t.split(/[：:]/)[0]===k:(p.i>title[0]?.i&&p.i<title[1]?.i&&p.t.length>4)));
 function pv(p,n,k){return p?.para.map(s=>value(s,n,k)).find(v=>v!==undefined)}
 function format(p,n,w,prefix=false){if(!p)return false;let cnt=0;for(const r of p.runs){const part=prefix?r.t.split(/[：:]/)[0]:r.t;
 if(part.trim()){cnt++;const a=r.props.map(s=>tag(s,'w:'+n)).find(Boolean);let v=at(a,'w:val');if(w===true?!a||['0','false','off'].includes(v):String(v).toUpperCase()!==w)return false}
 if(prefix&&/[：:]/.test(r.t))break}return cnt>0}
 const pics=P.flatMap(p=> [...tags(p.x,'wp:anchor'),...tags(p.x,'wp:inline')].map(x=>{
 const id=at(tag(x,'a:blip'),'r:embed'), name=assets[id];const pos=tags(x,'wp:positionH')[0]||'', align=tags(pos,'wp:align')[0]||'', offset=Number(tags(pos,'wp:posOffset')[0]?.replace(/<[^>]+>/g,'')||0);
 const ex=tag(x,'wp:extent');return {name,i:p.i,top:!!tag(x,'wp:wrapTopAndBottom'),tight:!!tag(x,'wp:wrapTight'),right:align.includes('>right<')||(()=>{const pg=tag(doc.xml,'w:pgSz'),mar=tag(doc.xml,'w:pgMar'),width=(Number(at(pg,'w:w')||11906)-Number(at(mar,'w:left')||1440)-Number(at(mar,'w:right')||1440))*635;const relative=at(tag(pos,'wp:positionH'),'relativeFrom');const left=offset-(relative==='page'?Number(at(mar,'w:left')||1440)*635:0);return ['column','margin','page'].includes(relative)&&left>=width*0.45})(),w:Number(at(ex,'cx'))/360000,h:Number(at(ex,'cy'))/360000}}));
 const area=(f,lo,hi)=>pics.filter(p=>p.name===f&&p.i>=lo&&p.i<=hi);
 const bus=body[0]&&title[1]?area('bus',body[0].i,title[1].i-1):[],street=title[3]&&body[11]?area('street',title[3].i+1,body[11].i):[];
 const portraits=[1,2,3,4,5].map(i=>body[11]?area('portrait'+i,body[11].i,Infinity):[]);
 const tests={
 center:[pv(title[0],'jc')==='center'],big:[format(title[0],'sz','44')],bold:[format(title[0],'b',true)],after:[pv(title[0],'spacing','w:afterLines')==='100'],
 indent:body.map(p=>{const c=pv(p,'ind','w:firstLineChars');return c!==undefined?+c===200:Math.abs(Number(pv(p,'ind','w:firstLine'))-480)<=5}),size:body.map(p=>format(p,'sz','24')),
 line:body.map(p=>pv(p,'spacing','w:line')==='360'&&(!pv(p,'spacing','w:lineRule')||pv(p,'spacing','w:lineRule')==='auto')),
 subbold:title.slice(1).map(p=>format(p,'b',true)),italic:title.slice(1).map(p=>format(p,'i',true)),subsize:title.slice(1).map(p=>format(p,'sz','30')),
 labelbold:body.slice(1).map(p=>format(p,'b',true,true)),red:body.slice(1).map(p=>format(p,'color','FF0000',true)),
 bus:[bus.length>0],top:[bus.some(p=>p.top)],street:[street.some(p=>p.right)],tight:[street.some(p=>p.tight)],
 portraits:portraits.map(a=>a.length>0),wrap:portraits.map(a=>a.some(p=>p.tight)),scale:portraits.map(a=>a.some(p=>p.w>=1.5&&p.w<=5&&p.h>=2&&p.h<=7))};
 const details=rules.map(r=>{let t=tests[r.nc]||[false],got=t.filter(Boolean).length;return {id:r.id,type:r.type,desc:r.desc,max:r.pts,pts:Math.floor(r.pts*got/t.length),got,need:t.length,ok:got===t.length}});
 return {details,total:details.reduce((a,r)=>a+r.pts,0),max:rules.reduce((s,r)=>s+r.pts,0)}
}


export async function scoreLocal(fileBase64,fileType,scoringRules){if(typeof fileBase64!=='string'||fileBase64.length>5500000||!Array.isArray(scoringRules)||scoringRules.length>200)throw Error('文件或规则超出限制');const bytes=b64ToBytes(fileBase64);if(fileType==='xlsx')return scoreXlsx(bytes,scoringRules);const doc=await readDoc(bytes);if(!doc)throw Error('无效的 Word 文件');if(scoringRules.length&&scoringRules.every(r=>r.id?.startsWith('nc2_')&&r.nc)){const {createClient}=await import('@supabase/supabase-js');const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});const {data,error}=await db.from('lulu_scoring_profiles').select('config').eq('name','word-layout-v1').single();if(error||!data)throw Error('未找到评分配置');return ncScore(doc,scoringRules,await ncAssets(bytes,data.config.hashes),data.config)}return scoreDocx(doc,scoringRules)}