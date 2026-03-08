import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    PermissionFlagsBits,
    InteractionContextType,
    MessageFlags,
} from "discord.js";

import { createQuote, type PassageEntry } from "@/modules/db_utils";
import { createSubmitCancelButtonRow, parsePassages } from "@/modules/ui";

// Storage (in memory) for previous interactions / passages
// keys: "guildId-userId"
const sessions = new Map<string, PassageEntry[]>();
const activeCollectors = new Map<
    string,
    { interaction: ChatInputCommandInteraction; stop: () => void }
>();

export const data = new SlashCommandBuilder()
    .setName("quote-much")
    .setDescription("Quotes conversation; passage by passage")
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
            .setDescription("The user who uttered the passage")
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
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

    const response = await interaction.reply({
        content: `**Quote so far** - run \`/quote-much\` again to add another passage:\n${parsePassages(passages)}`,
        components: [createSubmitCancelButtonRow()],
        flags: MessageFlags.Ephemeral,
        withResponse: true,
    });

    if (response.resource === null || response.resource.message === null) {
        return interaction.editReply({
            content: "Failed to send confirmation message.",
            components: [],
        });
    }

    const collector = response.resource.message.createMessageComponentCollector(
        {
            filter: (i) => i.user.id === interaction.user.id,
            time: 300_000,
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
            });
            return;
        }

        const finalPassages = sessions.get(sessionKey) ?? passages;
        sessions.delete(sessionKey);
        await createQuote(
            interaction.guildId,
            interaction.user,
            finalPassages,
            parsePassages(finalPassages)
        );
        await confirmation.update({
            content: `Quote saved with ${finalPassages.length} passage(s)!`,
            components: [],
        });
    });

    collector.on("end", async (_collected, reason) => {
        if (reason === "time") {
            sessions.delete(sessionKey);
            activeCollectors.delete(sessionKey);
            await interaction.editReply({
                content:
                    "Confirmation not received within 5 minutes, session cancelled.",
                components: [],
            });
        }
        // "superseded" is handled by the next invocation; "limit" is handled in "collect"
    });
}
