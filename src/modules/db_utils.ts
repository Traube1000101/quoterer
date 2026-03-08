export async function initGuild(
    guild: {
        name: string;
        id: string;
        iconURL: () => string | null;
    },
    channel: { id: string; name: string | null }
) {
    throw new Error("Not implemented");
}
