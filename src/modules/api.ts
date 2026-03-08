import express, { Request, Response } from "express";
import NodeCache from "node-cache";
import axios from "axios";
import argon2 from "argon2";

type Database = any; // Replace with actual type if available

function getApiModule(database: Database) {
    const cache = new NodeCache({ stdTTL: 60 });

    const salt = Buffer.from(process.env.salt!, "base64");
    const hash = async (i: string) => {
        const rawHash = await argon2.hash(i, {
            raw: true,
            salt,
        });
        return rawHash.toString("base64");
    };

    const app = express();
    app.use(express.json());

    app.get("/api/quotes", async (req: Request, res: Response) => {
        try {
            let quotes = cache.get("quotes");
            const respond = (content: any) => res.json(content);
            if (quotes) return respond(quotes);

            const pipeline = [
                {
                    $sort: { createdTimestamp: -1 },
                },
                {
                    $project: {
                        _id: 0,
                        content: 1,
                        authorIds: 1,
                        createdTimestamp: 1,
                        createdIn: 1,
                        publisherId: 1,
                    },
                },
            ];

            const rawQuotes = await database
                .collection("quotes")
                .aggregate(pipeline)
                .toArray();

            quotes = await Promise.all(
                rawQuotes.map(async (quote: any) => {
                    const authorIds = await Promise.all(
                        quote.authorIds.map(
                            async (authorId: string) => await hash(authorId)
                        )
                    );

                    const publisherId = await hash(quote.publisherId);

                    return {
                        ...quote,
                        authorIds,
                        publisherId,
                    };
                })
            );

            cache.set("quotes", quotes);

            respond(quotes);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get("/api/users", async (req: Request, res: Response) => {
        try {
            let users = cache.get("users");
            const respond = (content: any) => res.json(content);
            if (users) return respond(users);

            const rawUsers = await database
                .collection("users")
                .find({}, {})
                .toArray();

            users = await Promise.all(
                rawUsers.map(async (user: any) => {
                    // ...add user hashing or transformation here if needed
                    return user;
                })
            );

            cache.set("users", users);

            respond(users);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ...add more routes as needed

    return app;
}

export default getApiModule;
