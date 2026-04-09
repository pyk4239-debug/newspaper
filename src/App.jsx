import { useState, useEffect } from "react";

const STORAGE_KEY = "newspaper_v1";
const CATS = ["정치·세계", "경제", "사회", "기술", "문화", "스포츠", "라이프"];

// 언론사명·기자·날짜 줄 건너뛰고 실제 제목 추출
function extractTitle(text) {
  const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    // 날짜 패턴 (2026. 4. 6. / 2026-04-06 등)
    if (/\d{4}[\.\-]\s?\d{1,2}[\.\-]/.test(line)) continue;
    // 기자 줄 (기자, 특파원, 에디터 포함)
    if (/기자|특파원|에디터|기자단/.test(line)) continue;
    // 짧은 줄 (언론사명 등 10자 이하)
    if (line.length <= 10) continue;
    // 통과하면 제목
    return line.slice(0, 120);
  }
  return lines[0]?.slice(0, 120) || "제목 없음";
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Source+Serif+4:wght@300;400&family=Lato:wght@300;400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #FAFAF7;
    --paper: #FFFFFF;
    --ink: #111111;
    --mid: #666;
    --muted: #AAA8A2;
    --rule: #E2DFD8;
    --accent: #1a1a1a;
  }
  body { font-family: 'Lato', sans-serif; background: var(--bg); color: var(--ink); min-height: 100vh; }
  .page { min-height: 100vh; display: flex; flex-direction: column; animation: fadeIn 0.2s ease; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  /* ── Top bar ── */
  .top-bar {
    padding: 14px 20px 12px;
    border-bottom: 2px solid var(--ink);
    background: var(--bg);
    position: sticky; top: 0; z-index: 10;
  }
  .top-main { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 2px; }
  .logo {
    font-family: 'Playfair Display', serif;
    font-size: 24px; font-weight: 700; letter-spacing: -0.5px;
  }
  .top-meta { font-size: 10px; color: var(--muted); font-weight: 300; display: flex; align-items: center; gap: 10px; }
  .guide-btn {
    background: none; border: 1px solid var(--rule); border-radius: 20px;
    padding: 3px 10px; font-size: 10px; font-weight: 700;
    color: var(--muted); cursor: pointer; transition: all 0.15s; font-family: 'Lato', sans-serif;
  }
  .guide-btn:active { border-color: var(--ink); color: var(--ink); }
  .top-date { font-size: 10px; color: var(--muted); font-weight: 300; border-top: 1px solid var(--rule); padding-top: 6px; }

  .back-btn {
    background: none; border: none; font-family: 'Lato', sans-serif;
    font-size: 14px; font-weight: 700; color: var(--ink); cursor: pointer; padding: 4px 0;
  }
  .page-title { font-size: 12px; font-weight: 700; color: var(--muted); letter-spacing: 1px; text-transform: uppercase; }

  /* ── Tab bar ── */
  .cat-bar {
    display: flex; overflow-x: auto; border-bottom: 1px solid var(--rule);
    background: var(--bg); position: sticky; top: 69px; z-index: 9;
  }
  .cat-bar::-webkit-scrollbar { display: none; }
  .cat-tab {
    padding: 9px 14px; font-size: 12px; font-weight: 400; color: var(--muted);
    background: none; border: none; border-bottom: 2px solid transparent;
    cursor: pointer; white-space: nowrap; transition: all 0.15s; flex-shrink: 0;
    font-family: 'Lato', sans-serif;
  }
  .cat-tab.active { color: var(--ink); font-weight: 700; border-bottom-color: var(--ink); }

  /* ── Portal ── */
  .portal { flex: 1; padding-bottom: 80px; }

  .empty-portal {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 12px;
    color: var(--muted); padding: 60px 20px; text-align: center;
  }
  .empty-rule { width: 40px; height: 2px; background: var(--rule); margin: 0 auto; }
  .empty-txt { font-size: 13px; font-weight: 300; line-height: 1.7; font-family: 'Source Serif 4', serif; font-style: italic; }

  .section-divider { height: 8px; background: var(--bg); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }

  .section-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 20px 8px;
  }
  .section-title {
    font-family: 'Playfair Display', serif; font-size: 14px;
    font-weight: 700; letter-spacing: 0.3px;
  }
  .section-count { font-size: 10px; color: var(--muted); font-weight: 300; }

  .art-row {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 12px 20px; border-bottom: 1px solid var(--rule);
    cursor: pointer; background: var(--paper); transition: background 0.1s;
  }
  .art-row:active { background: #F0EDE6; }
  .art-num {
    font-family: 'Playfair Display', serif; font-size: 11px; font-style: italic;
    color: var(--muted); min-width: 20px; text-align: right; flex-shrink: 0; padding-top: 2px;
  }
  .art-info { flex: 1; min-width: 0; }
  .art-title {
    font-family: 'Source Serif 4', serif; font-size: 15px; font-weight: 400;
    line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2;
    -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 4px; color: var(--ink);
  }
  .art-sub { font-size: 10px; color: var(--muted); font-weight: 300; }
  .art-del {
    background: none; border: none; font-size: 14px; color: var(--rule);
    cursor: pointer; flex-shrink: 0; padding: 2px 4px; transition: color 0.15s;
  }
  .art-del:active { color: #c0392b; }

  /* FAB */
  .fab {
    position: fixed; bottom: 28px; right: 24px;
    width: 52px; height: 52px; border-radius: 50%;
    background: var(--ink); color: var(--bg); border: none;
    font-size: 24px; cursor: pointer;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.15s; z-index: 20;
  }
  .fab:active { transform: scale(0.91); }

  /* ── INPUT ── */
  .input-body { flex: 1; display: flex; flex-direction: column; padding: 16px 12px; gap: 14px; }
  .field-label {
    font-size: 9px; font-weight: 700; letter-spacing: 2px;
    text-transform: uppercase; color: var(--muted); margin-bottom: 6px;
  }
  .cat-picker { display: flex; flex-wrap: wrap; gap: 8px; }
  .cat-pick-btn {
    padding: 7px 14px; border-radius: 20px; border: 1px solid var(--rule);
    background: var(--paper); color: var(--mid); font-family: 'Lato', sans-serif;
    font-size: 12px; cursor: pointer; transition: all 0.12s;
  }
  .cat-pick-btn.on { background: var(--ink); color: var(--bg); border-color: var(--ink); }

  .article-ta {
    flex: 1; border: 1.5px solid var(--rule); border-radius: 6px;
    padding: 14px 12px; font-family: 'Source Serif 4', serif; font-size: 14px;
    font-weight: 300; line-height: 1.75; color: var(--ink); background: var(--paper);
    outline: none; resize: none; min-height: 380px; transition: border-color 0.15s;
    width: 100%;
  }
  .article-ta:focus { border-color: var(--ink); }
  .article-ta::placeholder { color: var(--muted); font-style: italic; }

  .title-preview {
    background: var(--paper); border: 1px solid var(--rule); border-radius: 4px;
    padding: 10px 14px; font-family: 'Source Serif 4', serif; font-size: 14px;
    color: var(--ink); font-weight: 400; line-height: 1.4;
  }
  .title-preview.empty { color: var(--muted); font-style: italic; }

  .save-btn {
    background: var(--ink); color: var(--bg); border: none; border-radius: 4px;
    padding: 15px; font-family: 'Lato', sans-serif; font-size: 14px;
    font-weight: 700; cursor: pointer; transition: opacity 0.15s;
  }
  .save-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  /* ── DETAIL ── */
  .detail-body { flex: 1; overflow-y: auto; padding: 24px 20px 80px; }
  .dv-cat {
    font-size: 9px; font-weight: 700; letter-spacing: 2px;
    text-transform: uppercase; color: var(--muted); margin-bottom: 14px;
    display: flex; align-items: center; gap: 8px;
  }
  .dv-cat::after { content: ''; flex: 1; height: 1px; background: var(--rule); }
  .dv-title {
    font-family: 'Playfair Display', serif; font-size: 24px;
    line-height: 1.3; letter-spacing: -0.3px; margin-bottom: 10px;
  }
  .dv-date { font-size: 11px; color: var(--muted); font-weight: 300; margin-bottom: 24px; }
  .dv-rule { border: none; border-top: 1px solid var(--rule); margin: 20px 0; }
  .dv-body-label {
    font-size: 9px; font-weight: 700; letter-spacing: 2px;
    text-transform: uppercase; color: var(--muted); margin-bottom: 12px;
  }
  .dv-toggle {
    font-size: 12px; font-weight: 700; color: var(--mid);
    background: none; border: 1px solid var(--rule); border-radius: 3px;
    padding: 10px 14px; cursor: pointer; width: 100%; text-align: left;
    font-family: 'Lato', sans-serif;
  }
  .dv-full {
    font-family: 'Source Serif 4', serif; font-size: 14px; line-height: 1.85;
    font-weight: 300; color: var(--mid); white-space: pre-wrap; margin-top: 16px;
  }
  .del-btn {
    width: 100%; margin-top: 32px; padding: 13px; border: 1px solid #e0c0bd;
    border-radius: 4px; background: #fdf5f4; color: #c0392b;
    font-family: 'Lato', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer;
  }

  /* ── GUIDE ── */
  .guide-body { flex: 1; overflow-y: auto; padding: 20px 20px 60px; }
  .guide-intro { font-size: 13px; font-weight: 300; color: var(--mid); margin-bottom: 24px; line-height: 1.6; font-family: 'Source Serif 4', serif; font-style: italic; }
  .guide-item { padding: 16px 0; border-bottom: 1px solid var(--rule); }
  .guide-name { font-family: 'Playfair Display', serif; font-size: 17px; margin-bottom: 3px; }
  .guide-sub { font-size: 11px; font-weight: 700; color: var(--ink); letter-spacing: 0.5px; margin-bottom: 5px; }
  .guide-desc { font-size: 13px; font-weight: 300; color: var(--mid); line-height: 1.6; }

  /* Confirm sheet */
  .confirm-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.35);
    display: flex; align-items: flex-end; justify-content: center; z-index: 200;
  }
  .confirm-sheet {
    background: var(--paper); border-radius: 18px 18px 0 0;
    padding: 28px 20px 44px; width: 100%; max-width: 480px;
    display: flex; flex-direction: column; gap: 10px;
    animation: slideUp 0.22s ease;
  }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .confirm-msg { font-size: 15px; text-align: center; color: var(--ink); padding-bottom: 8px; }
  .confirm-yes {
    padding: 15px; border: none; border-radius: 10px; background: #c0392b; color: #fff;
    font-family: 'Lato', sans-serif; font-size: 15px; font-weight: 700; cursor: pointer;
  }
  .confirm-no {
    padding: 15px; border: 1px solid var(--rule); border-radius: 10px; background: none;
    color: var(--mid); font-family: 'Lato', sans-serif; font-size: 15px; cursor: pointer;
  }
