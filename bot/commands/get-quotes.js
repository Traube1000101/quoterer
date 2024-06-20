const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { performance } = require("perf_hooks");
require("dotenv").config({ path: "../../.env" });

function processQuotes(client, messages) {
  const startTime = performance.now();
  for (const message of messages) {
    let quote = {
      quoteId: message[0],
      createdTimestamp: message[1].createdTimestamp,
    };
    const messageText = message[1].content.replace(/\*\*/g, "");

    const texts = messageText.match(/(?<=")[\w.!?äöü].*?[\w.!?äöü](?=")/g); // Match texts between quotes
    (texts && (quote.content = texts)) || (quote.invalid = true);

    quote.authors = [];

    const authorIds = messageText.match(/(?<=<@).*?(?=>)/g);
    if (authorIds) {
      for (const authorId of authorIds) {
        const author = client.users.cache.get(authorId);
        author &&
          quote.authors.push({
            id: author.id,
            name: author.displayName,
            username: author.username,
            avatar: author.avatarURL(),
          });
      }
    } else {
      let byString = messageText.match(/(?<=by\s).*(?=\sin)/); // Match string between by & in
      if (byString) {
        byString = byString[0];
        byString.split(", ").forEach((author) => {
          quote.authors.push({
            name: author,
          });
        });
      } else {
        quote.invalid = true;
      }
    }
    const createdIn = messageText.match(/(?<=\sin\s).*/);
    (createdIn && (quote.createdIn = createdIn[0])) ||
      (quote.createdIn = new Date(quote.createdTimestamp).getFullYear());

    quote.invalid && (quote.originalMessage = messageText);

    console.log(`Quote:`, quote);
  }
  const endTime = performance.now();

  return {
    count: messages.size,
    elapsedTime: (endTime - startTime).toFixed(2),
  };
}

module.exports = (client) => {
  return {
    data: new SlashCommandBuilder()
      .setName("get-quotes")
      .setDescription(
        "Gets all quotes of the quotes channel, processes them and saves them into the database."
      )
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      try {
        const channel = client.channels.cache.get(process.env.channel_id);
        const messages = await channel.messages.fetch();
        const data = processQuotes(client, messages);
        await interaction.reply({
          content: `Read and processed ${data.count} Quotes in ${data.elapsedTime}ms.`,
          ephemeral: true,
        });
      } catch (error) {
        console.error(error);
      }
    },
  };
};
