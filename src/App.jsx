import { useState, useEffect } from "react";

const STORAGE_KEY = "newspaper_v2";
const CATS = ["정치·세계", "경제", "사회", "기술", "문화", "스포츠", "라이프"];

// 첫 줄 = 신문사, 나머지에서 제목 추출
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

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #F8F8F8;
    --paper: #FFFFFF;
    --ink: #1A1A1A;
    --mid: #666;
    --muted: #AAAAAA;
    --rule: #E5E5E5;
    --blue: #0066CC;
  }
  body { font-family: 'Noto Sans KR', sans-serif; background: var(--bg); color: var(--ink); min-height: 100vh; }
  .page { min-height: 100vh; display: flex; flex-direction: column; animation: fadeIn 0.15s ease; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  /* Top bar */
  .top-bar {
    padding: 12px 16px 10px; border-bottom: 1px solid var(--ink);
    background: var(--paper); position: sticky; top: 0; z-index: 10;
  }
  .top-main { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }
  .logo { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; color: var(--ink); }
  .top-meta { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 8px; }
  .guide-btn {
    background: none; border: 1px solid var(--rule); border-radius: 4px;
    padding: 3px 8px; font-size: 11px; font-weight: 500;
    color: var(--mid); cursor: pointer; font-family: 'Noto Sans KR', sans-serif;
  }
  .top-date { font-size: 10px; color: var(--muted); padding-top: 4px; border-top: 1px solid var(--rule); }

  /* Back button */
  .back-btn {
    display: flex; align-items: center; gap: 4px;
    background: none; border: none; font-family: 'Noto Sans KR', sans-serif;
    font-size: 13px; font-weight: 500; color: var(--blue); cursor: pointer; padding: 2px 0;
  }
  .back-btn::before { content: '←'; font-size: 15px; }
  .page-label { font-size: 13px; font-weight: 500; color: var(--ink); }

  /* Tab bar */
  .cat-bar {
    display: flex; overflow-x: auto; border-bottom: 2px solid var(--rule);
    background: var(--paper); position: sticky; top: 61px; z-index: 9;
  }
  .cat-bar::-webkit-scrollbar { display: none; }
  .cat-tab {
    padding: 10px 14px; font-size: 13px; font-weight: 400; color: var(--muted);
    background: none; border: none; border-bottom: 2px solid transparent;
    cursor: pointer; white-space: nowrap; flex-shrink: 0;
    font-family: 'Noto Sans KR', sans-serif; margin-bottom: -2px;
  }
  .cat-tab.active { color: var(--blue); font-weight: 700; border-bottom-color: var(--blue); }

  /* Portal */
  .portal { flex: 1; padding-bottom: 80px; background: var(--bg); }

  .empty-portal {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 10px;
    color: var(--muted); padding: 60px 20px; text-align: center;
  }
  .empty-txt { font-size: 14px; font-weight: 300; line-height: 1.7; }

  .section-divider { height: 6px; background: var(--bg); }
  .section-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px 6px; background: var(--paper); }
  .section-title { font-size: 13px; font-weight: 700; color: var(--ink); }
  .section-count { font-size: 11px; color: var(--muted); }

  .art-row {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 12px 16px; border-bottom: 1px solid var(--rule);
    cursor: pointer; background: var(--paper);
  }
  .art-row:active { background: #F0F4FA; }
  .art-num { font-size: 11px; color: var(--muted); min-width: 20px; text-align: right; flex-shrink: 0; padding-top: 3px; }
  .art-info { flex: 1; min-width: 0; }
  .art-title {
    font-size: 15px; font-weight: 500; line-height: 1.5;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden; margin-bottom: 4px; color: var(--ink);
  }
  .art-sub { font-size: 11px; color: var(--muted); }
  .art-source { color: var(--blue); font-weight: 500; }
  .art-del { background: none; border: none; font-size: 14px; color: var(--rule); cursor: pointer; flex-shrink: 0; padding: 2px 4px; }
  .art-del:active { color: #cc0000; }

  /* FAB */
  .fab {
    position: fixed; bottom: 24px; right: 20px;
    width: 52px; height: 52px; border-radius: 50%;
    background: var(--blue); color: #fff; border: none;
    font-size: 26px; cursor: pointer;
    box-shadow: 0 2px 12px rgba(0,102,204,0.4);
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.15s; z-index: 20;
  }
  .fab:active { transform: scale(0.92); }

  /* INPUT */
  .input-body { flex: 1; display: flex; flex-direction: column; padding: 16px 12px; gap: 14px; }
  .field-label { font-size: 11px; font-weight: 700; color: var(--mid); margin-bottom: 6px; }
  .cat-picker { display: flex; flex-wrap: wrap; gap: 7px; }
  .cat-pick-btn {
    padding: 6px 13px; border-radius: 4px; border: 1px solid var(--rule);
    background: var(--paper); color: var(--mid); font-family: 'Noto Sans KR', sans-serif;
    font-size: 12px; cursor: pointer;
  }
  .cat-pick-btn.on { background: var(--blue); color: #fff; border-color: var(--blue); }

  .article-ta {
    flex: 1; border: 1px solid var(--rule); border-radius: 4px;
    padding: 12px; font-family: 'Noto Sans KR', sans-serif; font-size: 14px;
    font-weight: 300; line-height: 1.75; color: var(--ink); background: var(--paper);
    outline: none; resize: none; min-height: 380px; width: 100%; transition: border-color 0.15s;
  }
  .article-ta:focus { border-color: var(--blue); }
  .article-ta::placeholder { color: var(--muted); }

  .preview-box {
    background: #F0F4FA; border-radius: 4px; padding: 10px 12px;
    font-size: 13px; line-height: 1.5;
  }
  .preview-source { font-size: 11px; color: var(--blue); font-weight: 700; margin-bottom: 3px; }
  .preview-title { font-size: 14px; font-weight: 500; color: var(--ink); }

  .save-btn {
    background: var(--blue); color: #fff; border: none; border-radius: 4px;
    padding: 14px; font-family: 'Noto Sans KR', sans-serif; font-size: 14px;
    font-weight: 700; cursor: pointer;
  }
  .save-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  /* EDIT */
  .edit-body { flex: 1; display: flex; flex-direction: column; padding: 16px 12px; gap: 14px; }
  .edit-ta {
    flex: 1; border: 1px solid var(--rule); border-radius: 4px;
    padding: 12px; font-family: 'Noto Sans KR', sans-serif; font-size: 14px;
    font-weight: 300; line-height: 1.75; color: var(--ink); background: var(--paper);
    outline: none; resize: none; min-height: 380px; width: 100%;
  }
  .edit-ta:focus { border-color: var(--blue); }
  .edit-save-btn {
    background: var(--blue); color: #fff; border: none; border-radius: 4px;
    padding: 14px; font-family: 'Noto Sans KR', sans-serif; font-size: 14px;
    font-weight: 700; cursor: pointer;
  }

  /* DETAIL */
  .detail-body { flex: 1; overflow-y: auto; padding: 20px 16px 80px; }
  .dv-source { font-size: 12px; font-weight: 700; color: var(--blue); margin-bottom: 8px; }
  .dv-cat { font-size: 11px; color: var(--muted); margin-bottom: 10px; }
  .dv-title { font-size: 22px; font-weight: 700; line-height: 1.4; margin-bottom: 8px; color: var(--ink); }
  .dv-date { font-size: 11px; color: var(--muted); padding-bottom: 16px; border-bottom: 1px solid var(--rule); margin-bottom: 20px; }
  .dv-toggle {
    font-size: 13px; font-weight: 500; color: var(--blue);
    background: none; border: 1px solid var(--rule); border-radius: 4px;
    padding: 10px 14px; cursor: pointer; width: 100%; text-align: left;
    font-family: 'Noto Sans KR', sans-serif;
  }
  .dv-full { font-size: 14px; line-height: 1.85; font-weight: 300; color: var(--mid); white-space: pre-wrap; margin-top: 14px; }

  .detail-btns { display: flex; gap: 8px; margin-top: 28px; }
  .edit-btn {
    flex: 1; padding: 13px; border: 1px solid var(--blue); border-radius: 4px;
    background: none; color: var(--blue); font-family: 'Noto Sans KR', sans-serif;
    font-size: 13px; font-weight: 700; cursor: pointer;
  }
  .del-btn {
    flex: 1; padding: 13px; border: 1px solid #FFCCCC; border-radius: 4px;
    background: #FFF5F5; color: #CC0000; font-family: 'Noto Sans KR', sans-serif;
    font-size: 13px; font-weight: 700; cursor: pointer;
  }

  /* GUIDE */
  .guide-body { flex: 1; overflow-y: auto; padding: 16px 16px 60px; }
  .guide-intro { font-size: 13px; color: var(--mid); margin-bottom: 20px; line-height: 1.6; }
  .guide-item { padding: 14px 0; border-bottom: 1px solid var(--rule); }
  .guide-name { font-size: 16px; font-weight: 700; margin-bottom: 3px; }
  .guide-sub { font-size: 12px; font-weight: 700; color: var(--blue); margin-bottom: 4px; }
  .guide-desc { font-size: 13px; color: var(--mid); line-height: 1.6; }

  /* Confirm sheet */
  .confirm-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.35);
    display: flex; align-items: flex-end; justify-content: center; z-index: 200;
  }
  .confirm-sheet {
    background: var(--paper); border-radius: 14px 14px 0 0;
    padding: 24px 16px 40px; width: 100%; max-width: 480px;
    display: flex; flex-direction: column; gap: 10px;
    animation: slideUp 0.2s ease;
  }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .confirm-msg { font-size: 15px; text-align: center; color: var(--ink); padding-bottom: 8px; }
  .confirm-yes { padding: 14px; border: none; border-radius: 8px; background: #CC0000; color: #fff; font-family: 'Noto Sans KR', sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; }
  .confirm-no { padding: 14px; border: 1px solid var(--rule); border-radius: 8px; background: none; color: var(--mid); font-family: 'Noto Sans KR', sans-serif; font-size: 15px; cursor: pointer; }
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
  const [history, setHistory] = useState(["home"]); // 화면 히스토리
  const [activeTab, setActiveTab] = useState("전체");
  const [inputText, setInputText] = useState("");
  const [selectedCat, setSelectedCat] = useState(CATS[0]);
  const [activeId, setActiveId] = useState(null);
  const [editText, setEditText] = useState("");
  const [showFull, setShowFull] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const screen = history[history.length - 1];

  const goTo = (s) => setHistory(prev => [...prev, s]);
  const goBack = () => {
    if (history.length > 1) setHistory(prev => prev.slice(0, -1));
  };

  // 기기 뒤로가기 처리
  useEffect(() => {
    const handler = (e) => {
      if (history.length > 1) {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener("popstate", handler);
    // 히스토리 스택에 상태 추가
    window.history.pushState({}, "");
    return () => window.removeEventListener("popstate", handler);
  }, [history]);

  useEffect(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) setArticles(JSON.parse(s)); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(articles)); } catch {}
  }, [articles]);

  const { source: previewSource, title: previewTitle } = extractMeta(inputText);

  const handleSave = () => {
    if (inputText.trim().length < 10) return;
    const { source, title } = extractMeta(inputText);
    const item = { id: Date.now(), title, source, category: selectedCat, fullText: inputText, savedAt: new Date().toISOString() };
    setArticles(prev => [item, ...prev]);
    setActiveId(item.id);
    setShowFull(false);
    setInputText("");
    setHistory(["home", "detail"]);
  };

  const handleEditSave = () => {
    const { source, title } = extractMeta(editText);
    setArticles(prev => prev.map(a => a.id === activeId ? { ...a, title, source, fullText: editText } : a));
    goBack();
  };

  const doDelete = () => {
    setArticles(prev => prev.filter(a => a.id !== confirmId));
    setConfirmId(null);
    setHistory(["home"]);
  };

  const tabs = ["전체", ...CATS];
  const filtered = activeTab === "전체" ? articles : articles.filter(a => a.category === activeTab);
  const sections = CATS.map(cat => ({ cat, items: articles.filter(a => a.category === cat) })).filter(s => s.items.length > 0);
  const active = articles.find(a => a.id === activeId);

  const openDetail = (id) => { setActiveId(id); setShowFull(false); goTo("detail"); };

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
                <button className="guide-btn" onClick={() => goTo("guide")}>섹션 안내</button>
                <span>v2 · {articles.length}개</span>
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
              <div className="empty-txt">아래 + 버튼으로<br/>기사를 클립하세요</div>
            </div>
          ) : activeTab !== "전체" ? (
            <div className="portal">
              {filtered.length === 0 ? (
                <div style={{padding:"20px", color:"var(--muted)", fontSize:"13px"}}>기사가 없습니다</div>
              ) : filtered.map((a, i) => (
                <div key={a.id} className="art-row" onClick={() => openDetail(a.id)}>
                  <div className="art-num">{String(filtered.length - i).padStart(2, "0")}</div>
                  <div className="art-info">
                    <div className="art-title">{a.title}</div>
                    <div className="art-sub">
                      {a.source && <span className="art-source">{a.source} · </span>}
                      {fmtDate(a.savedAt)}
                    </div>
                  </div>
                  <button className="art-del" onClick={e => { e.stopPropagation(); setConfirmId(a.id); }}>✕</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="portal">
              {[...articles].sort((a, b) => b.savedAt.localeCompare(a.savedAt)).map((a, i) => (
                <div key={a.id} className="art-row" onClick={() => openDetail(a.id)}>
                  <div className="art-num">{String(articles.length - i).padStart(2, "0")}</div>
                  <div className="art-info">
                    <div className="art-title">{a.title}</div>
                    <div className="art-sub">
                      {a.source && <span className="art-source">{a.source} · </span>}
                      {fmtDate(a.savedAt)}
                    </div>
                  </div>
                  <button className="art-del" onClick={e => { e.stopPropagation(); setConfirmId(a.id); }}>✕</button>
                </div>
              ))}
            </div>
          )}
          <button className="fab" onClick={() => { setInputText(""); goTo("input"); }}>+</button>
        </div>
      )}

      {/* INPUT */}
      {screen === "input" && (
        <div className="page">
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
                {CATS.map(c => (
                  <button key={c} className={`cat-pick-btn${selectedCat === c ? " on" : ""}`} onClick={() => setSelectedCat(c)}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="field-label">기사 본문 (첫 줄에 신문사명 입력)</div>
              <textarea
                className="article-ta"
                placeholder={"조선일보\n기사 제목\n기사 내용..."}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                autoFocus
              />
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
            <button className="dv-toggle" onClick={() => setShowFull(v => !v)}>
              {showFull ? "원문 접기 ↑" : "원문 전체 보기 ↓"}
            </button>
            {showFull && <div className="dv-full">{active.fullText}</div>}
            <div className="detail-btns">
              <button className="edit-btn" onClick={() => { setEditText(active.fullText); goTo("edit"); }}>수정</button>
              <button className="del-btn" onClick={() => setConfirmId(active.id)}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT */}
      {screen === "edit" && active && (
        <div className="page">
          <div className="top-bar">
            <div className="top-main">
              <button className="back-btn" onClick={goBack}>취소</button>
              <div className="page-label">기사 수정</div>
            </div>
          </div>
          <div className="edit-body">
            <textarea
              className="edit-ta"
              value={editText}
              onChange={e => setEditText(e.target.value)}
              autoFocus
            />
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
            <p className="guide-intro">7개 섹션 기준입니다.</p>
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
