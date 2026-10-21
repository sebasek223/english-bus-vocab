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

// This offline reserve keeps the learning flow usable if Gemini is temporarily
// unavailable or a deployment is missing its server-side API key.
const EXTRA_FALLBACK_WORDS: VocabWord[] = [
  ["Accomplish", "dosáhnout, splnit", "To succeed in doing or completing something.", "B2", "Cíle"],
  ["Adaptable", "přizpůsobivý", "Able to change easily to suit a new situation.", "B2", "Práce"],
  ["Advocate", "zastánce; prosazovat", "A person who publicly supports an idea, or to support it.", "C1", "Společnost"],
  ["Allocate", "přidělit", "To give something to a particular person or purpose.", "C1", "Práce"],
  ["Ambiguous", "nejednoznačný", "Having more than one possible meaning.", "C1", "Komunikace"],
  ["Anticipate", "předvídat, očekávat", "To expect something and prepare for it.", "B2", "Plánování"],
  ["Approach", "přístup; přiblížit se", "A way of dealing with a problem or task.", "B2", "Práce"],
  ["Aware", "vědomý si", "Knowing that something exists or is happening.", "B2", "Každodenní život"],
  ["Beneficial", "prospěšný", "Having a helpful or positive effect.", "C1", "Zdraví"],
  ["Breakthrough", "průlom", "An important discovery or development.", "C1", "Technologie"],
  ["Cautious", "opatrný", "Careful to avoid possible problems or danger.", "B2", "Každodenní život"],
  ["Coherent", "souvislý, srozumitelný", "Logical, clear, and easy to understand.", "C1", "Komunikace"],
  ["Compelling", "přesvědčivý, poutavý", "Very interesting or convincing.", "C1", "Kultura"],
  ["Convey", "sdělit, vyjádřit", "To communicate an idea or feeling.", "C1", "Komunikace"],
  ["Crucial", "zásadní", "Extremely important for a result or decision.", "B2", "Práce"],
  ["Deteriorate", "zhoršovat se", "To become worse over time.", "C1", "Zdraví"],
  ["Diverse", "rozmanitý", "Including many different types of people or things.", "B2", "Společnost"],
  ["Efficient", "efektivní", "Working well without wasting time or energy.", "B2", "Práce"],
  ["Eligible", "oprávněný", "Allowed to take part in or receive something.", "C1", "Práce"],
  ["Enhance", "zlepšit, posílit", "To improve the quality or value of something.", "C1", "Rozvoj"],
  ["Ethical", "etický", "Relating to ideas about what is morally right.", "C1", "Společnost"],
  ["Exceed", "překročit", "To be greater than a number, limit, or expectation.", "B2", "Práce"],
  ["Feasible", "proveditelný", "Possible and likely to be achieved.", "C1", "Plánování"],
  ["Fluctuate", "kolísat", "To change frequently in level, amount, or value.", "C1", "Peníze"],
  ["Fundamental", "základní", "Forming the most important part of something.", "B2", "Vzdělávání"],
  ["Hesitate", "váhat", "To pause before doing something because you are unsure.", "B2", "Každodenní život"],
  ["Implement", "zavést, realizovat", "To put a plan or decision into effect.", "C1", "Práce"],
  ["Inevitable", "nevyhnutelný", "Certain to happen and impossible to avoid.", "C1", "Každodenní život"],
  ["Innovative", "inovativní", "Using new ideas or methods.", "B2", "Technologie"],
  ["Maintain", "udržovat", "To keep something at the same level or condition.", "B2", "Práce"],
  ["Mutual", "vzájemný", "Felt or done equally by two or more people.", "C1", "Vztahy"],
  ["Notion", "představa, názor", "A belief or idea about something.", "C1", "Myšlení"],
  ["Obtain", "získat", "To get something, especially through effort.", "B2", "Práce"],
  ["Outcome", "výsledek", "The result of an action or situation.", "B2", "Cíle"],
  ["Persuade", "přesvědčit", "To make someone do or believe something through reasoning.", "B2", "Komunikace"],
  ["Precise", "přesný", "Exact and accurate.", "B2", "Práce"],
  ["Preserve", "zachovat, uchovat", "To keep something in its original or good condition.", "C1", "Příroda"],
  ["Prioritize", "upřednostnit", "To decide that something is more important than other things.", "C1", "Plánování"],
  ["Reluctant", "neochotný", "Unwilling and hesitant to do something.", "C1", "Každodenní život"],
  ["Reliable", "spolehlivý", "Able to be trusted to work well or behave well.", "B2", "Práce"],
  ["Resolve", "vyřešit", "To find a satisfactory solution to a problem.", "B2", "Práce"],
  ["Restrict", "omezit", "To limit something or keep it within bounds.", "C1", "Společnost"],
  ["Significant", "významný", "Large or important enough to have an effect.", "B2", "Práce"],
  ["Simultaneous", "současný", "Happening at the same time.", "C1", "Každodenní život"],
  ["Tendency", "tendence, sklon", "A likely habit or way of behaving.", "C1", "Chování"],
  ["Thrive", "prospívat", "To grow, develop, or be successful.", "C1", "Rozvoj"],
  ["Versatile", "všestranný", "Able to adapt to many different activities or uses.", "C1", "Práce"],
  ["Vulnerable", "zranitelný", "Able to be easily harmed or affected.", "C1", "Společnost"],
  ["Withdraw", "stáhnout se; vybrat", "To remove something or move away from a situation.", "B2", "Peníze"],
] .map(([text, czechTranslation, definition, level, theme], index): VocabWord => ({
  id: `offline_${index + 1}`,
  text,
  phonetic: "",
  czechTranslation,
  definition,
  collocations: [],
  examples: [],
  level: level as "B2" | "C1",
  theme,
}));

