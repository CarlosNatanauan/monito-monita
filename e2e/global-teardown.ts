import { deleteAllE2eGroups } from "./db-cleanup";

export default async function globalTeardown() {
  const removed = await deleteAllE2eGroups();
  if (removed > 0) console.log(`e2e cleanup: deleted ${removed} test group(s) from the dev database`);
}
