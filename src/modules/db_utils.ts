export async function initGuild(
    guild: {
        name: string;
        id: string;
        iconURL: () => string | null;
    },
    channel: { id: string; name: string | null }
) {
    notImplementedError("initGuild");
}

export async function createQuote(
    guildId: string,
    publisherId: string,
    passages: { content: string; authorId: string }[],
    sourceMessage: string
) {
    notImplementedError("createQuote");
}

export async function checkAuthors(authorIds: string[]) {
    notImplementedError("checkAuthors");
}

export async function addAuthor(
    id: string,
    name: string,
    username: string | null,
    avatarURL: string | null
) {
    notImplementedError("addAuthor");
}

function notImplementedError(functionName: string) {
    console.error(`Function "${functionName}" is not implemented!`);
}
