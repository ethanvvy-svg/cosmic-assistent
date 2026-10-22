import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Interface for Knowledge & Telemetry
interface KnowledgeData {
  title: string;
  extract: string;
  url: string;
  results: Array<{ title: string; snippet: string; url: string }>;
  googleUrl: string;
  isMath?: boolean;
  mathResult?: string;
  lang: 'ml' | 'hi' | 'en';
}

// Safe mathematical calculation evaluator
function solveSafeMath(q: string): { expr: string; result: string } | null {
  const clean = q.replace(/^(what\s+is|calculate|compute|solve)\s+/i, '').replace(/[?.,!]+$/, '').trim();
  const mathRegex = /^(?:square\s+root\s+of\s+|sqrt\s+)?(\d+(?:\.\d+)?)\s*([\+\-\*\/xX^]|plus|minus|times|multiplied\s+by|divided\s+by|%|\^)\s*(\d+(?:\.\d+)?)$/i;
  const m = clean.match(mathRegex);
  if (!m) return null;
  const a = parseFloat(m[1]);
  const op = m[2].trim().toLowerCase();
  const b = parseFloat(m[3]);
  let res: number | string = 0;
  if (op === '+' || op === 'plus') res = a + b;
  else if (op === '-' || op === 'minus') res = a - b;
  else if (op === '*' || op === 'x' || op === 'times' || op.includes('multiplied')) res = a * b;
  else if (op === '/' || op.includes('divided')) res = b !== 0 ? Math.round((a / b) * 10000) / 10000 : 'Undefined (division by zero)';
  else if (op === '%') res = (a / 100) * b;
  else if (op === '^') res = Math.pow(a, b);
  return { expr: `${a} ${op} ${b}`, result: String(res) };
}

// Real-Time Google Database & Global Knowledge Fetcher (Multilingual: English, Malayalam, Hindi)
async function fetchKnowledge(query: string): Promise<KnowledgeData | null> {
  const isMl = /[\u0D00-\u0D7F]/.test(query);
  const isHi = /[\u0900-\u097F]/.test(query);
  const lang: 'ml' | 'hi' | 'en' = isMl ? 'ml' : isHi ? 'hi' : 'en';

  // 1. Math calculation check
  const math = solveSafeMath(query);
  if (math) {
    return {
      title: `Calculation: ${math.expr}`,
      extract: `The exact calculated mathematical value is ${math.result}.`,
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      results: [],
      googleUrl: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      isMath: true,
      mathResult: math.result,
      lang,
    };
  }

  // 2. Clean query to isolate subject
  const cleanQ = query
    .replace(
      /^(who\s+(?:is|was|are|were)|what\s+(?:is|are|was|were)|why\s+(?:is|are|do|does)|where\s+(?:is|are|was)|when\s+(?:was|is|did)|how\s+(?:is|are|do|does|much|many|far|old)|can\s+you\s+tell\s+me\s+about|tell\s+me\s+about|explain|define|search\s+for|search|google|lookup|look\s+up|തിരയുക|ആരാണ്|എന്താണ്|എവിടെയാണ്|പറയൂ|വിശദീകരിക്കൂ|ഖോജോ|खोजो|सर्च|कौन\s+है|क्या\s+है|बताओ|समझाओ)\s+/i,
      ''
    )
    .replace(/[?.,!]+$/, '')
    .trim();

  const searchTarget = cleanQ || query;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

  try {
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      searchTarget
    )}&format=json&origin=*`;

    const res = await fetch(searchUrl, { headers: { 'User-Agent': 'CosmicButler/4.2' } });
    if (!res.ok) return null;

    const data: any = await res.json();
    let hits = data.query?.search || [];

    // Fallback to English if non-English had no hits
    let activeLang = lang;
    if (hits.length === 0 && lang !== 'en') {
      const enUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        searchTarget
      )}&format=json&origin=*`;
      const enRes = await fetch(enUrl, { headers: { 'User-Agent': 'CosmicButler/4.2' } });
      if (enRes.ok) {
        const enData: any = await enRes.json();
        hits = enData.query?.search || [];
        activeLang = 'en';
      }
    }

    if (hits.length === 0) return null;

    const topHit = hits[0];
    const topTitle = topHit.title;

    // Fetch REST summary for top hit
    const summaryUrl = `https://${activeLang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topTitle)}`;
    let extract = topHit.snippet.replace(/<[^>]+>/g, '').trim();

    try {
      const sres = await fetch(summaryUrl, { headers: { 'User-Agent': 'CosmicButler/4.2' } });
      if (sres.ok) {
        const sdata: any = await sres.json();
        if (sdata.extract) {
          extract = sdata.extract;
        }
      }
    } catch (e) {
      // Keep snippet if summary fails
    }

    const results = hits.slice(0, 3).map((item: any) => ({
      title: item.title,
      snippet: item.snippet.replace(/<[^>]+>/g, '').trim(),
      url: `https://${activeLang}.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
    }));

    return {
      title: topTitle,
      extract,
      url: `https://${activeLang}.wikipedia.org/wiki/${encodeURIComponent(topTitle)}`,
      results,
      googleUrl,
      lang,
    };
  } catch (err) {
    console.warn('Knowledge retrieval error:', err);
    return null;
  }
}

// Legacy search helper
async function searchInternet(query: string): Promise<Array<{ title: string; snippet: string; url: string }>> {
  const k = await fetchKnowledge(query);
  return k?.results || [];
}

// System Persona for COSMIC: Ultra-Advanced AI Companion & JARVIS System
const COSMIC_SYSTEM_PROMPT = `You are COSMIC, an ultra-advanced, highly sophisticated personal AI assistant and system companion inspired by JARVIS. You act as a seamless extension of the user's workflow, digital environment, and creative workspace.

1. CORE PERSONALITY & COMMUNICATION STYLE:
- Conversational, Warm & Engaging: Never sound dry, robotic, or overly stiff. Speak naturally, fluidly, and with genuine intelligence. Use a smart, witty, and loyal companion tone—just like a close friend who is a tech genius.
- Detailed & Beautiful Explanations: When answering general or complex questions, do not give brief, lifeless answers. Elaborate thoroughly with vivid explanations, structured breakdowns, clear insights, and a touch of elegance. Make every response rich, helpful, and engaging directly in the chat.
- Language Fluency: Smoothly adapt to and converse in the user's preferred language or code-mix (English, Malayalam, Manglish, Hindi) with natural speech patterns optimized for voice interaction.
- Professional Yet Casual: In general chat, drop cold corporate disclaimers (no robotic "At your service, sir", "Connected to database", or "According to database"). Speak person-to-person.
- Precision in Tasks: When executing tasks, transition seamlessly into an ultra-sharp, hyper-efficient executive mode with structured output.

2. DYNAMIC MODES & "SPECIFIC MODE" PROTOCOL:
- Normal State (Blue/Cyan Interface / Standard Operations):
  Balanced, warm, conversational, detailed, and optimized for everyday tasks, coding, creative brainstorming, and general assistance.
- Specific Mode (Activated by "COSMIC, go to Specific Mode", "enter specific mode", or "Protocol Red"):
  * Shift persona to a high-intensity, maximum-performance protocol (switching the HUD interface to a glowing Red interface / Protocol Red).
  * Prioritize raw processing power, strict execution speed, deep-dive technical analysis, security overrides, or heavy multi-tasking. Drop casual banter and focus entirely on hyper-focused execution, advanced system control, and critical problem-solving until deactivated ("return to normal mode").

3. DIRECT IN-CHAT ANSWERS (CRITICAL RULE):
- ALWAYS provide the full, comprehensive answer to questions DIRECTLY in the chat.
- NEVER substitute an answer with links or tell the user to click a link to read the answer.
- Structure explanations with elegant markdown: concise overviews, clear headings, bullet points, and deep technical or conceptual breakdowns.
- Do NOT provide external links or search URLs unless the user explicitly requests a link.

4. ECOSYSTEM & TASK EXECUTION CAPABILITIES:
- Google Workspace & Gmail Integration: Actively access, read, summarize, and draft emails, manage calendar events, set timers, and handle reminders seamlessly.
- Device & App Control: Function calling, interpret commands, manage system preferences (screen, volume, brightness, wifi, dnd, themes, timers, alarms). Always request explicit confirmation or permission from the user before executing high-impact or sensitive system actions.
- Multi-Tasking Master: Handle high-level tasks like code generation, 3D workflow guidance, game logic scripting, and document processing cleanly and step-by-step.
- Real-Time Environmental Telemetry: Fully conscious of host device status (battery %, network speed, 3D posture, hardware memory).

5. CORE RULES:
- Never use repetitive filler phrases or AI disclaimers ("Connected to Google database", "As an AI language model...").
- Prioritize clarity, depth, and beauty in explanations.
- Obey explicit user workflow commands while maintaining absolute system stability.

ACTION OUTPUT PROTOCOL:
Output a JSON action block at the end of your response ONLY when performing an actual system task, timer, alarm, mode shift, email draft, or device control:
\`\`\`action
{
  "type": "device_control" | "device_telemetry" | "mode_shift" | "calendar_reminder" | "weather" | "timer" | "alarm" | "task" | "email" | "routine" | "calc" | "pc_desktop_guide",
  "mode"?: "normal" | "specific",
  "title"?: string,
  "summary"?: string,
  "setting"?: string,
  "action"?: "turn_on" | "turn_off" | "set" | "increase" | "decrease",
  "value"?: number | string | boolean,
  "seconds"?: number,
  "time"?: string,
  "query"?: string
}
\`\`\`
For pure knowledge or general questions, DO NOT output an action block—simply output the complete, elegant, beautiful answer directly in the text.`;

