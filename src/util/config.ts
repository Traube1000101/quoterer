import "dotenv/config";

const {
    DISCORD_TOKEN,
    DISCORD_CLIENT_ID,
    QUOTERER_GRAPHQL_ENDPOINT,
    MAX_RESPONSE_TIME,
} = process.env;

if (
    DISCORD_TOKEN === undefined ||
    DISCORD_CLIENT_ID === undefined ||
    QUOTERER_GRAPHQL_ENDPOINT === undefined ||
    MAX_RESPONSE_TIME === undefined
)
    throw new Error(
        "The following environment variables must be set: DISCORD_TOKEN, DISCORD_CLIENT_ID, QUOTERER_GRAPHQL_ENDPOINT, MAX_RESPONSE_TIME"
    );

export const config = {
    DISCORD_TOKEN,
    DISCORD_CLIENT_ID,
    QUOTERER_GRAPHQL_ENDPOINT,
    MAX_RESPONSE_TIME: parseInt(MAX_RESPONSE_TIME),
};
