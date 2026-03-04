import { storage } from './pg-storage.js';

async function runAutoArchive() {
  try {
    const tasks = await storage.autoArchiveTasks();
    const items = await storage.autoArchiveShoppingItems();
    if (tasks + items > 0) {
      console.log(`[archive] Archiviati ${tasks} task e ${items} acquisti`);
    }
  } catch (err) {
    console.error('[archive] Errore durante archiviazione automatica:', err);
  }
}

export function startArchiveService() {
  runAutoArchive();
  setInterval(runAutoArchive, 6 * 60 * 60 * 1000);
}
