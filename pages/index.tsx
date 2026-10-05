// pages/index.tsx
import { useEffect, useState, useRef } from "react";
import Head from "next/head";
import { VocabWord } from "./api/generateWords";

type TabType = "vocab" | "streak" | "progress";

export interface SRSRecord {
  text: string;
  czech: string;
  level: "B2" | "C1";
  phonetic?: string;
  definition?: string;
  collocations?: string[];
  examples?: { en: string; cz: string }[];
  stage: number; // 0: New, 1: 1d, 2: 3d, 3: 7d, 4: 14d, 5: 30d (Mastered)
  nextReviewDate: string; // YYYY-MM-DD
  lastReviewDate: string; // YYYY-MM-DD
  repetitions: number;
}

interface DayData {
  dayName: string;
  dateKey: string;
  count: number;
  isToday: boolean;
}

const SRS_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60];

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// Synthesized triumph fanfare using Web Audio API (works 100% offline)
function playFanfareSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const notes = [
      { freq: 523.25, time: 0.0, dur: 0.12 }, // C5
      { freq: 659.25, time: 0.12, dur: 0.12 }, // E5
      { freq: 783.99, time: 0.24, dur: 0.15 }, // G5
      { freq: 1046.5, time: 0.38, dur: 0.6 }, // C6
      { freq: 1318.51, time: 0.5, dur: 0.7 }, // E6
    ];

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.time);

      gain.gain.setValueAtTime(0, ctx.currentTime + n.time);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + n.time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.time + n.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + n.time);
      osc.stop(ctx.currentTime + n.time + n.dur);
    });
  } catch (e) {
    console.error("Audio fanfare error:", e);
  }
}

