// scripts/glm_bridge.js
// Antigravity <-> GLM-5.3-Flash (High Reasoning Mode) Direct Bridge

const https = require('https');

const API_KEY = process.env.GLM_API_KEY || '2705c09551d846c59b89986c79a3c2ef.w2y9PhdvFm8KXygK';
const BASE_HOST = 'api.z.ai';
const BASE_PATH = '/api/anthropic/v1/messages';

async function queryGLM({
  prompt,
  systemPrompt,
  model = 'GLM-5.3-Flash',
  maxTokens = 16000,
  reasoningMode = 'high', // 'low' | 'high' | 'max'
}) {
  return new Promise((resolve, reject) => {
    const budgetTokens = reasoningMode === 'high' || reasoningMode === 'max' ? 8000 : 2048;

    const payload = {
      model,
      max_tokens: maxTokens,
      thinking: {
        type: 'enabled',
        budget_tokens: budgetTokens,
      },
      messages: [{ role: 'user', content: prompt }],
    };

    if (systemPrompt) {
      payload.system = systemPrompt;
    }

    const data = JSON.stringify(payload);

    const options = {
      hostname: BASE_HOST,
      path: BASE_PATH,
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) {
            return reject(new Error(parsed.error.message || JSON.stringify(parsed.error)));
          }
          let text = '';
          let thinking = '';
          if (Array.isArray(parsed.content)) {
            for (const item of parsed.content) {
              if (item.type === 'text') text += item.text;
              if (item.type === 'thinking') thinking += item.thinking;
            }
          }
          resolve({ text: text || thinking, rawText: text, thinking, usage: parsed.usage });
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

if (require.main === module) {
  const prompt =
    process.argv.slice(2).join(' ') ||
    'Merhaba! GLM 5.3 Flash High modunda React Native projemiz için hazir misin?';
  console.log(`[Antigravity -> GLM-5.3-Flash (High Mode)]: ${prompt}\n`);
  queryGLM({ prompt })
    .then(({ text, thinking, usage }) => {
      if (thinking) {
        console.log(`[GLM-5.3 Derin Düşünce (Reasoning / High Mode)]:\n${thinking}\n`);
      }
      console.log(`[GLM-5.3-Flash Yanıtı]:\n${text}`);
      if (usage) {
        console.log(`\n[Token Kullanımı]: Input: ${usage.input_tokens}, Output: ${usage.output_tokens}`);
      }
    })
    .catch((err) => {
      console.error('[Hata]:', err.message);
    });
}

module.exports = { queryGLM };
