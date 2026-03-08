import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    PermissionFlagsBits,
    InteractionContextType,
} from "discord.js";

import { execute as quoteExecute } from "@/commands/quote";

export const data = new SlashCommandBuilder()
    .setName("quote-private")
    .setDescription(
        "Quote a single utterance which will not be displayed publically (on the website etc.)"
    )
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
    .addStringOption((option) =>
        option
            .setName("message")
            .setDescription("Single quote")
            .setRequired(true)
    )
    .addUserOption((option) =>
        option
            .setName("author")
            .setDescription("The user who uttered the quote (Default: you)")
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    return quoteExecute(interaction, true);
}
