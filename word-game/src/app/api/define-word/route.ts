import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { word } = await req.json();

    if (!word) {
      return NextResponse.json({ error: "Word is required" }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "system",
                content: "You are a helpful dictionary for a spiritual/pop-culture word game. Keep definitions concise (1-2 sentences)."
            },
            {
                role: "user",
                content: `Define the word "${word}" in the context of: 
                - Hoodoo/Voodoo/Spirituality
                - Gnostic Christianity
                - "Think and Grow Rich" / Mindset
                - "12 Week Year"
                - OR Pop Culture (HBO's Insecure) if it's a character name.

                If it's a generic word, define it spiritually or motivationally.
                Return ONLY the definition text.`
            }
        ],
        max_tokens: 100,
        temperature: 0.7,
    });

    const definition = completion.choices[0].message.content;
    return NextResponse.json({ definition });

  } catch (error) {
    console.error("OpenAI API Error:", error);
    return NextResponse.json(
        { error: "Failed to get definition" }, 
        { status: 500 }
    );
  }
}
