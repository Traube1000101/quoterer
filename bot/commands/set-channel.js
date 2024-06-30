const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = (database) => {
  async function setChannel(guildId, channelId, channelName) {
    const serversCollection = database.collection("servers");
    try {
      await serversCollection.updateOne(
        { _id: guildId },
        {
          $set: {
            channel: {
              id: channelId,
              name: channelName,
            },
          },
        },
        { upsert: true }
      );
    } catch (error) {
      console.error("Error:", error);
    }
  }

  return {
    data: new SlashCommandBuilder()
      .setName("set-channel")
      .setDescription("Sets the quote Channel for the current server.")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("Set the Quote Channel")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      ),
    async execute(interaction) {
      const channel = interaction.options.getChannel("channel");
      setChannel(interaction.guildId, channel.id, channel.name);
      await interaction.reply({
        content: `Successfully set the quote channel to "${channel.name}".`,
        ephemeral: true,
      });
    },
  };
};
