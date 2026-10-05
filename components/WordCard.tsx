// components/WordCard.tsx
import React, { useState } from "react";
import { VocabWord } from "../pages/api/generateWords";

interface WordCardProps {
  word: VocabWord;
  onKnown: () => void;
  onRepeat: () => void;
}

export default function WordCard({ word, onKnown, onRepeat }: WordCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const playPronunciation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word.text);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div
      onClick={() => setShowDetails(!showDetails)}
      className="glass-card"
      style={{
        padding: "20px",
        cursor: "pointer",
        position: "relative",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        border: showDetails ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
        transform: showDetails ? "scale(1.01)" : "scale(1)",
      }}
    >
      {/* Header with Level & Audio */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <span className={`badge-level ${word.level === "C1" ? "badge-c1" : "badge-b2"}`}>
          {word.level}
        </span>
        <button
          onClick={playPronunciation}
          aria-label="Poslechnout výslovnost"
          title="Poslechnout výslovnost"
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            border: "none",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            color: isPlayingAudio ? "#818cf8" : "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "1.1rem",
            transition: "all 0.2s ease",
          }}
        >
          🔊
        </button>
      </div>

      {/* English Word & Phonetics */}
      <div style={{ marginBottom: "14px" }}>
        <h3 style={{ fontSize: "1.6rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.02em" }}>
          {word.text}
        </h3>
        {word.phonetic && (
          <div style={{ fontSize: "0.9rem", color: "#94a3b8", fontStyle: "italic", marginTop: "2px" }}>
            {word.phonetic}
          </div>
        )}
      </div>

      {/* Czech Translation (Tap to reveal or always highlighted) */}
      <div
        style={{
          background: showDetails ? "rgba(79, 70, 229, 0.15)" : "rgba(255, 255, 255, 0.05)",
          padding: "12px 14px",
          borderRadius: "12px",
          marginBottom: "14px",
          border: showDetails ? "1px solid rgba(99, 102, 241, 0.3)" : "1px dashed rgba(255, 255, 255, 0.15)",
          transition: "all 0.2s ease",
        }}
      >
        <div style={{ fontSize: "0.75rem", color: "#a5b4fc", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>
          🇨🇿 Český překlad {showDetails ? "" : "(klepnutím odhalíš detaily)"}
        </div>
        <div style={{ fontSize: "1.15rem", fontWeight: "700", color: "#f1f5f9" }}>
          {word.czechTranslation}
        </div>
      </div>

      {/* Detailed Definition & Examples (Revealed on click) */}
      {showDetails && (
        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.92rem", lineHeight: "1.4" }}>
          <div>
            <div style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: "600" }}>DEFINICE:</div>
            <div style={{ color: "#e2e8f0" }}>{word.definition}</div>
          </div>
          <div style={{ background: "rgba(0, 0, 0, 0.2)", padding: "10px", borderRadius: "8px" }}>
            <div style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: "600" }}>PŘÍKLAD V VĚTĚ:</div>
            <div style={{ color: "#38bdf8", fontStyle: "italic" }}>"{word.example}"</div>
            {word.exampleCzech && (
              <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "4px" }}>
                "{word.exampleCzech}"
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          marginTop: "16px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onRepeat}
          className="btn-secondary"
          style={{ padding: "10px 14px", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
        >
          🔄 Zopakovat
        </button>
        <button
          onClick={onKnown}
          className="btn-success"
          style={{ padding: "10px 14px", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
        >
          ✅ Umím to
        </button>
      </div>
    </div>
  );
}