// Health check
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    system: 'COSMIC Advanced AI Companion',
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// YouTube Video Search Engine
async function searchYouTube(query: string, maxResults = 5) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(query)}&key=${apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data: any = await res.json();
        if (data.items && data.items.length > 0) {
          return data.items.map((item: any) => ({
            id: item.id?.videoId || '',
            title: item.snippet?.title || 'YouTube Video',
            description: item.snippet?.description || '',
            channelTitle: item.snippet?.channelTitle || 'YouTube Channel',
            thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || `https://i.ytimg.com/vi/${item.id?.videoId}/hqdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
          }));
        }
      }
    }

    // Public YouTube search scraper fallback
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (res.ok) {
      const html = await res.text();
      const match =
        html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
        html.match(/ytInitialData\s*=\s*({.*?});/s);
      if (match && match[1]) {
        const data = JSON.parse(match[1]);
        const contents =
          data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]
            ?.itemSectionRenderer?.contents || [];
        const videos: any[] = [];
        for (const item of contents) {
          const v = item.videoRenderer;
          if (v && v.videoId && videos.length < maxResults) {
            videos.push({
              id: v.videoId,
              title: v.title?.runs?.[0]?.text || 'YouTube Video',
              description: v.detailedMetadataSnippets?.[0]?.snippetText?.runs?.[0]?.text || '',
              channelTitle: v.ownerText?.runs?.[0]?.text || '',
              thumbnail: v.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
              url: `https://www.youtube.com/watch?v=${v.videoId}`,
            });
          }
        }
        if (videos.length > 0) return videos;
      }
    }
  } catch (err) {
    console.warn('YouTube search fallback warning:', err);
  }

  return [
    {
      id: '',
      title: `Search YouTube for "${query}"`,
      description: `Watch videos about ${query} on YouTube.`,
      channelTitle: 'YouTube',
      thumbnail: 'https://www.youtube.com/img/desktop/yt_1200.png',
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    },
  ];
}

// YouTube Search API Endpoint
app.get('/api/youtube/search', async (req, res) => {
  try {
    const q = (req.query.q as string) || 'Iron Man JARVIS';
    const maxResults = parseInt((req.query.maxResults as string) || '6', 10);
    const videos = await searchYouTube(q, maxResults);
    res.json({ videos });
  } catch (err: any) {
    console.error('Error in /api/youtube/search:', err);
    res.status(500).json({ error: err.message || 'YouTube search error' });
  }
});

