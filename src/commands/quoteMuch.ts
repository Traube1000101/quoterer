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

type PassageEntry = { content: string; authorId: string };

// "guildId-userId" -> accumulated passages
const sessions = new Map<string, PassageEntry[]>();

// "guildId-userId" -> previous interaction + stop handle for its collector
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
    passages.push({ content: message, authorId: passageAuthor.id });
    sessions.set(sessionKey, passages);

    const preview = passages
        .map((p, i) => `-# [${i + 1}] "${p.content}" - <@${p.authorId}>`)
        .join("\n");

    const submit = new ButtonBuilder()
        .setCustomId("submit")
        .setLabel("Submit Quote")
        .setStyle(ButtonStyle.Success);
    const cancel = new ButtonBuilder()
        .setCustomId("cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger);
    const row =
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
            cancel,
            submit
        );

    const response = await interaction.reply({
        content: `**Quote so far** - run \`/quote-much\` again to add another passage:\n${preview}`,
        components: [row],
        flags: MessageFlags.Ephemeral,
        withResponse: true,
    });

    if (response.resource === null || response.resource.message === null) {
        sessions.delete(sessionKey);
        return interaction.editReply({
            content: "Failed to send confirmation message.",
            components: [],
        });
    }

    const collector = response.resource.message.createMessageComponentCollector(
        {
            filter: (i) => i.user.id === interaction.user.id,
            time: 300_000, // 5 minutes to decide
            max: 1,
        }
    );

    activeCollectors.set(sessionKey, {
        interaction,
        stop: () => collector.stop("superseded"),
    });

    collector.on("collect", async (confirmation) => {
        activeCollectors.delete(sessionKey);
        // Read from the map at decision time so all passages accumulated
        // across multiple invocations are included.
        const finalPassages = sessions.get(sessionKey) ?? passages;

        if (confirmation.customId === "cancel") {
            sessions.delete(sessionKey);
            await confirmation.update({
                content: "Quote creation cancelled.",
                components: [],
            });
            return;
        }

        sessions.delete(sessionKey);
        await createQuote(
            interaction.guildId,
            interaction.user.id,
            finalPassages,
            finalPassages.map((p) => p.content).join(" / ")
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
