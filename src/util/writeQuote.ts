import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import {
    addAuthors,
    addPassages,
    addQuote,
    getGuildChannelId,
} from "./apiQuery";

import { client } from "..";
import { formatQuote } from "./UI";

export async function sendQuoteToChannel(
    interaction: ChatInputCommandInteraction<"cached">,
    qoute: {
        publisher: AuthorEntry;
        passages: PassageEntry[];
        isPrivate: boolean;
    }
) {
    const channelId = await getGuildChannelId(interaction.guildId);
    const quotesChannel = await client.channels.fetch(channelId);
    if (quotesChannel === null || !quotesChannel.isSendable()) {
        await interaction.reply({
            content: "Quotes channel not found or wrongly configured!",
            flags: [MessageFlags.Ephemeral],
        });
        return;
    }

    const messageContent = formatQuote(qoute);
    await quotesChannel.send(messageContent);
}

export type AuthorEntry = {
    id: string;
    globalName: string | null;
    username: string | null;
    avatarURL: () => string | null;
};
export type PassageEntry = { text: string; author: AuthorEntry };
export async function createQuoteDBEntry(
    guildId: string,
    publisher: AuthorEntry,
    passages: PassageEntry[],
    sourceMessage: string,
    isPrivate = false
) {
    const authors = passages.map((p) => p.author);
    authors.push(publisher);
    await addAuthors(authors);
    const quote = await addQuote(
        guildId,
        publisher.id,
        sourceMessage,
        isPrivate
    );
    await addPassages(passages, quote.createQuote.id);
}

export async function applyQuote(
    interaction: ChatInputCommandInteraction<"cached">,
    guildId: string,
    publisher: AuthorEntry,
    passages: PassageEntry[],
    sourceMessage: string,
    isPrivate = false
) {
    await createQuoteDBEntry(
        guildId,
        publisher,
        passages,
        sourceMessage,
        isPrivate
    );
    await sendQuoteToChannel(interaction, {
        publisher,
        passages,
        isPrivate,
    });
}
