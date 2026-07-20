import { collection, writeBatch, doc, getDocs } from "firebase/firestore";
import { db } from "./firebase.js";

// Mengambil semua data time availability dari koleksi "tutor_time_availability"
export const getTimeAvailability = async () => {
  try {
    const snapshot = await getDocs(collection(db, "tutor_time_availability"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Gagal mengambil data time availability:", error);
    throw error;
  }
};

// Mengimpor array time availability secara massal (batch)
export const importTimeAvailability = async (dataArray) => {
  try {
    const dataRef = collection(db, "tutor_time_availability");
    const batches = [];
    let currentBatch = writeBatch(db);
    let opCount = 0;

    dataArray.forEach(record => {
      const docRef = doc(dataRef, record.id.toString());
      currentBatch.set(docRef, record);
      opCount++;

      if (opCount === 500) {
        batches.push(currentBatch.commit());
        currentBatch = writeBatch(db);
        opCount = 0;
      }
    });

    if (opCount > 0) batches.push(currentBatch.commit());

    await Promise.all(batches);
  } catch (error) {
    console.error("Gagal mengimpor time availability:", error);
    throw error;
  }
};

// Menghapus semua data time availability di koleksi "tutor_time_availability"
export const deleteAllTimeAvailability = async () => {
  try {
    const snapshot = await getDocs(collection(db, "tutor_time_availability"));
    if (snapshot.empty) return;

    const batches = [];
    let currentBatch = writeBatch(db);
    let opCount = 0;

    snapshot.docs.forEach(docSnap => {
      currentBatch.delete(docSnap.ref);
      opCount++;

      if (opCount === 500) {
        batches.push(currentBatch.commit());
        currentBatch = writeBatch(db);
        opCount = 0;
      }
    });

    if (opCount > 0) batches.push(currentBatch.commit());

    await Promise.all(batches);
  } catch (error) {
    console.error("Gagal menghapus semua data time availability:", error);
    throw error;
  }
};
