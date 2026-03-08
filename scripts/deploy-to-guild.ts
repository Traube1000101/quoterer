import { deployCommands } from "../src/deploy-commands";

const guildId = process.argv[2];

if (!guildId) {
    console.error("Please provide a guild ID as the first argument.");
    process.exit(1);
}

deployCommands({ guildId });
