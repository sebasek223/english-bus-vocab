// pages/api/generateWords.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface VocabWord {
  id: string;
  text: string;
  phonetic?: string;
  czechTranslation: string;
  definition: string;
  example: string;
  exampleCzech?: string;
  level: "B2" | "C1";
  theme?: string;
}

const FALLBACK_WORDS: VocabWord[] = [
  {
    id: "fallback_1",
    text: "Resilience",
    phonetic: "/rɪˈzɪl.jəns/",
    czechTranslation: "odolnost, houževnatost",
    definition: "The capacity to recover quickly from difficulties; toughness.",
    example: "Courage and resilience helped her overcome the financial crisis.",
    exampleCzech: "Odvaha a odolnost jí pomohly překonat finanční krizi.",
    level: "B2",
    theme: "Každodenní život"
  },
  {
    id: "fallback_2",
    text: "Meticulous",
    phonetic: "/məˈtɪk.jə.ləs/",
    czechTranslation: "puntičkářský, pečlivý",
    definition: "Showing great attention to detail; very careful and precise.",
    example: "He was meticulous about keeping his research notes organized.",
    exampleCzech: "Byl velmi pečlivý při udržování pořádku ve svých výzkumných poznámkách.",
    level: "C1",
    theme: "Práce a soustředění"
  },
  {
    id: "fallback_3",
    text: "Ubiquitous",
    phonetic: "/juːˈbɪk.wə.təs/",
    czechTranslation: "všudypřítomný",
    definition: "Present, appearing, or found everywhere.",
    example: "Smartphones have become ubiquitous in modern daily life.",
    exampleCzech: "Chytré telefony se v moderním každodenním životě staly všudypřítomnými.",
    level: "C1",
    theme: "Moderní svět"
  },
  {
    id: "fallback_4",
    text: "Substantial",
    phonetic: "/səbˈstæn.ʃəl/",
    czechTranslation: "značný, podstatný",
    definition: "Of considerable importance, size, or worth.",
    example: "They made substantial progress toward achieving their annual goal.",
    exampleCzech: "Dosáhli značného pokroku směrem k dosažení svého ročního cíle.",
    level: "B2",
    theme: "Pokrok a cíle"
  },
  {
    id: "fallback_5",
    text: "Ambiguous",
    phonetic: "/æmˈbɪɡ.ju.əs/",
    czechTranslation: "dvojznačný, nejednoznačný",
    definition: "Open to more than one interpretation; having a double meaning.",
    example: "The instructions were ambiguous, leading to confusion among the team.",
    exampleCzech: "Pokyny byly nejednoznačné, což vedlo ke zmatku v týmu.",
    level: "B2",
    theme: "Komunikace"
  },
  {
    id: "fallback_6",
    text: "Eloquent",
    phonetic: "/ˈel.ə.kwənt/",
    czechTranslation: "výmluvný, kultivovaný v projevu",
    definition: "Fluent or practical in speaking or writing.",
    example: "His eloquent speech inspired everyone in the auditorium.",
    exampleCzech: "Jeho výmluvný projev inspiroval každého v sále.",
    level: "C1",
    theme: "Společnost a řeč"
  }
];

function getSeasonalContext(): string {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();

  if (month === 10 && day >= 20) return "Late October / Halloween / Autumn season (include autumn/mystery/atmosphere or everyday relevant terms)";
  if (month === 10) return "October / Autumn cozy season (nature, mood, work, daily life)";
  if (month === 11) return "November / Late Autumn / Thanksgiving / Cozy indoor vibes";
  if (month === 12) return "December / Winter / Christmas & Festive celebrations / Year-end reflection";
  if (month === 1) return "January / New Year / Resolutions / Fresh starts & Winter routines";
  if (month === 2) return "February / Winter / Valentine's & relationships & focus";
  if (month === 3 || month === 4) return "Spring / Easter / Nature awakening & Fresh energy";
  if (month === 5) return "May / Late Spring / Outdoor adventures & Social life";
  if (month === 6 || month === 7 || month === 8) return "Summer / Travel / Holidays / Sun / Leisure & Road trips";
  if (month === 9) return "September / Back to work & study / Autumn beginnings";
  return "General modern everyday conversational and contextual English";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { count = 5, excludeWords = [] } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    return res.status(200).json(FALLBACK_WORDS.slice(0, count));
  }

  const seasonalContext = getSeasonalContext();

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const prompt = `You are an expert English vocabulary coach for Czech speakers learning on the go (e.g. during a 5-min bus ride).
Generate ${count} engaging English vocabulary words or phrasal verbs, smoothly mixed between B2 (Upper-Intermediate) and C1 (Advanced) levels.

CURRENT SEASONAL & CALENDAR CONTEXT: "${seasonalContext}".
Weave in relevant thematic, seasonal, holiday, atmospheric, or modern practical vocabulary fitting this time of year and everyday life.

Exclude these already practiced words: ${JSON.stringify(excludeWords.slice(-40))}.

For each word, return a JSON array of objects with the following keys:
- "text": English word, idiom, or phrasal verb
- "phonetic": IPA pronunciation (e.g. "/rɪˈzɪl.jəns/")
- "czechTranslation": Natural Czech translation/meaning
- "definition": Clear, concise English definition
- "example": Natural, engaging English example sentence
- "exampleCzech": Czech translation of the example sentence
- "level": Either "B2" or "C1"
- "theme": Short 2-3 word topic in Czech (e.g. "Podzim & Nálada", "Práce & Úspěch", "Cestování", "Svátky", "Společnost")

Output ONLY a valid JSON array of objects, without markdown code fences.`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith("```json")) {
      text = text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (text.startsWith("```")) {
      text = text.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(text);
    const formattedWords: VocabWord[] = parsed.map((item: any) => ({
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      text: item.text,
      phonetic: item.phonetic || "",
      czechTranslation: item.czechTranslation || "",
      definition: item.definition || "",
      example: item.example || "",
      exampleCzech: item.exampleCzech || "",
      level: item.level === "C1" ? "C1" : "B2",
      theme: item.theme || "Slovní zásoba",
    }));

    return res.status(200).json(formattedWords);
  } catch (error: any) {
    console.error("Gemini API error, falling back to offline dictionary:", error?.message || error);
    return res.status(200).json(FALLBACK_WORDS.slice(0, count));
  }
}
