const axios = require('axios');

const analyzeText = async (text) => {
  if (!text) return { isSafe: true, scores: {} };

  try {
    const API_KEY = process.env.PERSPECTIVE_API_KEY;
    if (!API_KEY) return { isSafe: true, scores: {} }; // skip if no key
    
    const response = await axios.post(
      `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${API_KEY}`,
      {
        comment: { text },
        languages: ['en'],
        requestedAttributes: {
          TOXICITY: {},
          SEVERE_TOXICITY: {},
          INSULT: {},
          SPAM: {},
          THREAT: {}
        }
      }
    );

    const scores = response.data.attributeScores;
    const toxicity = scores.TOXICITY.summaryScore.value;
    const severeToxicity = scores.SEVERE_TOXICITY.summaryScore.value;
    const threat = scores.THREAT.summaryScore.value;

    if (toxicity > 0.85 || severeToxicity > 0.7 || threat > 0.8) {
      return { isSafe: false, scores, reason: 'Content violates community guidelines' };
    }

    return { isSafe: true, scores };
  } catch (error) {
    console.error('Perspective API error:', error.message);
    return { isSafe: true, scores: {} }; // Fail open
  }
};

module.exports = { analyzeText };
