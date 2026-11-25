// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
import { MongoClient } from 'mongodb';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function initMongo() {
  const dbName = process.env.MONGO_DB_NAME || 'dragonclaim';
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
  
  console.log(`Connecting to MongoDB at ${uri.replace(/\/\/[^/\s]*@/, "//***@")}`); // never log the password
  console.log(`Using database: ${dbName}`);
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db(dbName);
    
    // Read and validate schemas
    const schemasDir = path.join(__dirname, '../data/schemas');
    const schemaFiles = await fs.readdir(schemasDir);
    
    for (const file of schemaFiles) {
      if (file.endsWith('.schema.json')) {
        const collectionName = file.replace('.schema.json', '');
        const schemaPath = path.join(schemasDir, file);
        const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'));
        
        // Create collection with schema validation
        try {
          await db.createCollection(collectionName, {
            validator: schema
          });
          console.log(`Created collection ${collectionName} with schema validation`);
        } catch (error) {
          if (error.code === 48) { // Collection already exists
            console.log(`Collection ${collectionName} already exists, updating validator...`);
            await db.command({
              collMod: collectionName,
              validator: schema
            });
          } else {
            throw error;
          }
        }
      }
    }
    
    // Create indexes. _id already is the natural unique key for giveaways (eventId),
    // guilds (guildId) and discordBlacklists (discordId); users are upserted by discordUser.id.
    await db.collection('users').createIndex({ 'discordUser.id': 1 }, { unique: true });

    // Drop unique indexes created by older versions of this script on fields the bot never
    // writes: every doc indexed as null, so the 2nd insert failed with a duplicate key.
    const staleIndexes = [
      ['users', 'discordId_1'],
      ['giveaways', 'eventId_1'],
      ['guilds', 'guildId_1'],
    ];
    for (const [col, idx] of staleIndexes) {
      await db.collection(col).dropIndex(idx).catch((e) => {
        if (e.codeName !== 'IndexNotFound' && e.codeName !== 'NamespaceNotFound') throw e; // Absent on fresh DBs
      });
    }

    console.log('Created indexes on collections');
    
    // Insert test data if collections are empty (never in production: it'd seed fake users/guilds)
    const collections = process.env.NODE_ENV === 'production' ? [] : ['users', 'guilds'];
    for (const collection of collections) {
      const count = await db.collection(collection).countDocuments();
      if (count === 0) {
        console.log(`Inserting test data into ${collection}`);
        // Add test data based on collection
        switch(collection) {
          case 'users':
            await db.collection(collection).insertOne({
              discordUser: { id: '123456789', username: 'TestUser' },
              src: {},
              guildsArr: [],
            });
            break;
          case 'guilds':
            await db.collection(collection).insertOne({
              _id: '987654321', // schema: guild _id is the Discord guild ID (string)
              name: 'Test Guild',
              settings: {
                prefix: '.',
                modRoleId: '111111111'
              }
            });
            break;
        }
      }
    }
    
    console.log('MongoDB initialization complete!');
    
  } catch (error) {
    console.error('Error initializing MongoDB:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

initMongo(); 