import {
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    MessageActionRowComponentBuilder,
    DiscordjsErrorCodes,
    ChatInputCommandInteraction,
} from "discord.js";
import type { PassageEntry, AuthorEntry } from "./writeQuote";
import { ClientError } from "graphql-request";
import { config } from "@/util/config";

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

function userID2MentionString(userId: string) {
    return `<@${userId}>`;
}

export function formatPassages(passages: PassageEntry[]) {
    return passages
        .map((p) => `-# "${p.text}" - ${userID2MentionString(p.author.id)}`)
        .join("\n");
}

export async function catchInteractionCollectorError(
    error: unknown,
    interaction: ChatInputCommandInteraction<"cached">
) {
    if (!error || typeof error !== "object") {
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

    await interaction.editReply({
        content: "An unknown error occurred. Sry...",
        components: [],
    });
}

export function formatDurationMS(ms: number) {
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
        ms / 1000,
        "second"
    );
}

type QuoteData = {
    publisher: AuthorEntry;
    passages: PassageEntry[];
    isPrivate: boolean;
};
export function formatQuote({ publisher, passages, isPrivate }: QuoteData) {
    const intro = `-# Quote published by ${userID2MentionString(publisher.id)}:`;
    const passagesText = passages
        .map((p) => `"${p.text}"\t - ${userID2MentionString(p.author.id)}`)
        .join("\n");
    const privacyNote = isPrivate ? "*(This quote is private)*" : "";
    return `${intro}\n${passagesText}\n\n${privacyNote}`;
}
