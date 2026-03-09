import type { AuthorEntry, PassageEntry, QuoteEntry } from "./writeQuote";

import { config } from "@/util/config";
import { gql, GraphQLClient } from "graphql-request";

const graphqlClient = new GraphQLClient(config.QUOTERER_GRAPHQL_ENDPOINT);

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
                        }
                        text
                    }
                    publisher {
                        id
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
                utteredAt: number;
                passages: {
                    author: {
                        id: string;
                    };
                    text: string;
                }[];
                publisher: {
                    id: string;
                };
            }[];
        };
    }>(query, variables);
    return response.guild.quotes;
}

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
            $utteredAt: Long
            $isPrivate: Boolean
        ) {
            createQuote(
                input: {
                    guildId: $guildId
                    publisherId: $publisherId
                    sourceMessage: $sourceMessage
                    utteredAt: $utteredAt
                    createdAt: $utteredAt
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
        utteredAt,
        isPrivate,
    };

    return await graphqlClient.request<{
        createQuote: { id: string };
    }>(mutation, variables);
}

export async function putPassages(passages: PassageEntry[], quoteId: string) {
    const query = gql`
        mutation ($text: String!, $authorId: ID!, $quoteId: ID!) {
            createPassage(
                input: { text: $text, authorId: $authorId, quoteId: $quoteId }
            ) {
                id
            }
        }
    `;

    const documents = passages.map((passage) => ({
        document: query,
        variables: {
            text: passage.text.trim(),
            authorId: passage.author.id,
            quoteId,
        },
    }));

    return await myBatchRequest<{ createPassage: { id: string } }>(
        graphqlClient,
        documents
    );
}

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