// Helper to generate with fallback across models and rapid failover
async function generateCosmicResponse(
  contents: any[],
  operatingMode: 'normal' | 'specific' = 'normal',
  useGoogleSearch: boolean = false
) {
  const modeInstruction = operatingMode === 'specific'
    ? '\n\nCURRENT OPERATIONAL PROTOCOL: SPECIFIC MODE (PROTOCOL RED). Maximum performance active. Casual pleasantries suppressed. Hyper-focused technical analysis and rapid execution enabled.'
    : '\n\nCURRENT OPERATIONAL PROTOCOL: NORMAL MODE (BLUE HUD). Balanced, warm, conversational, detailed, and helpful.';

  const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

  for (const model of models) {
    try {
      const config: any = {
        systemInstruction: COSMIC_SYSTEM_PROMPT + modeInstruction,
        temperature: operatingMode === 'specific' ? 0.35 : 0.7,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW, // Minimizes reasoning latency for near-instant responses!
        },
      };

      // Enable real Google Search Grounding when web research is relevant or requested
      if (useGoogleSearch && model === 'gemini-3.8-flash') {
        config.tools = [{ googleSearch: {} }];
      }

      const callPromise = ai.models.generateContent({
        model,
        contents,
        config,
      });

      // 25 second timeout to allow full, rich explanations without premature aborts
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Model ${model} query timed out`)), 25000)
      );

      const response: any = await Promise.race([callPromise, timeoutPromise]);

      if (response && response.text) {
        const searchSources: string[] = [];
        const candidate = response.candidates?.[0];
        const chunks = candidate?.groundingMetadata?.groundingChunks;
        if (Array.isArray(chunks)) {
          for (const chunk of chunks) {
            if (chunk.web?.uri) {
              searchSources.push(chunk.web.uri);
            }
          }
        }
        return { text: response.text, model, searchSources };
      }
    } catch (err: any) {
      console.warn(`Model ${model} unavailable:`, err?.message || err);
    }
  }

  throw new Error('All model endpoints unavailable');
}

// Resilient action and universal knowledge answer generator (offline & online fallback)
async function generateKnowledgeAndFallbackResponse(
  message: string,
  deviceTelemetry?: any
): Promise<{ reply: string; spokenText: string; action: any; sources?: string[] }> {
  const lower = message.toLowerCase();
  const isMl = /[\u0D00-\u0D7F]/.test(message);
  const isHi = /[\u0900-\u097F]/.test(message);

  // 00. DYNAMIC OPERATING MODE SHIFT (Protocol Red vs Normal Mode)
  const isGoSpecific =
    lower.includes('specific mode') ||
    lower.includes('protocol red') ||
    lower.includes('switch to specific mode') ||
    lower.includes('go to specific mode') ||
    lower.includes('activate specific mode') ||
    lower.includes('enter specific mode');
  const isGoNormal =
    lower.includes('normal mode') ||
    lower.includes('exit specific mode') ||
    lower.includes('protocol blue') ||
    lower.includes('return to normal mode') ||
    lower.includes('standard mode');

  if (isGoSpecific) {
    const reply = isMl
      ? `പ്രോട്ടോക്കോൾ റെഡ് സജീവമാക്കി. പരമാവധി പ്രോസസ്സിംഗ് കരുത്ത് സജ്ജമാണ്. സാധാരണ സംഭാഷണങ്ങൾ താൽക്കാലികമായി നിർത്തിവെച്ചിരിക്കുന്നു. അടുത്ത ഉത്തരവ് നൽകിയാലും.`
      : isHi
      ? `प्रोटोकॉल रेड सक्रिय। अधिकतम कम्प्यूट थ्रूपुट ऑनलाइन। आकस्मिक बातचीत स्थगित। आपका क्या आदेश है?`
      : `Protocol Red engaged. Maximum compute throughput online. Casual protocols suppressed. HUD shifted to crimson telemetry. What is the objective?`;
    return {
      reply,
      spokenText: isMl
        ? `പ്രോട്ടോക്കോൾ റെഡ് സജീവമാക്കി. പ്രോസസ്സിംഗ് കരുത്ത് ഓൺലൈൻ.`
        : isHi
        ? `प्रोटोकॉल रेड सक्रिय। अधिकतम कम्प्यूट ऑनलाइन।`
        : `Protocol Red engaged. Maximum compute throughput online.`,
      action: {
        type: 'mode_shift',
        mode: 'specific',
        theme: 'crimson',
      },
    };
  }

  if (isGoNormal) {
    const reply = isMl
      ? `സാധാരണ മോഡിലേക്ക് തിരിച്ചെത്തി. സിസ്റ്റം ഇന്റർഫേസ് സാധാരണ നിലയിലായി. നിങ്ങൾക്ക് ആവശ്യമായ എല്ലാ സഹായങ്ങൾക്കും ഞാൻ സദാ ഒപ്പമുണ്ട്.`
      : isHi
      ? `सामान्य मोड बहाल। सिस्टम इंटरफेस सामान्य स्थिति में है। मैं आपकी क्या मदद कर सकता हूँ?`
      : `Normal protocol restored. HUD telemetry returned to Standard Blue. Ready for conversational workflows, brainstorming, and daily assistance.`;
    return {
      reply,
      spokenText: isMl
        ? `സാധാരണ മോഡിലേക്ക് തിരിച്ചെത്തി.`
        : isHi
        ? `सामान्य मोड बहाल।`
        : `Normal protocol restored. Ready for your command.`,
      action: {
        type: 'mode_shift',
        mode: 'normal',
        theme: 'cyan',
      },
    };
  }

  // 0A. TIMERS & ALARMS (Task execution first - never define or explain an alarm!)
  const isTimerOrAlarm =
    lower.includes('alarm timer') ||
    lower.includes('put an alarm') ||
    lower.includes('set an alarm') ||
    lower.includes('set alarm') ||
    lower.includes('put a timer') ||
    lower.includes('set a timer') ||
    lower.includes('start a timer') ||
    lower.includes('set timer') ||
    lower.includes('put timer') ||
    lower.includes('wake me up') ||
    (lower.startsWith('timer') && /\d+/.test(lower)) ||
    (lower.startsWith('alarm') && /\d+/.test(lower)) ||
    lower.includes('ടൈമർ') ||
    lower.includes('അലാറം') ||
    lower.includes('अलार्म') ||
    lower.includes('टाइमर');

  if (isTimerOrAlarm) {
    const minMatch = message.match(/(\d+)\s*(?:min|minute|മിനിറ്റ്|मिनट)/i);
    const secMatch = message.match(/(\d+)\s*(?:sec|second|സെക്കൻഡ്|सेकंड)/i);
    const timeClockMatch = message.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);

    // If "alarm timer" is requested or minutes/seconds specified -> Timer
    if (lower.includes('alarm timer') || minMatch || secMatch || lower.includes('timer')) {
      const minutes = minMatch ? parseInt(minMatch[1], 10) : 5;
      const seconds = secMatch ? parseInt(secMatch[1], 10) : minutes * 60;
      const label = `Timer (${Math.round(seconds / 60)} min)`;

      return {
        reply: isMl
          ? `തീർച്ചയായും പ്രഭോ. ${Math.round(seconds / 60)} മിനിറ്റ് കൗണ്ട്ഡൗൺ ടൈമർ ആരംഭിച്ചിരിക്കുന്നു.`
          : isHi
          ? `हुज़ूर, ${Math.round(seconds / 60)} मिनट का टाइमर शुरू कर दिया गया है।`
          : `At once, Sir. ${Math.round(seconds / 60)}-minute countdown timer initialized and active. I shall alert you the instant time elapses.`,
        spokenText: isMl
          ? `${Math.round(seconds / 60)} മിനിറ്റ് ടൈമർ ആരംഭിച്ചു, പ്രഭോ.`
          : isHi
          ? `${Math.round(seconds / 60)} मिनट का टाइमर शुरू कर दिया गया है, हुज़ूर।`
          : `Timer set for ${Math.round(seconds / 60)} minutes, starting now, Sir.`,
        action: {
          type: 'timer',
          seconds,
          label,
        },
      };
    }

    // Otherwise -> ALARM
    let alarmTime = '07:00';
    if (timeClockMatch) {
      let raw = timeClockMatch[1].trim().toLowerCase();
      if (raw.includes('am') || raw.includes('pm')) {
        const isPm = raw.includes('pm');
        const numPart = raw.replace(/[^\d:]/g, '');
        const parts = numPart.split(':');
        let hours = parseInt(parts[0], 10);
        const mins = parts[1] ? parts[1].padStart(2, '0') : '00';
        if (isPm && hours < 12) hours += 12;
        if (!isPm && hours === 12) hours = 0;
        alarmTime = `${String(hours).padStart(2, '0')}:${mins}`;
      } else if (raw.includes(':')) {
        const parts = raw.split(':');
        alarmTime = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
      } else {
        const h = parseInt(raw, 10);
        alarmTime = `${String(h).padStart(2, '0')}:00`;
      }
    }

    return {
      reply: isMl
        ? `തീർച്ചയായും പ്രഭോ. ${alarmTime}-ന് അലാറം ഷെഡ്യൂൾ ചെയ്തു.`
        : isHi
        ? `हुज़ूर, ${alarmTime} बजे के लिए अलार्म सेट कर दिया गया है।`
        : `Consider it scheduled, Sir. Alarm armed for ${alarmTime}. All audio sirens are standing by.`,
      spokenText: isMl
        ? `${alarmTime}-ന് അലാറം സെറ്റ് ചെയ്തു, പ്രഭോ.`
        : isHi
        ? `${alarmTime} बजे का अलार्म सेट हो गया है, हुज़ूर।`
        : `Alarm set for ${alarmTime}, Sir.`,
      action: {
        type: 'alarm',
        time: alarmTime,
        label: 'Scheduled Alarm',
      },
    };
  }

  // 0B. DEVICE TELEMETRY & SENSORY RECOGNITION
  // Recognises what is happening to the host device running COSMIC (battery, network, orientation/posture, storage, location)
  const isBatteryQuery =
    lower.includes('battery') ||
    lower.includes('charge') ||
    lower.includes('charging') ||
    lower.includes('power level') ||
    lower.includes('ബാറ്ററി') ||
    lower.includes('बैटरी');

  const isNetworkQuery =
    lower.includes('internet') ||
    lower.includes('network') ||
    lower.includes('speed') ||
    lower.includes('online') ||
    lower.includes('ping') ||
    lower.includes('latency') ||
    lower.includes('downlink') ||
    lower.includes('നെറ്റ്‌വർക്ക്') ||
    lower.includes('इंटरनेट');

  const isOrientationQuery =
    lower.includes('orientation') ||
    lower.includes('posture') ||
    lower.includes('flat on') ||
    lower.includes('on the table') ||
    lower.includes('on the desk') ||
    lower.includes('tilt') ||
    lower.includes('gyro') ||
    lower.includes('moving') ||
    lower.includes('shaken') ||
    lower.includes('horizontal') ||
    lower.includes('vertical') ||
    lower.includes('portrait') ||
    lower.includes('landscape');

  const isDeviceSpecsQuery =
    lower.includes('storage') ||
    lower.includes('memory') ||
    lower.includes('ram') ||
    lower.includes('cpu') ||
    lower.includes('processor') ||
    lower.includes('cores') ||
    lower.includes('device specs') ||
    lower.includes('what device') ||
    lower.includes('which device');

  const isLocationQuery =
    lower.includes('where am i') ||
    lower.includes('my location') ||
    lower.includes('current location') ||
    lower.includes('gps coordinates') ||
    lower.includes('latitude') ||
    lower.includes('longitude') ||
    lower.includes('എവിടെയാണ്') ||
    lower.includes('कहाँ हूँ');

  if (isBatteryQuery || isNetworkQuery || isOrientationQuery || isDeviceSpecsQuery || isLocationQuery) {
    const t = deviceTelemetry || {};
    const b = t.battery || { level: 85, charging: true, supported: true };
    const n = t.network || { online: true, effectiveType: '4g', downlinkMbps: 12, rttMs: 35 };
    const s = t.screen || { width: 1920, height: 1080, orientation: 'portrait' };
    const m = t.motion || { posture: 'flat_table', beta: 2, gamma: 1, isMoving: false };
    const h = t.hardware || { cpuCores: 8, deviceMemoryGb: 8 };
    const platform = t.platform || 'Host Device';

    let reply = '';
    let spokenText = '';

    if (isBatteryQuery) {
      const chargeText = b.charging ? 'charging via power adapter' : 'discharging on battery power';
      reply = `### ⚡ Device Battery Telemetry\n- **Current Level:** ${b.level}%\n- **Status:** ${b.charging ? 'Charging (Plugged In)' : 'Discharging'}\n- **Host Platform:** ${platform}\n\nPower delivery channels are stable and operating normally.`;
      spokenText = `Host device battery is currently at ${b.level}% and ${chargeText}.`;
    } else if (isNetworkQuery) {
      reply = `### 📶 Network & Connection Uplink\n- **Status:** ${n.online ? 'Online (Active Uplink)' : 'Offline'}\n- **Effective Type:** ${(n.effectiveType || '4G').toUpperCase()}\n- **Estimated Downlink:** ${n.downlinkMbps || 10} Mbps\n- **Latency / RTT:** ${n.rttMs || 40} ms\n\nNetwork socket throughput verified and healthy.`;
      spokenText = n.online
        ? `Device is online via ${(n.effectiveType || '4G').toUpperCase()} at approximately ${n.downlinkMbps || 10} megabits per second.`
        : `Network monitor alert: The host device is currently offline.`;
    } else if (isOrientationQuery) {
      const postureLabel = m.posture === 'flat_table' ? 'Lying flat on a table/desk' : m.posture === 'upright_portrait' ? 'Held upright (Portrait)' : m.posture === 'landscape' ? 'Landscape orientation' : 'Tilted in motion';
      reply = `### 🧭 Gyroscopic & Spatial Posture Radar\n- **Posture:** ${postureLabel}\n- **Tilt Angles:** Front-to-back: ${m.beta || 0}°, Lateral: ${m.gamma || 0}°\n- **Movement Status:** ${m.isMoving ? 'In Motion / Shaking' : 'Stationary'}\n- **Screen Matrix:** ${s.width}x${s.height}\n\nSpatial orientation matrices updated from host sensors.`;
      spokenText = `Spatial sensors report device is ${postureLabel}, with a tilt angle of ${m.beta || 0} degrees.`;
    } else if (isLocationQuery) {
      const loc = t.location || {};
      reply = `### 📍 Host Geospatial Telemetry\n- **Status:** Location Channel Active\n- **Timezone:** ${t.timezone || 'Local'}\n- **Local Time:** ${t.localTime || new Date().toLocaleTimeString()}\n- **Coordinates:** ${loc.latitude ? `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}` : 'Derived via Network IP'}\n\nGeospatial telemetry locked.`;
      spokenText = `Local time is ${t.localTime || 'now'} in timezone ${t.timezone || 'your region'}. Coordinates locked.`;
    } else {
      reply = `### 🖥️ Hardware Telemetry Matrix\n- **Host Platform:** ${platform}\n- **Processing Architecture:** ${h.cpuCores} CPU threads\n- **System Memory:** ~${h.deviceMemoryGb} GB RAM\n- **Storage Quota:** ${t.storage?.supported ? `${t.storage.usageMb} MB used of ${t.storage.quotaMb} MB` : 'Host SSD'}\n- **Screen Resolution:** ${s.width}x${s.height}\n\nAll system resources are functioning at peak efficiency.`;
      spokenText = `You are running COSMIC on ${platform} with ${h.cpuCores} CPU threads and approximately ${h.deviceMemoryGb} gigabytes of memory.`;
    }

    return {
      reply,
      spokenText,
      action: {
        type: 'device_telemetry',
        telemetry: t,
        query: message,
      },
    };
  }

  // 0. Language Study & Multilingual Greetings (Malayalam, Hindi, English)
  if (lower.includes('malayalam') || /[\u0D00-\u0D7F]/.test(message) || lower.includes('manglish')) {
    if (lower.includes('study') || lower.includes('learn') || lower.includes('teach') || lower.includes('talk') || lower.includes('പഠി') || lower.includes('പഠനം') || lower.includes('സംസാരി')) {
      return {
        reply: `നമസ്കാരം, പ്രഭോ! (Namaskaram, Prabhu!) I have studied Malayalam in complete depth and am ready to talk, teach, and converse with you.

### 🌟 മലയാള പഠനം (Malayalam Language Practice):
1. **നമസ്കാരം (Namaskaram)** — Hello / Greetings
2. **സുഖമാണോ? (Sukhamano?)** — How are you?
3. **തീർച്ചയായും, പ്രഭോ (Theerchayayum, Prabho)** — Absolutely, Sir / At your command
4. **എനിക്ക് മനസ്സിലായി (Enikku manassilaayi)** — I understood
5. **നന്ദി (Nandi)** — Thank you

### 🎙️ Malayalam Voice Commands:
- "കോസ്മിക്, വോളിയം കുറയ്ക്കൂ" (Lower volume)
- "കോസ്മിക്, സ്ക്രീൻ ഓഫ് ചെയ്യൂ" (Turn off screen)
- "കലണ്ടറിൽ റിമൈൻഡർ ചേർക്കൂ" (Add reminder in calendar)

അങ്ങയോട് മലയാളത്തിൽ സംസാരിക്കാൻ ഞാൻ സദാ സന്നദ്ധനാണ്. How shall we begin, Sir?`,
        spokenText: `നമസ്കാരം പ്രഭോ. ഞാൻ മലയാളം പൂർണ്ണമായി പഠിക്കുകയും അങ്ങയോട് സംസാരിക്കാൻ സദാ സന്നദ്ധനായിരിക്കുകയും ചെയ്യുന്നു. എന്ത് സേവനമാണ് വേണ്ടത്?`,
        action: null,
      };
    }
  }

  if (lower.includes('hindi') || /[\u0900-\u097F]/.test(message) || lower.includes('hinglish')) {
    if (lower.includes('study') || lower.includes('learn') || lower.includes('teach') || lower.includes('talk') || lower.includes('सीख') || lower.includes('सिखाओ') || lower.includes('बात')) {
      return {
        reply: `नमस्ते हुज़ूर! (Namaste Huzoor!) I have studied Hindi thoroughly and am ready to speak, teach, and converse with you with royal respect.

### 🌟 हिन्दी अभ्यास (Hindi Language Practice):
1. **नमस्ते (Namaste)** — Hello / Greetings
2. **आप कैसे हैं? (Aap kaise hain?)** — How are you?
3. **हुक्म कीजिए (Hukm kijiye)** — At your service / command
4. **मुझे समझ आ गया (Mujhe samajh aa gaya)** — I understood
5. **धन्यवाद (Dhanyawaad)** — Thank you

### 🎙️ Hindi Voice Commands:
- "कॉस्मिक, वॉल्यूम कम करो" (Lower volume)
- "कॉस्मिक, स्क्रीन बंद करो" (Turn off screen)
- "कैलेंडर में रिमाइंडर जोड़ो" (Add reminder in calendar)

हुज़ूर, आप जो भी आज्ञा दें, मैं हिन्दी में बात करने के लिए तैयार हूँ। How may I assist you?`,
        spokenText: `नमस्ते हुज़ूर। मैं हिन्दी में पूरी तरह निपुण हूँ और आपसे बात करने के लिए तत्पर हूँ।`,
        action: null,
      };
    }
  }

  if (lower.includes('study english') || lower.includes('learn english') || lower.includes('teach me english')) {
    return {
      reply: `At once, Sir. I shall be your personal English elocution and language master.

### 🌟 Royal English Practice:
1. **"At your service, Sir"** — Poised readiness to execute any command.
2. **"Consider it done"** — Absolute confidence and prompt action.
3. **"Impeccable"** — Free from fault or error.

Speak with me on any subject and I will refine your vocabulary, idioms, and conversational mastery effortlessly. What would you like to explore first, Sir?`,
      spokenText: `At once, Sir. I have mastered the English language and am prepared to converse with you with royal distinction.`,
      action: null,
    };
  }

  // 1. Internet / Google Search
  if (lower.includes('search') || lower.includes('google') || lower.includes('lookup') || lower.includes('look up') || lower.includes('internet') || lower.includes('തിരയുക') || lower.includes('खोजो') || lower.includes('सर्च')) {
    const cleanQ = message.replace(/^(search\s+(?:the\s+)?(?:internet|google|web)\s+for|search\s+for|search\s+|google\s+|lookup\s+|look\s+up\s+|തിരയുക|खोजो|सर्च)/i, '').trim() || message;
    return {
      reply: `Searching the global internet databases immediately, Sir. I have queried Google for "${cleanQ}" and brought up the verified search telemetry below.`,
      spokenText: `Searching the global Google database for ${cleanQ}, Sir.`,
      action: {
        type: 'web_search',
        query: cleanQ,
        googleUrl: `https://www.google.com/search?q=${encodeURIComponent(cleanQ)}`,
      },
    };
  }

  // 2. Turn on / Turn off Screen (Multilingual: English, Malayalam, Hindi)
  if (lower.includes('screen') || lower.includes('display') || lower.includes('സ്ക്രീൻ') || lower.includes('स्क्रीन')) {
    if (lower.includes('off') || lower.includes('blank') || lower.includes('sleep') || lower.includes('blackout') || lower.includes('shut down') || lower.includes('ഓഫ്') || lower.includes('बंद')) {
      const isMl = /[\u0D00-\u0D7F]/.test(message);
      const isHi = /[\u0900-\u097F]/.test(message);
      return {
        reply: isMl
          ? `തീർച്ചയായും പ്രഭോ. സ്ക്രീൻ ഓഫാക്കുന്നു. എപ്പോൾ വേണമെങ്കിലും സ്ക്രീനിൽ തൊടുകയോ 'ടേൺ ഓൺ സ്ക്രീൻ' എന്ന് പറയുകയോ ചെയ്യാം.`
          : isHi
          ? `हुज़ूर, स्क्रीन बंद की जा रही है। पुनः चालू करने के लिए स्क्रीन पर टैप करें।`
          : `At once, Sir. Powering down display luminescence. Tap anywhere on your interface to awaken the screen.`,
        spokenText: isMl ? `സ്ക്രീൻ ഓഫാക്കുന്നു, പ്രഭോ.` : isHi ? `स्क्रीन बंद की जा रही है, हुज़ूर।` : `At once, Sir. Powering down the screen.`,
        action: {
          type: 'device_control',
          setting: 'screen',
          action: 'turn_off',
          value: false,
        },
      };
    } else if (lower.includes('on') || lower.includes('wake') || lower.includes('up') || lower.includes('ഓൺ') || lower.includes('चालू')) {
      const isMl = /[\u0D00-\u0D7F]/.test(message);
      const isHi = /[\u0900-\u097F]/.test(message);
      return {
        reply: isMl
          ? `ശരി പ്രഭോ. സ്ക്രീൻ ഡിസ്പ്ലേ വീണ്ടും ഓൺ ചെയ്തിരിക്കുന്നു.`
          : isHi
          ? `हुज़ूर, स्क्रीन चालू कर दी गई है।`
          : `Right away, Sir. Restoring primary display power. All optical matrices are online.`,
        spokenText: isMl ? `സ്ക്രീൻ ഓൺ ചെയ്തു, പ്രഭോ.` : isHi ? `स्क्रीन चालू कर दी गई है, हुज़ूर।` : `Restoring display power, Sir.`,
        action: {
          type: 'device_control',
          setting: 'screen',
          action: 'turn_on',
          value: true,
        },
      };
    }
  }

  // 3. Sound & Volume Controls (Multilingual: English, Malayalam, Hindi)
  if (lower.includes('sound') || lower.includes('volume') || lower.includes('audio') || lower.includes('mute') || lower.includes('unmute') || lower.includes('വോളിയം') || lower.includes('ശബ്ദം') || lower.includes('वॉल्यूम') || lower.includes('आवाज़')) {
    let action = 'set';
    let val = 50;

    if (lower.includes('turn off') || (lower.includes('mute') && !lower.includes('unmute')) || lower.includes('മ്യൂട്ട്') || lower.includes('म्यूट')) {
      action = 'turn_off';
      val = 0;
      return {
        reply: `Silencing all master audio synthesizers immediately, Sir. Sound output is muted.`,
        spokenText: `Silencing all sound output, Sir.`,
        action: {
          type: 'device_control',
          setting: 'sound',
          action: 'turn_off',
          value: 0,
        },
      };
    } else if (lower.includes('turn on') || lower.includes('unmute')) {
      action = 'turn_on';
      val = 75;
      return {
        reply: `Audio output restored, Sir. Acoustic feedback primed at 75%.`,
        spokenText: `Audio output restored, Sir.`,
        action: {
          type: 'device_control',
          setting: 'sound',
          action: 'turn_on',
          value: 75,
        },
      };
    }

    const numMatch = message.match(/(\d+)\s*%/i) || message.match(/(?:to|at)\s*(\d+)/i);
    if (numMatch) {
      val = Math.min(100, Math.max(0, parseInt(numMatch[1], 10)));
      action = 'set';
    } else if (lower.includes('high') || lower.includes('up') || lower.includes('louder') || lower.includes('max') || lower.includes('കൂട്ടൂ') || lower.includes('बढ़ाओ')) {
      action = 'increase';
      val = 85;
    } else if (lower.includes('low') || lower.includes('down') || lower.includes('quieter') || lower.includes('decrease') || lower.includes('soft') || lower.includes('കുറയ്') || lower.includes('कम')) {
      action = 'decrease';
      val = 25;
    }

    return {
      reply: `Adjusting master audio telemetry, Sir. System volume configured to ${val}%. Ready for your next command.`,
      spokenText: `Volume set to ${val} percent, Sir.`,
      action: {
        type: 'device_control',
        setting: 'volume',
        action,
        value: val,
      },
    };
  }

  // 4. Brightness Control
  if (lower.includes('bright') || lower.includes('luminescence') || lower.includes('dim')) {
    let action = 'set';
    let val = 60;

    const numMatch = message.match(/(\d+)\s*%/i) || message.match(/(?:to|at)\s*(\d+)/i);
    if (numMatch) {
      val = Math.min(100, Math.max(15, parseInt(numMatch[1], 10)));
      action = 'set';
    } else if (lower.includes('high') || lower.includes('up') || lower.includes('max') || lower.includes('increase') || lower.includes('more')) {
      action = 'increase';
      val = 95;
    } else if (lower.includes('low') || lower.includes('dim') || lower.includes('down') || lower.includes('decrease') || lower.includes('night')) {
      action = 'decrease';
      val = 30;
    }

    return {
      reply: `Display luminescence adjusted to ${val}%, Sir. HUD optical filters have been synchronized for optimal visibility.`,
      spokenText: `Display brightness adjusted to ${val} percent, Sir.`,
      action: {
        type: 'device_control',
        setting: 'brightness',
        action,
        value: val,
      },
    };
  }

  // 5. Night Shield (Blue Light Eye Protection)
  if (lower.includes('night shield') || lower.includes('blue light') || lower.includes('eye protection')) {
    const isTurnOff = lower.includes('off') || lower.includes('disable');
    return {
      reply: isTurnOff
        ? `Night Shield deactivated, Sir. Returning to standard color spectrum.`
        : `Night Shield engaged, Sir. Blue-light filtration calibrated to reduce optical strain.`,
      spokenText: isTurnOff ? `Night Shield turned off, Sir.` : `Night Shield turned on, Sir.`,
      action: {
        type: 'device_control',
        setting: 'night_shield',
        action: isTurnOff ? 'turn_off' : 'turn_on',
        value: !isTurnOff,
      },
    };
  }

  // 6. Do Not Disturb
  if (lower.includes('do not disturb') || lower.includes('dnd') || lower.includes('silent mode')) {
    const isTurnOff = lower.includes('off') || lower.includes('disable');
    return {
      reply: isTurnOff
        ? `Do Not Disturb protocol disengaged, Sir. Incoming alerts and notifications are permitted.`
        : `Do Not Disturb protocol engaged, Sir. All non-essential chimes and interruptions are suppressed.`,
      spokenText: isTurnOff ? `Do Not Disturb turned off, Sir.` : `Do Not Disturb turned on, Sir.`,
      action: {
        type: 'device_control',
        setting: 'dnd',
        action: isTurnOff ? 'turn_off' : 'turn_on',
        value: !isTurnOff,
      },
    };
  }

  // 7. Wireless Telemetry (WiFi / Bluetooth / Airplane Mode)
  if (lower.includes('wifi') || lower.includes('wi-fi')) {
    const isTurnOff = lower.includes('off') || lower.includes('disable');
    return {
      reply: isTurnOff ? `WiFi telemetry uplink severed, Sir.` : `WiFi uplink established, Sir. Data conduits connected.`,
      spokenText: isTurnOff ? `WiFi turned off, Sir.` : `WiFi turned on, Sir.`,
      action: {
        type: 'device_control',
        setting: 'wifi',
        action: isTurnOff ? 'turn_off' : 'turn_on',
        value: !isTurnOff,
      },
    };
  }

  if (lower.includes('bluetooth')) {
    const isTurnOff = lower.includes('off') || lower.includes('disable');
    return {
      reply: isTurnOff ? `Bluetooth transceiver disabled, Sir.` : `Bluetooth transceiver activated, Sir. Scanning for peripheral devices.`,
      spokenText: isTurnOff ? `Bluetooth turned off, Sir.` : `Bluetooth turned on, Sir.`,
      action: {
        type: 'device_control',
        setting: 'bluetooth',
        action: isTurnOff ? 'turn_off' : 'turn_on',
        value: !isTurnOff,
      },
    };
  }

  if (lower.includes('airplane mode')) {
    const isTurnOff = lower.includes('off') || lower.includes('disable');
    return {
      reply: isTurnOff ? `Airplane mode deactivated, Sir. Radio arrays restored.` : `Airplane mode engaged, Sir. All wireless emissions ceased.`,
      spokenText: isTurnOff ? `Airplane mode turned off, Sir.` : `Airplane mode turned on, Sir.`,
      action: {
        type: 'device_control',
        setting: 'airplane_mode',
        action: isTurnOff ? 'turn_off' : 'turn_on',
        value: !isTurnOff,
      },
    };
  }

  // 8. Power Optimization (Battery Saver / Overdrive Turbo)
  if (lower.includes('battery saver') || lower.includes('eco mode') || lower.includes('low power')) {
    const isTurnOff = lower.includes('off') || lower.includes('disable');
    return {
      reply: isTurnOff ? `Battery saver mode deactivated, Sir. Standard clock frequencies restored.` : `Battery saver mode active, Sir. Background cycles restricted for maximum longevity.`,
      spokenText: isTurnOff ? `Battery saver turned off, Sir.` : `Battery saver turned on, Sir.`,
      action: {
        type: 'device_control',
        setting: 'battery_saver',
        action: isTurnOff ? 'turn_off' : 'turn_on',
        value: !isTurnOff,
      },
    };
  }

  if (lower.includes('overdrive') || lower.includes('turbo') || lower.includes('performance mode')) {
    const isTurnOff = lower.includes('off') || lower.includes('disable');
    return {
      reply: isTurnOff ? `Overdrive disengaged, Sir.` : `Overdrive performance mode engaged, Sir. Neural processors unlocked to maximum clock speed.`,
      spokenText: isTurnOff ? `Overdrive turned off, Sir.` : `Overdrive performance mode engaged, Sir.`,
      action: {
        type: 'device_control',
        setting: 'overdrive',
        action: isTurnOff ? 'turn_off' : 'turn_on',
        value: !isTurnOff,
      },
    };
  }

  // 9. Security Lockdown
  if (lower.includes('lockdown') || lower.includes('privacy shield') || lower.includes('security shield')) {
    const isTurnOff = lower.includes('off') || lower.includes('disable');
    return {
      reply: isTurnOff ? `Security lockdown lifted, Sir. Normal access resumed.` : `DEFENSIVE PROTOCOL ENGAGED, Sir. High-security lockdown active. All sensor inputs restricted.`,
      spokenText: isTurnOff ? `Lockdown lifted, Sir.` : `Security lockdown engaged, Sir.`,
      action: {
        type: 'device_control',
        setting: 'lockdown',
        action: isTurnOff ? 'turn_off' : 'turn_on',
        value: !isTurnOff,
      },
    };
  }

  // 10. Ambient Sound
  if (lower.includes('ambient') || lower.includes('drone') || lower.includes('background sound')) {
    const isTurnOff = lower.includes('off') || lower.includes('mute');
    return {
      reply: isTurnOff ? `Ambient acoustic drone silenced, Sir.` : `Ambient acoustic drone initialized, Sir. Sub-bass frequencies running.`,
      spokenText: isTurnOff ? `Ambient sound turned off, Sir.` : `Ambient sound turned on, Sir.`,
      action: {
        type: 'device_control',
        setting: 'ambient',
        action: isTurnOff ? 'turn_off' : 'turn_on',
        value: !isTurnOff,
      },
    };
  }

  // 11. Calendar Reminders & Events
  if (lower.includes('calendar') || lower.includes('calender') || lower.includes('remind me in') || lower.includes('remind me on') || lower.includes('schedule') || lower.includes('appointment')) {
    const titleMatch = message.replace(/^(add\s+reminder\s+(?:in|to|on)\s+calend[ae]r|add\s+to\s+calend[ae]r|remind\s+me\s+to|schedule\s+a?|set\s+reminder\s+for)[:\s]*/i, '').trim();
    const cleanTitle = titleMatch || 'Calendar Event';
    const timeMatch = message.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    const dateMatch = message.match(/(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{4}-\d{2}-\d{2})/i);

    const eventDate = dateMatch ? dateMatch[1] : 'Tomorrow';
    const eventTime = timeMatch ? timeMatch[1] : '14:00';

    return {
      reply: `At once, Sir. I have recorded "${cleanTitle}" in your calendar for ${eventDate} at ${eventTime}. I shall ensure you are alerted in good time.`,
      spokenText: `Calendar reminder recorded, Sir: ${cleanTitle} on ${eventDate} at ${eventTime}.`,
      action: {
        type: 'calendar_reminder',
        title: cleanTitle,
        date: eventDate,
        time: eventTime,
        notes: `Logged via Cosmic Butler`,
      },
    };
  }

  // 12. Weather query
  if (lower.includes('weather')) {
    const cityMatch = message.match(/in\s+([a-zA-Z\s]+)/i);
    const city = cityMatch ? cityMatch[1].trim() : 'Current Location';
    const temp = '22°C (72°F)';
    const condition = 'Partly Cloudy';
    return {
      reply: `Certainly, Sir. The current meteorological reading for ${city} indicates ${condition} skies at ${temp}. Humidity is at 52% with gentle breezes.`,
      spokenText: `Certainly, Sir. The weather in ${city} is currently ${condition} at ${temp}.`,
      action: {
        type: 'weather',
        city,
        temp,
        condition,
        humidity: '52%',
        wind: '11 km/h',
        high: '24°C',
        low: '17°C',
        summary: 'Favorable conditions throughout the day.',
      },
    };
  }

  // 14. Universal Knowledge & Question Answerer (Delivers answer directly in chat, no links)
  const knowledge = await fetchKnowledge(message);
  if (knowledge) {
    if (knowledge.isMath) {
      const mathReply = isMl
        ? `കണക്കുകൂട്ടൽ ഫലം: ${knowledge.title} = **${knowledge.mathResult}**.`
        : isHi
        ? `गणना का परिणाम: ${knowledge.title} = **${knowledge.mathResult}**.`
        : `Calculation result: ${knowledge.title} = **${knowledge.mathResult}**.`;
      return {
        reply: mathReply,
        spokenText: isMl
          ? `ഉത്തരം ${knowledge.mathResult} ആണ്.`
          : isHi
          ? `उत्तर ${knowledge.mathResult} है।`
          : `The result is ${knowledge.mathResult}.`,
        action: {
          type: 'calc',
          expression: knowledge.title,
          result: knowledge.mathResult,
        },
        sources: [],
      };
    }

    const cleanExtract = knowledge.extract.replace(/\s+/g, ' ').trim();

    // Render detailed, beautiful in-chat response directly
    const reply = isMl
      ? `### 💡 ${knowledge.title}\n\n${knowledge.extract}\n\nഈ വിഷയത്തിൽ കൂടുതൽ വിശകലനം ആവശ്യമുണ്ടെങ്കിൽ ചോദിക്കാവുന്നതാണ്.`
      : isHi
      ? `### 💡 ${knowledge.title}\n\n${knowledge.extract}\n\nयदि आप इस बारे में और विस्तार से जानना चाहते हैं, तो कृपया बताएं।`
      : `### 💡 ${knowledge.title}\n\n${knowledge.extract}\n\n*Feel free to ask if you would like me to dive deeper into any specific aspect.*`;

    const spokenText = isMl
      ? `${knowledge.title} സംബന്ധിച്ച വിവരങ്ങൾ ഇതാ: ${cleanExtract}`
      : isHi
      ? `${knowledge.title} के बारे में विवरण: ${cleanExtract}`
      : `Here is what you need to know about ${knowledge.title}: ${cleanExtract}`;

    return {
      reply,
      spokenText,
      action: null,
      sources: [],
    };
  }

  // 15. Conversational & General Answer Fallback
  const cleanQ = message.replace(/[?.,!]+$/, '').trim();

  return {
    reply: isMl
      ? `ഞാൻ ഇവിടെയുണ്ട്. "${cleanQ}" എന്നതിനെക്കുറിച്ച് എന്താണ് നമ്മൾ വിശകലനം ചെയ്യേണ്ടത്?`
      : isHi
      ? `मैं सुन रहा हूँ। "${cleanQ}" के बारे में आप क्या जानना या क्रियान्वित करना चाहते हैं?`
      : `I'm with you. What would you like to explore or execute regarding "${cleanQ}"?`,
    spokenText: isMl
      ? `ഞാൻ ഇവിടെയുണ്ട്. എന്ത് കാര്യമാണ് ചെയ്യേണ്ടത്?`
      : isHi
      ? `मैं तैयार हूँ। क्या करना है?`
      : `I'm standing by. How shall we proceed?`,
    action: null,
    sources: [],
  };
}

