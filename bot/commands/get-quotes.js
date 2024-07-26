const workingSir = process.cwd();
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  Collection,
} = require("discord.js");
const { performance } = require("perf_hooks");
const { v5: uuidv5, validate: uuidValidate } = require("uuid");

module.exports = (database, client) => {
  const { sendNude, getQuoteChannel, updateUsers, pushUser, getUserByName } =
    require(`${workingSir}/modules/db.js`)(database, client);

  function getRest(string, matches) {
    if (matches) {
      const lastMatch = matches[matches?.length - 1],
        lastMatchPos = string.indexOf(lastMatch) + lastMatch?.length + 1;
      return string.slice(lastMatchPos);
    }
  }

  async function processQuotes(performanceMonitor, messages, serverId, userId) {
    const namespace = process.env.namespace_uuid;
    if (!uuidValidate(namespace))
      throw new Error(
        "Invalid namespace UUID! check if its defined correctly in .env file."
      );

    for (const message of messages) {
      let quote = {
        serverId: serverId,
        publisherId: userId,
        createdTimestamp: message[1].createdTimestamp,
        content: [],
        authorIds: [],
        imported: true,
      };
      await updateUsers([quote.publisherId]);

      const messageId = message[0];
      const messageText = message[1].content.replace(/\*\*/g, "");
      const texts = messageText.match(/(?<=").*?(?=")/g); // Match texts between quotes

      let messageTextRest = messageText;
      if (texts) {
        const filteredTexts = texts.filter(
          (e) => e.trim().length > 0 && e.match(/^\s*-\s*$/) === null
        ); // Filter out strings with just spaces and hyphens
        if (!filteredTexts) {
          quote.invalid = true;
        }
        quote.content = filteredTexts;
        messageTextRest = getRest(messageText, filteredTexts);
      } else quote.invalid = true;

      const authorIds = messageTextRest.match(/(?<=<@!?)\d+(?=>)/g);
      if (authorIds) {
        await updateUsers(authorIds);
        quote.authorIds = authorIds;
      } else {
        let byString = messageTextRest.match(/(?<=by\s).*(?=\sin)/); // Match string between by & in
        if (byString) {
          byString = byString[0];
          for (const authorName of byString.split(", ")) {
            let author = await getUserByName(authorName);
            if (author === false) {
              author = {
                _id: uuidv5(authorName, namespace),
                name: authorName,
              };
              await pushUser(author);
            }
            quote.authorIds.push(author._id);
          }
        } else {
          quote.invalid = true;
        }
      }
      const createdIn = messageTextRest.match(/(?<=\sin\s)(?!.*\sin\s).*/);
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
          data = await processQuotes(
            performanceMonitor,
            messages,
            interaction.guildId,
            interaction.user.id
          );
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
