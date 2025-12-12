import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// A robust pool of 60+ words ensuring variety across all themes
const HARDCODED_WORDS = [
    // Hoodoo / Voodoo
    "ROOTWORK", "CONJURE", "MOJO", "GRISGRIS", "LOA", "SPIRITS", "ALTAR",
    "CANDLE", "JINX", "HEX", "BLESS", "ANCESTORS", "ORISHA", "CHARM",
    "TALISMAN", "LODESTONE", "DRAGON", "LUCK", "JUSTICE", "RITUAL",
    
    // Gnostic / Spirituality
    "GNOSIS", "ARCHON", "SOPHIA", "PLEROMA", "AEON", "LOGOS", "DIVINE",
    "AWAKEN", "CHAKRA", "AURA", "COSMIC", "SACRED", "WISDOM", "GRACE",
    "MIRACLE", "ETHEREAL", "SOUL", "LIGHT", "TRUTH", "MYSTIC",
    
    // Mindset / Success
    "DESIRE", "FAITH", "VISION", "WEALTH", "POWER", "GROWTH", "MASTER",
    "ACHIEVE", "PURPOSE", "PASSION", "FOCUS", "RESULTS", "WIN",
    "DREAM", "BELIEVE", "CREATE", "LEADER", "SUCCESS", "MONEY",
    
    // 12 Week Year / Execution
    "EXECUTE", "PLAN", "GOAL", "ACTION", "SCORE", "TRACK", "SPRINT",
    "HABIT", "PROGRESS", "MOMENTUM", "TACTICS", "STRATEGY", "WEEKLY",
    "URGENCY", "DEADLINE", "COMMIT", "OWNERSHIP", "PRIORITY"
];

export async function GET() {
  try {
    // 1. Fetch dynamic words from OpenAI
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "system",
                content: "You are a helper for a word search game generator. You output ONLY valid JSON. Each request should produce DIFFERENT words from a large pool of possibilities."
            },
            {
                role: "user",
                content: (() => {
                 const themes = [
                    { name: "HOODOO and VOODOO", context: "rootwork, conjure, mojo, gris, loas, spirits..." },
                    { name: "Gnostic Christianity", context: "gnosis, archon, sophia, pleroma, aeon..." },
                    { name: "Mindset & Success", context: "Think and Grow Rich, desire, faith, autosuggestion..." },
                    { name: "12 Week Year", context: "execution, vision, goal, weekly, plan, strategy..." }
                  ];
                    // Random weighted selection
                    const rand = Math.random();
                    let focus = themes[0];
                    if (rand < 0.4) focus = themes[0];
                    else if (rand < 0.6) focus = themes[1];
                    else if (rand < 0.8) focus = themes[2];
                    else focus = themes[3];

                    return `Generate a list of 8-10 single words for a word search.
                    
                    THEME: ${focus.name} (${focus.context})
                    
                    Constraints:
                    - Single words only.
                    - Max 10 characters.
                    - All UPPERCASE.
                    - Valid English.
                    - Return JSON: { "words": [...] }
                    `
                })()
            }
        ],
        response_format: { type: "json_object" },
        temperature: 1.2, 
    });

    const content = completion.choices[0].message.content;
    let generatedWords: string[] = [];

    if (content) {
        try {
            const data = JSON.parse(content);
            if (data.words && Array.isArray(data.words)) {
                generatedWords = data.words;
            }
        } catch (e) {
            console.error("Failed to parse OpenAI response", e);
        }
    }

    // 2. Mix with Hardcoded Words
    // Select 5 random words from the hardcoded list
    const shuffledHardcoded = [...HARDCODED_WORDS].sort(() => 0.5 - Math.random());
    const selectedHardcoded = shuffledHardcoded.slice(0, 8);

    // Combine lists
    const combinedPool = [...generatedWords, ...selectedHardcoded];
    
    // 3. Clean, filter, and deduplicate
    const cleanWords = Array.from(new Set(
        combinedPool
          .filter(w => typeof w === 'string')
          .map(w => w.toUpperCase().replace(/[^A-Z]/g, '')) // Remove non-letters
          .filter(w => w.length >= 3 && w.length <= 10)     // Length constraints
    ));

    // 4. Randomize and Pick Top 10
    const finalWords = cleanWords
        .sort(() => 0.5 - Math.random()) // Shuffle again
        .slice(0, 10);                   // Take top 10

    // Ensure we have enough words
    if (finalWords.length < 5) {
        // Emergency fallback if everything failed
        const emergency = ["FAITH", "HOPE", "LOVE", "JOY", "PEACE", "SPIRIT"];
        return NextResponse.json({ words: emergency });
    }
    
    return NextResponse.json({ words: finalWords });

  } catch (error) {
    console.error("Word Gen Error:", error);
    
    // Fallback if API fails completely
    const fallbackWords = ["MOJO", "ISSA", "FAITH", "VISION", "SPIRIT", "MOLLY", "CONJURE", "GNOSIS"];
    return NextResponse.json({ words: fallbackWords }, { status: 200 });
  }
}
