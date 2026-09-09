const { SlashCommandBuilder } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");
const { connectToChannel, startVoiceActivityMonitor } = require("../util/voice");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("join")
    .setDescription("Joins the voice channel.")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The voice channel to join")
        .setRequired(false)
        .addChannelTypes(2),
    ), // 2 is the type for voice channels
  async execute(interaction) {
    const channel =
      interaction.options.getChannel("channel") ||
      interaction.member.voice.channel;

    if (!channel) {
      return interaction.reply({
        content: "You need to be in a voice channel or specify one to join!",
        ephemeral: true,
      });
    }

    const connection = getVoiceConnection(interaction.guild.id);
    if (connection) {
      return interaction.reply({
        content: "I am already in a voice channel!",
        ephemeral: true,
      });
    }

    interaction.deferReply().catch((error) => {
      console.error("Error deferring reply:", error);
    });

    try {
      const newConnection = await connectToChannel(channel);
      startVoiceActivityMonitor(newConnection);
      await interaction.editReply(`Joined <#${channel.id}>!`);
    } catch (error) {
      console.error("Error joining voice channel:", error);
      try {
        await interaction.editReply({
          content: "There was an error trying to join the voice channel!",
        });
      } catch (replyError) {
        console.error("Error replying to interaction:", replyError);
      }
    }
  },
};
