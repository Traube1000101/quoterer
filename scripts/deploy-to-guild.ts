import "dotenv/config";
import { deployCommands } from "../src/util/deployCommands";

const guildId = process.argv[2] ?? process.env.GUILD_ID;

if (!guildId) {
    console.error(
        "Please provide a guild ID as the first argument to push the commands to, or set the GUILD_ID environment variable."
    );
    process.exit(1);
}

deployCommands({ guildId });
