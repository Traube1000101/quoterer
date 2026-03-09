import { Client, Events, GatewayIntentBits, MessageFlags } from "discord.js";
import { config } from "./util/config";
import { commands } from "./commands";
import { deployCommands } from "./util/deploy-commands";

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! 🤖 Logged in as ${readyClient.user.tag}`);
});

client.on(Events.GuildCreate, async (guild) => {
    await deployCommands({ guildId: guild.id });
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    if (!(commandName in commands)) {
        return interaction.reply({
            content: "Unknown command!",
            flags: MessageFlags.Ephemeral,
        });
    }
    const command = commands[commandName as keyof typeof commands];

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: "There was an error while executing this command!",
                flags: MessageFlags.Ephemeral,
            });
        } else {
            await interaction.reply({
                content: "There was an error while executing this command!",
                flags: MessageFlags.Ephemeral,
            });
        }
    }
});

client.login(config.DISCORD_TOKEN);

export { client };
