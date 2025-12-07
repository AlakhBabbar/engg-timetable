import React, { useEffect, useState } from 'react';
import { fetchAllTeachers, updateTeacherCode } from './services/TeacherCodeAllocation';

function getDefaultCode(name) {
  if (!name) return '';
  // Remove only standalone salutations (Mr, Mrs, Sh, Dr, Prof, Miss) as whole words
  let clean = name
    .split(/\s+/)
    .filter(word => !/^(Mr|Mrs|Sh|Dr|Prof|Miss)\.?$/i.test(word))
    .join(' ')
    .replace(/[(){}\[\]]/g, '') // Remove brackets and braces
    .replace(/[^a-zA-Z\s]/g, '') // Remove any other special characters
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
  return clean
    .split(' ')
    .filter(Boolean)
    .map(word => word[0].toUpperCase())
    .join('');
}

export default function TeacherCodeAllocation() {
  const [teachers, setTeachers] = useState([]);
  const [codes, setCodes] = useState({});
  const [conflicts, setConflicts] = useState({});
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [saving, setSaving] = useState({});

  useEffect(() => {
    fetchAllTeachers().then(data => {
      setTeachers(data);
      // Set default codes
      const initialCodes = {};
      data.forEach(t => {
        initialCodes[t.id] = t.teacherCode || getDefaultCode(t.name);
      });
      setCodes(initialCodes);
    });
  }, []);

  useEffect(() => {
    // Detect conflicts
    const codeToIds = {};
    Object.entries(codes).forEach(([id, code]) => {
      if (!code) return;
      if (!codeToIds[code]) codeToIds[code] = [];
      codeToIds[code].push(id);
    });
    const newConflicts = {};
    Object.entries(codeToIds).forEach(([code, ids]) => {
      if (ids.length > 1) {
        ids.forEach(id => {
          newConflicts[id] = ids.filter(x => x !== id);
        });
      }
    });
    setConflicts(newConflicts);
  }, [codes]);

  const handleCodeChange = (id, value) => {
    setCodes(c => ({ ...c, [id]: value.toUpperCase() }));
  };

  const handleReset = id => {
    const teacher = teachers.find(t => t.id === id);
    setCodes(c => ({ ...c, [id]: getDefaultCode(teacher.name) }));
  };

  const handleSave = async id => {
    setSaving(s => ({ ...s, [id]: true }));
    await updateTeacherCode(id, codes[id]);
    setSaving(s => ({ ...s, [id]: false }));
  };

  return (
    <div className="p-6 relative">
      <h1 className="text-2xl font-bold mb-6 bg-white">Teacher Code Allocation</h1>
      {selectedConflict && (
        <div className="mb-4 p-3 rounded bg-red-100 text-red-700 border border-red-300">
          Code conflict with: {selectedConflict.map(cid => {
            const t = teachers.find(t => t.id === cid);
            return t ? t.name : cid;
          }).join(', ')}
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="overflow-y-auto max-h-[420px]">
          <table className="min-w-full border border-gray-200 rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-3 text-left">Teacher Name</th>
                <th className="py-2 px-3 text-left">Faculty</th>
                <th className="py-2 px-3 text-left">Department</th>
                <th className="py-2 px-3 text-left">Max Hours</th>
                <th className="py-2 px-3 text-left">Teacher Code</th>
                <th className="py-2 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(t => {
                const code = codes[t.id] || '';
                const isConflict = !!conflicts[t.id];
                return (
                  <tr
                    key={t.id}
                    className={isConflict ? 'bg-red-50' : ''}
                    onClick={() => isConflict ? setSelectedConflict(conflicts[t.id]) : setSelectedConflict(null)}
                  >
                    <td className="py-2 px-3">{t.name}</td>
                    <td className="py-2 px-3">Engineering</td>
                    <td className="py-2 px-3">{t.department}</td>
                    <td className="py-2 px-3">{t.maxHours}</td>
                    <td className="py-2 px-3">
                      <input
                        className="border rounded px-2 py-1 w-24"
                        value={code}
                        onChange={e => handleCodeChange(t.id, e.target.value)}
                        maxLength={8}
                      />
                    </td>
                    <td className="py-2 px-3 text-center flex gap-2 justify-center">
                      <button
                        className={`px-3 py-1 rounded bg-green-600 hover:bg-green-800 ease-in-out duration-75 delay-75 text-white ${isConflict ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={isConflict || saving[t.id]}
                        onClick={e => { e.stopPropagation(); handleSave(t.id); }}
                      >
                        Save
                      </button>
                      <button
                        className="px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-400 hover:text-gray-900 ease-in-out duration-75 delay-75"
                        onClick={e => { e.stopPropagation(); handleReset(t.id); }}
                      >
                        Reset
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex justify-end mt-6">
        <button
          className={`px-6 py-2 rounded-lg bg-green-700 text-white font-semibold shadow hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed`}
          disabled={Object.keys(conflicts).length > 0 || Object.values(saving).some(Boolean)}
          onClick={async () => {
            const updates = teachers.map(async t => {
              if (codes[t.id] !== t.teacherCode) {
                setSaving(s => ({ ...s, [t.id]: true }));
                await updateTeacherCode(t.id, codes[t.id]);
                setSaving(s => ({ ...s, [t.id]: false }));
              }
            });
            await Promise.all(updates);
          }}
        >
          Save All
        </button>
      </div>
    </div>
  );
}
