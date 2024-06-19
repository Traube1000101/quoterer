const { SlashCommandBuilder, time } = require("discord.js");

const config = require("../config.json");

function gatherQuotes(client, messages) {
  for (const message of messages) {
    let quote = {
      quoteId: message[0],
      createdTimestamp: message[1].createdTimestamp,
    };
    const messageText = message[1].content.replace(/\*\*/g, "");

    const texts = messageText.match(/(?<=")[\w.!?äöü].*?[\w.!?äöü](?=")/g); // Match texts between quotes
    (texts && (quote.content = texts)) || (quote.invalid = true);

    let byString = messageText.match(/(?<=by\s).*(?=\sin)/); // Match string between by & in
    if (byString) {
      byString = byString[0];
      quote.authors = [];

      const authorIds = byString.match(/(?<=<@).*?(?=>)/g);
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
        byString.split(", ").forEach((author) => {
          quote.authors.push({
            name: author,
          });
        });
      }
    } else {
      quote.invalid = true;
    }

    const createdIn = messageText.match(/(?<=\sin\s).*/);
    (createdIn && (quote.createdIn = createdIn[0])) ||
      (quote.createdIn = new Date(quote.createdTimestamp).getFullYear());

    quote.invalid && (quote.originalMessage = messageText);

    console.log(`Quote:`, quote);
  }
}

module.exports = (client) => {
  return {
    data: new SlashCommandBuilder()
      .setName("get-messages")
      .setDescription("Gets all messages of a channel."),
    async execute(interaction) {
      const channel = client.channels.cache.get(config.channel_id);
      channel.messages
        .fetch()
        .then((messages) => gatherQuotes(client, messages))
        .catch(console.error);
      await interaction.reply({
        content: "Read and processed the Quotes!",
        ephemeral: true,
      });
    },
  };
};
