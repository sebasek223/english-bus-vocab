// pages/index.tsx
import { useEffect, useState, useRef } from "react";
import Head from "next/head";
import WordCard from "../components/WordCard";
import { VocabWord } from "./api/generateWords";

export default function Home() {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [level, setLevel] = useState<"B2" | "C1" | "MIXED">("B2");
  const [dailyTarget, setDailyTarget] = useState(10);
  const [learnedToday, setLearnedToday] = useState(0);
  const [streak, setStreak] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [knownWordsCount, setKnownWordsCount] = useState(0);
  const [practicedHistory, setPracticedHistory] = useState<string[]>([]);

  // 5-minute Bus timer state
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 300s = 5 min
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize data from LocalStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const today = new Date().toISOString().split("T")[0];
      const savedDate = localStorage.getItem("vocab_last_date");
      const savedStreak = parseInt(localStorage.getItem("vocab_streak") || "1", 10);
      const savedTarget = parseInt(localStorage.getItem("vocab_target") || "10", 10);
      const savedKnown = JSON.parse(localStorage.getItem("vocab_known_words") || "[]");
      const savedHistory = JSON.parse(localStorage.getItem("vocab_history") || "[]");

      setDailyTarget(savedTarget);
      setPracticedHistory(savedHistory);
      setKnownWordsCount(savedKnown.length);

      if (savedDate === today) {
        setLearnedToday(parseInt(localStorage.getItem("vocab_learned_today") || "0", 10));
        setStreak(savedStreak);
      } else {
        // New day: check if yesterday was completed
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yDateStr = yesterday.toISOString().split("T")[0];

        if (savedDate === yDateStr) {
          // Continuous streak
          setStreak(savedStreak);
        } else if (savedDate) {
          // Missed day
          setStreak(1);
          localStorage.setItem("vocab_streak", "1");
        }
        setLearnedToday(0);
        localStorage.setItem("vocab_learned_today", "0");
        localStorage.setItem("vocab_last_date", today);
      }

      // Load initial words
      fetchWords("B2", savedHistory);
    }
  }, []);

  // 5-minute Timer effect
  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification("🎉 Skvělá práce v autobuse!", {
          body: "Tvých 5 minut angličtiny právě vypršelo. Splnil jsi dnešní trénink!",
          icon: "/icons/icon-192.png",
        });
      } else {
        alert("🎉 5 minut v autobuse vypršelo! Skvělá práce s dnešní slovní zásobou!");
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timerActive, timeLeft]);

  const toggleBusTimer = () => {
    if (!timerActive) {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
      setTimeLeft(300);
      setTimerActive(true);
    } else {
      setTimerActive(false);
      setTimeLeft(300);
    }
  };

  const fetchWords = async (targetLevel = level, history = practicedHistory) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/generateWords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: targetLevel,
          count: 5,
          excludeWords: history,
        }),
      });
      const data: VocabWord[] = await res.json();
      setWords(data);
    } catch (err) {
      console.error("Error fetching words:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKnown = (word: VocabWord) => {
    const today = new Date().toISOString().split("T")[0];
    const newLearned = learnedToday + 1;
    setLearnedToday(newLearned);
    localStorage.setItem("vocab_learned_today", newLearned.toString());
    localStorage.setItem("vocab_last_date", today);

    // Save to known words
    const savedKnown: string[] = JSON.parse(localStorage.getItem("vocab_known_words") || "[]");
    if (!savedKnown.includes(word.text)) {
      savedKnown.push(word.text);
      localStorage.setItem("vocab_known_words", JSON.stringify(savedKnown));
      setKnownWordsCount(savedKnown.length);
    }

    // Save to history to avoid duplicates
    const newHistory = [...practicedHistory, word.text];
    setPracticedHistory(newHistory);
    localStorage.setItem("vocab_history", JSON.stringify(newHistory));

    // Update streak if goal reached
    if (newLearned >= dailyTarget && learnedToday < dailyTarget) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      localStorage.setItem("vocab_streak", newStreak.toString());
    }

    // Remove from active list
    const remaining = words.filter((w) => w.id !== word.id);
    setWords(remaining);
    if (remaining.length === 0) {
      fetchWords(level, newHistory);
    }
  };

  const handleRepeat = (word: VocabWord) => {
    // Put word at the end of the current queue
    setWords((prev) => [...prev.filter((w) => w.id !== word.id), word]);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPercent = Math.min(100, Math.round((learnedToday / dailyTarget) * 100));

  return (
    <>
      <Head>
        <title>BusVocab AI – 5 min denně do kapsy</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
      </Head>

      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "16px", width: "100%" }}>
        {/* Header */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}>
              🚍 BusVocab <span style={{ fontSize: "0.8rem", background: "rgba(99,102,241,0.3)", padding: "2px 8px", borderRadius: "6px", color: "#818cf8" }}>AI B2-C1</span>
            </h1>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8" }}>5 minut denně v autobuse</p>
          </div>
          <div
            style={{
              background: "rgba(245, 158, 11, 0.15)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              padding: "6px 12px",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: "700",
              color: "#fbbf24",
              fontSize: "0.95rem",
            }}
          >
            🔥 {streak} {streak === 1 ? "den" : streak < 5 ? "dny" : "dní"} streak
          </div>
        </header>

        {/* 5-Min Bus Mode Banner */}
        <div
          className="glass-card"
          style={{
            padding: "16px",
            marginBottom: "16px",
            background: timerActive ? "linear-gradient(135deg, rgba(79, 70, 229, 0.4), rgba(30, 41, 59, 0.8))" : "rgba(30, 41, 59, 0.6)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontWeight: "700", fontSize: "1rem", color: "#f8fafc" }}>
              ⏱️ 5 minut jízdy autobusem
            </div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
              {timerActive ? `Zbývá: ${formatTimer(timeLeft)}` : "Spusť rychlou denní lekci"}
            </div>
          </div>
          <button
            onClick={toggleBusTimer}
            className={timerActive ? "btn-secondary" : "btn-primary"}
            style={{ padding: "8px 16px", fontSize: "0.88rem" }}
          >
            {timerActive ? `⏸️ ${formatTimer(timeLeft)}` : "🚀 Start (5 min)"}
          </button>
        </div>

        {/* Daily Goal & Progress Bar */}
        <div className="glass-card" style={{ padding: "16px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: "600" }}>DENNÍ CÍL SLOVÍČEK</span>
            <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "#38bdf8" }}>
              {learnedToday} / {dailyTarget} slov ({progressPercent}%)
            </span>
          </div>
          <div style={{ width: "100%", height: "10px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "9999px", overflow: "hidden" }}>
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                background: "linear-gradient(90deg, #6366f1, #10b981)",
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", fontSize: "0.78rem", color: "#64748b" }}>
            <span>Celkem naučeno: <strong>{knownWordsCount}</strong> slov</span>
            <span>Cíl: <strong>{dailyTarget} slov/den</strong></span>
          </div>
        </div>

        {/* Level Selector & Refresh */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center" }}>
          <button
            onClick={() => { setLevel("B2"); fetchWords("B2"); }}
            className={level === "B2" ? "btn-primary" : "btn-secondary"}
            style={{ flex: 1, padding: "8px 12px", fontSize: "0.85rem" }}
          >
            B2 (Středně pokročilá)
          </button>
          <button
            onClick={() => { setLevel("C1"); fetchWords("C1"); }}
            className={level === "C1" ? "btn-primary" : "btn-secondary"}
            style={{ flex: 1, padding: "8px 12px", fontSize: "0.85rem" }}
          >
            C1 (Pokročilá)
          </button>
          <button
            onClick={() => { setLevel("MIXED"); fetchWords("MIXED"); }}
            className={level === "MIXED" ? "btn-primary" : "btn-secondary"}
            style={{ flex: 1, padding: "8px 12px", fontSize: "0.85rem" }}
          >
            B2 + C1 Mix
          </button>
        </div>

        {/* Cards or Loading State */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🤖✨</div>
            <div style={{ fontWeight: "700", color: "#cbd5e1" }}>Gemini generuje nová {level} slovíčka...</div>
            <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "4px" }}>Vybíráme praktická slova s českým překladem</div>
          </div>
        ) : words.length === 0 ? (
          <div className="glass-card" style={{ textAlign: "center", padding: "30px 20px" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>🎉</div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "8px" }}>Dnešní várka hotova!</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "16px" }}>
              Skvělá práce. Můžeš načíst další sadu nebo si dát pauzu.
            </p>
            <button onClick={() => fetchWords(level)} className="btn-primary">
              ⚡ Načíst dalších 5 slovíček
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {words.map((word) => (
              <WordCard
                key={word.id}
                word={word}
                onKnown={() => handleKnown(word)}
                onRepeat={() => handleRepeat(word)}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <footer style={{ textAlign: "center", marginTop: "32px", paddingBottom: "24px", color: "#64748b", fontSize: "0.78rem" }}>
          BusVocab AI • B2-C1 anglická slovní zásoba • Ideální na cesty
        </footer>
      </div>
    </>
  );
}
