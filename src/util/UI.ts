import {
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    MessageActionRowComponentBuilder,
    DiscordjsErrorCodes,
    ChatInputCommandInteraction,
} from "discord.js";
import type { PassageEntry, QuoteData } from "./writeQuote";
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
        .map(
            (p) =>
                `-# "${p.text.trim()}" - ${userID2MentionString(p.author.id)}`
        )
        .join("\n");
}

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
    console.error("\nError Object:", { ...error });
}

export function formatDurationMS(ms: number) {
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
        ms / 1000,
        "second"
    );
}

// ...existing code...

export function formatQuote({
    publisher,
    passages,
    isPrivate,
    utteredAt,
}: QuoteData) {
    const date = new Date(utteredAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const passagesText = passages
        .map(
            (p) =>
                `> ### ❝ ${p.text.trim()} ❞ — ${userID2MentionString(p.author.id)}`
        )
        .join("\n> \n");

    const footer = [
        `-# 📅  ${date}`,
        `-# 📌  Archived by ${userID2MentionString(publisher.id)}`,
        isPrivate ? `-# 🔒 *Private Quote*` : "",
    ]
        .filter(Boolean)
        .join("\n");

    return `${passagesText}\n\n${footer}`;
}
