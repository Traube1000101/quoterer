const express = require("express");
const NodeCache = require("node-cache");
const axios = require("axios");
const argon2 = require("argon2");

module.exports = (database) => {
  const cache = new NodeCache({ stdTTL: 60 });

  const salt = Buffer.from(process.env.salt, "base64");
  const hash = async (i) => {
    const rawHash = await argon2.hash(i, {
      raw: true,
      salt,
    });
    return rawHash.toString("base64");
  };

  const app = express();
  app.use(express.json());

  app.get("/api/quotes", async (req, res) => {
    try {
      let quotes = cache.get("quotes");
      const respond = (content) => res.json(content);
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
        rawQuotes.map(async (quote) => {
          const authorIds = await Promise.all(
            quote.authorIds.map(async (authorId) => await hash(authorId))
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
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      let users = cache.get("users");
      const respond = (content) => res.json(content);
      if (users) return respond(users);

      const rawUsers = await database.collection("users").find({},{}).toArray();

      users = await Promise.all(
        rawUsers.map(async (user) => {
          const _id = await hash(user._id)
          return {
            ...user,
            avatar: user.avatar
              ? await urlToBase64(user.avatar)
              : undefined,
            _id,
          };
        })
      );

      cache.set("users", users);

      respond(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  const port = process.env.api_port || 8080;
  app.listen(port, () => console.log(`API running on port ${port}`));
};

async function urlToBase64(url) {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const base64 = Buffer.from(response.data).toString("base64");
    const mimeType = response.headers["content-type"];
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`Failed to convert ${url} to Base64:`, error.message);
    return null;
  }
}
