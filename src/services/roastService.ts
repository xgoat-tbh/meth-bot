import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { pickRandom } from '../utils/random';

const FALLBACK_ROASTS = [
  "You're the human equivalent of a participation trophy — worthless, but at least you showed up.",
  "I'd roast you, but my therapist said I need to stop punching down.",
  "Your search history is the scariest thing horror writers have never seen.",
  "You're proof that evolution has a sense of humour and a dark side.",
  "Scientists are baffled — you're somehow both the cause and the cure for headaches.",
  "Your ex didn't need closure, they needed a decontamination shower.",
  "You have the personality of a wet napkin at a funeral.",
  "Most people have a spark of genius. You somehow managed to short-circuit the whole grid.",
  "Your dad's greatest regret isn't leaving — it's coming back.",
  "You're the human equivalent of reading the terms and conditions. Nobody wants to.",
  "If stupidity were a sport, you'd fail the drug test for being *that* enhanced.",
  "Your personality has the same energy as a dead phone at 3% battery.",
  "You peaked in a fever dream and have been downhill ever since.",
  "The only impressive thing about you is your ability to make everyone in the room feel smarter.",
  "Your future therapist is already pre-emptively exhausted.",
  "Even your spam folder sends your emails to the trash.",
  "You've got the energy of someone who argues with self-checkout machines — and loses.",
  "I've seen better decision-making from a drunk raccoon.",
  "Your hairline called. It said it needs space.",
  "You're the reason people put 'do not eat' warnings on silica gel packets.",
  "You have the sexual energy of a broken IKEA instruction manual.",
  "Your birth certificate is just a letter of apology from the hospital.",
  "Even your shadow started walking a bit behind you.",
  "You're living proof that the universe doesn't proofread.",
  "Dating you must feel like paying full price for a demo version.",
  "Your confidence is impressive for someone with so little basis for it.",
  "You're the NPC everyone skips dialogue with.",
  "Somewhere a village is missing its idiot and overachieving.",
  "You look like you were assembled from leftover parts on a Friday afternoon.",
  "Your vibe is 'last slice of pizza at a party nobody wanted but nobody threw out'.",
];

const ROAST_SYSTEM_PROMPT =
  'You are a savage, unhinged roast comedian generating roasts for an adult friend group server. ' +
  'Be brutal, creative, and darkly funny — go for the throat. 18+ humour is welcome. ' +
  'Do NOT be racist, sexist, homophobic, or discriminatory in a hateful way. ' +
  'Target ego, intelligence, appearance, life choices, and general existence. ' +
  'Keep it under 200 characters. No quotes around the response. Just the roast text.';

async function tryOpenAI(targetName: string): Promise<string | null> {
  if (!config.AI_API_KEY || !config.AI_API_URL) return null;
  try {
    const response = await axios.post(
      config.AI_API_URL,
      {
        model: config.AI_MODEL,
        messages: [
          { role: 'system', content: ROAST_SYSTEM_PROMPT },
          { role: 'user', content: `Roast this person: ${targetName}` },
        ],
        max_tokens: 100,
        temperature: 0.9,
      },
      {
        headers: { Authorization: `Bearer ${config.AI_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 8_000,
      }
    );
    const content: string | undefined = response.data?.choices?.[0]?.message?.content?.trim();
    if (content) {
      logger.info(`AI roast (OpenAI) generated for ${targetName}`);
      return content;
    }
    return null;
  } catch (err) {
    logger.warn(`OpenAI roast failed: ${(err as Error).message}`);
    return null;
  }
}

async function tryGemini(targetName: string): Promise<string | null> {
  if (!config.GEMINI_API_KEY) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.GEMINI_API_KEY}`;
    const response = await axios.post(
      url,
      {
        system_instruction: { parts: [{ text: ROAST_SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: `Roast this person: ${targetName}` }] }],
        generationConfig: { maxOutputTokens: 100, temperature: 0.9 },
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 8_000 }
    );
    const content: string | undefined =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (content) {
      logger.info(`AI roast (Gemini) generated for ${targetName}`);
      return content;
    }
    return null;
  } catch (err) {
    logger.warn(`Gemini roast failed: ${(err as Error).message}`);
    return null;
  }
}

export async function generateRoast(targetName: string): Promise<string> {
  const openAIResult = await tryOpenAI(targetName);
  if (openAIResult) return openAIResult;

  const geminiResult = await tryGemini(targetName);
  if (geminiResult) return geminiResult;

  logger.info(`Using fallback roast for ${targetName}`);
  return pickRandom(FALLBACK_ROASTS);
}
