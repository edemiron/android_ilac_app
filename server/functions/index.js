/**
 * Firebase Functions - AI Servisleri
 * API key'ler sunucu tarafında saklanır, client'a gitmez
 */

const { onRequest } = require('firebase-functions/v2/https');
const axios = require('axios');
const cors = require('cors')({ origin: true });

// Environment variable'dan API key'leri al
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com';

/**
 * Gemini ile ilaç ara
 */
exports.geminiSearch = onRequest({ cors: true, maxInstances: 10 }, async (req, res) => {
  try {
    const { prompt, barcode } = req.body;

    if (!prompt && !barcode) {
      return res.status(400).json({ error: 'prompt veya barcode gerekli' });
    }

    const searchPrompt = barcode
      ? `Bu barkodlu ilaç hakkında bilgi ver: ${barcode}. İlaç adı, etken madde, kullanım dozu ve yan etkileri hakkında bilgi ver. Türkçe yanıt ver.`
      : prompt;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: searchPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const result = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ success: true, result });
  } catch (error) {
    console.error('Gemini error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Claude (Anthropic) ile ilaç ara
 */
exports.claudeSearch = onRequest({ cors: true, maxInstances: 10 }, async (req, res) => {
  try {
    const { prompt, barcode } = req.body;

    if (!prompt && !barcode) {
      return res.status(400).json({ error: 'prompt veya barcode gerekli' });
    }

    const searchPrompt = barcode
      ? `Bu barkodlu ilaç hakkında bilgi ver: ${barcode}. İlaç adı, etken madde, kullanım dozu ve yan etkileri hakkında bilgi ver. Türkçe yanıt ver. Max 500 kelime.`
      : prompt;

    const response = await axios.post(
      `${ANTHROPIC_API_URL}/v1/messages`,
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: searchPrompt }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
      }
    );

    const result = response.data?.content?.[0]?.text || '';
    res.json({ success: true, result });
  } catch (error) {
    console.error('Claude error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Health check
 */
exports.health = onRequest({ cors: true }, (req, res) => {
  res.json({
    status: 'OK',
    gemini: GEMINI_API_KEY ? 'Configured' : 'Missing',
    claude: ANTHROPIC_API_KEY ? 'Configured' : 'Missing',
  });
});
