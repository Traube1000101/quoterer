import {
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    MessageActionRowComponentBuilder,
    DiscordjsErrorCodes,
    ChatInputCommandInteraction,
    EmbedBuilder,
} from "discord.js";
import type { FetchedQuote, FullQuoteEntry } from "./queries";
import { ClientError } from "graphql-request";
import { config } from "@/util/config";

/**
 * Creates an action row with Submit and Cancel buttons for quote confirmation.
 * @returns A Discord action row containing the two buttons.
 */
export function createSubmitCancelButtonRow() {
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
    return row;
}

/**
 * Converts a Discord user ID to a mention string.
 * @param userId The Discord user ID.
 * @param fallbackName The name that will be used instead if the userId is not a Discord ID.
 * @returns A formatted mention string (e.g. `<@123456>` or `John Doe`).
 */
function userID2MentionString(userId: string, fallbackName: string) {
    if (userId.length == 36 && userId.charAt(8) === "-") return fallbackName;
    return `<@${userId}>`;
}

export function addQuoteSourceMessage(
    quote: Omit<FullQuoteEntry, "sourceMessage">
) {
    const passageTexts = quote.passages.map(
        (p) =>
            `"${p.text.trim()}" by ${userID2MentionString(p.author.id, p.author.globalName)}`
    );
    const publisherText = `Published by ${userID2MentionString(quote.publisher.id, quote.publisher.globalName)}`;
    const sourceMessage = passageTexts.join("\n") + "\n" + publisherText;
    return { ...quote, sourceMessage };
}

/**
 * Handles errors from interaction collectors by replying with an appropriate message.
 * Covers timeout, GraphQL, network, and unknown error cases.
 * @param error The caught error object.
 * @param interaction The command interaction to reply to.
 */
export async function catchInteractionCollectorError(
    error: unknown,
    interaction: ChatInputCommandInteraction<"cached">
) {
    if (!error || typeof error !== "object") {
        console.error("Unknown error:", error);
        await interaction.editReply({
            content: "An unknown error occurred. WTF?",
            components: [],
        });
        return;
    }
    if (
        "code" in error &&
        error.code === DiscordjsErrorCodes.InteractionCollectorError
    ) {
        await interaction.editReply({
            content: `Confirmation not received within ${formatDurationMS(config.MAX_RESPONSE_TIME)}, cancelling...`,
            components: [],
        });
        return;
    }
    if (error instanceof ClientError) {
        console.error("GraphQL Error:", error);
        await interaction.editReply({
            content: "API Error. Sry...",
            components: [],
        });
        return;
    }

    if (
        ("code" in error && error.code === "EHOSTUNREACH") ||
        ("errno" in error && error.errno === -113)
    ) {
        console.error("Database API not responding: ", error);
        await interaction.editReply({
            content: "Our database seems to be down. Sry...",
            components: [],
        });
        return;
    }

    console.error("Unknown error:", error);
    await interaction.editReply({
        content: "An unknown error occurred. Sry...",
        components: [],
    });
}

/**
 * Formats a duration in milliseconds as a human-readable relative time string.
 * @param ms The duration in milliseconds.
 * @returns A localized relative time string (e.g. "in 30 seconds").
 */
export function formatDurationMS(ms: number) {
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
        ms / 1000,
        "second"
    );
}

/**
 * Formats a quote into a styled Discord embed with passages, date, and metadata.
 * @param quote The quote data to format.
 * @returns An EmbedBuilder ready to be sent in a Discord channel.
 */
export function formatQuote({
    publisher,
    passages,
    isPrivate,
    utteredAt,
}: FetchedQuote) {
    const date = new Date(utteredAt);

    const passagesText = passages
        .map(
            (p) =>
                `### ❝ ${p.text.trim()} ❞ — ${userID2MentionString(p.author.id, p.author.globalName)}`
        )
        .join("\n");

    const embed = new EmbedBuilder()
        .setColor(isPrivate ? 0xf5c542 : 0x5865f2)
        .setDescription(
            passagesText +
                `\n-# 📌  Archived by ${userID2MentionString(publisher.id, publisher.globalName ?? "Unknown")}`
        )
        .setTimestamp(date);

    if (isPrivate) embed.setAuthor({ name: "🔒 Private Quote" });

    return { embeds: [embed] };
}
