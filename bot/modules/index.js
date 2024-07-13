module.exports = (database, client) => {
  // Send Noteworthy Unified Discord Entry
  async function sendNude(messageId, quote) {
    const quotesCollection = database.collection("quotes");
    try {
      await quotesCollection.updateOne(
        { _id: messageId },
        {
          $unset: { invalid: null, originalMessage: null },
        }
      );
      await quotesCollection.updateOne(
        { _id: messageId },
        {
          $set: quote,
        },
        { upsert: true }
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
  return { sendNude, getQuoteChannel };
};
