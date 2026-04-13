import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "newspaper_v5";
const CATS_KEY = "newspaper_cats_v5";
const PAGE_SIZE = 20;

const DEFAULT_CATS = [
  { name: "정치·세계", sub: "국내정치 · 외교 · 국제정세 · 분쟁", desc: "국내외 정치 뉴스, 선거, 외교, 전쟁, 글로벌 이슈" },
  { name: "경제",      sub: "주식 · 부동산 · 환율 · 재테크",      desc: "증시, 환율, 부동산, 거시경제, 기업 실적" },
  { name: "사회",      sub: "사건사고 · 법원 · 교육 · 환경 · 복지", desc: "국내 사건사고, 법원·재판, 교육 정책, 기후·환경, 사회 이슈" },
  { name: "기술",      sub: "AI · IT · 과학 · 우주",              desc: "인공지능, 테크 기업, 신기술, 과학 발견, 우주 탐사" },
  { name: "문화",      sub: "영화 · 음악 · 책 · 예술 · 엔터",     desc: "영화, 드라마, 음악, 전시, 공연, 연예 뉴스" },
  { name: "스포츠",    sub: "축구 · 야구 · 농구 · 올림픽",        desc: "국내외 모든 스포츠 경기, 선수, 팀 소식" },
  { name: "라이프",    sub: "건강 · 음식 · 여행 · 일상",          desc: "건강 정보, 맛집, 여행지, 쇼핑, 생활 팁" },
];

function extractMeta(text) {
  const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
  const source = lines[0] || "";
  let title = "제목 없음";
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (/\d{4}[\.\-]\s?\d{1,2}[\.\-]/.test(line)) continue;
    if (/기자|특파원|에디터|기자단/.test(line)) continue;
    if (line.length <= 6) continue;
    title = line.slice(0, 120);
    break;
  }
  return { source, title };
}

