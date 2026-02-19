import { openDB, type IDBPDatabase } from 'idb';
import type { Car, Setup, Controller, Configuration, SessionGarageLink } from '@/types/garage';

const DB_NAME = 'stintlab_garage';
const DB_VERSION = 3;
const CARS_STORE = 'cars';
const SETUPS_STORE = 'setups';
const LINKS_STORE = 'session_links';
const CONTROLLERS_STORE = 'controllers';
const CONFIGS_STORE = 'configurations';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(CARS_STORE)) {
          db.createObjectStore(CARS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(SETUPS_STORE)) {
          const store = db.createObjectStore(SETUPS_STORE, { keyPath: 'id' });
          store.createIndex('car_id', 'car_id');
        }
        if (!db.objectStoreNames.contains(LINKS_STORE)) {
          db.createObjectStore(LINKS_STORE, { keyPath: 'session_id' });
        }
        if (!db.objectStoreNames.contains(CONTROLLERS_STORE)) {
          db.createObjectStore(CONTROLLERS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(CONFIGS_STORE)) {
          db.createObjectStore(CONFIGS_STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

// ── Cars ────────────────────────────────────────

export async function getAllCars(): Promise<Car[]> {
  const db = await getDB();
  return db.getAll(CARS_STORE);
}

export async function getCar(id: string): Promise<Car | undefined> {
  const db = await getDB();
  return db.get(CARS_STORE, id);
}

export async function saveCar(car: Car): Promise<void> {
  const db = await getDB();
  await db.put(CARS_STORE, car);
}

export async function deleteCar(id: string): Promise<void> {
  const db = await getDB();
  // Also delete associated setups and links
  const tx = db.transaction([CARS_STORE, SETUPS_STORE, LINKS_STORE], 'readwrite');
  tx.objectStore(CARS_STORE).delete(id);

  const setups = await tx.objectStore(SETUPS_STORE).index('car_id').getAll(id);
  for (const s of setups) {
    tx.objectStore(SETUPS_STORE).delete(s.id);
  }

  // Remove links pointing to this car
  const allLinks: SessionGarageLink[] = await tx.objectStore(LINKS_STORE).getAll();
  for (const link of allLinks) {
    if (link.car_id === id) {
      tx.objectStore(LINKS_STORE).put({ ...link, car_id: null, setup_id: null });
    }
  }

  await tx.done;
}

// ── Setups ──────────────────────────────────────

export async function getSetupsForCar(carId: string): Promise<Setup[]> {
  const db = await getDB();
  return db.getAllFromIndex(SETUPS_STORE, 'car_id', carId);
}

export async function getAllSetups(): Promise<Setup[]> {
  const db = await getDB();
  return db.getAll(SETUPS_STORE);
}

export async function saveSetup(setup: Setup): Promise<void> {
  const db = await getDB();
  await db.put(SETUPS_STORE, setup);
}

export async function deleteSetup(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction([SETUPS_STORE, LINKS_STORE], 'readwrite');
  tx.objectStore(SETUPS_STORE).delete(id);

  // Nullify links pointing to this setup
  const allLinks: SessionGarageLink[] = await tx.objectStore(LINKS_STORE).getAll();
  for (const link of allLinks) {
    if (link.setup_id === id) {
      tx.objectStore(LINKS_STORE).put({ ...link, setup_id: null });
    }
  }

  await tx.done;
}

// ── Session ↔ Garage Links ──────────────────────

export async function getSessionLink(sessionId: string): Promise<SessionGarageLink | undefined> {
  const db = await getDB();
  return db.get(LINKS_STORE, sessionId);
}

export async function getAllSessionLinks(): Promise<SessionGarageLink[]> {
  const db = await getDB();
  return db.getAll(LINKS_STORE);
}

export async function saveSessionLink(link: SessionGarageLink): Promise<void> {
  const db = await getDB();
  await db.put(LINKS_STORE, link);
}

// ── Controllers ─────────────────────────────────

export async function getAllControllers(): Promise<Controller[]> {
  const db = await getDB();
  return db.getAll(CONTROLLERS_STORE);
}

export async function saveController(controller: Controller): Promise<void> {
  const db = await getDB();
  await db.put(CONTROLLERS_STORE, controller);
}

export async function deleteController(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(CONTROLLERS_STORE, id);
}

// ── Configurations ──────────────────────────────

export async function getAllConfigurations(): Promise<Configuration[]> {
  const db = await getDB();
  return db.getAll(CONFIGS_STORE);
}

export async function saveConfiguration(config: Configuration): Promise<void> {
  const db = await getDB();
  await db.put(CONFIGS_STORE, config);
}

export async function deleteConfiguration(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction([CONFIGS_STORE, LINKS_STORE], 'readwrite');
  tx.objectStore(CONFIGS_STORE).delete(id);
  // Nullify links pointing to this configuration
  const allLinks: SessionGarageLink[] = await tx.objectStore(LINKS_STORE).getAll();
  for (const link of allLinks) {
    if (link.configuration_id === id) {
      tx.objectStore(LINKS_STORE).put({ ...link, configuration_id: null });
    }
  }
  await tx.done;
}
