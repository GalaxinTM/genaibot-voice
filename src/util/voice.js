const {
  joinVoiceChannel,
  VoiceConnectionStatus,
  VoiceConnectionDisconnectReason,
  createAudioPlayer,
  createAudioResource,
  StreamType,
  entersState,
  EndBehaviorType,
} = require("@discordjs/voice");
const prism = require("prism-media");
const { Readable } = require("stream");

function setupVoiceEcho(connection) {
  // 1. Create the AudioPlayer and subscribe the VoiceConnection
  const player = createAudioPlayer();
  connection.subscribe(player);

  const receiver = connection.receiver;

  receiver.speaking.on("start", (userId) => {
    // 2. Subscribe to the user's incoming Opus audio stream
    const opusStream = receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: 200, // Stop stream after 200ms of silence
      },
    });

    // 3. Decode Opus packets into 48kHz 16-bit stereo PCM
    const decoder = new prism.opus.Decoder({
      rate: 48000,
      channels: 2,
      frameSize: 960,
    });
    const pcmStream = opusStream.pipe(decoder);

    const chunks = [];
    pcmStream.on("data", (chunk) => chunks.push(chunk));

    // 4. When silence is detected, play the recorded audio back into the channel
    pcmStream.on("end", () => {
      const audioBuffer = Buffer.concat(chunks);
      if (audioBuffer.length === 0) return;

      // Convert the PCM buffer back into a Readable stream
      const bufferStream = Readable.from(audioBuffer);

      // Create a raw PCM audio resource
      const resource = createAudioResource(bufferStream, {
        inputType: StreamType.Raw,
      });

      player.play(resource);
    });
  });
  connection.on(VoiceConnectionStatus.Destroyed, () => {
    console.log("Disconnected from voice channel.");
    player.stop(); // Stop the player when the connection is destroyed
  });
}

function listenToUsers(connection) {
  const receiver = connection.receiver;

  // Fired whenever a user starts speaking
  receiver.speaking.on("start", (userId) => {
    console.log(`User ${userId} started speaking`);

    // Subscribe to this specific user's stream
    const audioStream = receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: 100, // Stop stream after 100ms of silence
      },
    });

    // Emits raw Opus audio frames for this user
    audioStream.on("data", (chunk) => {
      // 'chunk' is a Buffer containing Opus audio data
    });

    audioStream.on("end", () => {
      console.log(`Finished receiving audio from user ${userId}`);
    });
  });
}

async function connectToChannel(channel) {
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: false,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);

    connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
      // Code 4014 means the bot was kicked, disconnected by a moderator, or moved channels
      if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
        try {
          // If the bot was merely moved to another voice channel, 
          // Discord will automatically reconnect it within 5 seconds.
          await entersState(connection, VoiceConnectionStatus.Connecting, 5_000);
        } catch {
          // If it times out, the bot was kicked/disconnected by a moderator—destroy the connection.
          connection.destroy();
        }
      } else if (connection.rejoinAttempts < 5) {
        // Recoverable network drop: back off and attempt to rejoin
        await new Promise((resolve) => setTimeout(resolve, (connection.rejoinAttempts + 1) * 5_000));
        connection.rejoin();
      } else {
        // Reconnect limit reached
        connection.destroy();
      }
    });

    return connection;
  } catch (error) {
    connection.destroy();
    throw error;
  }
}

module.exports = {
  connectToChannel,
  listenToUsers,
  setupVoiceEcho,
};
