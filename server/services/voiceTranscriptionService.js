const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

/**
 * Transcribe and moderate Telugu / English voice audio
 * @param {string} mediaUrl - URL or local path to audio file
 * @returns {Promise<{ transcript: string, isSafe: boolean, reason?: string }>}
 */
async function transcribeAndModerateAudio(mediaUrl) {
  if (!mediaUrl) return { isSafe: true, transcript: '' };

  try {
    let audioBuffer = null;
    let mimeType = 'audio/webm';

    if (mediaUrl.endsWith('.wav')) mimeType = 'audio/wav';
    else if (mediaUrl.endsWith('.mp3')) mimeType = 'audio/mp3';
    else if (mediaUrl.endsWith('.ogg')) mimeType = 'audio/ogg';

    // 1. Check if it's a local file in client/public
    if (mediaUrl.startsWith('/uploads/') || mediaUrl.startsWith('uploads/')) {
      const cleanPath = mediaUrl.startsWith('/') ? mediaUrl.slice(1) : mediaUrl;
      const localPath = path.join(__dirname, '../../client/public', cleanPath);
      if (fs.existsSync(localPath)) {
        audioBuffer = fs.readFileSync(localPath);
      }
    } else if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
      // 2. Fetch from Cloudinary or remote URL
      const response = await axios.get(mediaUrl, { 
        responseType: 'arraybuffer',
        timeout: 8000 
      });
      audioBuffer = Buffer.from(response.data);
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      console.warn('[Voice AI] Audio buffer empty or not found for:', mediaUrl);
      return { isSafe: true, transcript: '' };
    }

    // If Gemini API is configured, use Gemini 1.5 Flash multimodal audio capability
    if (genAI && process.env.GEMINI_API_KEY) {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const audioPart = {
        inlineData: {
          data: audioBuffer.toString('base64'),
          mimeType: mimeType
        }
      };

      const prompt = `You are a strict Telugu & English audio moderation AI for TeluguChat.
Listen carefully to this voice note message:
1. Transcribe the spoken speech accurately into text (either Telugu script or English letters).
2. Evaluate if the spoken content contains:
   - Severe Telugu or English abuses, swear words (e.g., dengu, lanja, munda, fuck, bastard, etc.)
   - Sexual harassment, explicit adult/NSFW proposals
   - Scams, phishing, blackmail, threats or severe harassment.

You MUST respond strictly with a valid JSON object only:
{
  "transcript": "transcribed speech here",
  "isSafe": true or false,
  "reason": "short explanation in English if unsafe, or empty string if safe"
}`;

      const result = await model.generateContent([prompt, audioPart]);
      const responseText = result.response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`[Voice AI Transcribed] "${parsed.transcript}" | Safe: ${parsed.isSafe}`);
        return {
          transcript: parsed.transcript || '',
          isSafe: typeof parsed.isSafe === 'boolean' ? parsed.isSafe : true,
          reason: parsed.reason || ''
        };
      }
    }
  } catch (err) {
    console.error('[Voice AI Transcription Error]:', err.message);
  }

  // Graceful fallback
  return { isSafe: true, transcript: '' };
}

module.exports = {
  transcribeAndModerateAudio
};

