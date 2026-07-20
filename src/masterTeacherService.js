import { collection, writeBatch, doc, getDocs } from "firebase/firestore";
import { db } from "./firebase.js";

// Mengambil semua master data tutor dari koleksi "master_teachers"
export const getMasterTeachers = async () => {
  try {
    const snapshot = await getDocs(collection(db, "master_teachers"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Gagal mengambil master data teachers:", error);
    throw error;
  }
};

// Mengimpor array master teacher secara massal (batch) ke koleksi "master_teachers"
export const importMasterTeachers = async (teacherArray) => {
  try {
    const teachersRef = collection(db, "master_teachers");
    const batches = [];
    let currentBatch = writeBatch(db);
    let opCount = 0;

    teacherArray.forEach(teacher => {
      const docRef = doc(teachersRef, teacher.id.toString());
      currentBatch.set(docRef, teacher);
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
    console.error("Gagal mengimpor master teachers:", error);
    throw error;
  }
};

// Menghapus semua master data teacher di koleksi "master_teachers"
export const deleteAllMasterTeachers = async () => {
  try {
    const snapshot = await getDocs(collection(db, "master_teachers"));
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
    console.error("Gagal menghapus semua master data teachers:", error);
    throw error;
  }
};
