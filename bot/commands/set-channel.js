const workingSir = process.cwd();
const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = (database) => {
  const { setChannel } = require(`${workingSir}/modules/db.js`)(database);
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
      const { id, name } = interaction.options.getChannel("channel");
      const server = {
        name: interaction.guild.name,
        icon: interaction.guild.iconURL(),
        channel: {
          id,
          name,
        },
      };
      setChannel(interaction.guildId, server);
      await interaction.reply({
        content: `Successfully set the quote channel to "${name}".`,
        ephemeral: true,
      });
    },
  };
};
