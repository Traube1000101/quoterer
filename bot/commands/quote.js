const workingSir = process.cwd();
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  bold,
  inlineCode,
} = require("discord.js");
const { performance } = require("perf_hooks");

module.exports = (database, client) => {
  const { sendNude, getQuoteChannel } = require(`${workingSir}/modules/db.js`)(
    database,
    client
  );

  async function processQuote(channel, interaction) {
    const createdDate = new Date();
    let quote = {
      serverId: interaction.guildId,
      publisher: interaction.user.id,
      createdTimestamp: +createdDate,
      createdIn: createdDate.getFullYear(),
      content: [],
      authors: [],
    };

    const textStr = interaction.options.getString("text");
    if (!textStr)
      throw new Error(
        `No Text was provided or it's in a wrong format. Please separate multiple texts with ${inlineCode(
          ";"
        )}!\nExample: ${inlineCode("Some quote; Another quote")}`
      );
    quote.content = textStr.split(/\s*(?:;|"\s*")\s*/).filter((f) => f);

    const authorStr = interaction.options.getString("author");
    const authorIds = authorStr.match(/(?<=<@).*?(?=>)/g);
    if (!authorIds) throw new Error("No author defined.");
    quote.authors = authorIds.map((authorId) => {
      const author = client.users.cache.get(authorId);
      if (!author) {
        quote.invalid = true;
        return;
      }
      const { displayName, username } = author;
      return {
        id: authorId,
        name: displayName,
        username: username,
        avatar: author.avatarURL(),
      };
    });

    const quoteString = `"${quote.content.join('" "')}" by ${quote.authors
      .map((author) => bold(author.name))
      .join(", ")} in ${quote.createdIn}`;

    const { id } = await channel.send(quoteString);

    sendNude(id, quote);

    interaction.reply({
      content: `Quote created in ${channel.toString()}.`,
    });
  }

  return {
    data: new SlashCommandBuilder()
      .setName("quote")
      .setDescription(
        "Creates a Quote in the Quote Channel. Use ; to separate multiple texts."
      )
      .setDMPermission(false)
      .addStringOption((option) =>
        option
          .setName("text")
          .setDescription("Separate multiple texts with ;")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("author")
          .setDescription("Input Author(s) with @")
          .setRequired(true)
      ),

    async execute(interaction) {
      await getQuoteChannel(interaction.guildId)
        .then(async (channel) => processQuote(channel, interaction))
        .catch((error) => {
          interaction.reply({
            embeds: [
              {
                color: 0xff0000,
                description: bold("Error: ") + error.message,
              },
            ],
            ephemeral: true,
          });
        });
    },
  };
};
