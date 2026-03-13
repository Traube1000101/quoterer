import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    PermissionFlagsBits,
    InteractionContextType,
    MessageFlags,
} from "discord.js";

import { config } from "@/util/config";
import { applyQuote } from "@/util/write-quote";
import type { PassageEntry } from "@/util/queries";
import {
    createSubmitCancelButtonRow,
    formatDurationMS,
    formatPassages,
    formatQuote,
} from "@/util/discord-formatting";

// Storage (in memory) for previous interactions / passages
// keys: "guildId-userId"
const sessions = new Map<string, PassageEntry[]>();
const activeCollectors = new Map<
    string,
    { interaction: ChatInputCommandInteraction; stop: () => void }
>();

export const data = new SlashCommandBuilder()
    .setName("quote-much")
    .setDescription("Quote a conversation; passage by passage")
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

export async function execute(
    interaction: ChatInputCommandInteraction,
    isPrivate = false
) {
    if (!interaction.inCachedGuild()) {
        return interaction.reply({
            content: "Guild not found!",
            flags: MessageFlags.Ephemeral,
        });
    }

    const message = interaction.options.getString("message", true);
    const authorOption = interaction.options.getUser("author");
    const passageAuthor = authorOption ?? interaction.user;
    const sessionKey = `${interaction.guildId}-${interaction.user.id}`;

    // Close the previous interaction's buttons before creating the new one
    const previousCollector = activeCollectors.get(sessionKey);
    if (previousCollector) {
        activeCollectors.delete(sessionKey);
        previousCollector.stop();
        await previousCollector.interaction.deleteReply();
    }

    // Append new passage to the session (or start a fresh one)
    const passages = sessions.get(sessionKey) ?? [];
    passages.push({ text: message, author: passageAuthor });
    sessions.set(sessionKey, passages);

    const qouteEmbed = formatQuote({
        publisher: interaction.user,
        passages,
        isPrivate,
        utteredAt: new Date(),
    });

    const response = await interaction.reply({
        content: `**Quote so far** - run \`/quote-much\` again to add another passage:`,
        components: [createSubmitCancelButtonRow()],
        flags: MessageFlags.Ephemeral,
        withResponse: true,
        ...qouteEmbed,
    });

    if (response.resource === null || response.resource.message === null) {
        return interaction.editReply({
            content: "Failed to send confirmation message.",
            components: [],
            embeds: [],
        });
    }

    const collector = response.resource.message.createMessageComponentCollector(
        {
            filter: (i) => i.user.id === interaction.user.id,
            time: config.MAX_RESPONSE_TIME,
            max: 1,
        }
    );

    activeCollectors.set(sessionKey, {
        interaction,
        stop: () => collector.stop("superseded"),
    });

    collector.on("collect", async (confirmation) => {
        activeCollectors.delete(sessionKey);

        if (confirmation.customId === "cancel") {
            sessions.delete(sessionKey);
            await confirmation.update({
                content: "Quote creation cancelled.",
                components: [],
                embeds: [],
            });
            return;
        }

        const finalPassages = sessions.get(sessionKey) ?? passages;
        sessions.delete(sessionKey);
        await applyQuote(interaction, {
            guildId: interaction.guildId,
            publisher: interaction.user,
            passages: finalPassages,
            sourceMessage: formatPassages(finalPassages),
            isPrivate,
            utteredAt: new Date(),
        });
        try {
            await confirmation.update({
                content: `Quote saved with ${finalPassages.length} passage${finalPassages.length !== 1 ? "s" : ""}!`,
                components: [],
                embeds: [],
            });
        } catch (error) {
            console.error("Failed to update confirmation message:", error);
        }
    });

    collector.on("end", async (_collected, reason) => {
        if (reason === "time") {
            sessions.delete(sessionKey);
            activeCollectors.delete(sessionKey);
            try {
                await interaction.editReply({
                    content: `Confirmation not received within ${formatDurationMS(
                        config.MAX_RESPONSE_TIME
                    )}, session cancelled.`,
                    components: [],
                    embeds: [],
                });
            } catch (error) {
                console.error("Failed to edit reply on collector end:", error);
            }
        }
        // "superseded" is handled by the next invocation; "limit" is handled in "collect"
    });
}
