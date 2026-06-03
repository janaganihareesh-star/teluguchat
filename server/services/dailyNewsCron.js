const cron = require('node-cron');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const News = require('../models/News');

const initDailyNewsCron = (app) => {
  console.log('[Cron] Initializing daily morning 6:00 AM news cron job...');
  
  const generateFallbackNews = async () => {
    const fallbackQuotes = [
      "Success is not final, failure is not fatal: it is the courage to continue that counts.",
      "Ninnati kante eroju inka better ga undalani korukuntunnam!",
      "Believe you can and you're halfway there.",
      "Your only limit is your mind. Think big!",
      "Every day is a fresh start. Make the most of your conversations today!",
      "Small steps every day lead to big results. Keep pushing forward!",
      "ప్రతి నిమిషం ఒక కొత్త అవకాశం. దాన్ని వదులుకోకండి!",
      "కష్టపడకుండా లభించే విజయం కంటే, పోరాడి గెలిచే విజయానికి విలువ ఎక్కువ.",
      "మీ ఆలోచనలే మీ భవిష్యత్తును నిర్ణయిస్తాయి.",
      "ఓటమి అనేది విజయానికి మొదటి మెట్టు.",
      "The best way to predict the future is to create it.",
      "Don't watch the clock; do what it does. Keep going.",
      "నీ శ్రమ నిన్ను ఎప్పటికైనా ఉన్నత స్థానంలో నిలబెడుతుంది.",
      "Act as if what you do makes a difference. It does.",
      "కలలు కనండి, వాటిని నిజం చేసుకోవడానికి నిరంతరం శ్రమించండి.",
      "Opportunities don't happen, you create them.",
      "It always seems impossible until it's done.",
      "విజయం అనేది ఒక ప్రయాణం, గమ్యస్థానం కాదు.",
      "The only way to do great work is to love what you do.",
      "Start where you are. Use what you have. Do what you can.",
      "కష్టాలు మనల్ని బలహీనపరచడానికి రావు, మనలోని శక్తినే మేల్కొల్పడానికి వస్తాయి.",
      "Strive not to be a success, but rather to be of value.",
      "నీపై నీకు నమ్మకం ఉంటే, సగం విజయం సాధించినట్లే.",
      "Do one thing every day that scares you.",
      "Quality is not an act, it is a habit.",
      "మనం నిన్నటి కంటే ఈరోజు మరింత మెరుగ్గా మారాలి.",
      "Hardships often prepare ordinary people for an extraordinary destiny.",
      "Success usually comes to those who are too busy to be looking for it.",
      "ధైర్యమే మనకున్న అతిపెద్ద ఆయుధం.",
      "Dream big and dare to fail."
    ];

    const fallbackQuestions = [
      "If you could travel anywhere right now, where would it be?",
      "What is your favorite childhood memory?",
      "If you had to eat only one food for the rest of your life, what would it be?",
      "What is a skill you'd love to learn this year?",
      "Eroju mee life lo jarigina oka manchi vishayam enti?",
      "Mee favourite movie enti? Enduku ishtam?",
      "మీరు చూసిన వాటిలో అత్యంత అందమైన ప్రదేశం ఏది?",
      "మీకు బాగా నచ్చిన పుస్తకం లేదా సినిమా ఏది మరియు ఎందుకు?",
      "మీ జీవితంలో మీరు అత్యంత గౌరవించే వ్యక్తి ఎవరు?",
      "If you could meet any historical person, who would it be?",
      "మీ చిన్ననాటి స్నేహితులతో మీకున్న బెస్ట్ మెమరీ ఏంటి?",
      "What is the best piece of advice you have ever received?",
      "మీకు సూపర్ పవర్ ఉంటే ఏం చేయాలనుకుంటారు?",
      "What is your favorite way to spend a rainy day?",
      "ఈరోజు మీ మూడ్ ఎలా ఉంది? ఒక ఎమోజీతో చెప్పండి!",
      "What is one thing you are grateful for today?",
      "If you could change one thing in the world, what would it be?",
      "మీకు నచ్చిన తెలుగు వంటకం ఏది?",
      "What is your dream job?",
      "If you could live in any era of history, which one would you choose?",
      "మీ ఖాళీ సమయంలో మీరు ఎక్కువగా చేసే పని ఏంటి?",
      "What is your favorite childhood cartoon show?",
      "మీ జీవితంలో మర్చిపోలేని ప్రయాణం ఏది?",
      "If you could learn any language instantly, what would it be?",
      "మీరు ఎక్కువగా వినే పాట ఏది?",
      "What is the most adventurous thing you have ever done?",
      "మీ ఫేవరెట్ క్రికెటర్ లేదా క్రీడాకారుడు ఎవరు?",
      "If you could open a business, what kind of business would it be?",
      "మీకు సంతోషాన్ని ఇచ్చే చిన్న విషయం ఏంటి?",
      "What is the next goal you want to achieve?"
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
