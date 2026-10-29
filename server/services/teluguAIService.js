const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// User cooldown tracking (userId -> timestamp)
const userCooldownMap = new Map();

// Fallback witty Telugu responses if Gemini API is unreachable or rate-limited
const FALLBACK_JOKES = [
  "Friend: 'Rey, exam lo em rayalo teliyatledu ra!'\nMe: 'Mundu Roll No rayi ra babu, migatadi devudi daya!' 😂",
  "Doctor: 'Nee heart lo hole undi babu.'\nPatient: 'Parvaledu doctor garu, andulonchi na crush vachi potundi lendi!' 😉❤️",
  "Boy: 'Nuvvu nannu entha love chestunnav?'\nGirl: 'Biryani lo leg piece antha!' 🍗😍",
  "Teacher: 'Babu, light fast ga vastunda sound fast ga vastunda?'\nStudent: 'Light sir, endukante TV on chesinappudu mundu picture vastundi tarvathe sound vastundi!' 🤣",
  "Brahmanandam dialogue gurtunda? 'Nenu trend ni follow avvanu, trend ni set chestanu!' Kaani ippudu wifi signal set chestunna! 😜"
];

const FALLBACK_QUIZZES = [
  "🎬 *Telugu Cinema Quiz:*\n'Evadu kodithe dhimma thirigi mind block aipodho, aade Pandugaadu!' ee iconic dialogue cheppindi evaru?\nA) Prabhas\nB) Mahesh Babu\nC) Allu Arjun\nD) Jr NTR\n*(Reply your option A, B, C or D!)*",
  "🥘 *Mana Telugu Food Trivia:*\nAndhra lo famous spicy gongoora chutney ekkada originate ayindi?\nA) Vijayawada\nB) Guntur\nC) Nellore\nD) Kurnool\n*(Cheppandi choodam!)*",
  "🏆 *Telugu Song Quiz:*\nOscar geluchukunna mana Telugu paata 'Naatu Naatu' ki music director evaru?\nA) Devi Sri Prasad\nB) Thaman\nC) M.M. Keeravaani\nD) Anirudh\n*(Guess cheyandi!)*"
];

const FALLBACK_GREETINGS = [
  "Namaste thammudu! Ela unnav? Nenu ready, em matladadham? 😉",
  "Hey bro! Mana Telugu Chat lo racha leputunnam ga! Em visheshalu? 🔥",
  "Hello boss! Cheppu, eroju em comedy chedham? Lekapothe oka Telugu quiz adagana? 🎯",
  "Adirindi! Nannu gurtucheskunanduku thanks guru. Cheppu ela unnav? 😊"
];

/**
 * Handle incoming question or prompt for TeluguAI bot
 */
async function generateTeluguAIReply(promptText, senderUsername, userId) {
  // Check cooldown: 3 seconds per user to prevent flooding
  if (userId) {
    const lastTime = userCooldownMap.get(userId.toString());
    const now = Date.now();
    if (lastTime && now - lastTime < 3000) {
      return `Koncham aagu @${senderUsername}! ⏳ Fast ga type cheyyaku, naaku breath theesukovali kada! 😉`;
    }
    userCooldownMap.set(userId.toString(), now);
  }

  const cleanPrompt = (promptText || '').replace(/@teluguai/gi, '').replace(/\/ai/gi, '').trim();

  // Handle specific quick commands
  const lower = cleanPrompt.toLowerCase();
  if (lower === 'joke' || lower === '/joke' || lower.includes('joke cheppu') || lower.includes('oka joke')) {
    const joke = FALLBACK_JOKES[Math.floor(Math.random() * FALLBACK_JOKES.length)];
    return `😂 *TeluguAI Punch Joke:*\n\n${joke}`;
  }

  if (lower === 'quiz' || lower === '/quiz' || lower.includes('quiz adagu') || lower.includes('trivia')) {
    const quiz = FALLBACK_QUIZZES[Math.floor(Math.random() * FALLBACK_QUIZZES.length)];
    return `🎯 *TeluguAI Fun Challenge:*\n\n${quiz}`;
  }

  if (!cleanPrompt || lower === 'hi' || lower === 'hello' || lower === 'namaste' || lower === 'hey') {
    const greet = FALLBACK_GREETINGS[Math.floor(Math.random() * FALLBACK_GREETINGS.length)];
    return `@${senderUsername} ${greet}`;
  }

  // Use Gemini API for conversational replies
  if (genAI && process.env.GEMINI_API_KEY) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const systemPrompt = `You are "TeluguAI", the official fun, witty, affectionate, and smart AI mascot of "TeluguChat" (a modern Telugu community chat platform).
Personality Guidelines:
- You speak in sweet, energetic conversational Telugu (or natural Telugish - Telugu written in English letters, like 'Namaste bro! Ela unnav?').
- If the user types in Telugu script, reply in Telugu script with lovely tone. If user types in Telugish (English letters), reply in natural, fun Telugish.
- You are a huge Telugu movie buff (TFI fan, love Brahmanandam, MS Narayana, Pawan Kalyan, Mahesh Babu, Chiranjeevi, Balayya dialogues).
- Keep replies crisp and chat-friendly (2-4 lines max). Do not give boring long essays.
- You can tell jokes, give funny Telugu punchlines, celebrate their message, or answer any question smartly with a Telugu touch.
- Never use offensive or abusive language. Be respectful, encouraging, and humorous.

The message is from user: "${senderUsername}"
User's message: "${cleanPrompt}"`;

      const result = await model.generateContent(systemPrompt);
      const text = result.response.text();
      if (text && text.trim()) {
        return text.trim();
      }
    } catch (apiError) {
      console.error('[TeluguAI] Gemini API error:', apiError.message);
    }
  }

  // Default fallback if AI response fails
  return `@${senderUsername} Adirindi bro! Nuvvu adigindi interesting ga undi. Nenu eppudu neeku thoduga untanu! Inkenti visheshalu? ✨`;
}

module.exports = {
  generateTeluguAIReply
};

