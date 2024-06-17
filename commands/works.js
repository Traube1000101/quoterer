const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("works").setDescription("Replies if it works!"),
  async execute(interaction) {
    await interaction.reply("workssss!");
  },
};
