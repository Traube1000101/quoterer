const express = require("express");
const NodeCache = require("node-cache");

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
          $sort: { createdTimestamp: -1 }
        },        
        {
          $project: {
            _id: 0,
            serverId: 1,
            createdTimestamp: 1,
            content: 1,
            authors: 1,
            publisher: { $first: "$publisherInfo" },
          },
        },
      ];

      quotes = await database
        .collection("quotes")
        .aggregate(pipeline)
        .toArray();

      cache.set("quotes", quotes);

      respond(quotes);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  const port = process.env.api_port || 8080;
  app.listen(port, () => console.log(`API running on port ${port}`));
};
