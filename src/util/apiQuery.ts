import type { AuthorEntry, PassageEntry } from "./writeQuote";

import { config } from "@/util/config";
import { gql, GraphQLClient } from "graphql-request";

const client = new GraphQLClient(config.QUOTERER_GRAPHQL_ENDPOINT);

export async function getGuildChannelId(guildId: string) {
    const query = gql`
        query ($guildId: ID!) {
            guild(id: $guildId) {
                channelId
            }
        }
    `;

    const variables = { guildId };
    const response = await client.request<{ guild: { channelId: string } }>(
        query,
        variables
    );
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

    return await client.request<{ createGuild: { id: string } }>(
        mutation,
        variables
    );
}

const filterUniqueAuthor = (
    a: AuthorEntry,
    index: number,
    self: AuthorEntry[]
) => index === self.findIndex((b) => b.id === a.id);

export async function addAuthors(authors: AuthorEntry[]) {
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
        client,
        documents
    );
}

export async function addQuote(
    guildId: string,
    publisherId: string,
    sourceMessage: string,
    isPrivate = false
) {
    const utteredAt = Date.now();
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
        publisherId,
        sourceMessage,
        utteredAt,
        isPrivate,
    };

    return await client.request(mutation, variables);
}

export async function addPassages(passages: PassageEntry[], quoteId: string) {
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
            text: passage.text,
            authorId: passage.author.id,
            quoteId,
        },
    }));

    return await myBatchRequest<{ createPassage: { id: string } }>(
        client,
        documents
    );
}

async function myBatchRequest<T>(
    client: GraphQLClient,
    documents: { document: string; variables: any }[]
) {
    return Promise.all(
        documents.map(({ document, variables }) =>
            client.request<T>(document, variables)
        )
    );
}
