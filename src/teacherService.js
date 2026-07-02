import { collection, writeBatch, doc, getDocs } from "firebase/firestore";
import { db } from "./firebase.js";

// Mengambil semua data teacher (bisa digunakan untuk fetch awal)
export const getTeachers = async () => {
  try {
    const snapshot = await getDocs(collection(db, "teachers"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Gagal mengambil data teachers:", error);
    throw error;
  }
};

// Menyimpan array teacher secara massal (batch)
export const importTeachers = async (teacherArray) => {
  try {
    const teachersRef = collection(db, "teachers");
    const batches = [];
    let currentBatch = writeBatch(db);
    let opCount = 0;

    teacherArray.forEach(teacher => {
      // Pastikan ID berupa string
      const docRef = doc(teachersRef, teacher.id.toString());
      currentBatch.set(docRef, teacher);
      opCount++;

      // Batas maksimal batch Firestore adalah 500 operasi
      if (opCount === 500) {
        batches.push(currentBatch.commit());
        currentBatch = writeBatch(db);
        opCount = 0;
      }
    });

    if (opCount > 0) batches.push(currentBatch.commit());

    await Promise.all(batches);
  } catch (error) {
    console.error("Gagal mengimpor teachers:", error);
    throw error; // Lempar error agar bisa ditangkap oleh blok catch di komponen UI
  }
};
