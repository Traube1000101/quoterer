module.exports = (database, client) => {
  // Send Noteworthy Unified Discord Entry
  function sendNude(messageId, quote) {
    try {
      const quotesCollection = database.collection("quotes");
      quotesCollection
        .updateOne(
          { _id: messageId },
          {
            $unset: { invalid: null, originalMessage: null },
          }
        )
        .then(() => {
          quotesCollection.updateOne(
            { _id: messageId },
            {
              $set: quote,
            },
            { upsert: true }
          );
        });

      const serversCollection = database.collection("servers");
      serversCollection.updateOne(
        { _id: quote.serverId },
        {
          $addToSet: { quotes: messageId },
        }
      );
    } catch (error) {
      console.error("Error:", error);
    }
  }

  async function getQuoteChannel(guildId) {
    const serversCollection = database.collection("servers");
    const result = await serversCollection.findOne({ _id: guildId });
    if (!result?.channel?.id) {
      throw new Error(
        "No quotes channel set! It must first be set by the Server Owner."
      );
    }
    return await client.channels.fetch(result.channel.id);
  }

  async function setChannel(guildId, channelId, channelName) {
    const serversCollection = database.collection("servers");
    try {
      await serversCollection.updateOne(
        { _id: guildId },
        {
          $set: {
            channel: {
              id: channelId,
              name: channelName,
            },
          },
        },
        { upsert: true }
      );
    } catch (error) {
      console.error("Error:", error);
    }
  }

  return { sendNude, getQuoteChannel, setChannel };
};
