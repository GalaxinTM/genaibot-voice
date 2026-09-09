const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    const req = client.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Generator service failed with ${res.statusCode}: ${raw}`));
          return;
        }

        try {
          const parsed = JSON.parse(raw);
          resolve(parsed);
        } catch (error) {
          reject(new Error(`Generator service returned invalid JSON: ${raw}`));
        }
      });
    });

    req.on('error', reject);
  });
}

async function generateText(guildId) {
  const base = process.env.GENERATOR_SERVICE_URL || 'http://localhost:3000';
  const query = new URL(base);
  query.searchParams.set('channel_id', String(guildId));

  const payload = await requestJson(query.toString());

  if (Array.isArray(payload)) {
    return payload.join(' ');
  }

  if (payload && Array.isArray(payload.generated)) {
    return payload.generated.join(' ');
  }

  if (payload && typeof payload.text === 'string') {
    return payload.text;
  }

  if (payload && typeof payload.response === 'string') {
    return payload.response;
  }

  throw new Error('Generator service payload did not contain text content.');
}

module.exports = {
  generateText,
};