const ALL_FALLBACK_WORDS = [...FALLBACK_WORDS, ...EXTRA_FALLBACK_WORDS];

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
  const requestedCount = Number.isInteger(count) ? Math.min(10, Math.max(1, count)) : 5;
  const excludedWords = new Set(
    Array.isArray(excludeWords) ? excludeWords.map((word: string) => word.toLowerCase()) : []
  );
  const availableFallbackWords = ALL_FALLBACK_WORDS.filter((word) => !excludedWords.has(word.text.toLowerCase()));
  // Never silently recycle already learned offline words as “new”. The client
  // can now show a useful retry state instead of teaching a duplicate.
  const fallbackWords = shuffle(availableFallbackWords).slice(0, requestedCount);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    return res.status(200).json(fallbackWords);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // 1.5 Flash is retired for many Gemini API projects. Keep the model
    // configurable for deployments, while using the current stable Flash API
    // model by default.
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
    });

    const prompt = `You are an expert English vocabulary coach for Czech speakers learning on the go.
Generate ${requestedCount} engaging English vocabulary words, idioms, or phrasal verbs smoothly mixed between B2 (Upper-Intermediate) and C1 (Advanced) levels.

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

    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error("Gemini response is not a JSON array");
    }
    const formattedWords: VocabWord[] = parsed
      .filter((item: unknown): item is Record<string, any> =>
        typeof item === "object" && item !== null && typeof (item as { text?: unknown }).text === "string"
      )
      .map((item) => ({
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
      level: item.level === "C1" ? ("C1" as const) : ("B2" as const),
      theme: item.theme || "Slovní zásoba",
      }))
      .filter((word) => !excludedWords.has(word.text.trim().toLowerCase()));

    if (formattedWords.length === 0) {
      throw new Error("Gemini did not return any new vocabulary");
    }

    return res.status(200).json(formattedWords);
  } catch (error: any) {
    console.error("Gemini API error, falling back to offline dictionary:", error?.message || error);
    return res.status(200).json(fallbackWords);
  }
}
