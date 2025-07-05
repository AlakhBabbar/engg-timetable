import React, { useEffect, useState } from 'react';
import { FiEdit2, FiRefreshCw, FiCheckSquare, FiSquare, FiUsers, FiList, FiSave, FiCalendar, FiCheckCircle } from 'react-icons/fi';
import {
  fetchAllRooms,
  listenToRoomFreeTimings,
  setRoomFreeTimings,
  setRoomAllFreeTimings,
  resetRoomFreeTimings
} from './services/RoomAvailabilityAllocation';

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const timeSlots = [
  '7:00-7:55', '7:55-8:50', '8:50-9:45', '10:30-11:25', '11:25-12:20',
  '12:20-1:15', '1:15-2:10', '2:10-3:05', '3:05-4:00', '4:00-4:55'
];

export default function RoomAvailabilityAllocation() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [freeTimings, setFreeTimings] = useState([]);
  const [pendingFreeTimings, setPendingFreeTimings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allChecked, setAllChecked] = useState(false);
  const [listenerUnsub, setListenerUnsub] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Fetch all rooms on mount
  useEffect(() => {
    fetchAllRooms().then(setRooms);
  }, []);

  // Listen to selected room's freeTimings
  useEffect(() => {
    if (listenerUnsub) listenerUnsub();
    setFreeTimings([]); // Reset grid on room change
    setPendingFreeTimings([]);
    setDirty(false);
    setResetting(true);
    if (!selectedRoom) return;
    setLoading(true);
    const unsub = listenToRoomFreeTimings(selectedRoom.id, timings => {
      setFreeTimings(timings);
      setPendingFreeTimings(timings);
      setLoading(false);
      setResetting(false);
      setDirty(false);
    });
    setListenerUnsub(() => unsub);
    return () => unsub && unsub();
  }, [selectedRoom]);

  // Ensure freeTimings is always an array
  const timingsArray = Array.isArray(pendingFreeTimings) ? pendingFreeTimings : [];
  // Build a lookup for fast checking
  const freeLookup = {};
  timingsArray.forEach(obj => {
    const day = Object.keys(obj)[0];
    freeLookup[day] = obj[day] || [];
  });

  // For select all
  const allSlots = weekDays.reduce((acc, day) => {
    acc[day] = [...timeSlots];
    return acc;
  }, {});

  // Check if all are checked
  useEffect(() => {
    if (!selectedRoom) return;
    let all = true;
    for (let day of weekDays) {
      for (let slot of timeSlots) {
        if (!freeLookup[day] || !freeLookup[day].includes(slot)) {
          all = false;
          break;
        }
      }
      if (!all) break;
    }
    setAllChecked(all);
  }, [freeTimings, selectedRoom]);

  // Handle cell click
  const handleCellToggle = async (day, slot) => {
    if (!selectedRoom || resetting) return;
    // Update pendingFreeTimings locally
    const timingsObj = {};
    timingsArray.forEach(obj => {
      const d = Object.keys(obj)[0];
      timingsObj[d] = [...(obj[d] || [])];
    });
    if (!timingsObj[day]) timingsObj[day] = [];
    const isFree = timingsObj[day].includes(slot);
    if (isFree) {
      timingsObj[day] = timingsObj[day].filter(s => s !== slot);
    } else {
      timingsObj[day].push(slot);
    }
    const newPending = Object.keys(timingsObj).map(dayKey => ({ [dayKey]: timingsObj[dayKey] }));
    setPendingFreeTimings(newPending);
    setDirty(true);
    // Update Firestore immediately for real-time
    await setRoomFreeTimings(selectedRoom.id, newPending);
  };

  // Handle select all
  const handleSelectAll = async () => {
    if (!selectedRoom || resetting) return;
    const newPending = Object.keys(allSlots).map(day => ({ [day]: !allChecked ? allSlots[day] : [] }));
    setPendingFreeTimings(newPending);
    setDirty(true);
    await setRoomFreeTimings(selectedRoom.id, newPending);
  };

  // Handle reset
  const handleReset = async (roomId) => {
    setPendingFreeTimings([]);
    setDirty(true);
    await setRoomFreeTimings(roomId, []);
  };

  // Save all changes to Firestore
  const handleSave = async () => {
    if (!selectedRoom) return;
    await setRoomFreeTimings(selectedRoom.id, pendingFreeTimings);
    setDirty(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 mr-1">
          <FiCheckCircle className="text-indigo-600 text-2xl" />
        </span>
        <h1 className="text-2xl font-bold text-indigo-700">Availability</h1>
        <div className="ml-auto">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-100">
            <FiCalendar className="text-cyan-500 text-xl" />
          </span>
        </div>
      </div>
      <div className="flex gap-4">
        {/* Left Section: Room List */}
        <div className="bg-white rounded-xl shadow-sm p-4 min-w-[600px] max-w-[900px] w-[700px] flex flex-col">
          <h2 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2"><FiUsers /> Rooms</h2>
          <div className="flex-1 overflow-y-auto max-h-[520px] rounded-lg border border-gray-100 shadow-inner">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-2 text-left">Room Number</th>
                  <th className="py-2 px-2 text-left">Capacity</th>
                  <th className="py-2 px-2 text-left">Faculty</th>
                  <th className="py-2 px-2 text-left">Features</th>
                  <th className="py-2 px-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map(room => (
                  <tr key={room.id} className={`hover:bg-indigo-50 cursor-pointer transition-all duration-150 ${selectedRoom?.id === room.id ? 'bg-indigo-200 ring-2 ring-indigo-400' : ''}`}
                    onClick={() => setSelectedRoom(room)}>
                    <td className="py-2 px-2 font-medium">{room.number}</td>
                    <td className="py-2 px-2">{room.capacity || '-'}</td>
                    <td className="py-2 px-2">{room.faculty || '-'}</td>
                    <td className="py-2 px-2">
                      {(room.features || []).map(f => <span key={f} className="bg-gray-200 rounded px-1 mr-1">{f}</span>)}
                    </td>
                    <td className="py-2 px-2 text-center flex gap-2 justify-center">
                      <button className="text-indigo-600 hover:text-indigo-900" title="Edit"><FiEdit2 /></button>
                      <button className="text-red-500 hover:text-red-700" title="Reset" onClick={e => { e.stopPropagation(); handleReset(room.id); handleSelectAll() }}><FiRefreshCw /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Right Section: Availability Table */}
        <div className={`bg-white rounded-xl shadow-sm p-6 flex-1 min-w-[500px] transition-all duration-200 ${!selectedRoom ? 'opacity-60 pointer-events-none grayscale' : ''}`}> 
          <div className="flex items-center gap-3 mb-3">
            <button
              className="flex items-center gap-2 px-6 py-1.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-base focus:outline-none shadow-sm border border-indigo-100"
              onClick={handleSelectAll}
              style={{ minWidth: 80 }}
            >
              <span className="inline-flex items-center justify-center w-6 h-6">
                <input type="checkbox" checked={allChecked} readOnly className="accent-indigo-600 w-6 h-6" />
              </span>
              <span className="ml-1">All</span>
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-inner bg-white">
            <table className="border-collapse w-full text-sm">
              <thead>
                <tr>
                  <th className="py-2 px-3"></th>
                  {weekDays.map(day => (
                    <th key={day} className="py-2 px-3 text-center font-semibold text-indigo-700">{day.slice(0,3)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(slot => (
                  <tr key={slot}>
                    <td className="py-2 px-3 font-mono text-right text-indigo-700 font-semibold whitespace-nowrap">{slot}</td>
                    {weekDays.map(day => {
                      const checked = resetting ? false : (freeLookup[day] && freeLookup[day].includes(slot));
                      return (
                        <td key={day} className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!selectedRoom || resetting}
                            onChange={() => handleCellToggle(day, slot)}
                            className={`accent-indigo-600 w-6 h-6 border-2 border-indigo-300 rounded-md shadow-sm ${!selectedRoom || resetting ? 'bg-gray-200 cursor-not-allowed' : ''}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading && <div className="text-xs text-gray-400 mt-2">Loading availability...</div>}
          {selectedRoom && (
            <div className="mt-4 flex justify-end">
              <button
                className={`px-4 py-2 rounded-lg bg-green-600 text-white flex items-center gap-2 hover:bg-green-700 ${!dirty ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={!dirty}
                onClick={handleSave}
              >
                <FiSave /> Save
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
