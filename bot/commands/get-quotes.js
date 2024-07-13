const workingSir = process.cwd();
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  Collection,
} = require("discord.js");
const { performance } = require("perf_hooks");
require("dotenv").config({ path: `${workingSir}/../.env` });

module.exports = (database, client) => {
  const { sendNude, getQuoteChannel } = require(`${workingSir}/modules`)(
    database,
    client
  );

  function getRest(string, matches) {
    if (matches) {
      const lastMatch = matches[matches?.length - 1],
        lastMatchPos = string.indexOf(lastMatch) + lastMatch?.length + 1;
      return string.slice(lastMatchPos);
    }
  }

  async function processQuotes(performanceMonitor, messages) {
    for (const message of messages) {
      let quote = {
        createdTimestamp: message[1].createdTimestamp,
        content: [],
        authors: [],
        imported: true,
      };

      const messageId = message[0];
      const messageText = message[1].content.replace(/\*\*/g, "");
      const texts = messageText.match(/(?<=").*?(?=")/g); // Match texts between quotes

      let messageTextRest = messageText;
      if (texts) {
        const filteredTexts = texts.filter((e) => e.trim().length > 0); // Filter out strings with just spaces
        quote.content = filteredTexts;
        messageTextRest = getRest(messageText, filteredTexts);
      } else quote.invalid = true;

      const authorIds = messageTextRest.match(/(?<=<@).*?(?=>)/g);
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
        let byString = messageTextRest.match(/(?<=by\s).*(?=\sin)/); // Match string between by & in
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
      const createdIn = messageTextRest.match(/(?<=\sin\s).*/);
      (createdIn && (quote.createdIn = createdIn[0])) ||
        (quote.createdIn = new Date(quote.createdTimestamp).getFullYear());
      quote.invalid && (quote.originalMessage = messageText);

      sendNude(messageId, quote);

      await performanceMonitor.deferIfNeeded();
    }

    return {
      count: messages.size,
    };
  }

  async function fetchMessages(performanceMonitor, channel, limit = 10000) {
    let collection = new Collection();
    let lastId = null;

    while (collection.size < limit) {
      const options = { limit: 100, cache: false };
      lastId && (options.before = lastId);

      const messages = await channel.messages.fetch(options);
      if (messages) {
        collection = collection.concat(messages);
        lastId = messages.last().id;
      }
      if (messages.size < 100) {
        break;
      }
      await performanceMonitor.deferIfNeeded();
    }

    return collection;
  }

  return {
    data: new SlashCommandBuilder()
      .setName("get-quotes")
      .setDescription(
        "Gets all quotes of the quotes channel, processes them and saves them into the database."
      )
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
      let performanceMonitor = {
        deffered: false,
        start: performance.now(),
        getDuration() {
          return performance.now() - this.start;
        },
        async deferIfNeeded() {
          if (!this.deffered && this.getDuration() > 1250.0) {
            await interaction.deferReply({ ephemeral: true });
            this.deffered = true;
          }
        },
      };

      async function reply(message) {
        if (performanceMonitor.deffered === true) {
          await interaction.editReply(message);
        } else {
          await interaction.reply(message);
        }
      }

      try {
        const channel = await getQuoteChannel(interaction.guildId),
          messages = await fetchMessages(performanceMonitor, channel),
          data = await processQuotes(performanceMonitor, messages);
        await reply({
          content: `Read and processed ${
            data.count
          } Quotes in ${performanceMonitor.getDuration().toFixed(2)}ms.`,
          ephemeral: true,
        });
      } catch (error) {
        await reply({
          content: "Error: " + error.message,
          ephemeral: true,
        });
      }
    },
  };
};
