import mongoose, { Connection } from 'mongoose';
import 'dotenv/config';

export async function connectTestDatabase() {
  const uri = process.env.MONGODB_TEST_URI;

  if (!uri) {
    throw new Error('MONGODB_TEST_URI is required to run integration tests');
  }

  const databaseName = new URL(uri).pathname.replace(/^\//, '');
  if (!databaseName || !databaseName.includes('integration')) {
    throw new Error(
      'MONGODB_TEST_URI must point to a dedicated integration database',
    );
  }

  return mongoose.createConnection(uri).asPromise();
}

export async function clearDatabase(connection?: Connection): Promise<void> {
  if (!connection) return;
  await Promise.all(
    Object.values(connection.collections).map((collection) =>
      collection.deleteMany({}),
    ),
  );
}

export function closeTestDatabase(connection?: Connection): Promise<void> {
  if (!connection) return Promise.resolve();
  return connection.close();
}
