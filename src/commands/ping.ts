import {
    SlashCommandBuilder,
    MessageFlags,
    ChatInputCommandInteraction,
} from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!");

export async function execute(interaction: ChatInputCommandInteraction) {
    return interaction.reply({
        content: "Pong!",
        flags: MessageFlags.Ephemeral,
    });
}
