const express = require("express");
const NodeCache = require("node-cache");
const axios = require('axios');

const cache = new NodeCache({ stdTTL: 60 });

module.exports = (database) => {
  const app = express();
  app.use(express.json());

  app.get("/api/quotes", async (req, res) => {
    try {
      let quotes = cache.get("quotes");
      const respond = (content) => res.json(content);
      if (quotes) return respond(quotes);

      const pipeline = [
        {
          $lookup: {
            from: "users",
            localField: "authorIds",
            foreignField: "_id",
            as: "authors",
          },
        },
        {
          $addFields: {
            authors: {
              $map: {
                input: "$authors",
                as: "author",
                in: {
                  avatar: "$$author.avatar",
                  name: "$$author.name",
                  username: "$$author.username",
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "publisherId",
            foreignField: "_id",
            as: "publisherInfo",
          },
        },
        {
          $addFields: {
            publisherInfo: {
              $map: {
                input: "$publisherInfo",
                as: "pub",
                in: {
                  avatar: "$$pub.avatar",
                  name: "$$pub.name",
                  username: "$$pub.username",
                },
              },
            },
          },
        },
        {
          $sort: { createdTimestamp: -1 },
        },
        {
          $project: {
            _id: 0,
            content: 1,
            authors: 1,
            createdTimestamp: 1,
            publisher: { $first: "$publisherInfo" },
          },
        },
      ];

      const rawQuotes = await database
        .collection("quotes")
        .aggregate(pipeline)
        .toArray();

      quotes = await Promise.all(
        rawQuotes.map(async (quote) => {
          const authors = await Promise.all(
            quote.authors.map(async (author) => ({
              ...author,
              avatar: author.avatar ? await urlToBase64(author.avatar) : null,
            }))
          );

          const publisher = {
            ...quote.publisher,
            avatar: quote.publisher?.avatar
              ? await urlToBase64(quote.publisher.avatar)
              : null,
          };

          return {
            ...quote,
            authors: authors,
            publisher: publisher,
          };
        })
      );

      cache.set("quotes", quotes);

      respond(quotes);
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