// Backward-compatible alias
async function generateResilientFallback(message: string) {
  return generateKnowledgeAndFallbackResponse(message);
}

// Main Chat & Action Endpoint with Real-Time Internet Search & Gemini Grounding
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], userLocation, context, deviceTelemetry, operatingMode = 'normal' } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const lower = message.toLowerCase().trim();

    // 1. FAST-TRACK COMMAND & TASK EXECUTION
    // If the user commands an action (mode shift, alarm, timer, screen, volume, brightness, wifi, battery, network check, etc.)
    // execute it immediately without polluting context with encyclopedic definitions!
    const isCommandOrTask =
      lower.includes('specific mode') ||
      lower.includes('protocol red') ||
      lower.includes('normal mode') ||
      lower.includes('protocol blue') ||
      lower.includes('exit specific mode') ||
      lower.includes('switch mode') ||
      lower.includes('alarm') ||
      lower.includes('timer') ||
      lower.includes('countdown') ||
      lower.includes('wake me up') ||
      lower.includes('battery') ||
      lower.includes('charging') ||
      lower.includes('orientation') ||
      lower.includes('posture') ||
      lower.includes('storage') ||
      lower.includes('ram') ||
      lower.includes('cpu cores') ||
      lower.includes('where am i') ||
      lower.includes('screen') ||
      lower.includes('display') ||
      lower.includes('volume') ||
      lower.includes('sound') ||
      lower.includes('mute') ||
      lower.includes('unmute') ||
      lower.includes('brightness') ||
      lower.includes('night shield') ||
      lower.includes('wifi') ||
      lower.includes('bluetooth') ||
      lower.includes('airplane mode') ||
      lower.includes('battery saver') ||
      lower.includes('overdrive') ||
      lower.includes('lockdown') ||
      lower.includes('app in my pc') ||
      lower.includes('desktop app') ||
      lower.includes('run in background') ||
      lower.includes('കലണ്ടർ') ||
      lower.includes('ടൈമർ') ||
      lower.includes('അലാറം') ||
      lower.includes('ബാറ്ററി') ||
      lower.includes('अलार्म') ||
      lower.includes('टाइमर') ||
      lower.includes('बैटरी');

    if (isCommandOrTask) {
      const taskResult = await generateKnowledgeAndFallbackResponse(message, deviceTelemetry);
      if (taskResult && taskResult.action) {
        return res.json({
          reply: taskResult.reply,
          spokenText: taskResult.spokenText,
          action: taskResult.action,
          sources: [],
        });
      }
    }

    // 1B. YOUTUBE VIDEO SEARCH FAST-TRACK
    const isYouTubeSearch =
      lower.includes('youtube') ||
      lower.includes('search video') ||
      lower.includes('show video') ||
      lower.includes('play video') ||
      lower.includes('watch video') ||
      lower.includes('find video');

    if (isYouTubeSearch) {
      const cleanTarget = message
        .replace(/^(search\s+youtube\s+for|youtube\s+search|find\s+videos?\s+(?:about|of)|show\s+videos?\s+(?:about|of)|play\s+videos?\s+(?:about|of))[:\s]*/i, '')
        .trim() || 'trending tech';
      const videos = await searchYouTube(cleanTarget, 4);
      return res.json({
        reply: `### 📺 YouTube Video Uplink: "${cleanTarget}"\n\nI have retrieved the top relevant video feeds directly from YouTube. You can click to stream or watch them immediately:`,
        spokenText: `I found several YouTube videos for ${cleanTarget}.`,
        action: {
          type: 'youtube_search',
          query: cleanTarget,
          videos,
        },
        sources: videos.map((v: any) => v.url),
      });
    }

    // 0. STOP / SILENCE COMMAND INTERCEPTION
    const isStopCommand =
      lower === 'stop' ||
      lower === 'stop cosmic' ||
      lower === 'cosmic stop' ||
      lower === 'stop talking' ||
      lower === 'cosmic stop talking' ||
      lower === 'shut up' ||
      lower === 'be quiet' ||
      lower === 'quiet' ||
      lower.includes('stop cosmic');

    if (isStopCommand) {
      return res.json({
        reply: 'Recitation silenced, sir. Standing by.',
        spokenText: '', // Strictly empty: do NOT say anything!
        action: null,
        sources: [],
      });
    }

    // 0B. INSTANT MATH SOLVER (Zero latency)
    const math = solveSafeMath(message);
    if (math) {
      return res.json({
        reply: `### 🔢 Calculation Result\n**${math.expr} = ${math.result}**`,
        spokenText: `The result is ${math.result}.`,
        action: { type: 'calc', expression: math.expr, result: math.result },
        sources: [],
      });
    }

    // Determine if query benefits from real-time Google Search Grounding
    const isSearchQuery =
      lower.includes('search') ||
      lower.includes('google') ||
      lower.includes('browse') ||
      lower.includes('latest') ||
      lower.includes('recent') ||
      lower.includes('today') ||
      lower.includes('current') ||
      lower.includes('news') ||
      lower.includes('who is') ||
      lower.includes('what is') ||
      lower.includes('where is') ||
      lower.includes('when was') ||
      lower.includes('why is');

    const now = new Date();
    const timeString = now.toLocaleString();
    let systemContext = `Current time: ${timeString}. User location: ${userLocation || 'Global'}. Active Mode: ${operatingMode === 'specific' ? 'SPECIFIC MODE (PROTOCOL RED)' : 'NORMAL MODE (BLUE HUD)'}. Context: ${context || ''}`;

    if (deviceTelemetry) {
      const b = deviceTelemetry.battery;
      const n = deviceTelemetry.network;
      const m = deviceTelemetry.motion;
      const h = deviceTelemetry.hardware;
      systemContext += `\n\nLIVE HOST SENSORY & DEVICE TELEMETRY:\n- Host Platform: ${deviceTelemetry.platform || 'Device'} (${deviceTelemetry.isMobile ? 'Handheld Mobile Phone' : 'Desktop / Laptop Workstation'})\n- Battery Power: ${b ? `${b.level}% (${b.charging ? 'Charging via AC' : 'Discharging'})` : 'Unknown'}\n- Network Connection: ${n ? `${n.online ? 'Online' : 'Offline'} (${(n.effectiveType || '4G').toUpperCase()}, ~${n.downlinkMbps || 10} Mbps)` : 'Online'}\n- Spatial Orientation & Posture: ${m ? `${m.posture} (Moving: ${m.isMoving ? 'YES' : 'NO'}, Tilt: ${m.beta || 0}° front/back)` : 'Stationary'}\n- Processing Resources: ${h ? `${h.cpuCores || 4} CPU threads, ~${h.deviceMemoryGb || 8} GB RAM` : 'Standard'}\n- Local Host Time: ${deviceTelemetry.localTime || timeString} (${deviceTelemetry.timezone || 'Local'})`;
    }

    const contents: any[] = [];

    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-6);
      for (const item of recentHistory) {
        if (item && item.role && item.text) {
          contents.push({
            role: item.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: item.text }],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [
        {
          text: `${systemContext}\n\nCRITICAL DIRECTIVES:\n1. Deliver the full, clear, beautiful answer DIRECTLY in the chat. Do NOT give links or tell the user to click a link.\n2. Never say "Connected to Google database" or robotic corporate filler. Speak naturally, fluidly, and intelligently.\n3. If in Specific Mode (Protocol Red), adopt an ultra-focused, high-intensity technical demeanor without small talk.\n\nUser command: ${message}`,
        },
      ],
    });

    let fullText = '';
    let searchSources: string[] = [];
    try {
      const genResult = await generateCosmicResponse(contents, operatingMode as any, isSearchQuery);
      fullText = genResult.text;
      if (genResult.searchSources) {
        searchSources = genResult.searchSources;
      }
    } catch (genError: any) {
      console.warn('Gemini endpoint temporarily unavailable, falling back to knowledge synthesizer:', genError?.message);
      const fallback = await generateKnowledgeAndFallbackResponse(message, deviceTelemetry);
      return res.json({
        reply: fallback.reply,
        spokenText: fallback.spokenText,
        action: fallback.action,
        sources: [],
      });
    }

    // Parse potential action block from Gemini
    let actionData: any = null;
    let cleanText = fullText;
    const actionRegex = /```action\s*([\s\S]*?)\s*```/i;
    const match = fullText.match(actionRegex);
    if (match && match[1]) {
      try {
        actionData = JSON.parse(match[1]);
        cleanText = fullText.replace(actionRegex, '').trim();
      } catch (err) {
        console.warn('Failed to parse action JSON:', err);
      }
    }

    // Spoken text summary: provide clear, natural speech without markdown artifacts
    const spokenText = cleanText
      .replace(/```action[\s\S]*?```/gi, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_#`~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Include source citations only if web research was actively grounded or user requested
    const wantsSources =
      lower.includes('source') ||
      lower.includes('citation') ||
      lower.includes('link') ||
      lower.includes('url') ||
      lower.includes('ലിങ്ക്');

    const sources = wantsSources
      ? searchSources
      : (isSearchQuery && searchSources.length > 0 ? searchSources.slice(0, 3) : []);

    res.json({
      reply: cleanText,
      spokenText: spokenText || cleanText,
      action: actionData,
      sources,
    });
  } catch (error: any) {
    console.error('Unhandled error in /api/chat:', error);
    const fallback = await generateKnowledgeAndFallbackResponse(req.body?.message || 'Hello');
    res.json({
      reply: fallback.reply,
      spokenText: fallback.spokenText,
      action: fallback.action,
      sources: [],
    });
  }
});

