const workingSir = process.cwd();
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  bold,
  inlineCode,
} = require("discord.js");
const { performance } = require("perf_hooks");

module.exports = (database, client) => {
  if (database != null || client != null)
    var { sendNude, getQuoteChannel, updateUsers } =
    require(`${workingSir}/modules/db.js`)(database, client);

  async function processQuote(channel, interaction) {
    const createdDate = new Date();
    let quote = {
      serverId: interaction.guildId,
      publisherId: interaction.user.id,
      createdTimestamp: +createdDate,
      createdIn: createdDate.getFullYear(),
      content: [],
      authorIds: [],
    };
    updateUsers([quote.publisherId]);

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
    const authors = await updateUsers(authorIds);
    quote.authorIds = authorIds;

    const quoteString = `"${quote.content.join('" "')}" by ${authors
      .map((author) => author && bold(author.name))
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
