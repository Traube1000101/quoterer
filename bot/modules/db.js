module.exports = (database, client) => {
  const serversCollection = database.collection("servers");
  const usersCollection = database.collection("users");

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
    usersCollection.updateOne(
      { _id: user._id },
      {
        $set: user,
      },
      { upsert: true }
    );
  }

  function updateAllUsers() {
    usersCollection
      .find({})
      .toArray()
      .then((users) => {
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
    const result = await serversCollection.findOne({ _id: guildId });
    if (!result?.channel?.id) {
      throw new Error(
        "No quotes channel set! It must first be set by the Server Owner."
      );
    }
    return await client.channels.fetch(result.channel.id);
  }

  async function setChannel(guildId, server) {
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

  return {
    sendNude,
    getQuoteChannel,
    setChannel,
    updateUsers,
    updateAllUsers,
    pushUser,
  };
};