export default function Home() {
  const [currentTab, setCurrentTab] = useState<TabType>("vocab");
  const [words, setWords] = useState<VocabWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [dailyTarget, setDailyTarget] = useState(10);
  const [learnedToday, setLearnedToday] = useState(0);
  const [streak, setStreak] = useState(1);
  const [activeDays, setActiveDays] = useState<string[]>([]);
  const [srsRecords, setSrsRecords] = useState<SRSRecord[]>([]);
  const [weeklyHistory, setWeeklyHistory] = useState<{ [dateKey: string]: number }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);

  // Install PWA state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Touch / Drag Swipe state
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFlyingOut, setIsFlyingOut] = useState<"left" | "right" | null>(null);
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const swipeDirectionRef = useRef<"undecided" | "horizontal" | "vertical">("undecided");

  // Load persistence and PWA detection
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);

      window.addEventListener("beforeinstallprompt", (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
      });

      const today = new Date().toISOString().split("T")[0];
      const savedDate = localStorage.getItem("vocab_last_date");
      const savedStreak = parseInt(localStorage.getItem("vocab_streak") || "1", 10);
      const savedTarget = parseInt(localStorage.getItem("vocab_target") || "10", 10);
      const savedSRS: SRSRecord[] = JSON.parse(localStorage.getItem("vocab_srs_records_v1") || "[]");
      const savedDays: string[] = JSON.parse(localStorage.getItem("vocab_active_days") || "[]");
      const savedHistory: { [dateKey: string]: number } = JSON.parse(localStorage.getItem("vocab_daily_counts") || "{}");

      setDailyTarget(savedTarget);
      setSrsRecords(savedSRS);
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

      fetchSmartWordsQueue(savedSRS);
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  // Smart SRS Queue
  const fetchSmartWordsQueue = async (currentSRS = srsRecords) => {
    setIsLoading(true);
    setShowAnswer(false);
    setDragOffset({ x: 0, y: 0 });
    setIsFlyingOut(null);

    const today = new Date().toISOString().split("T")[0];
    const dueWords: SRSRecord[] = currentSRS.filter((r) => r.nextReviewDate <= today);

    const dueVocabWords: VocabWord[] = dueWords.slice(0, 3).map((r) => ({
      id: `srs_${r.text}`,
      text: r.text,
      phonetic: r.phonetic || "",
      czechTranslation: r.czech,
      definition: r.definition || "Opakování podle křivky zapomínání",
      collocations: r.collocations || [],
      examples: r.examples || [],
      level: r.level,
      theme: `⏰ Opakování (${r.stage}. fáze paměti)`,
    }));

    const neededNewCount = Math.max(3, 6 - dueVocabWords.length);
    const excludeList = currentSRS.map((r) => r.text);

    try {
      const res = await fetch("/api/generateWords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: neededNewCount, excludeWords: excludeList }),
      });
      const newAiWords: VocabWord[] = await res.json();
      setWords([...dueVocabWords, ...newAiWords]);
      setCurrentIndex(0);
    } catch (e) {
      console.error(e);
      if (dueVocabWords.length > 0) {
        setWords(dueVocabWords);
        setCurrentIndex(0);
      }
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

  // SRS Update: Move up in memory stages + Trigger Fanfare if daily target reached
  const handleKnown = () => {
    if (!currentWord || isFlyingOut) return;
    setIsFlyingOut("right");

    setTimeout(() => {
      const today = new Date().toISOString().split("T")[0];
      const newLearned = learnedToday + 1;
      setLearnedToday(newLearned);
      localStorage.setItem("vocab_learned_today", newLearned.toString());

      const updatedHistory = { ...weeklyHistory, [today]: newLearned };
      setWeeklyHistory(updatedHistory);
      localStorage.setItem("vocab_daily_counts", JSON.stringify(updatedHistory));

      const existingRecord = srsRecords.find((r) => r.text.toLowerCase() === currentWord.text.toLowerCase());
      const nextStage = existingRecord ? Math.min(5, existingRecord.stage + 1) : 1;
      const intervalDays = SRS_INTERVALS_DAYS[nextStage - 1] || 1;
      const nextReviewDate = addDaysToDate(today, intervalDays);

      const updatedRecord: SRSRecord = {
        text: currentWord.text,
        czech: currentWord.czechTranslation,
        level: currentWord.level,
        phonetic: currentWord.phonetic,
        definition: currentWord.definition,
        collocations: currentWord.collocations,
        examples: currentWord.examples,
        stage: nextStage,
        nextReviewDate,
        lastReviewDate: today,
        repetitions: (existingRecord?.repetitions || 0) + 1,
      };

      const updatedSRSList = [
        ...srsRecords.filter((r) => r.text.toLowerCase() !== currentWord.text.toLowerCase()),
        updatedRecord,
      ];
      setSrsRecords(updatedSRSList);
      localStorage.setItem("vocab_srs_records_v1", JSON.stringify(updatedSRSList));

      // Trigger Celebration Fanfare + Confetti when reaching daily target
      if (newLearned >= dailyTarget && learnedToday < dailyTarget) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        localStorage.setItem("vocab_streak", newStreak.toString());

        // Play fanfare sound and show modal
        playFanfareSound();
        setShowCelebration(true);
      }

      nextCard();
    }, 220);
  };

  const handleRepeat = () => {
    if (!currentWord || isFlyingOut) return;
    setIsFlyingOut("left");

    setTimeout(() => {
      const today = new Date().toISOString().split("T")[0];
      const existingRecord = srsRecords.find((r) => r.text.toLowerCase() === currentWord.text.toLowerCase());
      const resetStage = 0;
      const nextReviewDate = today;

      const resetRecord: SRSRecord = {
        text: currentWord.text,
        czech: currentWord.czechTranslation,
        level: currentWord.level,
        phonetic: currentWord.phonetic,
        definition: currentWord.definition,
        collocations: currentWord.collocations,
        examples: currentWord.examples,
        stage: resetStage,
        nextReviewDate,
        lastReviewDate: today,
        repetitions: (existingRecord?.repetitions || 0) + 1,
      };

      const updatedSRSList = [
        ...srsRecords.filter((r) => r.text.toLowerCase() !== currentWord.text.toLowerCase()),
        resetRecord,
      ];
      setSrsRecords(updatedSRSList);
      localStorage.setItem("vocab_srs_records_v1", JSON.stringify(updatedSRSList));

      setWords((prev) => [...prev.filter((_, i) => i !== currentIndex), currentWord]);
      nextCard(false);
    }, 220);
  };

  const nextCard = (advance = true) => {
    setShowAnswer(false);
    setDragOffset({ x: 0, y: 0 });
    setIsFlyingOut(null);
    if (advance) {
      if (currentIndex + 1 < words.length) {
        setCurrentIndex((i) => i + 1);
      } else {
        fetchSmartWordsQueue();
      }
    }
  };

  // Touch / Drag Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (!currentWord || isFlyingOut) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    touchStartRef.current = { x: clientX, y: clientY };
    swipeDirectionRef.current = "undecided";
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging || !currentWord) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - touchStartRef.current.x;
    const deltaY = clientY - touchStartRef.current.y;

    if (swipeDirectionRef.current === "undecided") {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 8) return;
      swipeDirectionRef.current = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
    }

    if (swipeDirectionRef.current === "vertical") {
      setIsDragging(false);
      setDragOffset({ x: 0, y: 0 });
      return;
    }

    setDragOffset({ x: deltaX, y: 0 });
  };

  const handleTouchEnd = () => {
    if (!isDragging || !currentWord) return;
    setIsDragging(false);

    const threshold = 75;
    if (dragOffset.x > threshold) {
      handleKnown();
    } else if (dragOffset.x < -threshold) {
      handleRepeat();
    } else if (Math.abs(dragOffset.x) < 8 && Math.abs(dragOffset.y) < 8) {
      setShowAnswer((prev) => !prev);
    } else {
      setDragOffset({ x: 0, y: 0 });
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

  const getRank = (count: number) => {
    if (count >= 100) return { title: "C1 Anglický Expert", icon: "👑", color: "#fbbf24" };
    if (count >= 50) return { title: "B2 Pokročilý Mistr", icon: "🥇", color: "#818cf8" };
    if (count >= 20) return { title: "Aktivní Student", icon: "🥈", color: "#38bdf8" };
    return { title: "Začínající Cestovatel", icon: "🥉", color: "#10b981" };
  };

  // SRS Memory Breakdown stats
  const todayStr = new Date().toISOString().split("T")[0];
  const dueTodayCount = srsRecords.filter((r) => r.nextReviewDate <= todayStr).length;
  const shortTermCount = srsRecords.filter((r) => r.stage >= 1 && r.stage <= 2).length;
  const mediumTermCount = srsRecords.filter((r) => r.stage >= 3 && r.stage <= 4).length;
  const masteredCount = srsRecords.filter((r) => r.stage >= 5).length;

  const activeWordRecord = currentWord
    ? srsRecords.find((r) => r.text.toLowerCase() === currentWord.text.toLowerCase())
    : null;
  const currentStage = activeWordRecord ? activeWordRecord.stage : 0;

  const stageLabels = [
    { label: "Nové slovo", icon: "🌱", color: "#38bdf8" },
    { label: "1. fáze (+1 den)", icon: "🌿", color: "#818cf8" },
    { label: "2. fáze (+3 dny)", icon: "🌳", color: "#a855f7" },
    { label: "3. fáze (+7 dní)", icon: "⭐", color: "#f59e0b" },
    { label: "4. fáze (+14 dní)", icon: "💎", color: "#ec4899" },
    { label: "Trvalá paměť", icon: "🏆", color: "#10b981" },
  ];

  const progressPercent = Math.min(100, Math.round((learnedToday / dailyTarget) * 100));
  const chartDays = get7DayChartData();
  const maxBarCount = Math.max(dailyTarget, ...chartDays.map((d) => d.count), 1);
  const userRank = getRank(srsRecords.length);

  // Compute card transform while dragging or flying out
  let cardTransform = "translate3d(0,0,0) rotate(0deg)";
  let cardTransition = isDragging ? "none" : "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease";
  let cardOpacity = 1;

  if (isFlyingOut === "right") {
    cardTransform = "translate3d(500px, 0, 0) rotate(25deg)";
    cardOpacity = 0;
  } else if (isFlyingOut === "left") {
    cardTransform = "translate3d(-500px, 0, 0) rotate(-25deg)";
    cardOpacity = 0;
  } else if (isDragging || dragOffset.x !== 0) {
    const rotation = dragOffset.x / 20;
    cardTransform = `translate3d(${dragOffset.x}px, ${dragOffset.y * 0.4}px, 0) rotate(${rotation}deg)`;
  }

  const isSwipingRight = dragOffset.x > 30;
  const isSwipingLeft = dragOffset.x < -30;

  return (
    <>
      <Head>
        <title>BusVocab AI – English Flashcards</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#090d16" />

        {/* PWA Standalone Fullscreen Meta Tags */}
        <meta name="application-name" content="BusVocab" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BusVocab" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icon.svg" />
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
            background: "linear-gradient(135deg, #0d1b2a, #1a2a40)",
            color: "#fbbf24",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.2rem" }}>🚍</span>
            <span style={{ fontWeight: "800", fontSize: "1.05rem", letterSpacing: "-0.02em" }}>BusVocab</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {!isStandalone && (
              <button
                onClick={handleInstallClick}
                style={{
                  background: "rgba(99, 102, 241, 0.15)",
                  border: "1px solid rgba(99, 102, 241, 0.35)",
                  color: "#a5b4fc",
                  padding: "4px 9px",
                  borderRadius: "20px",
                  fontSize: "0.74rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                📲 Nainstalovat
              </button>
            )}

            <div
              onClick={() => setCurrentTab("streak")}
              style={{
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                color: "#fbbf24",
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "0.8rem",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              🔥 {streak}
            </div>
          </div>
        </header>

        {/* Main Single-Screen Content Area */}
        <main style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
          {/* TAB 1: SLOVÍČKA (SRS Flashcard View) */}
          {currentTab === "vocab" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 0 }}>
              {/* Top Sub-Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div
                  style={{
                    background: "rgba(99, 102, 241, 0.12)",
                    border: "1px solid rgba(99, 102, 241, 0.25)",
                    padding: "3px 9px",
                    borderRadius: "10px",
                    fontSize: "0.74rem",
                    fontWeight: "700",
                    color: "#a5b4fc",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span>{stageLabels[currentStage]?.icon || "✨"}</span>
                  <span>{currentWord?.theme || stageLabels[currentStage]?.label || "B2 & C1 Mix"}</span>
                </div>

                <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: "600" }}>
                  Dnes: <strong style={{ color: "#38bdf8" }}>{learnedToday}/{dailyTarget}</strong>
                </div>
              </div>

              {/* Centered Flashcard with Swipe & Touch gestures */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  touchAction: "pan-y",
                  minHeight: 0,
                }}
              >
                {isLoading ? (
                  <div style={{ textAlign: "center", padding: "20px" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🧠⚡</div>
                    <div style={{ fontWeight: "700", color: "#cbd5e1", fontSize: "0.95rem" }}>Křivka zapomínání počítá...</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>Příprava slov k zopakování a nových výrazů</div>
                  </div>
                ) : !currentWord ? (
                  <div className="glass-panel" style={{ padding: "24px", textAlign: "center", width: "100%" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🎉</div>
                    <div style={{ fontWeight: "800", fontSize: "1.1rem", marginBottom: "6px" }}>Všechna slova pro dnešek hotova!</div>
                    <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: "16px" }}>Paměťové intervaly jsou nastaveny.</p>
                    <button onClick={() => fetchSmartWordsQueue()} className="btn-primary" style={{ padding: "10px 20px", fontSize: "0.88rem" }}>
                      ⚡ Další várka slovíček
                    </button>
                  </div>
                ) : (
                  <div
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={handleTouchStart}
                    onMouseMove={handleTouchMove}
                    onMouseUp={handleTouchEnd}
                    className="glass-panel"
                    style={{
                      width: "100%",
                      height: "100%",
                      padding: "18px 16px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      minHeight: "min(290px, 100%)",
                      maxHeight: "min(560px, 100%)",
                      border: showAnswer ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
                      cursor: "grab",
                      transform: cardTransform,
                      transition: cardTransition,
                      opacity: cardOpacity,
                      position: "relative",
                      userSelect: "none",
                      overflow: "hidden",
                    }}
                  >
                    {/* Swipe Visual Cue Indicators */}
                    {isSwipingRight && (
                      <div
                        style={{
                          position: "absolute",
                          top: "14px",
                          left: "14px",
                          background: "rgba(16, 185, 129, 0.9)",
                          color: "white",
                          fontWeight: "800",
                          padding: "4px 10px",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                          letterSpacing: "0.05em",
                          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)",
                          zIndex: 10,
                        }}
                      >
                        ✅ UMÍM
                      </div>
                    )}
                    {isSwipingLeft && (
                      <div
                        style={{
                          position: "absolute",
                          top: "14px",
                          right: "14px",
                          background: "rgba(245, 158, 11, 0.9)",
                          color: "white",
                          fontWeight: "800",
                          padding: "4px 10px",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                          letterSpacing: "0.05em",
                          boxShadow: "0 4px 12px rgba(245, 158, 11, 0.4)",
                          zIndex: 10,
                        }}
                      >
                        🔄 ZOPAKOVAT
                      </div>
                    )}

                    {/* Level, Memory Stage & Audio */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
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

                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: "700",
                            padding: "3px 7px",
                            borderRadius: "6px",
                            background: "rgba(255, 255, 255, 0.06)",
                            color: stageLabels[currentStage]?.color || "#94a3b8",
                          }}
                        >
                          {stageLabels[currentStage]?.icon} {stageLabels[currentStage]?.label}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio(currentWord.text);
                        }}
                        style={{
                          background: "rgba(255, 255, 255, 0.08)",
                          border: "none",
                          borderRadius: "50%",
                          width: "34px",
                          height: "34px",
                          fontSize: "1rem",
                          cursor: "pointer",
                          color: isPlayingAudio ? "#818cf8" : "#ffffff",
                        }}
                      >
                        🔊
                      </button>
                    </div>

                    {/* Word & Phonetic */}
                    <div style={{ textAlign: "center", margin: "6px 0" }}>
                      <h2 style={{ fontSize: "1.85rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.02em" }}>
                        {currentWord.text}
                      </h2>
                      {currentWord.phonetic && (
                        <div style={{ color: "#94a3b8", fontSize: "0.88rem", fontStyle: "italic", marginTop: "2px" }}>
                          {currentWord.phonetic}
                        </div>
                      )}
                    </div>

                    {/* Answer Reveal Box (Czech + Collocations + 2 Context Examples) */}
                    <div
                      style={{
                        background: showAnswer ? "rgba(99, 102, 241, 0.12)" : "rgba(255, 255, 255, 0.03)",
                        border: showAnswer ? "1px solid rgba(99, 102, 241, 0.3)" : "1px dashed rgba(255, 255, 255, 0.12)",
                        padding: "10px 12px",
                        borderRadius: "12px",
                        maxHeight: "min(320px, 40dvh)",
                        overflowY: "auto",
                        overscrollBehavior: "contain",
                      }}
                      className="no-scrollbar"
                    >
                      {showAnswer ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ fontSize: "1.15rem", fontWeight: "800", color: "#38bdf8" }}>
                            {currentWord.czechTranslation}
                          </div>

                          {currentWord.collocations && currentWord.collocations.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "2px" }}>
                              {currentWord.collocations.map((col, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    background: "rgba(255, 255, 255, 0.08)",
                                    border: "1px solid rgba(255, 255, 255, 0.12)",
                                    padding: "2px 7px",
                                    borderRadius: "6px",
                                    fontSize: "0.72rem",
                                    color: "#a5b4fc",
                                    fontWeight: "600",
                                  }}
                                >
                                  🔗 {col}
                                </span>
                              ))}
                            </div>
                          )}

                          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                            {currentWord.examples && currentWord.examples.map((ex, idx) => (
                              <div
                                key={idx}
                                style={{
                                  background: "rgba(0, 0, 0, 0.25)",
                                  padding: "6px 8px",
                                  borderRadius: "8px",
                                  fontSize: "0.75rem",
                                  lineHeight: "1.35",
                                }}
                              >
                                <div style={{ color: "#38bdf8", fontStyle: "italic" }}>"{ex.en}"</div>
                                {ex.cz && <div style={{ color: "#94a3b8", marginTop: "2px" }}>"{ex.cz}"</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: "center", padding: "8px 0" }}>
                          <div style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: "600" }}>
                            👆 Klepnutím otočíš kartu
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "#475569", marginTop: "2px" }}>
                            nebo potáhni: 👈 Zopakovat | Umím 👉
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: "center", fontSize: "0.7rem", color: "#475569", marginTop: "2px" }}>
                      Karta {currentIndex + 1} z {words.length} • Ebbinghaus SRS Algoritmus
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Card Action Buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                <button
                  disabled={!currentWord || isLoading}
                  onClick={(e)=>{e.stopPropagation(); handleRepeat();}}
                  className="btn-repeat"
                  style={{ padding: "13px", fontSize: "0.88rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff" }}
                >
                  <span>👈</span>
                  <span>🔄 Zopakovat</span>
                </button>
                <button
                  disabled={!currentWord || isLoading}
                  onClick={(e)=>{e.stopPropagation(); handleKnown();}}
                  className="btn-know"
                  style={{ padding: "13px", fontSize: "0.88rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff" }}
                >
                  <span>✅ Umím to</span>
                  <span>👉</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: STREAK & KALENDÁŘ */}
          {currentTab === "streak" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
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
                  Každodenní 5minutové procvičování zabraňuje zapomínání.
                </p>
              </div>

              <div className="glass-panel" style={{ padding: "16px", marginTop: "10px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#f8fafc" }}>
                    📅 Tento měsíc
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Aktivní dny: <strong style={{ color: "#fbbf24" }}>{activeDays.length}</strong>
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", textAlign: "center", fontSize: "0.68rem", color: "#64748b", fontWeight: "700", marginBottom: "4px" }}>
                  <span>PO</span><span>ÚT</span><span>ST</span><span>ČT</span><span>PÁ</span><span>SO</span><span>NE</span>
                </div>

                <div className="calendar-grid">
                  {renderCalendar()}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROGRES & KŘIVKA ZAPOMÍNÁNÍ */}
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
                  <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#ffffff" }}>{srsRecords.length}</div>
                  <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>v SRS systému</div>
                </div>
              </div>

              {/* Spaced Repetition Breakdown */}
              <div className="glass-panel" style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "0.9rem" }}>🧠</span>
                    <span style={{ fontSize: "0.82rem", fontWeight: "700", color: "#f8fafc" }}>Křivka zapomínání (SRS)</span>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "#38bdf8", fontWeight: "700" }}>
                    Dnes k zopakov.: {dueTodayCount}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", textAlign: "center" }}>
                  <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "8px 4px", borderRadius: "10px", border: dueTodayCount > 0 ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ fontSize: "1rem", fontWeight: "800", color: dueTodayCount > 0 ? "#fbbf24" : "#94a3b8" }}>{dueTodayCount}</div>
                    <div style={{ fontSize: "0.62rem", color: "#94a3b8", marginTop: "2px" }}>⏰ K revizi</div>
                  </div>

                  <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "8px 4px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ fontSize: "1rem", fontWeight: "800", color: "#818cf8" }}>{shortTermCount}</div>
                    <div style={{ fontSize: "0.62rem", color: "#94a3b8", marginTop: "2px" }}>🌱 1–3 dny</div>
                  </div>

                  <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "8px 4px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ fontSize: "1rem", fontWeight: "800", color: "#f59e0b" }}>{mediumTermCount}</div>
                    <div style={{ fontSize: "0.62rem", color: "#94a3b8", marginTop: "2px" }}>🌿 7–14 dní</div>
                  </div>

                  <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "8px 4px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ fontSize: "1rem", fontWeight: "800", color: "#10b981" }}>{masteredCount}</div>
                    <div style={{ fontSize: "0.62rem", color: "#94a3b8", marginTop: "2px" }}>🏆 Trvalá</div>
                  </div>
                </div>
              </div>

              {/* 7-Day Activity Chart */}
              <div className="glass-panel" style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "#f8fafc" }}>📈 Aktivita za 7 dní</span>
                  <span style={{ fontSize: "0.7rem", color: "#38bdf8", fontWeight: "700" }}>Cíl: {dailyTarget} slov/den</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", alignItems: "flex-end", height: "65px" }}>
                  {chartDays.map((d, i) => {
                    const heightPercent = Math.max(12, Math.min(100, Math.round((d.count / maxBarCount) * 100)));
                    const isSuccess = d.count >= dailyTarget;

                    return (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                        <span style={{ fontSize: "0.62rem", fontWeight: "700", color: d.count > 0 ? (isSuccess ? "#10b981" : "#818cf8") : "#475569", marginBottom: "3px" }}>
                          {d.count > 0 ? d.count : "0"}
                        </span>
                        <div
                          style={{
                            width: "100%",
                            height: `${heightPercent}%`,
                            borderRadius: "5px",
                            background: d.count === 0
                              ? "rgba(255, 255, 255, 0.05)"
                              : d.isToday
                              ? "linear-gradient(180deg, #38bdf8, #6366f1)"
                              : isSuccess
                              ? "linear-gradient(180deg, #10b981, #059669)"
                              : "linear-gradient(180deg, #818cf8, #4f46e5)",
                            transition: "height 0.4s ease",
                          }}
                        />
                        <span style={{ fontSize: "0.65rem", marginTop: "4px", fontWeight: d.isToday ? "800" : "600", color: d.isToday ? "#38bdf8" : "#64748b" }}>
                          {d.dayName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Learned Words Mini List */}
              <div className="glass-panel no-scrollbar" style={{ flex: 1, padding: "10px 12px", overflowY: "auto", minHeight: "60px" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: "700", marginBottom: "6px", color: "#94a3b8" }}>
                  SLOVNÍK & PAMĚŤOVÉ FÁZE ({srsRecords.length})
                </div>
                {srsRecords.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#64748b", fontSize: "0.78rem", padding: "10px" }}>
                    Zatím jsi nezačal procvičovat.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {srsRecords.slice().reverse().map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "5px 8px",
                          background: "rgba(255, 255, 255, 0.03)",
                          borderRadius: "8px",
                          fontSize: "0.76rem",
                        }}
                      >
                        <div>
                          <strong style={{ color: "#ffffff" }}>{item.text}</strong>
                          <span style={{ color: "#64748b", marginLeft: "6px" }}>• {item.czech}</span>
                        </div>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <span style={{ fontSize: "0.62rem", color: stageLabels[item.stage]?.color || "#94a3b8", fontWeight: "700" }}>
                            {stageLabels[item.stage]?.icon} Fáze {item.stage}
                          </span>
                          <span style={{ fontSize: "0.62rem", fontWeight: "700", color: item.level === "C1" ? "#fbbf24" : "#818cf8" }}>
                            {item.level}
                          </span>
                        </div>
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

        {/* Celebratory Daily Streak Modal with Fanfare + Confetti */}
        {showCelebration && (
          <div
            onClick={() => setShowCelebration(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.82)",
              backdropFilter: "blur(12px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              zIndex: 200,
              animation: "fadeIn 0.3s ease",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="glass-panel"
              style={{
                maxWidth: "360px",
                width: "100%",
                padding: "28px 20px",
                textAlign: "center",
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(18, 24, 38, 0.95))",
                border: "2px solid rgba(245, 158, 11, 0.6)",
                boxShadow: "0 0 50px rgba(245, 158, 11, 0.4)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Confetti particles */}
              <div style={{ position: "absolute", top: "10px", left: "15px", fontSize: "1.4rem" }}>🎉</div>
              <div style={{ position: "absolute", top: "15px", right: "20px", fontSize: "1.4rem" }}>✨</div>
              <div style={{ position: "absolute", bottom: "20px", left: "20px", fontSize: "1.2rem" }}>🎊</div>
              <div style={{ position: "absolute", bottom: "25px", right: "15px", fontSize: "1.2rem" }}>⭐</div>

              <div style={{ fontSize: "3.5rem", marginBottom: "4px", filter: "drop-shadow(0 0 15px rgba(245, 158, 11, 0.6))" }}>
                🔥
              </div>

              <h2 style={{ fontSize: "1.6rem", fontWeight: "900", color: "#fbbf24", marginBottom: "6px", letterSpacing: "-0.02em" }}>
                DENNÍ STREAK SPLNĚN!
              </h2>

              <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#ffffff", marginBottom: "10px" }}>
                Tvůj streak je teď <span style={{ color: "#fbbf24", fontSize: "1.3rem" }}>{streak} {streak === 1 ? "den" : streak < 5 ? "dny" : "dní"}</span> v řadě!
              </div>

              <p style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: "1.5", marginBottom: "22px" }}>
                Skvělá práce v autobuse! 🚍 Dnešní cíl {dailyTarget} slovíček máš úspěšně v kapse.
              </p>

              <button
                onClick={() => setShowCelebration(false)}
                className="btn-primary"
                style={{
                  width: "100%",
                  padding: "13px",
                  fontSize: "0.95rem",
                  fontWeight: "800",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  boxShadow: "0 4px 20px rgba(245, 158, 11, 0.4)",
                }}
              >
                Paráda, pokračovat! 🚀
              </button>
            </div>
          </div>
        )}

        {/* In-App Install Guide Modal */}
        {showInstallModal && (
          <div
            onClick={() => setShowInstallModal(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              zIndex: 100,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="glass-panel"
              style={{
                maxWidth: "360px",
                width: "100%",
                padding: "24px",
                textAlign: "center",
                border: "1px solid rgba(99, 102, 241, 0.4)",
              }}
            >
              <div style={{ fontSize: "2.4rem", marginBottom: "8px" }}>📲</div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: "800", color: "#ffffff", marginBottom: "10px" }}>
                Jak spustit bez URL řádku
              </h3>
              <div style={{ textAlign: "left", fontSize: "0.84rem", color: "#cbd5e1", lineHeight: "1.6", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "18px" }}>
                <div>
                  <strong>🍏 Na iPhone (Safari):</strong>
                  <br />
                  1. Dole klepni na tlačítko <strong>Sdílet</strong> (čtvereček se šipkou nahoru ⬆️).
                  <br />
                  2. Sjeď dolů a vyber <strong>„Přidat na plochu“</strong>.
                </div>
                <div>
                  <strong>🤖 Na Androidu (Chrome):</strong>
                  <br />
                  1. Nahoře klepni na <strong>tři tečky ⋮</strong>.
                  <br />
                  2. Zvol <strong>„Přidat na plochu“</strong> nebo <strong>„Instalovat aplikaci“</strong>.
                </div>
              </div>
              <button
                onClick={() => setShowInstallModal(false)}
                className="btn-primary"
                style={{ width: "100%", padding: "10px", fontSize: "0.9rem" }}
              >
                Rozumím 👍
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
