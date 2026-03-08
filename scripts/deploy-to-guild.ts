import "dotenv/config";
import { deployCommands } from "../src/util/deploy-commands";

const guildId = process.argv[2] ?? process.env.GUILD_ID;

if (!guildId) {
    console.error("Please provide a guild ID as the first argument.");
    process.exit(1);
}

deployCommands({ guildId });
