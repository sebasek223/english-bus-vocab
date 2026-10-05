// pages/api/generateWords.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ReviewDirection } from "../../lib/learning";

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
  direction?: ReviewDirection;
  reviewStage?: number;
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
  },
  {
    id: "fallback_5",
    text: "Commute",
    phonetic: "/kəˈmjuːt/",
    czechTranslation: "dojíždět, dojíždění",
    definition: "To travel regularly between home and work or school.",
    collocations: ["daily commute", "commute to work", "long commute"],
    examples: [
      { en: "She commutes to work by train every morning.", cz: "Každé ráno dojíždí do práce vlakem." },
      { en: "A shorter commute would give him more time with his family.", cz: "Kratší dojíždění by mu dalo více času na rodinu." }
    ],
    level: "B2",
    theme: "Cestování"
  },
  {
    id: "fallback_6",
    text: "Affordable",
    phonetic: "/əˈfɔːr.də.bəl/",
    czechTranslation: "cenově dostupný",
    definition: "Not too expensive for most people to buy or use.",
    collocations: ["affordable housing", "reasonably affordable", "affordable price"],
    examples: [
      { en: "The town offers affordable housing for young families.", cz: "Město nabízí cenově dostupné bydlení pro mladé rodiny." },
      { en: "They found an affordable hotel near the station.", cz: "Našli cenově dostupný hotel poblíž nádraží." }
    ],
    level: "B2",
    theme: "Peníze"
  },
  {
    id: "fallback_7",
    text: "Nourishing",
    phonetic: "/ˈnɜːr.ɪ.ʃɪŋ/",
    czechTranslation: "výživný, posilující",
    definition: "Providing the food or care needed to stay healthy and strong.",
    collocations: ["nourishing meal", "nourishing food", "highly nourishing"],
    examples: [
      { en: "A nourishing breakfast helped them stay focused all morning.", cz: "Výživná snídaně jim pomohla soustředit se celé dopoledne." },
      { en: "The soup was warm, nourishing, and easy to prepare.", cz: "Polévka byla teplá, výživná a snadná na přípravu." }
    ],
    level: "C1",
    theme: "Jídlo & Zdraví"
  },
  {
    id: "fallback_8",
    text: "Stumble upon",
    phonetic: "/ˈstʌm.bəl əˌpɑːn/",
    czechTranslation: "náhodou narazit na",
    definition: "To find something unexpectedly or by chance.",
    collocations: ["stumble upon an idea", "stumble upon a place", "unexpectedly stumble upon"],
    examples: [
      { en: "We stumbled upon a quiet café while exploring the old town.", cz: "Při procházení starého města jsme náhodou narazili na klidnou kavárnu." },
      { en: "She stumbled upon an old photograph in the desk drawer.", cz: "V zásuvce stolu náhodou narazila na starou fotografii." }
    ],
    level: "B2",
    theme: "Objevování"
  },
  {
    id: "fallback_9",
    text: "Foster",
    phonetic: "/ˈfɑː.stər/",
    czechTranslation: "podporovat, rozvíjet",
    definition: "To help an idea, feeling, or relationship develop.",
    collocations: ["foster creativity", "foster cooperation", "foster a relationship"],
    examples: [
      { en: "The new project aims to foster cooperation between local schools.", cz: "Nový projekt má za cíl podporovat spolupráci mezi místními školami." },
      { en: "Open conversations can foster trust within a team.", cz: "Otevřené rozhovory mohou v týmu posilovat důvěru." }
    ],
    level: "C1",
    theme: "Vztahy"
  },
  {
    id: "fallback_10",
    text: "Scarce",
    phonetic: "/skers/",
    czechTranslation: "vzácný, nedostatkový",
    definition: "Available only in small amounts; not easy to find.",
    collocations: ["scarce resources", "become scarce", "increasingly scarce"],
    examples: [
      { en: "Clean water is scarce in some parts of the region.", cz: "V některých částech regionu je čistá voda vzácná." },
      { en: "Affordable apartments have become scarce in the city.", cz: "Cenově dostupných bytů je ve městě stále méně." }
    ],
    level: "C1",
    theme: "Příroda"
  },
  {
    id: "fallback_11",
    text: "Overlook",
    phonetic: "/ˌoʊ.vərˈlʊk/",
    czechTranslation: "přehlédnout, opomenout",
    definition: "To fail to notice or consider something important.",
    collocations: ["overlook a detail", "easily overlooked", "overlook an opportunity"],
    examples: [
      { en: "It is easy to overlook a small detail when you are in a hurry.", cz: "Když spěcháte, snadno přehlédnete drobný detail." },
      { en: "The report overlooked the needs of people living nearby.", cz: "Zpráva opomenula potřeby lidí žijících v okolí." }
    ],
    level: "B2",
    theme: "Práce & Detail"
  },
  {
    id: "fallback_12",
    text: "Sustainable",
    phonetic: "/səˈsteɪ.nə.bəl/",
    czechTranslation: "udržitelný",
    definition: "Able to continue for a long time without harming people or the environment.",
    collocations: ["sustainable development", "sustainable energy", "environmentally sustainable"],
    examples: [
      { en: "The city is investing in sustainable public transport.", cz: "Město investuje do udržitelné veřejné dopravy." },
      { en: "They are looking for more sustainable ways to package food.", cz: "Hledají udržitelnější způsoby balení potravin." }
    ],
    level: "C1",
    theme: "Životní prostředí"
  }
];

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { count = 5, excludeWords = [] } = req.body;
  const excludedWords = new Set(
    Array.isArray(excludeWords) ? excludeWords.map((word: string) => word.toLowerCase()) : []
  );
  const availableFallbackWords = FALLBACK_WORDS.filter((word) => !excludedWords.has(word.text.toLowerCase()));
  const fallbackWords = shuffle(availableFallbackWords.length > 0 ? availableFallbackWords : FALLBACK_WORDS)
    .slice(0, count);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    return res.status(200).json(fallbackWords);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const prompt = `You are an expert English vocabulary coach for Czech speakers learning on the go.
Generate ${count} engaging English vocabulary words, idioms, or phrasal verbs smoothly mixed between B2 (Upper-Intermediate) and C1 (Advanced) levels.

Choose vocabulary randomly from a broad mix of unrelated topics and practical situations, such as work, travel, food, relationships, health, technology, nature, culture, money, and everyday life. Do not make the batch seasonal or stick to a single topic. When the batch has at least four words, use at least four different themes and avoid repeating a theme within the batch when possible.

Exclude these already practiced words: ${JSON.stringify(excludeWords.slice(-40))}.

For each word, return a JSON array of objects with the following keys:
- "text": English word, idiom, or phrasal verb
- "phonetic": IPA pronunciation (e.g. "/rɪˈzɪl.jəns/")
- "czechTranslation": Natural Czech translation/meaning
- "definition": Clear, simple English definition
- "collocations": Array of 2 to 3 common collocations / natural word pairs in English (e.g. ["build resilience", "emotional resilience"])
- "examples": Array of exactly 2 practical contextual sentences. At least one English sentence must contain the exact vocabulary word or phrase. Each item must have:
    - "en": English example sentence
    - "cz": Czech translation of that sentence
- "level": Either "B2" or "C1"
- "theme": Short Czech category tag for the word (e.g. "Práce", "Cestování", "Jídlo", "Vztahy", "Technologie", "Příroda"). Spread the tags across different topics within this batch.

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
    return res.status(200).json(fallbackWords);
  }
}
