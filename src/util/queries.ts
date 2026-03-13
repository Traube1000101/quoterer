import type { AuthorEntry, PassageEntry, QuoteEntry } from "./write-quote";

import { config } from "@/util/config";
import { gql, GraphQLClient } from "graphql-request";

const graphqlClient = new GraphQLClient(config.QUOTERER_GRAPHQL_ENDPOINT);

/**
 * Fetches all quotes for a guild from the GraphQL API. Quotes are sorted by utteredAt timestamp in descending order (newest first).
 * @param guildId The Discord guild ID to fetch quotes for.
 * @param includePrivate Whether to include private quotes in the results.
 * @returns An array of sorted quote objects with their passages, publisher, and metadata.
 */
export async function fetchGuildQuotes(
    guildId: string,
    includePrivate: boolean
) {
    const query = gql`
        query ($guildId: ID!, $includePrivate: Boolean!) {
            guild(id: $guildId) {
                quotes(includePrivate: $includePrivate) {
                    isPrivate
                    utteredAt
                    passages {
                        author {
                            id
                            globalName
                        }
                        text
                    }
                    publisher {
                        id
                        globalName
                    }
                }
            }
        }
    `;

    const variables = { guildId, includePrivate };
    const response = await graphqlClient.request<{
        guild: {
            quotes: {
                isPrivate: boolean;
                utteredAt: string;
                passages: {
                    author: {
                        id: string;
                        globalName: string;
                    };
                    text: string;
                }[];
                publisher: {
                    id: string;
                    globalName: string;
                };
            }[];
        };
    }>(query, variables);

    const datedQuotes = response.guild.quotes.map((quote) => ({
        ...quote,
        utteredAt: new Date(quote.utteredAt),
    }));
    const sortedQuotes = datedQuotes.sort(
        (a, b) => a.utteredAt.getTime() - b.utteredAt.getTime()
    );
    return sortedQuotes;
}

/**
 * Fetches the configured quote channel ID for a guild.
 * @param guildId The Discord guild ID to look up.
 * @returns The channel ID associated with the guild.
 */
export async function fetchGuildChannelId(guildId: string) {
    const query = gql`
        query ($guildId: ID!) {
            guild(id: $guildId) {
                channelId
            }
        }
    `;

    const variables = { guildId };
    const response = await graphqlClient.request<{
        guild: { channelId: string };
    }>(query, variables);
    return response.guild.channelId;
}

/**
 * Initializes a new guild in the API by creating a guild record with its quote channel.
 * @param guild The Discord guild object containing its name, ID, and icon URL getter.
 * @param channel The channel to use for quotes, with its ID and name.
 * @returns The created guild's ID.
 */
export async function initGuild(
    guild: {
        name: string;
        id: string;
        iconURL: () => string | null;
    },
    channel: { id: string; name: string | null }
) {
    const mutation = gql`
        mutation (
            $id: ID!
            $name: String!
            $iconUrl: String
            $channelId: String!
            $channelName: String
        ) {
            createGuild(
                input: {
                    id: $id
                    name: $name
                    iconUrl: $iconUrl
                    channelId: $channelId
                    channelName: $channelName
                }
            ) {
                id
            }
        }
    `;

    const variables = {
        id: guild.id,
        name: guild.name,
        iconUrl: guild.iconURL(),
        channelId: channel.id,
        channelName: channel.name,
    };

    return await graphqlClient.request<{ createGuild: { id: string } }>(
        mutation,
        variables
    );
}

const filterUniqueAuthor = (
    a: AuthorEntry,
    index: number,
    self: AuthorEntry[]
) => index === self.findIndex((b) => b.id === a.id);

/**
 * Creates or updates author records in the API. Deduplicates authors by ID before sending.
 * @param authors Array of author entries to upsert.
 * @returns An array of responses containing the created author IDs.
 */
export async function putAuthors(authors: AuthorEntry[]) {
    const query = gql`
        mutation (
            $id: ID!
            $globalName: String
            $username: String!
            $avatarUrl: String
        ) {
            createAuthor(
                input: {
                    id: $id
                    globalName: $globalName
                    username: $username
                    avatarUrl: $avatarUrl
                }
            ) {
                id
            }
        }
    `;
    const documents = authors.filter(filterUniqueAuthor).map((author) => ({
        document: query,
        variables: {
            id: author.id,
            globalName: author.globalName,
            username: author.username,
            avatarUrl: author.avatarURL(),
        },
    }));
    return await myBatchRequest<{ createAuthor: { id: string } }>(
        graphqlClient,
        documents
    );
}

/**
 * Creates a new quote record in the API.
 * @param quote The quote data excluding passages (guild ID, publisher, source message, privacy flag, and timestamp).
 * @returns The created quote's ID.
 */
export async function putQuote({
    guildId,
    publisher,
    sourceMessage,
    isPrivate,
    utteredAt,
}: Omit<QuoteEntry, "passages">) {
    const mutation = gql`
        mutation (
            $guildId: ID!
            $publisherId: ID!
            $sourceMessage: String
            $utteredAt: DateTime
            $isPrivate: Boolean
        ) {
            createQuote(
                input: {
                    guildId: $guildId
                    publisherId: $publisherId
                    sourceMessage: $sourceMessage
                    utteredAt: $utteredAt
                    isPrivate: $isPrivate
                }
            ) {
                id
            }
        }
    `;

    const variables = {
        guildId,
        publisherId: publisher.id,
        sourceMessage,
        utteredAt: utteredAt.toISOString(),
        isPrivate,
    };

    return await graphqlClient.request<{
        createQuote: { id: string };
    }>(mutation, variables);
}

/**
 * Creates passage records for a quote. Each passage is ordered by its array index.
 * @param passages Array of passage entries containing text and author info.
 * @param quoteId The ID of the quote these passages belong to.
 * @returns An array of responses containing the created passage IDs.
 */
export async function putPassages(passages: PassageEntry[], quoteId: string) {
    const query = gql`
        mutation (
            $text: String!
            $authorId: ID!
            $quoteId: ID!
            $position: Int!
        ) {
            createPassage(
                input: {
                    text: $text
                    authorId: $authorId
                    quoteId: $quoteId
                    position: $position
                }
            ) {
                id
            }
        }
    `;

    const documents = passages.map((passage, position) => ({
        document: query,
        variables: {
            text: passage.text.trim(),
            authorId: passage.author.id,
            quoteId,
            position,
        },
    }));

    return await myBatchRequest<{ createPassage: { id: string } }>(
        graphqlClient,
        documents
    );
}

/**
 * Executes multiple GraphQL requests concurrently.
 * @param client The GraphQL client instance to use.
 * @param documents Array of GraphQL documents with their variables.
 * @returns An array of all response results.
 */
async function myBatchRequest<T>(
    client: GraphQLClient,
    documents: { document: string; variables: any }[]
) {
    // TODO: Consider real batch requests to reduce overhead (but this is quite simple)
    return Promise.all(
        documents.map(({ document, variables }) =>
            client.request<T>(document, variables)
        )
    );
}
