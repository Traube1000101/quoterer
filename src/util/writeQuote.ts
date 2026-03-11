import { ChatInputCommandInteraction, SendableChannels } from "discord.js";
import {
    putAuthors,
    putPassages,
    putQuote,
    fetchGuildChannelId,
} from "@/util/apiQuery";

import { client } from "@/util/client";
import { formatQuote } from "@/util/UI";

/** A minimal passage representation containing only the text and author ID. */
export type PassageData = { text: string; author: Pick<AuthorEntry, "id"> };
/** A lightweight quote representation used for display purposes. */
export type QuoteData = {
    publisher: Pick<AuthorEntry, "id">;
    passages: PassageData[];
    isPrivate: boolean;
    utteredAt: Date;
};
/**
 * Sends a single formatted quote to the specified channel.
 * @param quotesChannel The Discord channel to send the quote to.
 * @param qoute The quote data to format and send.
 */
export async function sendQuoteToChannel(
    quotesChannel: SendableChannels,
    qoute: QuoteData
) {
    await sendQuotesToChannel(quotesChannel, [qoute]);
}

const SEND_RATE_LIMIT = { amount: 5, window_ms: 5000 };
/**
 * Sends multiple formatted quotes to the specified channel sequentially.
 * @param quotesChannel The Discord channel to send quotes to.
 * @param qoutes The array of quote data to format and send.
 */
export async function sendQuotesToChannel(
    quotesChannel: SendableChannels,
    qoutes: QuoteData[]
) {
    const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));
    const delayPerMessage = Math.ceil(
        SEND_RATE_LIMIT.window_ms / SEND_RATE_LIMIT.amount
    );
    for (const quote of qoutes) {
        const message = formatQuote(quote);
        await quotesChannel.send(message);
        await delay(delayPerMessage);
    }
}

/** Full author information including display name, username, and avatar. */
export type AuthorEntry = {
    id: string;
    globalName: string | null;
    username: string | null;
    avatarURL: () => string | null;
};
/** A passage with its full author details, used when persisting to the API. */
export type PassageEntry = { text: string; author: AuthorEntry };
/** Full quote entry containing all data needed to persist a quote to the API. */
export type QuoteEntry = {
    guildId: string;
    publisher: AuthorEntry;
    passages: PassageEntry[];
    isPrivate: boolean;
    sourceMessage: string;
    utteredAt: Date;
};
/**
 * Persists a quote and its associated authors and passages to the database via the API.
 * @param quote The full quote entry to store.
 */
export async function createQuoteDBEntry({
    guildId,
    publisher,
    passages,
    sourceMessage,
    isPrivate,
}: QuoteEntry) {
    const authors = passages.map((p) => p.author);
    authors.push(publisher);
    await putAuthors(authors);
    const quote = await putQuote({
        guildId,
        publisher,
        sourceMessage,
        isPrivate,
        utteredAt: new Date(),
    });
    await putPassages(passages, quote.createQuote.id);
}

/**
 * Saves a quote to the database and sends it to the guild's quotes channel.
 * @param interaction The command interaction, used for error replies.
 * @param quote The quote entry to persist and display.
 */
export async function applyQuote(
    interaction: ChatInputCommandInteraction<"cached">,
    quote: QuoteEntry
) {
    await createQuoteDBEntry(quote);
    const quotesChannel = await fetchGuildChannel(quote.guildId, interaction);
    await sendQuoteToChannel(quotesChannel, quote);
}

/**
 * Fetches the configured quotes channel for a guild.
 * @param guildId The Discord guild ID.
 * @param interaction Optional interaction to reply with an error if the channel is invalid.
 * @returns The sendable channel, or `undefined` if not found or not sendable.
 */
export async function fetchGuildChannel(
    guildId: string,
    interaction: ChatInputCommandInteraction<"cached"> | null = null
) {
    const channelId = await fetchGuildChannelId(guildId);
    const quotesChannel = await client.channels.fetch(channelId);
    if (quotesChannel === null || !quotesChannel.isSendable()) {
        if (interaction)
            await interaction.editReply({
                content: "Quotes channel not found or wrongly configured!",
            });
        return;
    }
    return quotesChannel;
}