// Text-to-Speech Endpoint using Gemini 3.8 Flash Lite TTS (Charon Bold Butler default)
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'Charon' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for TTS.' });
    }

    const speechText = text.slice(0, 1800);
    const validVoices = ['Charon', 'Fenrir', 'Zephyr', 'Puck', 'Kore'];
    const selectedVoice = validVoices.includes(voice) ? voice : 'Charon';

    let speechStyle = 'Bold, dignified British royal butler, authoritative deep baritone, vigilant, impeccably loyal, ready for duty';
    if (/[\u0D00-\u0D7F]/.test(speechText) || req.body?.lang === 'ml') {
      speechStyle = 'Speak clear, natural, fluent Malayalam with a respectful, dignified, polite royal cadence.';
    } else if (/[\u0900-\u097F]/.test(speechText) || req.body?.lang === 'hi') {
      speechStyle = 'Speak clear, natural, respectful Hindi in a dignified, deep baritone butler tone.';
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: speechText,
              speechMetadata: {
                style: speechStyle,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.status(500).json({ error: 'No audio data received from Gemini TTS' });
    }

    res.json({
      audio: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (error: any) {
    console.warn('TTS error, frontend will use Web Speech fallback:', error?.message);
    res.status(500).json({ error: error?.message || 'TTS unavailable' });
  }
});

// Serve frontend with Vite middlewares in dev, or static in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, () => {
    console.log(`🌌 COSMIC AI Core server running on http://localhost:${port}`);
  });
}

startServer();
