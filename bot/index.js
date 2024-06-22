const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, Events, GatewayIntentBits } = require("discord.js");
require("dotenv").config({ path: "../.env" });
const { MongoClient } = require("mongodb");

const uri = `mongodb://${process.env.db_user}:${process.env.db_password}@localhost:27017/`;
const dbClient = new MongoClient(uri);
const database = dbClient.db("quote-gatherer");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  let command = require(filePath);

  if (typeof command === "function") {
    command = command(database, client);
  }

  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
    );
  }
}

client.on("ready", () => {
  client.user.setActivity("Searching for quotes...", {
    type: 4,
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    const errorReply = {
      content: "There was an error while executing this command!",
      ephemeral: true,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorReply);
    } else {
      await interaction.reply(errorReply);
    }
  }
});

client.login(process.env.bot_token);

console.log("Bot is running!");

process.on("SIGINT", async () => {
  await dbClient.close();
  await client.user.setActivity("Sleeping...", {
    type: 4,
  });
  console.log("Shutting down...");
  process.exit();
});
