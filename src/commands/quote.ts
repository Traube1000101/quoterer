import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    PermissionFlagsBits,
    InteractionContextType,
    MessageFlags,
} from "discord.js";
import { config } from "@/util/config";
import { applyQuote } from "@/util/write-quote";
import {
    addQuoteSourceMessage,
    catchInteractionCollectorError,
    createSubmitCancelButtonRow,
    formatQuote,
} from "@/util/discord-formatting";

export const data = new SlashCommandBuilder()
    .setName("quote")
    .setDescription("Quote a single utterance")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
    .addStringOption((option) =>
        option
            .setName("message")
            .setDescription("Single quote")
            .setRequired(true)
    )
    .addUserOption((option) =>
        option
            .setName("author")
            .setDescription("The user who uttered the quote (Default: you)")
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
    const author = authorOption ?? interaction.user;

    const quote = {
        guildId: interaction.guildId,
        publisher: author,
        passages: [{ text: message, author: author }],
        isPrivate,
        utteredAt: new Date(),
    };
    const fullQuote = addQuoteSourceMessage(quote);

    const qouteEmbed = formatQuote(fullQuote);
    const response = await interaction.reply({
        content: "Are you sure you want to quote the following message?",
        embeds: qouteEmbed.embeds,
        components: [createSubmitCancelButtonRow()],
        flags: MessageFlags.Ephemeral,
        withResponse: true,
    });

    if (response.resource === null || response.resource.message === null) {
        return interaction.editReply({
            content: "Failed to send confirmation message.",
            components: [],
            embeds: [],
        });
    }
    try {
        const confirmation =
            await response.resource.message.awaitMessageComponent({
                filter: (i) => i.user.id === author.id,
                time: config.MAX_RESPONSE_TIME,
            });

        if (confirmation.customId === "cancel") {
            await confirmation.update({
                content: "Quote creation cancelled.",
                components: [],
                embeds: [],
            });
            return;
        }

        await applyQuote(interaction, fullQuote);

        await confirmation.update({
            content: "Your message has been quoted!",
            components: [],
            embeds: [],
        });
    } catch (error) {
        await catchInteractionCollectorError(error, interaction);
    }
}
