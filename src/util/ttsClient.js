const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');

function requestBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    const req = client.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const data = Buffer.concat(chunks);
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`TTS service failed with ${res.statusCode}: ${data.toString('utf8')}`));
          return;
        }
        resolve(data);
      });
    });

    req.on('error', reject);
  });
}

async function synthesize(text, options = {}) {
  const base = process.env.TTS_SERVICE_URL || 'http://localhost:5000/tts';
  const url = new URL(base);
  url.searchParams.set('text', text);
  url.searchParams.set('lang', 'useng');
  url.searchParams.set('pitch', String(options.pitch || 50));
  url.searchParams.set('speed', String(options.speed || 50));
  url.searchParams.set('quality', String(options.quality || 50));
  url.searchParams.set('tone', String(options.tone || 50));
  url.searchParams.set('accent', String(options.accent || 50));
  url.searchParams.set('intonation', String(options.intonation || 1));

  return requestBuffer(url.toString());
}

module.exports = {
  synthesize,
};