const fmtDate = (iso) => new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
const todayStr = () => new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #F8F8F8; --paper: #FFF; --ink: #1A1A1A;
    --mid: #444; --muted: #AAA; --rule: #E5E5E5; --blue: #0066CC;
    --font: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
  }
  body { font-family: var(--font); background: var(--bg); color: var(--ink); min-height: 100vh; }
  .page { height: 100dvh; display: flex; flex-direction: column; animation: fadeIn 0.15s ease; overflow: hidden; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .top-bar { padding: 12px 16px 10px; border-bottom: 1px solid var(--ink); background: var(--paper); flex-shrink: 0; }
  .top-main { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }
  .logo { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; color: var(--ink); }
  .top-meta { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 8px; }
  .guide-btn { background: none; border: 1px solid var(--rule); border-radius: 4px; padding: 3px 8px; font-size: 11px; font-weight: 500; color: var(--mid); cursor: pointer; font-family: var(--font); }
  .top-date { font-size: 10px; color: var(--muted); padding-top: 4px; border-top: 1px solid var(--rule); }

  .back-btn { display: flex; align-items: center; gap: 4px; background: none; border: none; font-family: var(--font); font-size: 13px; font-weight: 500; color: var(--blue); cursor: pointer; padding: 2px 0; }
  .back-btn::before { content: '←'; font-size: 15px; }
  .page-label { font-size: 13px; font-weight: 500; color: var(--ink); }

  /* 검색바 */
  .search-bar { padding: 10px 16px; background: var(--paper); border-bottom: 1px solid var(--rule); flex-shrink: 0; }
  .search-input { width: 100%; border: 1px solid var(--rule); border-radius: 20px; padding: 8px 14px; font-family: var(--font); font-size: 14px; color: var(--ink); background: var(--bg); outline: none; }
  .search-input:focus { border-color: var(--blue); background: var(--paper); }
  .search-input::placeholder { color: var(--muted); }

  .cat-bar { display: flex; overflow-x: auto; border-bottom: 2px solid var(--rule); background: var(--paper); flex-shrink: 0; }
  .cat-bar::-webkit-scrollbar { display: none; }
  .cat-tab { padding: 10px 14px; font-size: 13px; font-weight: 400; color: var(--muted); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; white-space: nowrap; flex-shrink: 0; font-family: var(--font); margin-bottom: -2px; }
  .cat-tab.active { color: var(--blue); font-weight: 700; border-bottom-color: var(--blue); }

  /* 스크롤 영역 */
  .scroll-area { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }

  .portal { padding-bottom: 24px; background: var(--bg); }
  .empty-portal { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--muted); padding: 60px 20px; text-align: center; min-height: 200px; }
  .empty-txt { font-size: 14px; line-height: 1.7; }

  .art-row { display: flex; align-items: flex-start; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--rule); cursor: pointer; background: var(--paper); }
  .art-row:active { background: #F0F4FA; }
  .art-num { font-size: 11px; color: var(--muted); min-width: 20px; text-align: right; flex-shrink: 0; padding-top: 3px; }
  .art-info { flex: 1; min-width: 0; }
  .art-title { font-size: 15px; font-weight: 500; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 4px; color: var(--ink); }
  .art-sub { font-size: 11px; color: var(--muted); }
  .art-cat { color: var(--ink); font-weight: 700; }
  .art-source { color: var(--blue); font-weight: 500; }
  .art-thumb { width: 56px; height: 56px; object-fit: cover; border-radius: 4px; flex-shrink: 0; }
  .art-del { background: none; border: none; font-size: 14px; color: var(--rule); cursor: pointer; flex-shrink: 0; padding: 2px 4px; }
  .art-del:active { color: #cc0000; }

  /* 페이지네이션 */
  .pagination { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 16px; background: var(--paper); border-top: 1px solid var(--rule); }
  .page-btn { padding: 6px 12px; border: 1px solid var(--rule); border-radius: 4px; background: var(--paper); color: var(--mid); font-family: var(--font); font-size: 13px; cursor: pointer; }
  .page-btn.active { background: var(--blue); color: #fff; border-color: var(--blue); }
  .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .page-info { font-size: 12px; color: var(--muted); }

  .fab { position: fixed; bottom: 24px; right: 20px; width: 52px; height: 52px; border-radius: 50%; background: var(--blue); color: #fff; border: none; font-size: 26px; cursor: pointer; box-shadow: 0 2px 12px rgba(0,102,204,0.4); display: flex; align-items: center; justify-content: center; transition: transform 0.15s; z-index: 20; }
  .fab:active { transform: scale(0.92); }

  /* INPUT — 키보드 대응 */
  .input-page { height: 100dvh; display: flex; flex-direction: column; overflow: hidden; animation: fadeIn 0.15s ease; }
  .input-body { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 16px 12px; display: flex; flex-direction: column; gap: 14px; }
  .field-label { font-size: 11px; font-weight: 700; color: var(--mid); margin-bottom: 6px; }
  .cat-picker { display: flex; flex-wrap: wrap; gap: 7px; }
  .cat-pick-btn { padding: 6px 13px; border-radius: 4px; border: 1px solid var(--rule); background: var(--paper); color: var(--mid); font-family: var(--font); font-size: 12px; cursor: pointer; }
  .cat-pick-btn.on { background: var(--blue); color: #fff; border-color: var(--blue); }
  .url-input { width: 100%; border: 1px solid var(--rule); border-radius: 4px; padding: 10px 12px; font-family: var(--font); font-size: 14px; color: var(--ink); background: var(--paper); outline: none; }
  .url-input:focus { border-color: var(--blue); }
  .url-input::placeholder { color: var(--muted); }

  .photo-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .photo-thumb-wrap { position: relative; }
  .photo-thumb { width: 72px; height: 72px; object-fit: cover; border-radius: 6px; display: block; }
  .photo-del { position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; border-radius: 50%; background: #cc0000; color: #fff; border: none; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .photo-add { width: 72px; height: 72px; border: 1.5px dashed var(--rule); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: var(--muted); cursor: pointer; background: var(--paper); flex-shrink: 0; }

  .article-ta { width: 100%; border: 1px solid var(--rule); border-radius: 4px; padding: 12px; font-family: var(--font); font-size: 14px; font-weight: 400; line-height: 1.75; color: var(--ink); background: var(--paper); outline: none; resize: none; min-height: 300px; }
  .article-ta:focus { border-color: var(--blue); }
  .article-ta::placeholder { color: var(--muted); }
  .preview-box { background: #F0F4FA; border-radius: 4px; padding: 10px 12px; }
  .preview-source { font-size: 11px; color: var(--blue); font-weight: 700; margin-bottom: 3px; }
  .preview-title { font-size: 14px; font-weight: 500; color: var(--ink); }
  .save-btn { background: var(--blue); color: #fff; border: none; border-radius: 4px; padding: 14px; font-family: var(--font); font-size: 14px; font-weight: 700; cursor: pointer; }
  .save-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  /* EDIT */
  .edit-page { height: 100dvh; display: flex; flex-direction: column; overflow: hidden; animation: fadeIn 0.15s ease; }
  .edit-body { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 16px 12px; display: flex; flex-direction: column; gap: 14px; }
  .edit-ta { width: 100%; border: 1px solid var(--rule); border-radius: 4px; padding: 12px; font-family: var(--font); font-size: 14px; font-weight: 400; line-height: 1.75; color: var(--ink); background: var(--paper); outline: none; resize: none; min-height: 300px; }
  .edit-ta:focus { border-color: var(--blue); }
  .edit-save-btn { background: var(--blue); color: #fff; border: none; border-radius: 4px; padding: 14px; font-family: var(--font); font-size: 14px; font-weight: 700; cursor: pointer; }

  /* DETAIL */
  .detail-body { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 20px 16px 80px; }
  .dv-source { font-size: 12px; font-weight: 700; color: var(--blue); margin-bottom: 6px; }
  .dv-cat { font-size: 11px; color: var(--muted); margin-bottom: 10px; }
  .dv-title { font-size: 22px; font-weight: 700; line-height: 1.4; margin-bottom: 8px; color: var(--ink); }
  .dv-date { font-size: 11px; color: var(--muted); padding-bottom: 16px; border-bottom: 1px solid var(--rule); margin-bottom: 16px; }
  .dv-photos { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .dv-photo { width: 100%; max-height: 240px; object-fit: cover; border-radius: 6px; }
  .dv-url { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
  .dv-url-text { font-size: 12px; color: var(--blue); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-decoration: none; }
  .copy-btn { background: none; border: 1px solid var(--rule); border-radius: 4px; padding: 4px 10px; font-size: 11px; font-weight: 700; color: var(--mid); cursor: pointer; white-space: nowrap; font-family: var(--font); flex-shrink: 0; }
  .copy-btn.copied { color: var(--blue); border-color: var(--blue); }
  .dv-toggle { font-size: 13px; font-weight: 500; color: var(--blue); background: none; border: 1px solid var(--rule); border-radius: 4px; padding: 10px 14px; cursor: pointer; width: 100%; text-align: left; font-family: var(--font); }
  .dv-full { font-size: 15px; line-height: 1.9; font-weight: 400; color: var(--ink); white-space: pre-wrap; margin-top: 14px; }
  .detail-btns { display: flex; gap: 8px; margin-top: 28px; }
  .edit-btn { flex: 1; padding: 13px; border: 1px solid var(--blue); border-radius: 4px; background: none; color: var(--blue); font-family: var(--font); font-size: 13px; font-weight: 700; cursor: pointer; }
  .del-btn { flex: 1; padding: 13px; border: 1px solid #FFCCCC; border-radius: 4px; background: #FFF5F5; color: #CC0000; font-family: var(--font); font-size: 13px; font-weight: 700; cursor: pointer; }

  /* GUIDE */
  .guide-body { flex: 1; overflow-y: auto; padding: 16px 16px 60px; }
  .guide-intro { font-size: 13px; color: var(--mid); margin-bottom: 16px; line-height: 1.6; }
  .guide-item { padding: 14px 0; border-bottom: 1px solid var(--rule); }
  .guide-name { font-size: 16px; font-weight: 700; margin-bottom: 3px; }
  .guide-sub { font-size: 12px; font-weight: 700; color: var(--blue); margin-bottom: 4px; }
  .guide-desc { font-size: 13px; color: var(--mid); line-height: 1.6; }
  .edit-cats-btn { background: var(--blue); color: #fff; border: none; border-radius: 4px; padding: 10px 16px; font-family: var(--font); font-size: 13px; font-weight: 700; cursor: pointer; margin-bottom: 16px; width: 100%; }

  /* CAT EDIT */
  .cat-edit-body { flex: 1; overflow-y: auto; padding: 16px; }
  .cat-edit-intro { font-size: 13px; color: var(--mid); margin-bottom: 16px; line-height: 1.6; }
  .cat-edit-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
  .cat-edit-card { background: var(--paper); border: 1px solid var(--rule); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .cat-edit-card-top { display: flex; align-items: center; gap: 8px; }
  .cat-edit-name { flex: 1; border: none; border-bottom: 1px solid var(--rule); outline: none; font-family: var(--font); font-size: 15px; font-weight: 700; color: var(--ink); background: transparent; padding-bottom: 4px; }
  .cat-edit-sub { width: 100%; border: 1px solid var(--rule); border-radius: 4px; outline: none; font-family: var(--font); font-size: 12px; color: var(--mid); background: var(--bg); padding: 7px 10px; }
  .cat-edit-desc { width: 100%; border: 1px solid var(--rule); border-radius: 4px; outline: none; font-family: var(--font); font-size: 12px; color: var(--mid); background: var(--bg); padding: 7px 10px; resize: none; min-height: 60px; }
  .cat-edit-del { background: none; border: none; font-size: 16px; color: var(--muted); cursor: pointer; padding: 2px 4px; flex-shrink: 0; }
  .cat-edit-del:active { color: #cc0000; }
  .cat-add-btn { width: 100%; padding: 12px; border: 1px dashed var(--rule); border-radius: 4px; background: none; color: var(--blue); font-family: var(--font); font-size: 13px; font-weight: 700; cursor: pointer; margin-bottom: 16px; }
  .cat-save-btn { width: 100%; padding: 14px; background: var(--blue); color: #fff; border: none; border-radius: 4px; font-family: var(--font); font-size: 14px; font-weight: 700; cursor: pointer; }

  /* Confirm */
  .confirm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: flex-end; justify-content: center; z-index: 200; }
  .confirm-sheet { background: var(--paper); border-radius: 14px 14px 0 0; padding: 24px 16px 40px; width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: 10px; animation: slideUp 0.2s ease; }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .confirm-msg { font-size: 15px; text-align: center; color: var(--ink); padding-bottom: 8px; }
  .confirm-yes { padding: 14px; border: none; border-radius: 8px; background: #CC0000; color: #fff; font-family: var(--font); font-size: 15px; font-weight: 700; cursor: pointer; }
  .confirm-no { padding: 14px; border: 1px solid var(--rule); border-radius: 8px; background: none; color: var(--mid); font-family: var(--font); font-size: 15px; cursor: pointer; }

  .toast { position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%); background: #333; color: #fff; padding: 8px 18px; border-radius: 20px; font-size: 13px; z-index: 300; white-space: nowrap; }

  /* 검색 하이라이트 */
  mark { background: #FFF3B0; color: var(--ink); border-radius: 2px; }
`;

function ConfirmSheet({ onConfirm, onCancel }) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-sheet" onClick={e => e.stopPropagation()}>
        <div className="confirm-msg">이 기사를 삭제할까요?</div>
        <button className="confirm-yes" onClick={onConfirm}>삭제</button>
        <button className="confirm-no" onClick={onCancel}>취소</button>
      </div>
    </div>
  );
}

export default function Newspaper() {
  const [articles, setArticles] = useState([]);
  const [cats, setCats] = useState(DEFAULT_CATS);
  const [history, setHistory] = useState(["home"]);
  const [activeTab, setActiveTab] = useState("전체");
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(1);
  const [inputText, setInputText] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [inputPhotos, setInputPhotos] = useState([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editCat, setEditCat] = useState("");
  const [editPhotos, setEditPhotos] = useState([]);
  const [showFull, setShowFull] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");
  const [editCats, setEditCats] = useState([]);
  const photoInputRef = useRef(null);
  const editPhotoInputRef = useRef(null);

  const screen = history[history.length - 1];
  const catNames = cats.map(c => c.name);

  const goTo = (s) => {
    window.history.pushState({ len: history.length + 1 }, "");
    setHistory(prev => [...prev, s]);
  };
  const goBack = () => setHistory(prev => prev.length > 1 ? prev.slice(0, -1) : prev);

  useEffect(() => {
    window.history.pushState({ len: 1 }, "");
    window.history.pushState({ len: 2 }, "");
    const handler = () => {
      setHistory(prev => {
        if (prev.length > 1) {
          window.history.pushState({ len: prev.length }, "");
          return prev.slice(0, -1);
        } else {
          window.history.pushState({ len: 1 }, "");
          window.history.pushState({ len: 2 }, "");
          return prev;
        }
      });
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY); if (s) setArticles(JSON.parse(s));
      const c = localStorage.getItem(CATS_KEY); if (c) setCats(JSON.parse(c));
    } catch {}
  }, []);

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(articles)); } catch {} }, [articles]);
  useEffect(() => { try { localStorage.setItem(CATS_KEY, JSON.stringify(cats)); } catch {} }, [cats]);
  useEffect(() => { if (cats.length > 0 && !selectedCat) setSelectedCat(cats[0].name); }, [cats]);

  // 탭/검색 바뀌면 페이지 1로 리셋
  useEffect(() => { setPage(1); }, [activeTab, searchQ]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2000); };

  const { source: previewSource, title: previewTitle } = extractMeta(inputText);

  const handlePhotoAdd = async (files, setter) => {
    const arr = Array.from(files).slice(0, 2);
    const compressed = await Promise.all(arr.map(compressImage));
    setter(prev => [...prev, ...compressed].slice(0, 2));
  };

  const handleSave = () => {
    if (inputText.trim().length < 10) return;
    const { source, title } = extractMeta(inputText);
    const item = { id: Date.now(), title, source, category: selectedCat, fullText: inputText, url: inputUrl.trim(), photos: inputPhotos, savedAt: new Date().toISOString() };
    setArticles(prev => [item, ...prev]);
    setActiveId(item.id);
    setShowFull(false);
    setInputText(""); setInputUrl(""); setInputPhotos([]);
    setHistory(["home", "detail"]);
    window.history.pushState({ len: 2 }, "");
    window.history.pushState({ len: 3 }, "");
  };

  const handleEditSave = () => {
    const { source, title } = extractMeta(editText);
    setArticles(prev => prev.map(a => a.id === activeId ? { ...a, title, source, fullText: editText, category: editCat, photos: editPhotos } : a));
    goBack();
  };

  const doDelete = () => {
    setArticles(prev => prev.filter(a => a.id !== confirmId));
    setConfirmId(null);
    setHistory(["home"]);
    window.history.pushState({ len: 1 }, "");
    window.history.pushState({ len: 2 }, "");
  };

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true); showToast("링크 복사됨!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCatSave = () => {
    const filtered = editCats.filter(c => c.name.trim());
    if (!filtered.length) return;
    setCats(filtered); goBack(); showToast("섹션 저장됨!");
  };

  // 필터링
  const sorted = [...articles].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  const byCat = activeTab === "전체" ? sorted : sorted.filter(a => a.category === activeTab);
  const bySearch = searchQ.trim()
    ? byCat.filter(a =>
        a.title.includes(searchQ) ||
        (a.source || "").includes(searchQ) ||
        (a.fullText || "").includes(searchQ)
      )
    : byCat;

  const totalPages = Math.ceil(bySearch.length / PAGE_SIZE);
  const paged = bySearch.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const active = articles.find(a => a.id === activeId);

  const ArtRow = ({ a, i, showCat }) => (
    <div className="art-row" onClick={() => { setActiveId(a.id); setShowFull(false); goTo("detail"); }}>
      <div className="art-num">{String(bySearch.length - ((page-1)*PAGE_SIZE + i)).padStart(2, "0")}</div>
      <div className="art-info">
        <div className="art-title">{a.title}</div>
        <div className="art-sub">
          {showCat && a.category && <span className="art-cat">{a.category} · </span>}
          {a.source && <span className="art-source">{a.source} · </span>}
          {fmtDate(a.savedAt)}
        </div>
      </div>
      {a.photos?.[0] && <img className="art-thumb" src={a.photos[0]} alt="" />}
      <button className="art-del" onClick={e => { e.stopPropagation(); setConfirmId(a.id); }}>✕</button>
    </div>
  );

  const Pagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    // 최대 5개 버튼
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + 4);
    start = Math.max(1, end - 4);
    return (
      <div className="pagination">
        <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
        {Array.from({length: end - start + 1}, (_, i) => start + i).map(p => (
          <button key={p} className={`page-btn${page === p ? " active" : ""}`} onClick={() => setPage(p)}>{p}</button>
        ))}
        <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
        <span className="page-info">{bySearch.length}개</span>
      </div>
    );
  };

  return (
    <>
      <style>{css}</style>
      {confirmId && <ConfirmSheet onConfirm={doDelete} onCancel={() => setConfirmId(null)} />}
      {toast && <div className="toast">{toast}</div>}

      {/* HOME */}
      {screen === "home" && (
        <div className="page">
          <div className="top-bar">
            <div className="top-main">
              <div className="logo">Newspaper</div>
              <div className="top-meta">
                <button className="guide-btn" onClick={() => goTo("guide")}>섹션 안내</button>
                <span>v5 · {articles.length}개</span>
              </div>
            </div>
            <div className="top-date">{todayStr()}</div>
          </div>
          <div className="search-bar">
            <input className="search-input" placeholder="제목, 신문사, 본문 검색…" value={searchQ} onChange={e => setSearchQ(e.target.value)} />
          </div>
          <div className="cat-bar">
            {["전체", ...catNames].map(t => (
              <button key={t} className={`cat-tab${activeTab === t ? " active" : ""}`} onClick={() => setActiveTab(t)}>{t}</button>
            ))}
          </div>
          <div className="scroll-area">
            {articles.length === 0 ? (
              <div className="empty-portal"><div className="empty-txt">아래 + 버튼으로<br/>기사를 클립하세요</div></div>
            ) : bySearch.length === 0 ? (
              <div className="empty-portal"><div className="empty-txt">검색 결과가 없습니다</div></div>
            ) : (
              <div className="portal">
                {paged.map((a, i) => <ArtRow key={a.id} a={a} i={i} showCat={activeTab === "전체"} />)}
                <Pagination />
              </div>
            )}
          </div>
          <button className="fab" onClick={() => { setInputText(""); setInputUrl(""); setInputPhotos([]); goTo("input"); }}>+</button>
        </div>
      )}

      {/* INPUT */}
      {screen === "input" && (
        <div className="input-page">
          <div className="top-bar">
            <div className="top-main">
              <button className="back-btn" onClick={goBack}>홈</button>
              <div className="page-label">기사 클립</div>
            </div>
          </div>
          <div className="input-body">
            <div>
              <div className="field-label">카테고리</div>
              <div className="cat-picker">
                {catNames.map(c => (
                  <button key={c} className={`cat-pick-btn${selectedCat === c ? " on" : ""}`} onClick={() => setSelectedCat(c)}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="field-label">사진 (최대 2장)</div>
              <div className="photo-row">
                {inputPhotos.map((p, i) => (
                  <div key={i} className="photo-thumb-wrap">
                    <img className="photo-thumb" src={p} alt="" />
                    <button className="photo-del" onClick={() => setInputPhotos(prev => prev.filter((_, j) => j !== i))}>✕</button>
                  </div>
                ))}
                {inputPhotos.length < 2 && (
                  <button className="photo-add" onClick={() => photoInputRef.current?.click()}>+</button>
                )}
                <input ref={photoInputRef} type="file" accept="image/*" multiple style={{display:"none"}}
                  onChange={e => handlePhotoAdd(e.target.files, setInputPhotos)} />
              </div>
            </div>
            <div>
              <div className="field-label">원문 URL (선택)</div>
              <input className="url-input" type="url" placeholder="https://..." value={inputUrl} onChange={e => setInputUrl(e.target.value)} />
            </div>
            <div>
              <div className="field-label">기사 본문 (첫 줄에 신문사 이름)</div>
              <textarea className="article-ta" placeholder={"신문사 이름\n기사 제목\n기사 내용..."} value={inputText} onChange={e => setInputText(e.target.value)} />
            </div>
            {inputText.trim().length > 0 && (
              <div>
                <div className="field-label">미리보기</div>
                <div className="preview-box">
                  <div className="preview-source">{previewSource || "신문사"}</div>
                  <div className="preview-title">{previewTitle}</div>
                </div>
              </div>
            )}
            <button className="save-btn" onClick={handleSave} disabled={inputText.trim().length < 10}>저장</button>
          </div>
        </div>
      )}

      {/* DETAIL */}
      {screen === "detail" && active && (
        <div className="page">
          <div className="top-bar">
            <div className="top-main">
              <button className="back-btn" onClick={goBack}>목록</button>
            </div>
          </div>
          <div className="detail-body">
            {active.source && <div className="dv-source">{active.source}</div>}
            <div className="dv-cat">{active.category}</div>
            <h1 className="dv-title">{active.title}</h1>
            <div className="dv-date">{fmtDate(active.savedAt)} 저장</div>
            {active.photos?.length > 0 && (
              <div className="dv-photos">
                {active.photos.map((p, i) => <img key={i} className="dv-photo" src={p} alt="" />)}
              </div>
            )}
            {active.url && (
              <div className="dv-url">
                <a className="dv-url-text" href={active.url} target="_blank" rel="noopener noreferrer">{active.url}</a>
                <button className={`copy-btn${copied ? " copied" : ""}`} onClick={() => handleCopy(active.url)}>
                  {copied ? "복사됨 ✓" : "링크 복사"}
                </button>
              </div>
            )}
            <button className="dv-toggle" onClick={() => setShowFull(v => !v)}>
              {showFull ? "원문 접기 ↑" : "원문 전체 보기 ↓"}
            </button>
            {showFull && <div className="dv-full">{active.fullText}</div>}
            <div className="detail-btns">
              <button className="edit-btn" onClick={() => { setEditText(active.fullText); setEditCat(active.category); setEditPhotos(active.photos || []); goTo("edit"); }}>수정</button>
              <button className="del-btn" onClick={() => setConfirmId(active.id)}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT */}
      {screen === "edit" && active && (
        <div className="edit-page">
          <div className="top-bar">
            <div className="top-main">
              <button className="back-btn" onClick={goBack}>취소</button>
              <div className="page-label">기사 수정</div>
            </div>
          </div>
          <div className="edit-body">
            <div>
              <div className="field-label">섹션 변경</div>
              <div className="cat-picker">
                {catNames.map(c => (
                  <button key={c} className={`cat-pick-btn${editCat === c ? " on" : ""}`} onClick={() => setEditCat(c)}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="field-label">사진 (최대 2장)</div>
              <div className="photo-row">
                {editPhotos.map((p, i) => (
                  <div key={i} className="photo-thumb-wrap">
                    <img className="photo-thumb" src={p} alt="" />
                    <button className="photo-del" onClick={() => setEditPhotos(prev => prev.filter((_, j) => j !== i))}>✕</button>
                  </div>
                ))}
                {editPhotos.length < 2 && (
                  <button className="photo-add" onClick={() => editPhotoInputRef.current?.click()}>+</button>
                )}
                <input ref={editPhotoInputRef} type="file" accept="image/*" multiple style={{display:"none"}}
                  onChange={e => handlePhotoAdd(e.target.files, setEditPhotos)} />
              </div>
            </div>
            <textarea className="edit-ta" value={editText} onChange={e => setEditText(e.target.value)} autoFocus />
            <button className="edit-save-btn" onClick={handleEditSave}>저장</button>
          </div>
        </div>
      )}

      {/* GUIDE */}
      {screen === "guide" && (
        <div className="page">
          <div className="top-bar">
            <div className="top-main">
              <button className="back-btn" onClick={goBack}>홈</button>
              <div className="page-label">섹션 안내</div>
            </div>
          </div>
          <div className="guide-body">
            <button className="edit-cats-btn" onClick={() => { setEditCats(cats.map(c => ({...c}))); goTo("cat-edit"); }}>섹션 편집</button>
            <p className="guide-intro">현재 {cats.length}개 섹션입니다.</p>
            {cats.map(cat => (
              <div key={cat.name} className="guide-item">
                <div className="guide-name">{cat.name}</div>
                {cat.sub && <div className="guide-sub">{cat.sub}</div>}
                {cat.desc && <div className="guide-desc">{cat.desc}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CAT EDIT */}
      {screen === "cat-edit" && (
        <div className="page">
          <div className="top-bar">
            <div className="top-main">
              <button className="back-btn" onClick={goBack}>취소</button>
              <div className="page-label">섹션 편집</div>
            </div>
          </div>
          <div className="cat-edit-body">
            <p className="cat-edit-intro">섹션 이름·키워드·설명을 수정할 수 있어요.</p>
            <div className="cat-edit-list">
              {editCats.map((c, i) => (
                <div key={i} className="cat-edit-card">
                  <div className="cat-edit-card-top">
                    <input className="cat-edit-name" placeholder="섹션 이름" value={c.name}
                      onChange={e => setEditCats(prev => prev.map((v, j) => j === i ? {...v, name: e.target.value} : v))} />
                    <button className="cat-edit-del" onClick={() => setEditCats(prev => prev.filter((_, j) => j !== i))}>✕</button>
                  </div>
                  <input className="cat-edit-sub" placeholder="키워드 (예: 주식 · 부동산 · 환율)" value={c.sub || ""}
                    onChange={e => setEditCats(prev => prev.map((v, j) => j === i ? {...v, sub: e.target.value} : v))} />
                  <textarea className="cat-edit-desc" placeholder="설명" value={c.desc || ""}
                    onChange={e => setEditCats(prev => prev.map((v, j) => j === i ? {...v, desc: e.target.value} : v))} />
                </div>
              ))}
            </div>
            <button className="cat-add-btn" onClick={() => setEditCats(prev => [...prev, { name: "", sub: "", desc: "" }])}>+ 섹션 추가</button>
            <button className="cat-save-btn" onClick={handleCatSave}>저장</button>
          </div>
        </div>
      )}
    </>
  );
}
