# STT Service Scaffold

This package is intentionally a no-op / pass-through adapter scaffold for the future speech-to-text microservice.

The current voice-only companion architecture receives PCM audio directly from the Discord voice receiver, tracks completed speech segments, and then triggers the generator/TTS playback path using static pre-seeded datasets in `/messages/{guildId}.txt`.

Planned future integration:
- replace `SttService.transcribeBuffer(pcmBuffer)` with a network client to a speech-to-text microservice,
- map the returned transcript into a guild-scoped message store,
- keep the generator and TTS pipeline unchanged.

This folder does not implement the speech-to-text microservice itself.
