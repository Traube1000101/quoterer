module.exports = (database, client) => {
  // Send Noteworthy Unified Discord Entry
  async function sendNude(messageId, quote) {
    const quotesCollection = database.collection("quotes");
    try {
      await quotesCollection.updateOne(
        { _id: messageId },
        { $set: quote },
        { upsert: true }
      );
    } catch (error) {
      console.error("Error:", error);
    }
  }

  async function getQuoteChannel(guildId) {
    const serversCollection = database.collection("servers");
    try {
      const channelId = await serversCollection.findOne({ _id: guildId });
      return await client.channels.fetch(channelId.channel.id);
    } catch (error) {
      console.error("Error:", error);
    }
  }
  return { sendNude, getQuoteChannel };
};
