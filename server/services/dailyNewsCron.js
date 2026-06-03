const cron = require('node-cron');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const News = require('../models/News');

const initDailyNewsCron = (app) => {
  console.log('[Cron] Initializing daily morning 6:00 AM news cron job...');
  
  const generateFallbackNews = async () => {
    const fallbackQuotes = [
      "Success anedi final kadhu, failure anedi fatal kadhu: continue ayye dhairyame important!",
      "Ninnati kante eroju inka better ga undalani korukuntunnam!",
      "Mee meedha meeku confidence unte, half success energy vachinatle.",
      "Mee constructive thoughts ye mee future ni decide chesthayi.",
      "Dream big, and avi nijam cheskovadaniki regular ga work cheyandi.",
      "Prathi minute oka kotha chance. Danni miss cheskokandi!",
      "Failure anedi success ki first step.",
      "Mee hard work mimmalni eppatikaina high position lo nilabeduthundi.",
      "Success anedi oka journey, destination kaadhu.",
      "Kashtalu mana weak spots ni chupiyadaniki raavu, mana power ni baytaki thiyadaniki vasthayi.",
      "Ninnati kante eroju inka better ga marali mana life lo.",
      "Dhairyam ye mana life lo big weapon."
    ];

    const fallbackQuestions = [
      "Mee life lo choosina dynamic and beautiful place edi?",
      "Meeku baga nachina book or movie enti and character enduku nachindi?",
      "Mee life lo meeru respect chese first person evaru?",
      "Mee childhood friends tho unna best memory organic details cheppandi?",
      "Meeku super power unte em cheyali anukuntunnaru?",
      "Eroju mee mood ela undi? Oka emoji tho match cheyandi!",
      "Meeku nachina comfort food / Telugu dish edi?",
      "Mee free time lo ekkuva em cheyadam ishtam?",
      "Mee life lo life-changing/memorable travel memories cheppandi?",
      "Meeku loop lo vine favourite song/track enti eroju?",
      "Mee favourite cricketer or sports player evaru?",
      "Meeku happy ga anipinche tiny thing enti daily life lo?"
    ];



    const fallbackSongs = [
      "Idi vinu baguntadi: 'Samajavaragamana' from Ala Vaikunthapurramuloo 🎵",
      "Idi vinu baguntadi: 'Butta Bomma' from Ala Vaikunthapurramuloo 🎵",
      "Idi vinu baguntadi: 'Naatu Naatu' from RRR 🎵",
      "Idi vinu baguntadi: 'Neeli Neeli Aakasam' from 30 Rojullo Preminchadam Ela 🎵",
      "Idi vinu baguntadi: 'Chitti' from Jathi Ratnalu 🎵",
      "Idi vinu baguntadi: 'Inkem Inkem Inkem Kaavaale' from Geetha Govindam 🎵",
      "Idi vinu baguntadi: 'Srivalli' from Pushpa 🎵",
      "Idi vinu baguntadi: 'Adiga Adiga' from Ninnu Kori 🎵",
      "Idi vinu baguntadi: 'Oosupodu' from Fidaa 🎵",
      "Idi vinu baguntadi: 'Priyathama Priyathama' from Majili 🎵",
      "Idi vinu baguntadi: 'Sidda Sidda' from Arjun Reddy 🎵",
      "Idi vinu baguntadi: 'Telusa Telusa' from Sarrainodu 🎵",
      "Idi vinu baguntadi: 'Nee Kannu Neeli Samudram' from Uppena 🎵",
      "Idi vinu baguntadi: 'Undiporaadhey' from Hushaaru 🎵",
      "Idi vinu baguntadi: 'Anantham' from Jersey 🎵",
      "Idi vinu baguntadi: 'Mellaga Mellaga' from Varsham 🎵",
      "Idi vinu baguntadi: 'Nuvvostanante Nennoddantana' from Varsham 🎵",
      "Idi vinu baguntadi: 'My Love Is Gone' from Arya 2 🎵",
      "Idi vinu baguntadi: 'Ringa Ringa' from Arya 2 🎵",
      "Idi vinu baguntadi: 'Karige Loga' from Arya 2 🎵",
      "Idi vinu baguntadi: 'Cinema Choopistha Mava' from Race Gurram 🎵",
      "Idi vinu baguntadi: 'Sweety' from Race Gurram 🎵",
      "Idi vinu baguntadi: 'Pranaama' from Janatha Garage 🎵",
      "Idi vinu baguntadi: 'Apple Beauty' from Janatha Garage 🎵",
      "Idi vinu baguntadi: 'Aagadu' from Aagadu 🎵",
      "Idi vinu baguntadi: 'Dookudu' from Dookudu 🎵",
      "Idi vinu baguntadi: 'Poovai Poovai' from Dookudu 🎵",
      "Idi vinu baguntadi: 'Nenunnanani' from Nenunnanu 🎵",
      "Idi vinu baguntadi: 'Evare' from Premam 🎵",
      "Idi vinu baguntadi: 'Kallolam' from Pelli Choopulu 🎵"
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
1. A Motivational Quote
2. A thought-provoking General Question for the community
3. A Telugu or Indian Song Suggestion
Combine all 3 nicely into the 'content' field using HTML formatting (e.g., <br> or <strong>). Do NOT add extra chit-chat.
- Set 'type' to "motivation".

CRITICAL LANGUAGE REQUIREMENT:
The response ("title" and "content") MUST be written in a friendly, conversational mix of Telugu and English (code-mixed "Tanglish" / "Telugu-English" chat style) using ONLY the English/Latin alphabet (do NOT use Telugu script/Telugu letters).
Write it exactly how young Telugu people chat online or talk to friends. E.g.:
- "Success anedi final kadhu, failure anedi fatal kadhu: continue ayye dhairyame important!"
- "Eroju question of the day: Mee childhood friends tho unna best memory organic details cheppandi?"
- "Ee song vinu, chaala melodious ga transition baguntadi: 'Samajavaragamana' from Ala Vaikunthapurramuloo 🎵"
- "Happy Diwali friends! Eroju mana family tho sweets తింటూ safely crackers kalchandi!"

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
