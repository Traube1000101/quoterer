module.exports = (database, client) => {
  // Send Noteworthy Unified Discord Entry
  function sendNude(messageId, quote) {
    const messageIdInt = parseInt(messageId);
    try {
      const quotesCollection = database.collection("quotes");
      quotesCollection
        .updateOne(
          { _id: messageIdInt },
          {
            $unset: { invalid: null, originalMessage: null },
          }
        )
        .then(() => {
          quotesCollection.updateOne(
            { _id: messageIdInt },
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
          $addToSet: { quotes: messageIdInt },
        }
      );
    } catch (error) {
      console.error("Error:", error);
    }
  }

  function fetchUser(userId) {
    const dcUser = client.users.cache.get(userId);
    if (!dcUser) {
      return { invalid: true };
    }
    const { displayName, username } = dcUser;
    return {
      _id: userId,
      name: displayName,
      username: username,
      avatar: dcUser.avatarURL(),
    };
  }

  function pushUser(user) {
    const usersCollection = database.collection("users");
    usersCollection.updateOne(
      { _id: user._id },
      {
        $set: user,
      },
      { upsert: true }
    );
  }

  function updateAllUsers() {
    const usersCollection = database.collection("users");
    usersCollection.find({}).then((users) => {
      users.forEach((user) => {
        const updatedUser = fetchUser(user._id);
        pushUser(updatedUser);
      });
    });
  }

  function updateUsers(userIds) {
    return userIds.map((userId) => {
      const user = fetchUser(userId);
      pushUser(user);
      return user;
    });
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

  return {
    sendNude,
    getQuoteChannel,
    setChannel,
    updateUsers,
    updateAllUsers,
    pushUser,
  };
};
