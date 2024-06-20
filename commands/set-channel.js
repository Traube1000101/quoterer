const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  strikethrough,
} = require("discord.js");

module.exports = {
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
    const guildId = interaction.guildId;
    const channel = interaction.options.getChannel("channel");
    console.log("Guild ID:", guildId, "\nChannel ID:", channel.id);
    await interaction.reply({
      content:
        "WIP: Nothing was changed or set!" +
        strikethrough(
          `Successfully set the quote channel to "${channel.name}".`
        ),
      ephemeral: true,
    });
  },
};
