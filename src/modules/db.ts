import { Client } from "discord.js";
import { Db } from "mongodb";

type User = any; // Replace with actual type if available
type Server = any; // Replace with actual type if available

function getDbModule(database: Db, client: Client) {
    const serversCollection = database.collection("servers");
    const usersCollection = database.collection("users");

    function saveQuote(messageId: string, quote: any) {
        const messageIdInt = parseInt(messageId);
        try {
            const quotesCollection = database.collection("quotes");
            quotesCollection
                .insertOne({
                    _id: messageIdInt,
                    ...quote,
                })
                .catch((err: any) => {
                    if (err.code === 11000) {
                        console.log("Document already exists, not inserting.");
                    } else {
                        throw err;
                    }
                });

            serversCollection.updateOne(
                { _id: quote.serverId },
                {
                    $addToSet: { quotes: messageIdInt },
                }
            );
        } catch (error) {
            console.error("Error:", error);
        }
    }

    function fetchUser(userId: string) {
        if (userId === "" || userId === undefined || userId === null)
            return null;
        const dcUser = client.users.cache.get(userId);
        if (!dcUser) {
            return { _id: userId, invalid: true };
        }
        const { displayName, username, avatarURL } = dcUser;
        return {
            _id: userId,
            name: displayName,
            username: username,
            avatar: avatarURL(),
        };
    }

    async function pushUser(user: User) {
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: user,
            },
            { upsert: true }
        );
    }

    async function getUserByName(name: string) {
        const user = await usersCollection.find({ name }).toArray();
        return user[0] || false;
    }

    async function getUserById(id: string) {
        const user = await usersCollection.find({ _id: id }).toArray();
        return user[0] || false;
    }

    function updateAllUsers() {
        usersCollection
            .find({})
            .toArray()
            .then((users: User[]) => {
                users.forEach((user) => {
                    const updatedUser = fetchUser(user._id);
                    if (!updatedUser === null) pushUser(updatedUser);
                });
            });
    }

    async function updateUsers(userIds: string[]) {
        return Promise.all(
            userIds.map(async (userId) => {
                const user = await fetchUser(userId);
                await pushUser(user);
                return user;
            })
        );
    }

    async function getQuoteChannel(guildId: string) {
        const result = await serversCollection.findOne({ _id: guildId });
        if (!result?.channel?.id) {
            throw new Error(
                "No quotes channel set! It must first be set by the Server Owner."
            );
        }
        return await client.channels.fetch(result.channel.id);
    }

    async function setChannel(guildId: string, server: Server) {
        try {
            await serversCollection.updateOne(
                { _id: guildId },
                {
                    $set: server,
                },
                { upsert: true }
            );
        } catch (error) {
            console.error("Error:", error);
        }
    }

    async function getRandomQuote() {
        const quotesCollection = database.collection("quotes");
        try {
            const cursor = quotesCollection.aggregate([
                { $sample: { size: 1 } },
            ]);
            const randomQuote = await cursor.next();

            if (randomQuote) {
                return randomQuote;
            } else {
                throw Error("No quotes found.");
            }
        } catch (err) {
            console.error("Error getting random quote:", err);
        }
    }

    return {
        saveQuote,
        getQuoteChannel,
        setChannel,
        updateUsers,
        updateAllUsers,
        pushUser,
        getUserByName,
        getRandomQuote,
        getUserById,
    };
}

export { getDbModule };
