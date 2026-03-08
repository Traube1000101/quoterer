import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    PermissionFlagsBits,
    InteractionContextType,
    ChannelType,
} from "discord.js";
import { initGuild as initGuildQuotes } from "@/modules/db_utils";

export const data = new SlashCommandBuilder()
    .setName("set-channel")
    .setDescription("Sets channel where quotes will be written to")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
        option
            .setName("channel")
            .setDescription("Channel where quotes will be written to")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel("channel", true);

    if (interaction.guild === null) {
        return interaction.reply({
            content: "Guild not found!",
            ephemeral: true,
        });
    }

    await initGuildQuotes(interaction.guild, channel);

    await interaction.reply({
        content: `Successfully set the quote channel to "${channel.name}".`,
        ephemeral: true,
    });
}
