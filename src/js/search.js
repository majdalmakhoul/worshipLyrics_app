/* ================================================================
   SEARCH / FUZZY
================================================================ */
function normalize(s) {
  return (s||'').toLowerCase()
            .replace(/[\u0623\u0625\u0622\u0627]/g,'a').replace(/\u0629/g,'e').replace(/[\u0649\u064a]/g,'i')
    .replace(/[\u064B-\u065F]/g,'')
    .replace(/[^a-z0-9\u0600-\u06FF\s]/g,' ')
    .replace(/\s+/g,' ').trim();
}
function levenshtein(a,b){
  const m=a.length,n=b.length;
  if(!m)return n; if(!n)return m;
  const dp=Array.from({length:m+1},(_,i)=>Array.from({length:n+1},(_,j)=>i||j));
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++)
    dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}
function fuzzyScore(hay,needle) {
  const nh=normalize(hay), nn=normalize(needle);
  if(!nn) return 1;
  if(nh.includes(nn)) return 1;
  const wa=nh.split(' '), wb=nn.split(' ');
  let hits=0;
  for(const w of wb) for(const u of wa)
    if(u.startsWith(w)||w.startsWith(u)||levenshtein(u,w)<=1){hits++;break;}
  return hits/Math.max(wa.length,wb.length);
}
function scoreSong(song, q) {
  if(!q) return {score:1, fuzzy:false};
  const titles = [songTitle(song), song.arabizi, song.arabic, song.en, song.fr].filter(Boolean);
  const lyrics  = Object.values(cleanSlides(song.slides)).flat().filter(Boolean);
  let best = 0;
  for(const f of titles){ const s=fuzzyScore(f,q); if(s>best) best=s; }
  for(const f of lyrics) { const s=fuzzyScore(f,q)*.7; if(s>best) best=s; }
  return { score:best, fuzzy: best>0 && best<0.95 };
}

/* Does a song have content in a given language? */
function songHasLang(song, lang) {
  const normalized = normalizeSong(song);
  const slides = normalized.slides;
  if(lang==='arabizi') return normalized.hasArabizi && slides.arabizi?.some(s=>s.trim());
  if(lang==='arabic')  return slides.arabic?.some(s=>s.trim());
  if(lang==='en')      return slides.en?.some(s=>s.trim());
  if(lang==='fr')      return slides.fr?.some(s=>s.trim());
  return false;
}
/* All languages a song has content in */
function songLangs(song) {
  const normalized = normalizeSong(song);
  const langs = LANG_ORDER.filter(l => songHasLang(normalized, l));
  if(langs.includes(normalized.mainLang)) {
    return [normalized.mainLang, ...langs.filter(l => l !== normalized.mainLang)];
  }
  return langs;
}
