const DB_NAME = 'FocusFlowDB';
const DB_VERSION = 1;
const STORE_NAME = 'appData';

let dbPromise: Promise<IDBDatabase> | null = null;

const initDB = (): Promise<IDBDatabase> => {
    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error("IndexedDB error:", request.error);
            reject(new Error("Error opening IndexedDB."));
            dbPromise = null; 
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
        };
    });

    return dbPromise;
};


export const dbService = {
  async get<T>(key: string): Promise<T | undefined> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      transaction.oncomplete = () => {
         resolve(request.result?.value);
      };

      transaction.onerror = () => {
        console.error('Error getting data from IndexedDB:', transaction.error);
        reject(transaction.error);
      };
    });
  },

  async set<T>(key: string, value: T): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put({ key, value });

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        console.error('Error setting data in IndexedDB:', transaction.error);
        reject(transaction.error);
      };
    });
  },

  async exportAllData(): Promise<Record<string, any>> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      transaction.oncomplete = () => {
        const data: Record<string, any> = {};
        for (const item of request.result) {
          data[item.key] = item.value;
        }
        resolve(data);
      };

      transaction.onerror = () => {
        console.error('Error exporting data from IndexedDB:', transaction.error);
        reject(transaction.error);
      };
    });
  },

  async importAllData(data: Record<string, any>): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      store.clear();

      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          store.put({ key, value: data[key] });
        }
      }

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        console.error('Error importing data to IndexedDB:', transaction.error);
        reject(transaction.error);
      };
    });
  },
};