import { deployCommandsDev } from "@/util/deploy-commands";
import { commands } from "@/commands";
import "dotenv/config";

const guildId = process.argv[2] ?? process.env.DEV_GUILD_ID;

if (!guildId) {
    console.error(
        "Please provide a guild ID as the first argument to push the commands to, or set the DEV_GUILD_ID environment variable."
    );
    process.exit(1);
}

const commandsData = Object.values(commands).map((command) => command.data);
deployCommandsDev(guildId, commandsData);
