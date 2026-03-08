import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    PermissionFlagsBits,
    InteractionContextType,
} from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("quote-me")
    .setDescription("Quotes your message")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
    .addStringOption((option) =>
        option
            .setName("message")
            .setDescription("Your message to quote")
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const message = interaction.options.getString("message", true);
}
