import "dotenv/config";

const { DISCORD_TOKEN, DISCORD_CLIENT_ID } = process.env;

if (DISCORD_TOKEN === undefined || DISCORD_CLIENT_ID === undefined)
    throw new Error("Missing environment variables");

export const config = { DISCORD_TOKEN, DISCORD_CLIENT_ID };
