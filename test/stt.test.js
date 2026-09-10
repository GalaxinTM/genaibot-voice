const assert = require('assert');
const path = require('path');
const stt = require(path.join(__dirname, '..', 'src', 'util', 'stt'));

assert.strictEqual(typeof stt, 'object');
assert.strictEqual(typeof stt.transcribeBuffer, 'function');
assert.strictEqual(typeof stt.wavBufferFromPcm, 'function');
assert.strictEqual(typeof stt.appendTranscript, 'function');

const pcm = Buffer.from([0, 0, 0, 0]);
const wav = stt.wavBufferFromPcm(pcm, { sampleRate: 48000, channels: 2, bitDepth: 16 });
assert.ok(Buffer.isBuffer(wav));
assert.ok(wav.length >= 44);
assert.strictEqual(wav.slice(0, 4).toString('ascii'), 'RIFF');

console.log('stt utility smoke test passed');
