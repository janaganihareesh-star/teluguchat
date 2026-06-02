const cron = require('node-cron');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const News = require('../models/News');

const initDailyNewsCron = (app) => {
  console.log('[Cron] Initializing daily morning 6:00 AM news cron job...');
  
  const generateNews = async () => {
    console.log('[Cron] Triggering daily morning 6:00 AM news generation...');
    
    if (!process.env.GEMINI_API_KEY) {
      console.error('[Cron] GEMINI_API_KEY is not set. Using fallback hardcoded news.');
      
      const fallbackQuotes = [
        "Every day is a fresh start. Make the most of your conversations today!",
        "Small steps every day lead to big results. Keep pushing forward!",
        "Believe you can and you're halfway there.",
        "Your only limit is your mind. Think big!",
        "Success is not final, failure is not fatal: it is the courage to continue that counts.",
        "Ninnati kante eroju inka better ga undalani korukuntunnam!"
      ];

      const fallbackQuestions = [
        "If you could travel anywhere right now, where would it be?",
        "What is your favorite childhood memory?",
        "If you had to eat only one food for the rest of your life, what would it be?",
        "What is a skill you'd love to learn this year?",
        "Eroju mee life lo jarigina oka manchi vishayam enti?",
        "Mee favourite movie enti? Enduku ishtam?"
      ];

      const fallbackSongs = [
        "Idi vinu baguntadi: 'Samajavaragamana' from Ala Vaikunthapurramuloo 🎵",
        "Idi vinu baguntadi: 'Butta Bomma' from Ala Vaikunthapurramuloo 🎵",
        "Idi vinu baguntadi: 'Naatu Naatu' from RRR 🎵",
        "Idi vinu baguntadi: 'Neeli Neeli Aakasam' from 30 Rojullo Preminchadam Ela 🎵",
        "Idi vinu baguntadi: 'Chitti' from Jathi Ratnalu 🎵",
        "Idi vinu baguntadi: 'Inkem Inkem Inkem Kaavaale' from Geetha Govindam 🎵",
        "Idi vinu baguntadi: 'Srivalli' from Pushpa 🎵"
      ];

      const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
      const randomQuestion = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
      const randomSong = fallbackSongs[Math.floor(Math.random() * fallbackSongs.length)];

      await News.deleteMany({});
      const fallbackNews = await News.create({
        title: "🌟 Daily Highlights",
        content: `<strong>Motivational Quote:</strong><br>${randomQuote}<br><br><strong>Question of the Day:</strong><br>${randomQuestion}<br><br><strong>Song Suggestion:</strong><br>${randomSong}`,
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
      return;
    }

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      // We use gemini-1.5-flash as it's fast and sufficient for this
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
You are an AI assistant generating exactly ONE community announcement for a Telugu chatting app. 
Today's date is: ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}.

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

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      
      // Clean up markdown wrapping if AI accidentally includes it
      let jsonString = responseText;
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const generatedData = JSON.parse(jsonString);

      // Clear old news before posting the new one
      await News.deleteMany({});
      console.log('[Cron] Cleared old news successfully.');

      // Create new announcement in database
      const newNews = await News.create({
        title: generatedData.title,
        content: generatedData.content,
        type: generatedData.type || 'motivation',
        generatedByAI: true,
        priority: generatedData.type === 'festival' ? 2 : 1,
        authorName: 'AI Assistant',
      });

      console.log('[Cron] Successfully generated and saved daily news:', newNews.title);

      // Broadcast to connected users
      const io = app.get('io');
      if (io) {
        io.emit('new-news', newNews);
        // Also emit system message in general chat if desired
        io.to('general').emit('system-message', {
          message: `Check out the new daily announcement: <strong>${newNews.title}</strong> in the News tab!`,
          icon: '📰'
        });
      }

    } catch (error) {
      console.error('[Cron] Error generating daily news:', error);
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
