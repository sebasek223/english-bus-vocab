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

const EXTRA_FALLBACK_RAW: [string, string, string, string, string, string[], ExamplePair[]][] = [
  ["Accomplish", "dosáhnout, splnit", "To succeed in doing or completing something.", "B2", "Cíle", ["accomplish a goal", "successfully accomplish"], [{ en: "She accomplished everything she planned today.", cz: "Dnes splnila vše, co si naplánovala." }, { en: "Hard work is needed to accomplish your dreams.", cz: "K dosažení vašich snů je potřeba tvrdá práce." }]],
  ["Adaptable", "přizpůsobivý", "Able to change easily to suit a new situation.", "B2", "Práce", ["highly adaptable", "adaptable to change"], [{ en: "Successful workers are highly adaptable.", cz: "Úspěšní pracovníci jsou velmi přizpůsobiví." }, { en: "The software is adaptable to different devices.", cz: "Software je přizpůsobivý různým zařízením." }]],
  ["Advocate", "zastánce; prosazovat", "A person who publicly supports an idea, or to support it.", "C1", "Společnost", ["strongly advocate", "consumer advocate"], [{ en: "He is a strong advocate for environmental protection.", cz: "Je silným zastáncem ochrany životního prostředí." }, { en: "They advocate for equal rights.", cz: "Prosazují rovná práva." }]],
  ["Allocate", "přidělit", "To give something to a particular person or purpose.", "C1", "Práce", ["allocate resources", "allocate time"], [{ en: "The manager allocated tasks to the team.", cz: "Manažer přidělil úkoly týmu." }, { en: "We need to allocate more funds for research.", cz: "Musíme přidělit více prostředků na výzkum." }]],
  ["Ambiguous", "nejednoznačný", "Having more than one possible meaning.", "C1", "Komunikace", ["ambiguous statement", "highly ambiguous"], [{ en: "His answer was somewhat ambiguous.", cz: "Jeho odpověď byla poněkud nejednoznačná." }, { en: "Avoid using ambiguous language in official documents.", cz: "Vyhněte se nejednoznačným výrazům v oficiálních dokumentech." }]],
  ["Anticipate", "předvídat, očekávat", "To expect something and prepare for it.", "B2", "Plánování", ["anticipate problems", "eagerly anticipate"], [{ en: "We anticipate a large crowd at the event.", cz: "Na akci očekáváme velký dav." }, { en: "Good leaders anticipate future needs.", cz: "Dobří lídři předvídají budoucí potřeby." }]],
  ["Approach", "přístup; přiblížit se", "A way of dealing with a problem or task.", "B2", "Práce", ["new approach", "methodical approach"], [{ en: "We need a fresh approach to this issue.", cz: "K této otázce potřebujeme nový přístup." }, { en: "Winter is fast approaching.", cz: "Zima se rychle blíží." }]],
  ["Aware", "vědomý si", "Knowing that something exists or is happening.", "B2", "Každodenní život", ["fully aware", "become aware"], [{ en: "Are you aware of the new rules?", cz: "Jste si vědomi nových pravidel?" }, { en: "She slowly became aware of the danger.", cz: "Pomalými kroky si začala uvědomovat nebezpečí." }]],
  ["Beneficial", "prospěšný", "Having a helpful or positive effect.", "C1", "Zdraví", ["mutually beneficial", "highly beneficial"], [{ en: "Regular exercise is beneficial to health.", cz: "Pravidelné cvičení je zdraví prospěšné." }, { en: "The deal was mutually beneficial for both companies.", cz: "Dohoda byla oboustranně výhodná pro obě společnosti." }]],
  ["Breakthrough", "průlom", "An important discovery or development.", "C1", "Technologie", ["major breakthrough", "scientific breakthrough"], [{ en: "Scientists made a major breakthrough in cancer research.", cz: "Vědci učinili významný průlom ve výzkumu rakoviny." }, { en: "This invention is a technical breakthrough.", cz: "Tento vynález je technickým průlomem." }]],
  ["Cautious", "opatrný", "Careful to avoid possible problems or danger.", "B2", "Každodenní život", ["cautious approach", "extremely cautious"], [{ en: "Be cautious when driving in the rain.", cz: "Při jízdě v dešti buďte opatrní." }, { en: "He took a cautious step forward.", cz: "Učinil opatrný krok vpřed." }]],
  ["Coherent", "souvislý, srozumitelný", "Logical, clear, and easy to understand.", "C1", "Komunikace", ["coherent argument", "coherent strategy"], [{ en: "She presented a coherent argument during the debate.", cz: "Během debaty přednesla souvislý a srozumitelný argument." }, { en: "The essay was clear and coherent.", cz: "Esej byla jasná a souvislá." }]],
  ["Compelling", "přesvědčivý, poutavý", "Very interesting or convincing.", "C1", "Kultura", ["compelling evidence", "compelling story"], [{ en: "The movie has a very compelling story.", cz: "Film má velmi poutavý příběh." }, { en: "They found compelling evidence in court.", cz: "U soudu našli přesvědčivé důkazy." }]],
  ["Convey", "sdělit, vyjádřit", "To communicate an idea or feeling.", "C1", "Komunikace", ["convey a message", "convey feelings"], [{ en: "Words cannot convey how grateful I am.", cz: "Slova nemohou vyjádřit, jak moc jsem vděčný." }, { en: "The art piece conveys a deep emotion.", cz: "Umělecké dílo vyjadřuje hlubokou emoci." }]],
  ["Crucial", "zásadní", "Extremely important for a result or decision.", "B2", "Práce", ["crucial role", "crucial decision"], [{ en: "Timing plays a crucial role in success.", cz: "Načasování hraje v úspěchu zásadní roli." }, { en: "This is a crucial moment for our business.", cz: "Toto je zásadní okamžik pro naše podnikání." }]],
  ["Deteriorate", "zhoršovat se", "To become worse over time.", "C1", "Zdraví", ["rapidly deteriorate", "health deteriorates"], [{ en: "The weather began to deteriorate rapidly.", cz: "Počasí se začalo rychle zhoršovat." }, { en: "His health condition deteriorated overnight.", cz: "Jeho zdravotní stav se přes noc zhoršil." }]],
  ["Diverse", "rozmanitý", "Including many different types of people or things.", "B2", "Společnost", ["diverse background", "culturally diverse"], [{ en: "The team has members from diverse backgrounds.", cz: "Tým má členy z rozmanitých prostředí." }, { en: "Nature offers a diverse range of species.", cz: "Příroda nabízí rozmanitou škálu druhů." }]],
  ["Efficient", "efektivní", "Working well without wasting time or energy.", "B2", "Práce", ["highly efficient", "energy efficient"], [{ en: "We need an efficient way to process orders.", cz: "Potřebujeme efektivní způsob vyřizování objednávek." }, { en: "New engines are very energy efficient.", cz: "Nové motory jsou velmi energeticky úsporné." }]],
  ["Eligible", "oprávněný", "Allowed to take part in or receive something.", "C1", "Práce", ["eligible for a grant", "eligible voter"], [{ en: "You might be eligible for a discount.", cz: "Možná máte nárok na slevu." }, { en: "Only registered citizens are eligible to vote.", cz: "Volební právo mají pouze registrovaní občané." }]],
  ["Enhance", "zlepšit, posílit", "To improve the quality or value of something.", "C1", "Rozvoj", ["enhance performance", "enhance quality"], [{ en: "New software will enhance work efficiency.", cz: "Nový software posílí efektivitu práce." }, { en: "Good lighting can enhance the photo.", cz: "Dobré osvětlení může fotku vylepšit." }]],
  ["Ethical", "etický", "Relating to ideas about what is morally right.", "C1", "Společnost", ["ethical concerns", "ethical behavior"], [{ en: "Companies should adhere to ethical standards.", cz: "Firmy by měly dodržovat etické standardy." }, { en: "There are ethical concerns regarding AI development.", cz: "Ohledně vývoje AI existují etické obavy." }]],
  ["Exceed", "překročit", "To be greater than a number, limit, or expectation.", "B2", "Práce", ["exceed expectations", "exceed the limit"], [{ en: "Sales exceeded our expectations this month.", cz: "Prodeje tento měsíc překročily naše očekávání." }, { en: "Do not exceed the recommended dose.", cz: "Nepřekračujte doporučené dávkování." }]],
  ["Feasible", "proveditelný", "Possible and likely to be achieved.", "C1", "Plánování", ["financially feasible", "feasible option"], [{ en: "It is a feasible plan for the future.", cz: "Je to proveditelný plán do budoucna." }, { en: "We need to find a feasible solution quickly.", cz: "Musíme rychle najít proveditelné řešení." }]],
  ["Fluctuate", "kolísat", "To change frequently in level, amount, or value.", "C1", "Peníze", ["fluctuate wildly", "prices fluctuate"], [{ en: "Stock prices fluctuate daily.", cz: "Ceny akcií denně kolísají." }, { en: "Temperatures can fluctuate during spring.", cz: "Teploty mohou na jaře kolísat." }]],
  ["Fundamental", "základní", "Forming the most important part of something.", "B2", "Vzdělávání", ["fundamental change", "fundamental principle"], [{ en: "Freedom of speech is a fundamental right.", cz: "Svoboda projevu je základním právem." }, { en: "There is a fundamental mistake in the calculation.", cz: "Ve výpočtu je základní chyba." }]],
  ["Hesitate", "váhat", "To pause before doing something because you are unsure.", "B2", "Každodenní život", ["don't hesitate", "hesitate to ask"], [{ en: "Do not hesitate to contact us if you need help.", cz: "Neváhejte nás kontaktovat, pokud potřebujete pomoc." }, { en: "He hesitated before answering the question.", cz: "Před odpovědí na otázku zaváhal." }]],
  ["Implement", "zavést, realizovat", "To put a plan or decision into effect.", "C1", "Práce", ["implement a plan", "implement changes"], [{ en: "The government decided to implement new regulations.", cz: "Vláda se rozhodla zavést nová nařízení." }, { en: "It takes time to implement new ideas.", cz: "Realizace nových nápadů trvá nějaký čas." }]],
  ["Inevitable", "nevyhnutelný", "Certain to happen and impossible to avoid.", "C1", "Každodenní život", ["almost inevitable", "inevitable outcome"], [{ en: "Change is an inevitable part of life.", cz: "Změna je nevyhnutelnou součástí života." }, { en: "Failure was inevitable without proper preparation.", cz: "Bez řádné přípravy nebylo neúspěchu vyhnutí." }]],
  ["Innovative", "inovativní", "Using new ideas or methods.", "B2", "Technologie", ["innovative design", "highly innovative"], [{ en: "The company introduced an innovative product line.", cz: "Společnost představila inovativní řadu produktů." }, { en: "We encourage innovative thinking.", cz: "Podporujeme inovativní myšlení." }]],
  ["Maintain", "udržovat", "To keep something at the same level or condition.", "B2", "Práce", ["maintain order", "maintain balance"], [{ en: "It is important to maintain a healthy lifestyle.", cz: "Je důležité udržovat zdravý životní styl." }, { en: "He maintains good relations with his clients.", cz: "Udržuje dobré vztahy se svými klienty." }]],
  ["Mutual", "vzájemný", "Felt or done equally by two or more people.", "C1", "Vztahy", ["mutual respect", "mutual understanding"], [{ en: "A strong relationship requires mutual trust.", cz: "Silný vztah vyžaduje vzájemnou důvěru." }, { en: "They reached a mutual agreement.", cz: "Dosáhli vzájemné dohody." }]],
  ["Notion", "představa, názor", "A belief or idea about something.", "C1", "Myšlení", ["reject the notion", "vague notion"], [{ en: "He rejected the notion that hard work is useless.", cz: "Odmítl představu, že tvrdá práce je k ničemu." }, { en: "I had a vague notion of how it worked.", cz: "Měl jsem mlhavou představu o tom, jak to funguje." }]],
  ["Obtain", "získat", "To get something, especially through effort.", "B2", "Práce", ["obtain permission", "obtain results"], [{ en: "You need to obtain a permit before building.", cz: "Před stavbou musíte získat povolení." }, { en: "She managed to obtain valuable information.", cz: "Podařilo se jí získat cenné informace." }]],
  ["Outcome", "výsledek", "The result of an action or situation.", "B2", "Cíle", ["successful outcome", "predict the outcome"], [{ en: "We are waiting for the final outcome of the negotiation.", cz: "Čekáme na konečný výsledek jednání." }, { en: "Hard work usually leads to a positive outcome.", cz: "Tvrdá práce obvykle vede k pozitivnímu výsledku." }]],
  ["Persuade", "přesvědčit", "To make someone do or believe something through reasoning.", "B2", "Komunikace", ["try to persuade", "easily persuaded"], [{ en: "She persuaded him to join the project.", cz: "Přesvědčila ho, aby se připojil k projektu." }, { en: "It is hard to persuade people to change their habits.", cz: "Je těžké přesvědčit lidi, aby změnili své návyky." }]],
  ["Precise", "přesný", "Exact and accurate.", "B2", "Práce", ["precise measurements", "at that precise moment"], [{ en: "Give me the precise details of the plan.", cz: "Dejte mi přesné detaily plánu." }, { en: "The instrument provides highly precise readings.", cz: "Přístroj poskytuje velmi přesné hodnoty." }]],
  ["Preserve", "zachovat, uchovat", "To keep something in its original or good condition.", "C1", "Příroda", ["preserve history", "preserve nature"], [{ en: "We must preserve historical buildings for future generations.", cz: "Musíme zachovat historické budovy pro budoucí generace." }, { en: "Freezing helps preserve food.", cz: "Zmražení pomáhá uchovat potraviny." }]],
  ["Prioritize", "upřednostnit", "To decide that something is more important than other things.", "C1", "Plánování", ["prioritize tasks", "prioritize health"], [{ en: "Learn to prioritize your daily duties.", cz: "Naučte se upřednostňovat své denní povinnosti." }, { en: "Safety should always be prioritized.", cz: "Bezpečnost by měla mít vždy přednost." }]],
  ["Reluctant", "neochotný", "Unwilling and hesitant to do something.", "C1", "Každodenní život", ["reluctant to leave", "reluctant approval"], [{ en: "He was reluctant to talk about his past.", cz: "Neochotně mluvil o své minulosti." }, { en: "The company was reluctant to increase prices.", cz: "Firma byla neochotná zvyšovat ceny." }]],
  ["Reliable", "spolehlivý", "Able to be trusted to work well or behave well.", "B2", "Práce", ["reliable source", "reliable car"], [{ en: "He is a very reliable employee.", cz: "Je to velmi spolehlivý zaměstnanec." }, { en: "We need reliable data before making a decision.", cz: "Před rozhodnutím potřebujeme spolehlivá data." }]],
  ["Resolve", "vyřešit", "To find a satisfactory solution to a problem.", "B2", "Práce", ["resolve a conflict", "resolve an issue"], [{ en: "They managed to resolve the conflict peacefully.", cz: "Podařilo se jim konflikt vyřešit mírnou cestou." }, { en: "We must resolve this problem immediately.", cz: "Tento problém musíme okamžitě vyřešit." }]],
  ["Restrict", "omezit", "To limit something or keep it within bounds.", "C1", "Společnost", ["restrict access", "restrict movement"], [{ en: "The government decided to restrict foreign travel.", cz: "Vláda se rozhodla omezit cestování do zahraničí." }, { en: "Access is restricted to authorized personnel.", cz: "Prístup je omezen pouze pro oprávněný personál." }]],
  ["Significant", "významný", "Large or important enough to have an effect.", "B2", "Práce", ["significant change", "significant impact"], [{ en: "There has been a significant increase in sales.", cz: "Došlo k významnému nárůstu prodejů." }, { en: "Her contribution made a significant difference.", cz: "Její přispění mělo významný dopad." }]],
  ["Simultaneous", "současný", "Happening at the same time.", "C1", "Každodenní život", ["simultaneous translation", "simultaneous events"], [{ en: "The event was broadcast with simultaneous translation.", cz: "Událost byla vysílána se simultánním překladem." }, { en: "There were two simultaneous explosions.", cz: "Došlo ke dvěma současným výbuchům." }]],
  ["Tendency", "tendence, sklon", "A likely habit or way of behaving.", "C1", "Chování", ["have a tendency", "growing tendency"], [{ en: "Prices have a tendency to rise in winter.", cz: "Ceny mají v zimě tendenci růst." }, { en: "He has a tendency to exaggerate things.", cz: "Má sklon věci přehánět." }]],
  ["Thrive", "prospívat", "To grow, develop, or be successful.", "C1", "Rozvoj", ["thrive under pressure", "thrive in a new environment"], [{ en: "The business continues to thrive despite the crisis.", cz: "Podnikání i přes krizi nadále prospívá." }, { en: "Some plants thrive in shade.", cz: "Některým rostlinám se daří ve stínu." }]],
  ["Versatile", "všestranný", "Able to adapt to many different activities or uses.", "C1", "Práce", ["versatile tool", "versatile actor"], [{ en: "He is a versatile actor capable of playing any role.", cz: "Je to všestranný herec schopný zahrát jakoukoli roli." }, { en: "This jacket is versatile and stylish.", cz: "Tato bunda je všestranná a stylová." }]],
  ["Vulnerable", "zranitelný", "Able to be easily harmed or affected.", "C1", "Společnost", ["vulnerable group", "highly vulnerable"], [{ en: "Elderly people are more vulnerable to illness.", cz: "Starší lidé jsou vůči nemocem zranitelnější." }, { en: "The system is vulnerable to cyber attacks.", cz: "Systém je zranitelný vůči kybernetickým útokům." }]],
  ["Withdraw", "stáhnout se; vybrat", "To remove something or move away from a situation.", "B2", "Peníze", ["withdraw money", "withdraw from competition"], [{ en: "She withdrew money from the ATM.", cz: "Vybrala peníze z bankomatu." }, { en: "The army decided to withdraw from the area.", cz: "Armáda se rozhodla z oblasti stáhnout." }]]
];

const EXTRA_FALLBACK_WORDS: VocabWord[] = EXTRA_FALLBACK_RAW.map(
  ([text, czechTranslation, definition, level, theme, collocations, examples], index): VocabWord => ({
    id: `offline_${index + 1}`,
    text,
    phonetic: "",
    czechTranslation,
    definition,
    collocations: collocations || [],
    examples: examples || [],
    level: level as "B2" | "C1",
    theme,
  })
);

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
  const fallbackWords = shuffle(availableFallbackWords).slice(0, requestedCount);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    return res.status(200).json(fallbackWords);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use stable model name gemini-2.0-flash or gemini-1.5-flash
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
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
- "collocations": Array of 2 to 3 common collocations / natural word pairs in English (e.g. ["build resilience", "emotional resilience"]). MANDATORY: Must contain at least 2 non-empty strings!
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
        collocations: Array.isArray(item.collocations) && item.collocations.length > 0
          ? item.collocations.slice(0, 3)
          : [`${item.text} in context`, `use ${item.text}`],
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
