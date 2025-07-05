import { db, collection, getDocs, updateDoc, doc } from '../../../firebase/config';

// Fetch all teachers from Firestore
export async function fetchAllTeachers() {
  const snap = await getDocs(collection(db, 'teachers'));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Update teacher code for a teacher
export async function updateTeacherCode(teacherId, code) {
  await updateDoc(doc(db, 'teachers', teacherId), { teacherCode: code });
}
