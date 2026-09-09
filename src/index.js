const { Client, GatewayIntentBits, Events } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection } = require("@discordjs/voice");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

const prefix = "!";

client.login(process.env.DISCORD_TOKEN);
