import { config } from "@/config";

export async function initGuild(
    guild: {
        name: string;
        id: string;
        iconURL: () => string | null;
    },
    channel: { id: string; name: string | null }
) {
    const mutation = `createGuild(input: {id: "${guild.id}", name: "${guild.name}", channelName: "${channel.name}", channelId: "${channel.id}", iconUrl: "${guild.iconURL()}"}) { id }`;
    return await mutateGRAPHQL(mutation);
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

async function addAuthors(authors: AuthorEntry[]) {
    const mutation = authors
        .map(
            (author, index) =>
                `q${index + 1}: createAuthor(input: {id: "${author.id}", username: "${author.username}", avatarUrl: "${author.avatarURL()}", globalName: "${author.globalName}"}) { id }`
        )
        .join("\n");
    return await mutateGRAPHQL(mutation);
}

async function addQuote(
    guildId: string,
    publisherId: string,
    sourceMessage: string
) {
    const utteredAt = Date.now();
    // encode sourceMessage to escape newlines and quotes
    sourceMessage = sourceMessage
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n");
    const mutation = `createQuote(input: {guildId: "${guildId}", publisherId: "${publisherId}", sourceMessage: "${sourceMessage}", utteredAt: ${utteredAt}, createdAt: ${utteredAt}}) { id }`;

    return await mutateGRAPHQL(mutation);
}

async function addPassages(passages: PassageEntry[], quoteId: string) {
    const mutation = passages
        .map(
            (passage, index) =>
                `p${index + 1}: createPassage(input: {text: "${passage.text}", authorId: "${passage.author.id}", quoteId: "${quoteId}"}) { id }`
        )
        .join("\n");
    return await mutateGRAPHQL(mutation);
}

async function mutateGRAPHQL(mutation: string) {
    const response = await fetch(config.QUOTERER_GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: `mutation {${mutation}}` }),
    });

    if (!response.ok) {
        console.error("Failed to create quote:", response.statusText);
        process.exit(1);
    }

    const { data, errors } = await response.json();
    if (errors) {
        console.error("GraphQL error:", errors);
        console.log("This is the query that caused the error:", mutation);
        process.exit(1);
    }

    return data;
}
