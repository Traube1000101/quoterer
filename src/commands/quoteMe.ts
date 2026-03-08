import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    PermissionFlagsBits,
    InteractionContextType,
    MessageFlags,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    MessageActionRowComponentBuilder,
} from "discord.js";

import { createQuote } from "@/modules/db_utils";

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
    if (!interaction.inCachedGuild()) {
        return interaction.reply({
            content: "Guild not found!",
            flags: MessageFlags.Ephemeral,
        });
    }

    const message = interaction.options.getString("message", true);
    const author = interaction.user;

    const confirm = new ButtonBuilder()
        .setCustomId("confirm")
        .setLabel("Confirm")
        .setStyle(ButtonStyle.Danger);
    const cancel = new ButtonBuilder()
        .setCustomId("cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary);
    const row =
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
            cancel,
            confirm
        );
    const response = await interaction.reply({
        content: `Are you sure you want to quote the following message?\n-# \"${
            message
        }\" - <@${author.id}>`,
        components: [row],
        flags: MessageFlags.Ephemeral,
        withResponse: true,
    });

    if (response.resource === null || response.resource.message === null) {
        return interaction.editReply({
            content: "Failed to send confirmation message.",
            components: [],
        });
    }
    try {
        const confirmation =
            await response.resource.message.awaitMessageComponent({
                filter: (i) => i.user.id === author.id,
                time: 60_000,
            });

        if (confirmation.customId === "cancel") {
            await confirmation.update({
                content: "Quote creation cancelled.",
                components: [],
            });
            return;
        }

        await createQuote(
            interaction.guildId,
            author.id,
            [{ content: message, authorId: author.id }],
            message
        );

        await confirmation.update({
            content: "Your message has been quoted!",
            components: [],
        });
    } catch (error) {
        await interaction.editReply({
            content: "Confirmation not received within 1 minute, cancelling...",
            components: [],
        });
    }
}
