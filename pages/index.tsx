// pages/index.tsx
import { useEffect, useState } from "react";
import Head from "next/head";
import { VocabWord } from "./api/generateWords";

type TabType = "vocab" | "streak" | "progress";

interface DayData {
  dayName: string;
  dateKey: string;
  count: number;
  isToday: boolean;
}

export default function Home() {
  const [currentTab, setCurrentTab] = useState<TabType>("vocab");
  const [words, setWords] = useState<VocabWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [level, setLevel] = useState<"B2" | "C1" | "MIXED">("B2");
  const [dailyTarget, setDailyTarget] = useState(10);
  const [learnedToday, setLearnedToday] = useState(0);
  const [streak, setStreak] = useState(1);
  const [activeDays, setActiveDays] = useState<string[]>([]);
  const [knownWords, setKnownWords] = useState<{ text: string; czech: string; level: string }[]>([]);
  const [weeklyHistory, setWeeklyHistory] = useState<{ [dateKey: string]: number }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Load persistence
  useEffect(() => {
    if (typeof window !== "undefined") {
      const today = new Date().toISOString().split("T")[0];
      const savedDate = localStorage.getItem("vocab_last_date");
      const savedStreak = parseInt(localStorage.getItem("vocab_streak") || "1", 10);
      const savedTarget = parseInt(localStorage.getItem("vocab_target") || "10", 10);
      const savedKnown = JSON.parse(localStorage.getItem("vocab_known_words_v2") || "[]");
      const savedDays: string[] = JSON.parse(localStorage.getItem("vocab_active_days") || "[]");
      const savedHistory: { [dateKey: string]: number } = JSON.parse(localStorage.getItem("vocab_daily_counts") || "{}");

      setDailyTarget(savedTarget);
      setKnownWords(savedKnown);
      setWeeklyHistory(savedHistory);

      let currentActiveDays = savedDays;
      if (!currentActiveDays.includes(today)) {
        currentActiveDays = [...currentActiveDays, today];
        localStorage.setItem("vocab_active_days", JSON.stringify(currentActiveDays));
      }
      setActiveDays(currentActiveDays);

      if (savedDate === today) {
        const todayCount = parseInt(localStorage.getItem("vocab_learned_today") || "0", 10);
        setLearnedToday(todayCount);
        setStreak(savedStreak);
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yDateStr = yesterday.toISOString().split("T")[0];

        if (savedDate === yDateStr) {
          setStreak(savedStreak);
        } else if (savedDate) {
          setStreak(1);
          localStorage.setItem("vocab_streak", "1");
        }
        setLearnedToday(0);
        localStorage.setItem("vocab_learned_today", "0");
        localStorage.setItem("vocab_last_date", today);
      }

      fetchWords("B2");
    }
  }, []);

  const fetchWords = async (targetLevel = level) => {
    setIsLoading(true);
    setShowAnswer(false);
    try {
      const exclude = knownWords.map((w) => w.text);
      const res = await fetch("/api/generateWords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: targetLevel, count: 6, excludeWords: exclude }),
      });
      const data: VocabWord[] = await res.json();
      setWords(data);
      setCurrentIndex(0);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const currentWord = words[currentIndex];

  const playAudio = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 0.9;
      setIsPlayingAudio(true);
      u.onend = () => setIsPlayingAudio(false);
      u.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(u);
    }
  };

  const handleKnown = () => {
    if (!currentWord) return;
    const today = new Date().toISOString().split("T")[0];
    const newLearned = learnedToday + 1;
    setLearnedToday(newLearned);
    localStorage.setItem("vocab_learned_today", newLearned.toString());

    // Update daily history for charts
    const updatedHistory = { ...weeklyHistory, [today]: newLearned };
    setWeeklyHistory(updatedHistory);
    localStorage.setItem("vocab_daily_counts", JSON.stringify(updatedHistory));

    // Add to known
    const updatedKnown = [
      ...knownWords.filter((w) => w.text !== currentWord.text),
      { text: currentWord.text, czech: currentWord.czechTranslation, level: currentWord.level },
    ];
    setKnownWords(updatedKnown);
    localStorage.setItem("vocab_known_words_v2", JSON.stringify(updatedKnown));

    if (newLearned >= dailyTarget && learnedToday < dailyTarget) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      localStorage.setItem("vocab_streak", newStreak.toString());
    }

    nextCard();
  };

  const handleRepeat = () => {
    if (!currentWord) return;
    setWords((prev) => [...prev.filter((_, i) => i !== currentIndex), currentWord]);
    setShowAnswer(false);
  };

  const nextCard = () => {
    setShowAnswer(false);
    if (currentIndex + 1 < words.length) {
      setCurrentIndex((i) => i + 1);
    } else {
      fetchWords(level);
    }
  };

  // Generate 7-day chart data
  const get7DayChartData = (): DayData[] => {
    const dayNames = ["NE", "PO", "ÚT", "ST", "ČT", "PÁ", "SO"];
    const result: DayData[] = [];
    const todayStr = new Date().toISOString().split("T")[0];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      const dayName = i === 0 ? "Dnes" : dayNames[d.getDay()];
      const count = dateKey === todayStr ? learnedToday : (weeklyHistory[dateKey] || 0);

      result.push({
        dayName,
        dateKey,
        count,
        isToday: i === 0,
      });
    }
    return result;
  };

  // Calendar generation for current month
  const renderCalendar = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayNum = now.getDate();

    const shiftedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    const cells = [];

    for (let i = 0; i < shiftedFirstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="cal-day" style={{ opacity: 0.2 }}></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = (month + 1 < 10 ? "0" : "") + (month + 1);
      const dayStr = (d < 10 ? "0" : "") + d;
      const dateKey = `${year}-${monthStr}-${dayStr}`;
      const isActive = activeDays.includes(dateKey);
      const isToday = d === todayNum;

      cells.push(
        <div key={dateKey} className={`cal-day ${isActive ? "active" : ""} ${isToday ? "today" : ""}`}>
          <span>{d}</span>
          {isActive && <span style={{ fontSize: "0.65rem", marginTop: "-2px" }}>🔥</span>}
        </div>
      );
    }
    return cells;
  };

  // Rank determination based on total words learned
  const getRank = (count: number) => {
    if (count >= 100) return { title: "C1 Anglický Expert", icon: "👑", color: "#fbbf24" };
    if (count >= 50) return { title: "B2 Pokročilý Mistr", icon: "🥇", color: "#818cf8" };
    if (count >= 20) return { title: "Aktivní Student", icon: "🥈", color: "#38bdf8" };
    return { title: "Začínající Cestovatel", icon: "🥉", color: "#10b981" };
  };

  const progressPercent = Math.min(100, Math.round((learnedToday / dailyTarget) * 100));
  const chartDays = get7DayChartData();
  const maxBarCount = Math.max(dailyTarget, ...chartDays.map((d) => d.count), 1);
  const userRank = getRank(knownWords.length);

  return (
    <>
      <Head>
        <title>BusVocab AI – Minimalist English</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#090d16" />
      </Head>

      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", maxWidth: "480px", margin: "0 auto", width: "100%" }}>
        {/* Top Minimal Header */}
        <header
          style={{
            padding: "12px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.2rem" }}>🚍</span>
            <span style={{ fontWeight: "800", fontSize: "1.05rem", letterSpacing: "-0.02em" }}>BusVocab</span>
          </div>

          <div
            onClick={() => setCurrentTab("streak")}
            style={{
              background: "rgba(245, 158, 11, 0.15)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              color: "#fbbf24",
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "0.82rem",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            🔥 {streak} {streak === 1 ? "den" : streak < 5 ? "dny" : "dní"}
          </div>
        </header>

        {/* Main Single-Screen Content Area */}
        <main style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
          {/* TAB 1: SLOVÍČKA (Single Flashcard View) */}
          {currentTab === "vocab" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              {/* Top controls: Level switcher & Progress text */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.06)", borderRadius: "10px", padding: "2px" }}>
                  {(["B2", "C1", "MIXED"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => {
                        setLevel(lvl);
                        fetchWords(lvl);
                      }}
                      style={{
                        background: level === lvl ? "#6366f1" : "transparent",
                        color: level === lvl ? "#ffffff" : "#94a3b8",
                        border: "none",
                        padding: "5px 12px",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: "600" }}>
                  Dnes: <strong style={{ color: "#38bdf8" }}>{learnedToday}/{dailyTarget}</strong>
                </div>
              </div>

              {/* Centered Flashcard */}
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isLoading ? (
                  <div style={{ textAlign: "center", padding: "20px" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🤖✨</div>
                    <div style={{ fontWeight: "700", color: "#cbd5e1", fontSize: "0.95rem" }}>Generuji {level} slovíčka...</div>
                  </div>
                ) : !currentWord ? (
                  <div className="glass-panel" style={{ padding: "24px", textAlign: "center", width: "100%" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🎉</div>
                    <div style={{ fontWeight: "800", fontSize: "1.1rem", marginBottom: "6px" }}>Kolo dokončeno!</div>
                    <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: "16px" }}>Skvělá práce.</p>
                    <button onClick={() => fetchWords(level)} className="btn-primary" style={{ padding: "10px 20px", fontSize: "0.88rem" }}>
                      ⚡ Dalších 5 slovíček
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => setShowAnswer(!showAnswer)}
                    className="glass-panel"
                    style={{
                      width: "100%",
                      padding: "22px 18px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      minHeight: "260px",
                      maxHeight: "360px",
                      border: showAnswer ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {/* Level & Audio */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: "800",
                          padding: "3px 9px",
                          borderRadius: "6px",
                          background: currentWord.level === "C1" ? "rgba(245, 158, 11, 0.2)" : "rgba(99, 102, 241, 0.2)",
                          color: currentWord.level === "C1" ? "#fbbf24" : "#818cf8",
                        }}
                      >
                        {currentWord.level}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio(currentWord.text);
                        }}
                        style={{
                          background: "rgba(255, 255, 255, 0.08)",
                          border: "none",
                          borderRadius: "50%",
                          width: "36px",
                          height: "36px",
                          fontSize: "1.05rem",
                          cursor: "pointer",
                          color: isPlayingAudio ? "#818cf8" : "#ffffff",
                        }}
                      >
                        🔊
                      </button>
                    </div>

                    {/* Word & Phonetic */}
                    <div style={{ textAlign: "center", margin: "10px 0" }}>
                      <h2 style={{ fontSize: "1.9rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.02em" }}>
                        {currentWord.text}
                      </h2>
                      {currentWord.phonetic && (
                        <div style={{ color: "#94a3b8", fontSize: "0.9rem", fontStyle: "italic", marginTop: "2px" }}>
                          {currentWord.phonetic}
                        </div>
                      )}
                    </div>

                    {/* Answer Reveal Box */}
                    <div
                      style={{
                        background: showAnswer ? "rgba(99, 102, 241, 0.12)" : "rgba(255, 255, 255, 0.03)",
                        border: showAnswer ? "1px solid rgba(99, 102, 241, 0.3)" : "1px dashed rgba(255, 255, 255, 0.12)",
                        padding: "12px",
                        borderRadius: "14px",
                        textAlign: "center",
                      }}
                    >
                      {showAnswer ? (
                        <div>
                          <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#f8fafc", marginBottom: "4px" }}>
                            🇨🇿 {currentWord.czechTranslation}
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "#38bdf8", fontStyle: "italic", marginTop: "4px" }}>
                            "{currentWord.example}"
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: "600" }}>
                          👆 Klepnutím zobrazíš český překlad
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: "center", fontSize: "0.72rem", color: "#475569", marginTop: "4px" }}>
                      Karta {currentIndex + 1} z {words.length}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Card Action Buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "12px" }}>
                <button
                  disabled={!currentWord || isLoading}
                  onClick={handleRepeat}
                  className="btn-repeat"
                  style={{ padding: "14px", fontSize: "0.9rem" }}
                >
                  🔄 Zopakovat
                </button>
                <button
                  disabled={!currentWord || isLoading}
                  onClick={handleKnown}
                  className="btn-know"
                  style={{ padding: "14px", fontSize: "0.9rem" }}
                >
                  ✅ Umím to
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: STREAK & KALENDÁŘ */}
          {currentTab === "streak" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              {/* Streak Highlight Card */}
              <div
                className="glass-panel"
                style={{
                  padding: "18px",
                  textAlign: "center",
                  background: "linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(18, 24, 38, 0.9))",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                }}
              >
                <div style={{ fontSize: "2.6rem", marginBottom: "2px" }}>🔥</div>
                <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "#fbbf24" }}>
                  {streak} {streak === 1 ? "den" : streak < 5 ? "dny" : "dní"} v řadě
                </div>
                <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: "2px" }}>
                  Skvělý návyk! Každodenní procvičování funguje nejlépe.
                </p>
              </div>

              {/* Calendar Grid */}
              <div className="glass-panel" style={{ padding: "16px", marginTop: "10px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#f8fafc" }}>
                    📅 Tento měsíc
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Aktivní dny: <strong style={{ color: "#fbbf24" }}>{activeDays.length}</strong>
                  </span>
                </div>

                {/* Day of Week Headers */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", textAlign: "center", fontSize: "0.68rem", color: "#64748b", fontWeight: "700", marginBottom: "4px" }}>
                  <span>PO</span><span>ÚT</span><span>ST</span><span>ČT</span><span>PÁ</span><span>SO</span><span>NE</span>
                </div>

                <div className="calendar-grid">
                  {renderCalendar()}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROGRES & STATISTICKÝ GRAF */}
          {currentTab === "progress" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", overflow: "hidden" }}>
              {/* Rank & Level Badge */}
              <div
                className="glass-panel"
                style={{
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(18, 24, 38, 0.8))",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "1.6rem" }}>{userRank.icon}</span>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>Tvoje Úroveň</div>
                    <div style={{ fontSize: "0.95rem", fontWeight: "800", color: userRank.color }}>{userRank.title}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#ffffff" }}>{knownWords.length}</div>
                  <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>slov celkem</div>
                </div>
              </div>

              {/* 7-Day Activity Chart (Minimalist Bar Graph) */}
              <div className="glass-panel" style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "0.9rem" }}>📈</span>
                    <span style={{ fontSize: "0.82rem", fontWeight: "700", color: "#f8fafc" }}>Aktivita za 7 dní</span>
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "#38bdf8", fontWeight: "700" }}>
                    Cíl: {dailyTarget} slov/den
                  </span>
                </div>

                {/* Visual Bars */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px", alignItems: "flex-end", height: "80px", paddingBottom: "4px" }}>
                  {chartDays.map((d, i) => {
                    const heightPercent = Math.max(12, Math.min(100, Math.round((d.count / maxBarCount) * 100)));
                    const isSuccess = d.count >= dailyTarget;

                    return (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                        <span style={{ fontSize: "0.65rem", fontWeight: "700", color: d.count > 0 ? (isSuccess ? "#10b981" : "#818cf8") : "#475569", marginBottom: "4px" }}>
                          {d.count > 0 ? d.count : "0"}
                        </span>
                        <div
                          style={{
                            width: "100%",
                            height: `${heightPercent}%`,
                            borderRadius: "6px",
                            background: d.count === 0
                              ? "rgba(255, 255, 255, 0.05)"
                              : d.isToday
                              ? "linear-gradient(180deg, #38bdf8, #6366f1)"
                              : isSuccess
                              ? "linear-gradient(180deg, #10b981, #059669)"
                              : "linear-gradient(180deg, #818cf8, #4f46e5)",
                            boxShadow: d.count > 0 ? "0 2px 8px rgba(99, 102, 241, 0.3)" : "none",
                            transition: "height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                          }}
                        />
                        <span
                          style={{
                            fontSize: "0.68rem",
                            marginTop: "6px",
                            fontWeight: d.isToday ? "800" : "600",
                            color: d.isToday ? "#38bdf8" : "#64748b",
                          }}
                        >
                          {d.dayName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Motivational Insight Pill */}
              <div
                style={{
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px dashed rgba(245, 158, 11, 0.3)",
                  borderRadius: "12px",
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "0.76rem",
                  color: "#fde68a",
                }}
              >
                <span>💡</span>
                <span>Při 10 slovech denně v autobuse zvládneš <strong>+300 slov za měsíc!</strong></span>
              </div>

              {/* Learned Words Mini List */}
              <div className="glass-panel no-scrollbar" style={{ flex: 1, padding: "12px", overflowY: "auto", minHeight: "80px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: "700", marginBottom: "6px", color: "#94a3b8" }}>
                  NAUČENÁ SLOVÍČKA ({knownWords.length})
                </div>
                {knownWords.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#64748b", fontSize: "0.78rem", padding: "12px" }}>
                    Zatím jsi neoznačil žádné slovo.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                    {knownWords.slice().reverse().map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "6px 8px",
                          background: "rgba(255, 255, 255, 0.03)",
                          borderRadius: "8px",
                          fontSize: "0.78rem",
                        }}
                      >
                        <div>
                          <strong style={{ color: "#ffffff" }}>{item.text}</strong>
                          <span style={{ color: "#64748b", marginLeft: "6px" }}>• {item.czech}</span>
                        </div>
                        <span style={{ fontSize: "0.65rem", fontWeight: "700", color: item.level === "C1" ? "#fbbf24" : "#818cf8" }}>
                          {item.level}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Bottom Tab Navigation Bar */}
        <nav
          style={{
            height: "64px",
            background: "rgba(10, 14, 24, 0.95)",
            backdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            padding: "4px 8px",
          }}
        >
          <button
            onClick={() => setCurrentTab("vocab")}
            className={`tab-btn ${currentTab === "vocab" ? "active" : ""}`}
          >
            <span className="tab-icon">📚</span>
            <span>Slovíčka</span>
          </button>

          <button
            onClick={() => setCurrentTab("streak")}
            className={`tab-btn ${currentTab === "streak" ? "active" : ""}`}
          >
            <span className="tab-icon">🔥</span>
            <span>Streak</span>
          </button>

          <button
            onClick={() => setCurrentTab("progress")}
            className={`tab-btn ${currentTab === "progress" ? "active" : ""}`}
          >
            <span className="tab-icon">📊</span>
            <span>Progres</span>
          </button>
        </nav>
      </div>
    </>
  );
}
