// Set the entire freeTimings array for a room
export async function setRoomFreeTimings(roomId, timings) {
  await updateDoc(doc(db, 'rooms', roomId), { freeTimings: timings });
}
import { db, collection, doc, getDocs, onSnapshot, updateDoc, setDoc, getDoc } from '../../../firebase/config';

// Fetch all rooms from Firestore
export async function fetchAllRooms() {
  const snap = await getDocs(collection(db, 'rooms'));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Listen to a room's freeTimings in real time
export function listenToRoomFreeTimings(roomId, callback) {
  return onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().freeTimings || []);
    } else {
      callback([]);
    }
  });
}

// Update a room's freeTimings (add or remove a slot)
export async function updateRoomFreeTiming(roomId, day, slot, isFree) {
  const roomRef = doc(db, 'rooms', roomId);
  const docSnap = await getDoc(roomRef);
  let freeTimings = docSnap.exists() ? docSnap.data().freeTimings || [] : [];
  // Convert to object for easier manipulation
  const timingsObj = {};
  freeTimings.forEach(obj => {
    const [dayKey] = Object.keys(obj);
    timingsObj[dayKey] = obj[dayKey];
  });
  if (!timingsObj[day]) timingsObj[day] = [];
  if (isFree) {
    if (!timingsObj[day].includes(slot)) timingsObj[day].push(slot);
  } else {
    timingsObj[day] = timingsObj[day].filter(s => s !== slot);
  }
  // Convert back to array format
  const newFreeTimings = Object.keys(timingsObj).map(dayKey => ({ [dayKey]: timingsObj[dayKey] }));
  await updateDoc(roomRef, { freeTimings: newFreeTimings });
}

// Set all slots as free or none as free
export async function setRoomAllFreeTimings(roomId, allSlots, isAllFree) {
  const freeTimings = isAllFree
    ? Object.keys(allSlots).map(day => ({ [day]: allSlots[day] }))
    : Object.keys(allSlots).map(day => ({ [day]: [] }));
  await updateDoc(doc(db, 'rooms', roomId), { freeTimings });
}

// Reset a room's freeTimings to empty
export async function resetRoomFreeTimings(roomId) {
  await updateDoc(doc(db, 'rooms', roomId), { freeTimings: [] });
}
