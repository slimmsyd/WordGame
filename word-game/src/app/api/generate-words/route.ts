import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET() {
  try {
    const completion = await openai.chat.completions.create({
        model: "gpt-4o", // or gpt-3.5-turbo if 4o is not available/too expensive, but 4o is good for structured tasks
        messages: [
            {
                role: "system",
                content: "You are a helper for a word search game generator. You output ONLY valid JSON. Each request should produce DIFFERENT words from a large pool of possibilities."
            },
            {
                role: "user",
                content: (() => {
                 const themes = [
    { 
        name: "HOODOO and VOODOO", 
        context: "rootwork, conjure, mojo, gris, loas, spirits, crossroad, altar, candle, oil, jinx, hex, bless, cleanse, ancestors, orisha, santeria, petition, ritual, charm, talisman, lodestone, dragon blood, draw, luck, money, love, justice" 
    },
    { 
        name: "Gnostic Christianity & Spirituality", 
        context: "gnosis, archon, sophia, pleroma, aeon, demiurge, logos, divine spark, enlighten, awaken, conscious, chakra, aura, frequency, wavelength, manifest, cosmic, ethereal, meditate, sacred, wisdom, grace, miracle" 
    },
    { 
        name: "Mindset & Success", 
        context: "Think and Grow Rich, desire, faith, autosuggestion, imagination, burning desire, subconscious, vibration, thought, positive, magnet, attract, persist, master, control, achieve, wealth, purpose, passion, power, influence" 
    },
    { 
        name: "12 Week Year", 
        context: "execution, vision, goal, weekly, plan, strategy, tactics, action, measure, score, accountability, commitment, ownership, focus, priority, results, deadline, sprint, discipline, momentum, progress, track, routine, habit, intentional" 
    }
];
                    // 40% chance to focus on Hoodoo, 20% others
                    const rand = Math.random();
                    let focus = themes[0];
                    let others = [];
                    
                    if (rand < 0.4) {
                         focus = themes[0];
                         others = [themes[1], themes[2], themes[3]];
                    } else if (rand < 0.6) {
                         focus = themes[1];
                         others = [themes[0], themes[2], themes[3]];
                    } else if (rand < 0.8) {
                         focus = themes[2];
                         others = [themes[0], themes[1], themes[3]];
                    } else {
                         focus = themes[3];
                         others = [themes[0], themes[1], themes[2]];
                    }

                    return `Generate a list of 8-10 single words for a word search.
                    
                 
                    
                    THEME MIX (Fill the rest with these):
                    - Priority: ${focus.name} (${focus.context})
                    - Secondary: ${others.map(t => t.name).join(", ")}
                    
                    Constraints:
                    - Single words only (no spaces, no hyphens).
                    - Distinct from each other.
                    - Maximum 10 characters length.
                    - All UPPERCASE.
                    - Valid English or relevant terminology.
                    - Return strictly a JSON object with a key "words" containing the array of strings.
                    
                    `
                    
                    ;
                })()
            }
        ],
        response_format: { type: "json_object" },
        temperature: 1.2, // High for variety, but not so high it produces garbage
    });

    const content = completion.choices[0].message.content;
    if (!content) {
        throw new Error("No content received from OpenAI");
    }

    const data = JSON.parse(content);
    
    // Validate the response
    if (!data.words || !Array.isArray(data.words)) {
        throw new Error("Invalid response format - missing words array");
    }
    
    // Clean and validate each word
    const cleanWords = data.words
      .filter((word: any) => typeof word === 'string') // Only strings
      .map((word: string) => word.toUpperCase().trim()) // Force uppercase and trim
      .filter((word: string) => {
        // Only valid words: letters only, 1-10 chars
        return word.length > 0 && 
               word.length <= 10 && 
               /^[A-Z]+$/.test(word);
      })
      .slice(0, 10); // Max 10 words
    
    // Ensure we have at least some valid words
    if (cleanWords.length < 5) {
      console.error("Too few valid words generated:", cleanWords);
      throw new Error("Insufficient valid words generated");
    }
    
    return NextResponse.json({ words: cleanWords });

  } catch (error) {
    console.error("OpenAI API Error:", error);
    
    // Fallback words from all themes
    const fallbackWords = [
      "MOJO", "ISSA", "FAITH", "VISION", "SPIRIT", "MOLLY", "CONJURE", "GNOSIS"
    ];
    
    return NextResponse.json(
        { words: fallbackWords }, 
        { status: 200 } // Return 200 so the game still works
    );
  }
}
