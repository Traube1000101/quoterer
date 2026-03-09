import { fetchGuildQuotes } from "@/util/apiQuery";
import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    PermissionFlagsBits,
    InteractionContextType,
    MessageFlags,
    SendableChannels,
} from "discord.js";

import { fetchGuildChannel, sendQuotesToChannel } from "@/util/writeQuote";

export const data = new SlashCommandBuilder()
    .setName("resend-all-quotes")
    .setDescription("Resends all quotes to the set quotes channel.")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addBooleanOption((option) =>
        option
            .setName("delete-old")
            .setDescription(
                "Whether to delete old quote messages in the channel (Default: false)"
            )
            .setRequired(false)
    )
    .addBooleanOption((option) =>
        option
            .setName("include-private")
            .setDescription(
                "Whether to include private quotes in the resend (Default: false)"
            )
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
        return interaction.reply({
            content: "Guild not found!",
            flags: MessageFlags.Ephemeral,
        });
    }
    await interaction.deferReply(); // Defer the reply to give us more time to process

    const quotesChannel = await fetchGuildChannel(
        interaction.guildId,
        interaction
    );

    const deleteOld = interaction.options.getBoolean("delete-old") ?? false;
    if (deleteOld) await deleteMessages(quotesChannel);

    const includePrivate =
        interaction.options.getBoolean("include-private") ?? false;
    const quotes = await fetchGuildQuotes(interaction.guildId, includePrivate);
    await sendQuotesToChannel(quotesChannel, quotes);
    await interaction.editReply({
        content: `Resent ${quotes.length} quote(s) to the quotes channel!`,
    });
}

const MAX_ITERATIONS = 10; // Safety limit to prevent infinite loops
const DELETE_BATCH_SIZE = 100;
async function deleteMessages(quotesChannel: SendableChannels) {
    let fetchedMessages: Awaited<
        ReturnType<SendableChannels["messages"]["fetch"]>
    >;
    for (let i = 0; i < MAX_ITERATIONS; i++) {
        fetchedMessages = await quotesChannel.messages.fetch({
            limit: DELETE_BATCH_SIZE,
        });
        if (fetchedMessages.size < DELETE_BATCH_SIZE) break; // No more messages to delete
        const deletePromises = fetchedMessages.map((msg) => msg.delete());
        await Promise.all(deletePromises);
    }
}
