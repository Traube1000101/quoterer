import {
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    MessageActionRowComponentBuilder,
} from "discord.js";
import type { PassageEntry } from "./db_utils";

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

export function parsePassages(passages: PassageEntry[]) {
    return passages.map((p) => `-# "${p.text}" - <@${p.author.id}>`).join("\n");
}
