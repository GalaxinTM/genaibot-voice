class SttService {
  constructor() {
    this.name = 'SttService';
  }

  async transcribeBuffer(pcmBuffer) {
    // Pass-through / no-op adapter stub for a future STT microservice.
    // The voice pipeline remains ready to replace this object with a
    // remote service that returns a transcript from the PCM buffer.
    return "poop butt";
  }
}

module.exports = {
  SttService,
  transcribeBuffer: async (pcmBuffer) => {
    const service = new SttService();
    return service.transcribeBuffer(pcmBuffer);
  },
};
