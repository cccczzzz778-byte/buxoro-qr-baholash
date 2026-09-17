import { database, closeDatabase } from '../server/database.mjs';

try {
  await database();
  console.log('Database migrations applied successfully.');
} finally {
  await closeDatabase();
}
