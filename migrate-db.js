const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function updateCollectionInPlace(db, collectionName, idFieldName) {
  const collection = db.collection(collectionName);
  const docs = await collection.find().toArray();

  // Move discord id to separate field
  for (const doc of docs) {
    const oldId = doc._id;
    const { _id, ...rest } = doc;

    // Create new object id
    const newDoc = {
      _id: new ObjectId(),
      [idFieldName]: oldId,
      ...rest,
    };

    await collection.insertOne(newDoc);

    await collection.deleteOne({ _id: oldId });
  }
  console.log(`Updated collection "${collectionName}" with new _id and copied old id to "${idFieldName}"`);
}

(async () => {
    const client = new MongoClient(process.env.db_uri);
  try {
    await client.connect();
    const db = client.db('quoterer');

    await updateCollectionInPlace(db, 'quotes', 'messageId');
    await updateCollectionInPlace(db, 'users', 'userId');
  } finally {
    console.log(`%cSuccessfully migrated to version 2.x.x db layout`, "color: #0DBC79");
    await client.close();
  }
})();
