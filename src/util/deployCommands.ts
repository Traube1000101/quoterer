import { REST, Routes } from "discord.js";
import { config } from "@/util/config";
import { commands } from "@/commands";

const commandsData = Object.values(commands).map((command) => command.data);

const rest = new REST().setToken(config.DISCORD_TOKEN);

export async function deployCommands({ guildId }: { guildId: string }) {
    try {
        console.log(
            `Started refreshing ${commandsData.length} application (/) commands.`
        );

        const data = (await rest.put(
            Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, guildId),
            { body: commandsData }
        )) as unknown[];

        console.log(
            `Successfully reloaded ${data.length} application (/) commands.`
        );
    } catch (error) {
        console.error(error);
    }
}
