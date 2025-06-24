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

      quotes = await database.collection("quotes").find().toArray();

      cache.set("quotes", quotes);

      respond(quotes);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  const port = process.env.api_port || 8080;
  app.listen(port, () => console.log(`API running on port ${port}`));
}
