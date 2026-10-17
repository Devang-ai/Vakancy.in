const { GoogleGenerativeAI } = require('@google/generative-ai');

let cachedClient = null;
let lastKey = null;

const getAIClient = () => {
  const currentKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
  if (!currentKey || currentKey === 'your_gemini_api_key_here' || currentKey === 'YOUR_GEMINI_API_KEY') {
    return null;
  }
  if (!cachedClient || lastKey !== currentKey) {
    try {
      cachedClient = new GoogleGenerativeAI(currentKey);
      lastKey = currentKey;
    } catch (err) {
      console.warn('⚠️ Gemini AI initialization notice:', err.message);
      return null;
    }
  }
  return cachedClient;
};

const isGeminiConfigured = () => Boolean(getAIClient());

module.exports = {
  get aiClient() {
    return getAIClient();
  },
  getAIClient,
  isGeminiConfigured
};
