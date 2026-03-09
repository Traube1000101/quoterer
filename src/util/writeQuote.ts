import { ChatInputCommandInteraction, SendableChannels } from "discord.js";
import {
    putAuthors,
    putPassages,
    putQuote,
    fetchGuildChannelId,
} from "@/util/apiQuery";

import { client } from "@/util/client";
import { formatQuote } from "@/util/UI";

export type PassageData = { text: string; author: Pick<AuthorEntry, "id"> };
export type QuoteData = {
    publisher: Pick<AuthorEntry, "id">;
    passages: PassageData[];
    isPrivate: boolean;
    utteredAt: number;
};
export async function sendQuoteToChannel(
    quotesChannel: SendableChannels,
    qoute: QuoteData
) {
    await sendQuotesToChannel(quotesChannel, [qoute]);
}

export async function sendQuotesToChannel(
    quotesChannel: SendableChannels,
    qoutes: QuoteData[]
) {
    for (const quote of qoutes) {
        const messageContent = formatQuote(quote);
        await quotesChannel.send(messageContent);
    }
}

export type AuthorEntry = {
    id: string;
    globalName: string | null;
    username: string | null;
    avatarURL: () => string | null;
};
export type PassageEntry = { text: string; author: AuthorEntry };
export type QuoteEntry = {
    guildId: string;
    publisher: AuthorEntry;
    passages: PassageEntry[];
    isPrivate: boolean;
    sourceMessage: string;
    utteredAt: number;
};
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
        utteredAt: Date.now(),
    });
    await putPassages(passages, quote.createQuote.id);
}

export async function applyQuote(
    interaction: ChatInputCommandInteraction<"cached">,
    quote: QuoteEntry
) {
    await createQuoteDBEntry(quote);
    const quotesChannel = await fetchGuildChannel(quote.guildId, interaction);
    await sendQuoteToChannel(quotesChannel, quote);
}

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
