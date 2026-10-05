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
    level: "B2"
  },
  {
    id: "fallback_2",
    text: "Meticulous",
    phonetic: "/məˈtɪk.jə.ləs/",
    czechTranslation: "puntičkářský, pečlivý",
    definition: "Showing great attention to detail; very careful and precise.",
    example: "He was meticulous about keeping his research notes organized.",
    exampleCzech: "Byl velmi pečlivý při udržování pořádku ve svých výzkumných poznámkách.",
    level: "C1"
  },
  {
    id: "fallback_3",
    text: "Ubiquitous",
    phonetic: "/juːˈbɪk.wə.təs/",
    czechTranslation: "všudypřítomný",
    definition: "Present, appearing, or found everywhere.",
    example: "Smartphones have become ubiquitous in modern daily life.",
    exampleCzech: "Chytré telefony se v moderním každodenním životě staly všudypřítomnými.",
    level: "C1"
  },
  {
    id: "fallback_4",
    text: "Substantial",
    phonetic: "/səbˈstæn.ʃəl/",
    czechTranslation: "značný, podstatný",
    definition: "Of considerable importance, size, or worth.",
    example: "They made substantial progress toward achieving their annual goal.",
    exampleCzech: "Dosáhli značného pokroku směrem k dosažení svého ročního cíle.",
    level: "B2"
  },
  {
    id: "fallback_5",
    text: "Ambiguous",
    phonetic: "/æmˈbɪɡ.ju.əs/",
    czechTranslation: "dvojznačný, nejednoznačný",
    definition: "Open to more than one interpretation; having a double meaning.",
    example: "The instructions were ambiguous, leading to confusion among the team.",
    exampleCzech: "Pokyny byly nejednoznačné, což vedlo ke zmatku v týmu.",
    level: "B2"
  },
  {
    id: "fallback_6",
    text: "Eloquent",
    phonetic: "/ˈel.ə.kwənt/",
    czechTranslation: "výmluvný, kultivovaný v projevu",
    definition: "Fluent or persuasive in speaking or writing.",
    example: "His eloquent speech inspired everyone in the auditorium.",
    exampleCzech: "Jeho výmluvný projev inspiroval každého v sále.",
    level: "C1"
  },
  {
    id: "fallback_7",
    text: "Feasible",
    phonetic: "/ˈfiː.zə.bəl/",
    czechTranslation: "proveditelný, reálný",
    definition: "Possible to do easily or conveniently.",
    example: "It is not technically feasible to complete the project by tomorrow.",
    exampleCzech: "Není technicky proveditelné dokončit projekt do zítřka.",
    level: "B2"
  },
  {
    id: "fallback_8",
    text: "Scrutinize",
    phonetic: "/ˈskruː.tɪ.naɪz/",
    czechTranslation: "podrobně zkoumat, bedlivě prohlížet",
    definition: "Examine or inspect closely and thoroughly.",
    example: "Scientists will scrutinize the new data before publishing their findings.",
    exampleCzech: "Vědci nová data pečlivě prozkoumají, než své závěry publikují.",
    level: "C1"
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { level = "B2", count = 5, excludeWords = [] } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    return res.status(200).json(FALLBACK_WORDS.slice(0, count));
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const prompt = `You are an expert English vocabulary coach for Czech speakers.
Generate ${count} essential English vocabulary words at the ${level} CEFR level (or mixed B2/C1 if level is 'MIXED').
Exclude these already practiced words: ${JSON.stringify(excludeWords.slice(-30))}.

For each word, return a JSON array of objects with the following keys:
- "text": English word or phrasal verb
- "phonetic": IPA pronunciation (e.g. "/rɪˈzɪl.jəns/")
- "czechTranslation": Czech translation/meaning
- "definition": Clear, simple English definition
- "example": Natural English example sentence
- "exampleCzech": Czech translation of the example sentence
- "level": "${level === "MIXED" ? "B2 or C1" : level}"

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
      level: item.level || level,
    }));

    return res.status(200).json(formattedWords);
  } catch (error: any) {
    console.error("Gemini API error, falling back to offline dictionary:", error?.message || error);
    const matched = FALLBACK_WORDS.filter((w) => level === "MIXED" || w.level === level);
    return res.status(200).json(matched.length > 0 ? matched : FALLBACK_WORDS);
  }
}
