// pages/api/generateWords.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ExamplePair {
  en: string;
  cz: string;
}

export interface VocabWord {
  id: string;
  text: string;
  phonetic?: string;
  czechTranslation: string;
  definition: string;
  collocations: string[]; // e.g. ["build resilience", "emotional resilience"]
  examples: ExamplePair[]; // 2 natural context sentences
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
    collocations: ["build resilience", "emotional resilience", "show great resilience"],
    examples: [
      {
        en: "Courage and resilience helped her overcome the crisis.",
        cz: "Odvaha a odolnost jí pomohly překonat krizi."
      },
      {
        en: "Athletes need mental resilience to compete at the highest level.",
        cz: "Sportovci potřebují psychickou odolnost, aby mohli soutěžit na nejvyšší úrovni."
      }
    ],
    level: "B2",
    theme: "Vytrvalost & Život"
  },
  {
    id: "fallback_2",
    text: "Meticulous",
    phonetic: "/məˈtɪk.jə.ləs/",
    czechTranslation: "puntičkářský, pečlivý",
    definition: "Showing great attention to detail; very careful and precise.",
    collocations: ["meticulous planning", "meticulous attention to detail", "meticulous researcher"],
    examples: [
      {
        en: "He was meticulous about keeping his research notes organized.",
        cz: "Byl velmi pečlivý při udržování pořádku ve svých výzkumných poznámkách."
      },
      {
        en: "The restoration of the old castle requires meticulous work.",
        cz: "Obnova starého hradu vyžaduje precizní a pečlivou práci."
      }
    ],
    level: "C1",
    theme: "Práce & Detail"
  },
  {
    id: "fallback_3",
    text: "Ubiquitous",
    phonetic: "/juːˈbɪk.wə.təs/",
    czechTranslation: "všudypřítomný",
    definition: "Present, appearing, or found everywhere.",
    collocations: ["become ubiquitous", "ubiquitous presence", "ubiquitous technology"],
    examples: [
      {
        en: "Smartphones have become ubiquitous in modern daily life.",
        cz: "Chytré telefony se v moderním životě staly všudypřítomnými."
      },
      {
        en: "Coffee shops are ubiquitous in almost every major European city.",
        cz: "Kavárny jsou všudypřítomné téměř v každém větším evropském městě."
      }
    ],
    level: "C1",
    theme: "Moderní svět"
  },
  {
    id: "fallback_4",
    text: "Substantial",
    phonetic: "/səbˈstæn.ʃəl/",
    czechTranslation: "značný, podstatný",
    definition: "Of considerable importance, size, or worth.",
    collocations: ["substantial progress", "substantial amount", "substantial difference"],
    examples: [
      {
        en: "They made substantial progress toward achieving their annual goal.",
        cz: "Dosáhli značného pokroku směrem k dosažení svého ročního cíle."
      },
      {
        en: "There is a substantial difference between the two approaches.",
        cz: "Mezi oběma přístupy je podstatný rozdíl."
      }
    ],
    level: "B2",
    theme: "Pokrok & Cíle"
  }
];

function getSeasonalContext(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  if (month === 10 && day >= 20) return "Late October / Halloween / Autumn season (atmospheric, cozy, reflective or everyday terms)";
  if (month === 10) return "October / Autumn cozy season (nature, mood, work, daily commute)";
  if (month === 11) return "November / Late Autumn / Thanksgiving & cozy indoor routines";
  if (month === 12) return "December / Winter & Christmas holidays & year-end reflections";
  if (month === 1) return "January / New Year habits & winter focus";
  if (month === 2) return "February / Winter & relationships & persistence";
  if (month === 3 || month === 4) return "Spring & Easter / fresh energy & outdoors";
  if (month === 5) return "May / Late Spring / social life & travel";
  if (month === 6 || month === 7 || month === 8) return "Summer / Travel / Road trips & holidays";
  if (month === 9) return "September / Back to study/work & autumn routines";
  return "General everyday conversational and contextual English";
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

    const prompt = `You are an expert English vocabulary coach for Czech speakers learning on the go.
Generate ${count} engaging English vocabulary words, idioms, or phrasal verbs smoothly mixed between B2 (Upper-Intermediate) and C1 (Advanced) levels.

CURRENT SEASONAL & CALENDAR CONTEXT: "${seasonalContext}".
Include relevant seasonal, atmospheric, everyday conversational, or practical vocabulary.

Exclude these already practiced words: ${JSON.stringify(excludeWords.slice(-40))}.

For each word, return a JSON array of objects with the following keys:
- "text": English word, idiom, or phrasal verb
- "phonetic": IPA pronunciation (e.g. "/rɪˈzɪl.jəns/")
- "czechTranslation": Natural Czech translation/meaning
- "definition": Clear, simple English definition
- "collocations": Array of 2 to 3 common collocations / natural word pairs in English (e.g. ["build resilience", "emotional resilience"])
- "examples": Array of exactly 2 practical contextual sentences. Each item must have:
    - "en": English example sentence
    - "cz": Czech translation of that sentence
- "level": Either "B2" or "C1"
- "theme": Short 2-3 word topic in Czech (e.g. "Podzim & Nálada", "Práce & Úspěch", "Cestování", "Komunikace")

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
      collocations: Array.isArray(item.collocations) ? item.collocations.slice(0, 3) : [],
      examples: Array.isArray(item.examples) && item.examples.length > 0
        ? item.examples.slice(0, 2).map((ex: any) => ({
            en: typeof ex === "string" ? ex : ex.en || "",
            cz: typeof ex === "object" && ex.cz ? ex.cz : "",
          }))
        : [{ en: item.example || "", cz: item.exampleCzech || "" }],
      level: item.level === "C1" ? "C1" : "B2",
      theme: item.theme || "Slovní zásoba",
    }));

    return res.status(200).json(formattedWords);
  } catch (error: any) {
    console.error("Gemini API error, falling back to offline dictionary:", error?.message || error);
    return res.status(200).json(FALLBACK_WORDS.slice(0, count));
  }
}
