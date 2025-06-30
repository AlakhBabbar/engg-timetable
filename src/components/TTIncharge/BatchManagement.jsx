import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUsers, 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiSave,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiRefreshCw
} from 'react-icons/fi';
import { useSemester } from '../../context/SemesterContext';
import { 
  getBranches, 
  createBatch, 
  updateBatch, 
  deleteBatch, 
  getBatches,
  subscribeToBatches,
  syncAllBatches
} from './services/BatchManagement';

export default function BatchManagement() {
  // Semester context
  const { selectedSemester } = useSemester();
  
  const [selectedBranch, setSelectedBranch] = useState('');
  const [batches, setBatches] = useState([]);
  const [newBatchName, setNewBatchName] = useState('');
  const [editingBatch, setEditingBatch] = useState(null);
  const [editBatchName, setEditBatchName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  const branches = getBranches();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (selectedBranch && selectedSemester) {
        // Sync when coming back online
        handleSync();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [selectedBranch, selectedSemester]);

  // Set up real-time listener when branch and semester are selected
  useEffect(() => {
    let unsubscribe = null;

    if (selectedBranch && selectedSemester) {
      setLoading(true);
      
      // Set up real-time listener
      unsubscribe = subscribeToBatches(selectedBranch, selectedSemester, (batchData) => {
        setBatches(batchData);
        setLoading(false);
      });

      // Also load initial data
      loadBatches();
    } else {
      setBatches([]);
    }

    // Cleanup listener on unmount or when dependencies change
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedBranch, selectedSemester]);

  const loadBatches = async () => {
    try {
      const batchData = await getBatches(selectedBranch, selectedSemester, true); // Force sync
      setBatches(batchData);
    } catch (error) {
      showMessage('error', 'Failed to load batches. Using cached data.');
      console.error('Error loading batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncAllBatches();
      showMessage('success', 'Data synced successfully');
    } catch (error) {
      showMessage('error', 'Sync failed. Data saved locally.');
    } finally {
      setSyncing(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleCreateBatch = async () => {
    if (!newBatchName.trim()) {
      showMessage('error', 'Please enter a batch name');
      return;
    }

    setLoading(true);
    try {
      const newBatch = await createBatch(selectedBranch, selectedSemester, newBatchName.trim());
      setBatches([...batches, newBatch]);
      setNewBatchName('');
      showMessage('success', 'Batch created successfully');
    } catch (error) {
      showMessage('error', 'Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBatch = async (batchId) => {
    if (!editBatchName.trim()) {
      showMessage('error', 'Please enter a valid batch name');
      return;
    }

    setLoading(true);
    try {
      const updatedBatch = await updateBatch(batchId, editBatchName.trim());
      setBatches(batches.map(batch => 
        batch.id === batchId ? updatedBatch : batch
      ));
      setEditingBatch(null);
      setEditBatchName('');
      showMessage('success', 'Batch updated successfully');
    } catch (error) {
      showMessage('error', 'Failed to update batch');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBatch = async (batchId) => {
    if (!confirm('Are you sure you want to delete this batch?')) {
      return;
    }

    setLoading(true);
    try {
      await deleteBatch(batchId);
      setBatches(batches.filter(batch => batch.id !== batchId));
      showMessage('success', 'Batch deleted successfully');
    } catch (error) {
      showMessage('error', 'Failed to delete batch');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (batch) => {
    setEditingBatch(batch.id);
    setEditBatchName(batch.name);
  };

  const cancelEditing = () => {
    setEditingBatch(null);
    setEditBatchName('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-3 rounded-full">
            <FiUsers size={24} className="text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Batch Management</h1>
        </div>
        
        {/* Online/Offline Status and Sync Button */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            isOnline 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            {isOnline ? 'Online' : 'Offline'}
          </div>
          
          {isOnline && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2 disabled:opacity-50"
            >
              {syncing ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Syncing...
                </>
              ) : (
                <>
                  <FiCheck size={16} />
                  Sync
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Message Display */}
      {message.text && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}
        >
          {message.type === 'success' ? <FiCheck size={20} /> : <FiAlertCircle size={20} />}
          <span>{message.text}</span>
        </motion.div>
      )}

      {/* Selection Form */}
      <div className="bg-white p-6 rounded-2xl shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Branch for Current Semester</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Branch
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select Branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Semester
            </label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-between">
              <span className="font-medium text-purple-600">
                {selectedSemester || 'No semester selected'}
              </span>
              <span className="text-xs text-gray-500">
                (Managed from header)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Batch Creation Form */}
      {selectedBranch && selectedSemester && (
        <div className="bg-white p-6 rounded-2xl shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Create New Batch for {branches.find(b => b.id === selectedBranch)?.name} - {selectedSemester}
          </h2>
          
          {!isOnline && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
              ⚠️ You're offline. Changes will be saved locally and synced when you're back online.
            </div>
          )}
          
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Enter batch name (e.g., A, B, C or Batch-1, Batch-2)"
              value={newBatchName}
              onChange={(e) => setNewBatchName(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <motion.button
              onClick={handleCreateBatch}
              disabled={loading || !newBatchName.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium rounded-lg shadow hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiPlus size={18} />
              Create Batch
            </motion.button>
          </div>
        </div>
      )}

      {/* Batches List */}
      {selectedBranch && selectedSemester && (
        <div className="bg-white p-6 rounded-2xl shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Existing Batches ({batches.length})
          </h2>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FiUsers size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No batches created yet for this branch and semester.</p>
              <p className="text-sm">Create your first batch above to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {batches.map((batch) => (
                <motion.div
                  key={batch.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
                >
                  {editingBatch === batch.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editBatchName}
                        onChange={(e) => setEditBatchName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateBatch(batch.id)}
                          disabled={loading}
                          className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-1"
                        >
                          <FiSave size={16} />
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="flex-1 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition flex items-center justify-center gap-1"
                        >
                          <FiX size={16} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-800">{batch.name}</h3>
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEditing(batch)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="Edit batch"
                          >
                            <FiEdit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteBatch(batch.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Delete batch"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {/* <p>Students: {batch.studentCount || 0}</p> */}
                        <p>Created: {new Date(batch.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
