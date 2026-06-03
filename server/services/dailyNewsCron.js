const cron = require('node-cron');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const News = require('../models/News');

const initDailyNewsCron = (app) => {
  console.log('[Cron] Initializing daily morning 6:00 AM news cron job...');
  
  const generateFallbackNews = async () => {
    const fallbackQuotes = [
      "Motivational Quote: 'Success lines and goals correct-e, kani nee smile chusinappudu vache happiness ae ultimate goal!' Keep blushing! 🥰",
      "Sweet thought: 'Prapancham lo unique and beautiful smile needhe... Danni single day kooda miss cheskoku!' Have a gorgeous day! 💕",
      "Sweet Quote: 'Nee eyes lo look, nee lip paina smile... Ivi chuste evaraina flat aipovalsinde! Be confident, you are amazing!' 😉",
      "Motivation: 'Life short ga undi, so direct ga sweet words cheppeyandi... Evarni gurtucheskuni blush avutunnav? Direct ga message chesey!' 🥰",
      "Lovely thought: 'Nee smile thone roju start chesthe aa kick-e verappa! Keep smiling, it suits you so much! 😊'",
      "Cute Quote: 'Beautiful things happen when you smile. So, don't forget to keep that cute smile on your face today!' 🌸",
      "Romantic Quote: 'Mana life lo perfect song vethikite dorakatledu, kani nee voice vinagane direct hit! Have a lovely day! 💖'",
      "Cute Thought: 'Evaro okaru nee gurinchi aalochistu happy ga smile chestunnaru eroju... Maybe it's because of your lovely heart!' ✨",
      "Sweet Vibe: 'Nee navve nee beauty, nee confidence-e nee success. Keep shining and smiling today!' 🥰",
      "Motivational Quote: 'Aa problems anni control lo ki vachestayi, kani nuvvu happy ga smile chesindhe aa roju complete success! Have a happy day!' 😊"
    ];

    const fallbackQuestions = [
      "Eroju Question: Evaraina mimmalni chusi blush ayyeలా look ichara? Tell us that cute story! 🥰",
      "Community Question: Ee chat room lo evari texts chusi nee lip paina first smile vasthundi? Tag them! 😉",
      "Question: Nee favorite person screen paina kanipiste nee face lo oche blushing percentage entha? 100% or more? 📈💕",
      "Question of the Day: Evarnaina secretly care chestunnara? Direct ga chepakunda sweet hint ivvandi! ✨",
      "Question: Cute moments check... Meeku first crush/love eppudu and ela aindi? share check! 💖",
      "Question of the Day: Mee partner or crush chesina details lo meeku extreme happiness and blushing teche element enti? 🌸",
      "Question: Oka track or song vinnappudu immediate ga evari details gurtosthayi? Tag or describe them! 🎵",
      "Question of the Day: Eroju mee morning look chusi mirror ayna blush aindha leda? Describe your gorgeous smile! 🥰"
    ];

    const fallbackSongs = [
      "Idi vinu, standard blush vibes: 'Samajavaragamana' from Ala Vaikunthapurramuloo 🎵",
      "Vintunte auto ga blushing: 'Butta Bomma' from Ala Vaikunthapurramuloo 🎵",
      "Romantic loop entry: 'Nee Kannu Neeli Samudram' from Uppena 🎵",
      "Sweet blush overload: 'Inkem Inkem Inkem Kaavaale' from Geetha Govindam 🎵",
      "Sweet blush: 'Chitti Nee Navvante' from Jathi Ratnalu 🎵",
      "Vibe checks out for cute blush: 'Kallolam' from Pelli Choopulu 🎵",
      "Pure heart touching vibe: 'Adiga Adiga' from Ninnu Kori 🎵",
      "Cute loop song: 'Undiporaadhey' from Hushaaru 🎵",
      "Romantic classic: 'Mellaga Mellaga' from Varsham 🎵",
      "Auto smiling song: 'Arere Arere' from Happy Days 🎵",
      "Pure blushing melody: 'O Rendu Prema Meghalu' from Baby 🎵",
      "Cute sweet vibes: 'Hoyna Hoyna' from Gang Leader 🎵",
      "Sweet loop melody: 'Hrudayama' from Major 🎵",
      "Melody of the year: 'Priyathama Priyathama' from Majili 🎵"
    ];

    // Select based on day of year to guarantee a different one every day
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    const quote = fallbackQuotes[dayOfYear % fallbackQuotes.length];
    const question = fallbackQuestions[dayOfYear % fallbackQuestions.length];
    const song = fallbackSongs[dayOfYear % fallbackSongs.length];

    // Delete news older than 30 days to keep the DB clean, but keep recent history
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await News.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });

    const fallbackNews = await News.create({
      title: "🌟 Daily Highlights",
      content: `<strong>Motivational Quote:</strong><br>${quote}<br><br><strong>Question of the Day:</strong><br>${question}<br><br><strong>Song Suggestion:</strong><br>${song}`,
      type: "motivation",
      generatedByAI: false,
      priority: 1,
      authorName: "AI Assistant"
    });
    const io = app.get('io');
    if (io) {
      io.emit('new-news', fallbackNews);
      io.to('general').emit('system-message', {
        message: `Check out the new daily announcement: <strong>${fallbackNews.title}</strong> in the News tab!`,
        icon: '📰'
      });
    }
  };

  const generateNews = async () => {
    console.log('[Cron] Triggering daily morning 6:00 AM news generation...');
    
    if (!process.env.GEMINI_API_KEY) {
      console.error('[Cron] GEMINI_API_KEY is not set. Using fallback hardcoded news.');
      await generateFallbackNews();
      return;
    }

    try {
      // Fetch recent news titles and contents to inject in the prompt and prevent repetition
      let recentThemes = "";
      try {
        const recentNews = await News.find().sort({ createdAt: -1 }).limit(15);
        if (recentNews.length > 0) {
          recentThemes = "\nRecently generated topics/news content (DO NOT REPEAT or copy these quotes, questions, or songs):\n" + 
            recentNews.map((n, i) => `${i+1}. Title: "${n.title}", Content: "${n.content.replace(/<[^>]*>/g, ' ')}"`).join('\n') + '\n';
        }
      } catch (dbErr) {
        console.error('[Cron] Error fetching recent news for prompt:', dbErr);
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      
      const modelsToTry = [
        "gemini-2.5-flash",
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-2.0-flash-lite",
        "gemini-flash-latest"
      ];

      const prompt = `
You are an AI assistant generating exactly ONE community announcement for a Telugu chatting app. 
Today's date is: ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}.
${recentThemes}
Determine if today is a major festival or special day in India (e.g., Diwali, Eid, Independence Day, Sankranti, Ugadi, etc.).
If it IS a special day:
- Generate a short, warm wish about that day.
- Set 'type' to "festival".

If it is NOT a major special day (just a regular day), generate exactly these 3 things:
1. A Motivational Quote / Cute Thought
2. A thought-provoking, cute, or engaging General Question for the community (e.g. about crushes, love stories, sweet memories, things that make them blush/smile)
3. A Telugu or Indian Song Suggestion (preferably cute, romantic, or soulful)
Combine all 3 nicely into the 'content' field using HTML formatting (e.g., <br> or <strong>). Do NOT add extra chit-chat.
- Set 'type' to "motivation".

CRITICAL LANGUAGE REQUIREMENT:
The response ("title" and "content") MUST be written in a friendly, conversational mix of Telugu and English (code-mixed "Tanglish" / "Telugu-English" chat style) using ONLY the English/Latin alphabet (do NOT use Telugu script/Telugu letters).
Write it exactly how young Telugu people chat online or talk to friends. The content must make the readers smile and blush! E.g.:
- "Motivational Quote: 'Success lines and goals correct-e, kani nee smile chusinappudu vache happiness ae ultimate goal!' Keep blushing! 🥰"
- "Eroju Question: Ee chat room lo evari texts chusi nee lip paina first smile vasthundi? Tag them! 😉"
- "Ee song vinu, extreme blushing vibes in loop: 'Samajavaragamana' from Ala Vaikunthapurramuloo 🎵"
- "Happy Diwali friends! Eroju mana families tho sweet things share chestu safely crackers kalchandi!"

The response MUST be a valid JSON object matching this schema exactly, and NO markdown wrapping or backticks around it:
{
  "title": "A short engaging title for the news card (include emojis)",
  "content": "A well-formatted string containing the content.",
  "type": "festival" or "motivation"
}
`;

      let generatedData = null;
      let usedModel = "";

      for (const modelName of modelsToTry) {
        try {
          console.log(`[Cron] Trying news generation with model: ${modelName}`);
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          const responseText = result.response.text().trim();
          
          let jsonString = responseText;
          if (jsonString.startsWith('```json')) {
            jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (jsonString.startsWith('```')) {
            jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }

          generatedData = JSON.parse(jsonString);
          usedModel = modelName;
          console.log(`[Cron] Succeeded with model: ${modelName}`);
          break;
        } catch (modelErr) {
          console.error(`[Cron] Failed with model ${modelName}:`, modelErr.message);
        }
      }

      if (!generatedData) {
        throw new Error('All Gemini models failed to generate daily news.');
      }

      // Delete news older than 30 days to keep the DB clean, but keep recent history
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      await News.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });
      console.log('[Cron] Cleaned up news older than 30 days.');

      // Create new announcement in database
      const newNews = await News.create({
        title: generatedData.title,
        content: generatedData.content,
        type: generatedData.type || 'motivation',
        generatedByAI: true,
        priority: generatedData.type === 'festival' ? 2 : 1,
        authorName: 'AI Assistant',
      });

      console.log(`[Cron] Successfully generated and saved daily news using ${usedModel}:`, newNews.title);

      // Broadcast to connected users
      const io = app.get('io');
      if (io) {
        io.emit('new-news', newNews);
        io.to('general').emit('system-message', {
          message: `Check out the new daily announcement: <strong>${newNews.title}</strong> in the News tab!`,
          icon: '📰'
        });
      }

    } catch (error) {
      console.error('[Cron] Error generating daily news:', error);
      console.log('[Cron] Triggering fallback news generation due to AI failure...');
      await generateFallbackNews();
    }
  };

  // Schedule to run every day at 6:00 AM Asia/Kolkata (IST)
  cron.schedule('0 6 * * *', generateNews, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  // Check if we missed the 6 AM update on startup
  setTimeout(async () => {
    try {
      const latestNews = await News.findOne().sort({ createdAt: -1 });
      const todayString = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
      const latestNewsString = latestNews ? new Date(latestNews.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '';
      
      if (todayString !== latestNewsString) {
        // Checking if time in IST is >= 6 AM
        const options = { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false };
        const istHour = parseInt(new Intl.DateTimeFormat('en-IN', options).format(new Date()), 10);
        
        if (istHour >= 6) {
          console.log('[Cron] Missed 6 AM generation. Generating now...');
          await generateNews();
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, 3000);
};

module.exports = initDailyNewsCron;
