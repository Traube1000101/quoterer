import { config } from "@/util/config";

import { gql, GraphQLClient } from "graphql-request";

const client = new GraphQLClient(config.QUOTERER_GRAPHQL_ENDPOINT);

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

    return await client.request(mutation, variables);
}

export type AuthorEntry = {
    id: string;
    globalName: string | null;
    username: string | null;
    avatarURL: () => string | null;
};
export type PassageEntry = { text: string; author: AuthorEntry };
export async function createQuote(
    guildId: string,
    publisher: AuthorEntry,
    passages: PassageEntry[],
    sourceMessage: string
) {
    const authors = passages.map((p) => p.author);
    authors.push(publisher);
    await addAuthors(authors);
    const quote = await addQuote(guildId, publisher.id, sourceMessage);
    await addPassages(passages, quote.createQuote.id);
}

const filterUniqueAuthor = (
    a: AuthorEntry,
    index: number,
    self: AuthorEntry[]
) => index === self.findIndex((b) => b.id === a.id);

async function addAuthors(authors: AuthorEntry[]) {
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
    return await client.batchRequests(documents);
}

async function addQuote(
    guildId: string,
    publisherId: string,
    sourceMessage: string
) {
    const utteredAt = Date.now();
    const mutation = gql`
        mutation (
            $guildId: ID!
            $publisherId: ID!
            $sourceMessage: String
            $utteredAt: Long
        ) {
            createQuote(
                input: {
                    guildId: $guildId
                    publisherId: $publisherId
                    sourceMessage: $sourceMessage
                    utteredAt: $utteredAt
                    createdAt: $utteredAt
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
    };

    return await client.request(mutation, variables);
}

async function addPassages(passages: PassageEntry[], quoteId: string) {
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

    return await client.batchRequests(documents);
}
