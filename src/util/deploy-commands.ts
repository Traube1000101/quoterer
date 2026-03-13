import { REST, Routes } from "discord.js";
import { config } from "@/util/config";
import { SlashCommandOptionsOnlyBuilder } from "discord.js";

const rest = new REST().setToken(config.DISCORD_TOKEN);

/**
 * Registers all application slash commands globally via the Discord REST API.
 */
export async function deployCommandsGlobal(
    commandsData: SlashCommandOptionsOnlyBuilder[]
) {
    try {
        console.log(
            `Started refreshing ${commandsData.length} application (/) commands.`
        );

        const data = (await rest.put(
            Routes.applicationCommands(config.DISCORD_CLIENT_ID),
            { body: commandsData }
        )) as typeof commandsData;

        console.log(
            `Successfully reloaded ${data.length} application (/) commands.`
        );
    } catch (error) {
        console.error(error);
    }
}

/**
 * Registers all application slash commands for a specific guild via the Discord REST API.
 * @param options An object containing the guild ID to register the commands for.
 */
export async function deployCommandsDev(
    guildId: string,
    commandsData: SlashCommandOptionsOnlyBuilder[]
) {
    try {
        console.log(
            `Started refreshing ${commandsData.length} application (/) commands for guild ${guildId}.`
        );

        const data = (await rest.put(
            Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, guildId),
            { body: commandsData }
        )) as typeof commandsData;

        console.log(
            `Successfully reloaded ${data.length} application (/) commands for guild ${guildId}.`
        );
    } catch (error) {
        console.error(error);
    }
}