`;

const CAT_DESC = {
  "정치·세계": { sub: "국내정치 · 외교 · 국제정세 · 분쟁", desc: "국내외 정치 뉴스, 선거, 외교, 전쟁, 글로벌 이슈" },
  "경제":      { sub: "주식 · 부동산 · 환율 · 재테크", desc: "증시, 환율, 부동산, 거시경제, 기업 실적" },
  "사회":      { sub: "사건사고 · 교육 · 환경 · 복지", desc: "국내 사건사고, 교육 정책, 기후·환경, 사회 이슈" },
  "기술":      { sub: "AI · IT · 과학 · 우주", desc: "인공지능, 테크 기업, 신기술, 과학 발견, 우주 탐사" },
  "문화":      { sub: "영화 · 음악 · 책 · 예술 · 엔터", desc: "영화, 드라마, 음악, 전시, 공연, 연예 뉴스" },
  "스포츠":    { sub: "축구 · 야구 · 농구 · 올림픽", desc: "국내외 모든 스포츠 경기, 선수, 팀 소식" },
  "라이프":    { sub: "건강 · 음식 · 여행 · 일상", desc: "건강 정보, 맛집, 여행지, 쇼핑, 생활 팁" },
};

const fmtDate = (iso) => new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
const todayStr = () => new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

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
  const [screen, setScreen] = useState("home");
  const [activeTab, setActiveTab] = useState("전체");
  const [inputText, setInputText] = useState("");
  const [selectedCat, setSelectedCat] = useState(CATS[0]);
  const [activeId, setActiveId] = useState(null);
  const [showFull, setShowFull] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) setArticles(JSON.parse(s)); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(articles)); } catch {}
  }, [articles]);

  const previewTitle = extractTitle(inputText);

  const handleSave = () => {
    if (inputText.trim().length < 10) return;
    const item = {
      id: Date.now(),
      title: previewTitle,
      category: selectedCat,
      fullText: inputText,
      savedAt: new Date().toISOString(),
    };
    setArticles(prev => [item, ...prev]);
    setActiveId(item.id);
    setShowFull(false);
    setScreen("detail");
    setInputText("");
  };

  const doDelete = () => {
    setArticles(prev => prev.filter(a => a.id !== confirmId));
    if (activeId === confirmId) setScreen("home");
    setConfirmId(null);
  };

  const tabs = ["전체", ...CATS];
  const filtered = activeTab === "전체" ? articles : articles.filter(a => a.category === activeTab);
  const sections = CATS.map(cat => ({ cat, items: articles.filter(a => a.category === cat) })).filter(s => s.items.length > 0);
  const active = articles.find(a => a.id === activeId);

  return (
    <>
      <style>{css}</style>
      {confirmId && <ConfirmSheet onConfirm={doDelete} onCancel={() => setConfirmId(null)} />}

      {/* HOME */}
      {screen === "home" && (
        <div className="page">
          <div className="top-bar">
            <div className="top-main">
              <div className="logo">Newspaper</div>
              <div className="top-meta">
                <button className="guide-btn" onClick={() => setScreen("guide")}>섹션 안내</button>
                <span>v1 · {articles.length}개</span>
              </div>
            </div>
            <div className="top-date">{todayStr()}</div>
          </div>

          <div className="cat-bar">
            {tabs.map(t => (
              <button key={t} className={`cat-tab${activeTab === t ? " active" : ""}`} onClick={() => setActiveTab(t)}>{t}</button>
            ))}
          </div>

          {articles.length === 0 ? (
            <div className="empty-portal">
              <div className="empty-rule" />
              <div className="empty-txt">아래 + 버튼으로<br/>기사를 클립하세요</div>
            </div>
          ) : activeTab !== "전체" ? (
            <div className="portal">
              {filtered.length === 0 ? (
                <div style={{padding:"20px", color:"var(--muted)", fontSize:"13px", fontStyle:"italic"}}>기사가 없습니다</div>
              ) : filtered.map((a, i) => (
                <div key={a.id} className="art-row" onClick={() => { setActiveId(a.id); setShowFull(false); setScreen("detail"); }}>
                  <div className="art-num">{String(filtered.length - i).padStart(2, "0")}</div>
                  <div className="art-info">
                    <div className="art-title">{a.title}</div>
                    <div className="art-sub">{a.category} · {fmtDate(a.savedAt)}</div>
                  </div>
                  <button className="art-del" onClick={e => { e.stopPropagation(); setConfirmId(a.id); }}>✕</button>
                </div>
              ))}
            </div>
          ) : (
            // 전체 탭 — 최근순
            <div className="portal">
              {[...articles].sort((a, b) => b.savedAt.localeCompare(a.savedAt)).map((a, i) => (
                <div key={a.id} className="art-row" onClick={() => { setActiveId(a.id); setShowFull(false); setScreen("detail"); }}>
                  <div className="art-num">{String(articles.length - i).padStart(2, "0")}</div>
                  <div className="art-info">
                    <div className="art-title">{a.title}</div>
                    <div className="art-sub">{a.category} · {fmtDate(a.savedAt)}</div>
                  </div>
                  <button className="art-del" onClick={e => { e.stopPropagation(); setConfirmId(a.id); }}>✕</button>
                </div>
              ))}
            </div>
          )}

          <button className="fab" onClick={() => { setInputText(""); setScreen("input"); }}>+</button>
        </div>
      )}

      {/* INPUT */}
      {screen === "input" && (
        <div className="page">
          <div className="top-bar">
            <div className="top-main">
              <button className="back-btn" onClick={() => setScreen("home")}>‹ 뒤로</button>
              <div className="page-title">기사 클립</div>
            </div>
          </div>
          <div className="input-body">
            <div>
              <div className="field-label">카테고리</div>
              <div className="cat-picker">
                {CATS.map(c => (
                  <button key={c} className={`cat-pick-btn${selectedCat === c ? " on" : ""}`} onClick={() => setSelectedCat(c)}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="field-label">기사 본문 붙여넣기</div>
              <textarea
                className="article-ta"
                placeholder="기사 전문을 붙여넣으세요. 첫 줄이 제목으로 저장됩니다."
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                autoFocus
              />
            </div>
            {inputText.trim().length > 0 && (
              <div>
                <div className="field-label">제목 미리보기</div>
                <div className={`title-preview${!inputText.trim() ? " empty" : ""}`}>{previewTitle}</div>
              </div>
            )}
            <button className="save-btn" onClick={handleSave} disabled={inputText.trim().length < 10}>
              저장
            </button>
          </div>
        </div>
      )}

      {/* DETAIL */}
      {screen === "detail" && active && (
        <div className="page">
          <div className="top-bar">
            <div className="top-main">
              <button className="back-btn" onClick={() => setScreen("home")}>‹ 뒤로</button>
            </div>
          </div>
          <div className="detail-body">
            <div className="dv-cat">{active.category}</div>
            <h1 className="dv-title">{active.title}</h1>
            <div className="dv-date">{fmtDate(active.savedAt)} 저장</div>
            <hr className="dv-rule" />
            <div className="dv-body-label">원문</div>
            <button className="dv-toggle" onClick={() => setShowFull(v => !v)}>
              {showFull ? "접기 ↑" : "전체 보기 ↓"}
            </button>
            {showFull && <div className="dv-full">{active.fullText}</div>}
            <button className="del-btn" onClick={() => setConfirmId(active.id)}>이 기사 삭제</button>
          </div>
        </div>
      )}

      {/* GUIDE */}
      {screen === "guide" && (
        <div className="page">
          <div className="top-bar">
            <div className="top-main">
              <button className="back-btn" onClick={() => setScreen("home")}>‹ 뒤로</button>
              <div className="page-title">섹션 안내</div>
            </div>
          </div>
          <div className="guide-body">
            <p className="guide-intro">7개 섹션 기준입니다. 기사 추가 시 가장 잘 맞는 섹션을 선택하세요.</p>
            {CATS.map(cat => (
              <div key={cat} className="guide-item">
                <div className="guide-name">{cat}</div>
                <div className="guide-sub">{CAT_DESC[cat].sub}</div>
                <div className="guide-desc">{CAT_DESC[cat].desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
