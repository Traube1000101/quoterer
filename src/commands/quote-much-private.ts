import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    PermissionFlagsBits,
    InteractionContextType,
} from "discord.js";

import { execute as quoteMuchExecute } from "@/commands/quote-much";

export const data = new SlashCommandBuilder()
    .setName("quote-much-private")
    .setDescription("Quote a conversation privately; passage by passage.")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
    .addStringOption((option) =>
        option
            .setName("message")
            .setDescription("Passage of quote")
            .setRequired(true)
    )
    .addUserOption((option) =>
        option
            .setName("author")
            .setDescription("The user who uttered the passage (Default: you)")
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    return quoteMuchExecute(interaction, true);
}
