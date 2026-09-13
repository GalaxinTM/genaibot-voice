const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { URL } = require('node:url');

const DEFAULT_WHISPER_ENDPOINT = process.env.WHISPER_ENDPOINT || 'http://localhost:4000/inference';

function normalizeTranscript(rawTranscript) {
  if (typeof rawTranscript !== 'string') {
    rawTranscript = String(rawTranscript || '');
  }

  const transcript = rawTranscript
    // 1. Normalize line endings
    .replace(/\r\n/g, '\n')
    // 2. Remove [xyz], (xyz), and *xyz* (restricted to single lines)
    .replace(/(?:\[[^\r\n\]]*\]|\([^\r\n()]*\)|\*[^\r\n*]+\*)/g, ' ')
    // 3. Collapse multiple spaces/tabs within lines into a single space
    .replace(/[ \t]+/g, ' ')
    // 4. Strip leading and trailing spaces from EVERY line using multiline flag (/m)
    .replace(/^[ \t]+|[ \t]+$/gm, '')
    // 5. Limit consecutive blank lines to max 2 newlines (preserving paragraph breaks)
    .replace(/\n{2,}/g, '\n\n')
    // 6. Trim entire result
    .trim();

  if (!transcript) {
    return '';
  }

  return transcript;
}

function padPcmBuffer(pcmBuffer, options = {}) {
  if (!Buffer.isBuffer(pcmBuffer)) {
    throw new TypeError('pcmBuffer must be a Buffer');
  }

  const sampleRate = Number(options.sampleRate || 48000);
  const channels = Number(options.channels || 2);
  const bitDepth = Number(options.bitDepth || 16);
  const minDurationMs = Number(options.minDurationMs || 100);
  const bytesPerFrame = (bitDepth / 8) * channels;
  const minBytes = Math.max(1, Math.round((sampleRate * bytesPerFrame * minDurationMs) / 1000));

  if (pcmBuffer.length >= minBytes) {
    return pcmBuffer;
  }

  const pad = Buffer.alloc(minBytes - pcmBuffer.length, 0);
  return Buffer.concat([pcmBuffer, pad]);
}

function wavBufferFromPcm(pcmBuffer, options = {}) {
  if (!Buffer.isBuffer(pcmBuffer)) {
    throw new TypeError('pcmBuffer must be a Buffer');
  }

  const sampleRate = Number(options.sampleRate || 48000);
  const channels = Number(options.channels || 2);
  const bitDepth = Number(options.bitDepth || 16);
  const blockAlign = (bitDepth / 8) * channels;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

function makeMultipartBody(wavBuffer, boundary) {
  const fileName = 'speech.wav';
  const header = `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
    `Content-Type: audio/wav\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;

  return Buffer.concat([
    Buffer.from(header, 'utf8'),
    wavBuffer,
    Buffer.from(footer, 'utf8'),
  ]);
}

function whisperRequest(wavBuffer) {
  const endpoint = DEFAULT_WHISPER_ENDPOINT;
  const url = new URL(endpoint);
  const boundary = `----NodeWhisper${Date.now().toString(16)}`;
  const body = makeMultipartBody(wavBuffer, boundary);

  const headers = {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': body.length,
  };

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers,
      },
      (res) => {
        let responseText = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          responseText += chunk;
        });
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`whisper server responded ${res.statusCode}: ${responseText}`));
            return;
          }

          try {
            const parsed = responseText ? JSON.parse(responseText) : {};
            const transcript = parsed.transcript || parsed.text || parsed.transcription || parsed.result || '';
            resolve(String(transcript).trim());
          } catch (error) {
            resolve(String(responseText).trim());
          }
        });
      }
    );

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function transcribeBuffer(pcmBuffer, guildId = 'default', userId = 'unknown') {
  if (!Buffer.isBuffer(pcmBuffer)) {
    throw new TypeError('pcmBuffer must be a Buffer');
  }

  const paddedPcmBuffer = padPcmBuffer(pcmBuffer, { sampleRate: 48000, channels: 2, bitDepth: 16, minDurationMs: 100 });
  const wavBuffer = wavBufferFromPcm(paddedPcmBuffer);
  const transcript = normalizeTranscript(await whisperRequest(wavBuffer));

  if (transcript) {
    appendTranscript(guildId, transcript, userId);
  }

  return transcript;
}

function appendTranscript(guildId = 'default', transcript = '', userId = 'unknown') {
  const baseDir = path.resolve(process.cwd(), 'messages');
  const filePath = path.join(baseDir, `${guildId}.txt`);
  const cleanTranscript = normalizeTranscript(transcript);

  if (!cleanTranscript) {
    return;
  }

  const lines = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean)
    : [];

  if (lines.includes(cleanTranscript)) {
    return;
  }

  fs.mkdirSync(baseDir, { recursive: true });
  fs.appendFileSync(filePath, `${cleanTranscript}\n`, 'utf8');
}

module.exports = {
  transcribeBuffer,
  appendTranscript,
  wavBufferFromPcm,
  whisperRequest,
  normalizeTranscript,
};
