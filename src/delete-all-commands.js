const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
require("dotenv").config();

(async () => {
  const token = process.env.DISCORD_TOKEN;

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  await client.login(token);

  const rest = new REST({ version: "10" }).setToken(token);
  const applicationId = client.application.id;

  // Get every guild the bot is in
  const guilds = await client.guilds.fetch();

  for (const guild of guilds.values()) {
    try {
      await rest.put(
        Routes.applicationGuildCommands(applicationId, guild.id),
        { body: [] }
      );
      console.log(`Cleared all commands in guild ${guild.name} (${guild.id})`);
    } catch (err) {
      console.error(`Failed clearing guild ${guild.id}:`, err);
    }
  }

  console.log("Finished clearing all guild slash commands.");
  process.exit(0);
})();