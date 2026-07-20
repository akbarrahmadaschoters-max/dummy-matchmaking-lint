import { collection, writeBatch, doc, getDocs } from "firebase/firestore";
import { db } from "./firebase.js";

// Mengambil semua master data tutor Intertest dari koleksi "master_intertest_teachers"
export const getMasterIntertestTeachers = async () => {
  try {
    const snapshot = await getDocs(collection(db, "master_intertest_teachers"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Gagal mengambil master data Intertest teachers:", error);
    throw error;
  }
};

// Mengimpor array master Intertest teacher secara massal (batch)
export const importMasterIntertestTeachers = async (teacherArray) => {
  try {
    const teachersRef = collection(db, "master_intertest_teachers");
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
    console.error("Gagal mengimpor master Intertest teachers:", error);
    throw error;
  }
};

// Menghapus semua master data Intertest teacher di koleksi "master_intertest_teachers"
export const deleteAllMasterIntertestTeachers = async () => {
  try {
    const snapshot = await getDocs(collection(db, "master_intertest_teachers"));
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
    console.error("Gagal menghapus semua master data Intertest teachers:", error);
    throw error;
  }
};
