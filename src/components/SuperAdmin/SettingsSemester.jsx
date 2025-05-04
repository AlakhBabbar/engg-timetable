import { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiCheck, FiX, FiEdit2, FiCalendar, FiAlertCircle, FiSave, FiInfo } from 'react-icons/fi';
import { 
  fetchSemesters, 
  addSemester, 
  updateSemester, 
  deleteSemester,
  updateActiveSemester
} from './services/SettingsSemester';

// Import our enhanced semester service
import { 
  getCurrentSemesterPeriod,
  getSemesterNumbersForPeriod,
  getCurrentSemesterNumbers
} from '../../services/SemesterService';

export default function SettingsSemester() {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newSemester, setNewSemester] = useState('');
  const [editingSemester, setEditingSemester] = useState(null);
  const [activeSemesterId, setActiveSemesterId] = useState(null);
  const [savingChanges, setSavingChanges] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSemesterGuide, setShowSemesterGuide] = useState(false);
  
  // Get the current period and available semester numbers
  const currentPeriod = getCurrentSemesterPeriod();
  const availableSemesters = getSemesterNumbersForPeriod(currentPeriod);

  // Fetch semesters on component mount
  useEffect(() => {
    const loadSemesters = async () => {
      try {
        setLoading(true);
        const semestersData = await fetchSemesters();
        setSemesters(semestersData);
        
        // Set active semester
        const activeSemester = semestersData.find(sem => sem.status === 'active');
        if (activeSemester) {
          setActiveSemesterId(activeSemester.id);
        }
      } catch (error) {
        console.error('Error loading semesters:', error);
        setError('Failed to load semesters. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadSemesters();
  }, []);
  
  // Quick add semester from current period
  const handleQuickAddSemester = async (semesterNumber) => {
    const semesterName = `Semester ${semesterNumber}`;
    
    try {
      setSavingChanges(true);
      const newSemesterObj = await addSemester(semesterName);
      setSemesters([...semesters, newSemesterObj]);
      setSuccessMessage(`Semester ${semesterNumber} added successfully`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error adding semester:', error);
      setError('Failed to add semester. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSavingChanges(false);
    }
  };

  // Handle adding a new semester
  const handleAddSemester = async (e) => {
    e.preventDefault();
    if (!newSemester.trim()) return;
    
    try {
      setSavingChanges(true);
      const newSemesterObj = await addSemester(newSemester);
      setSemesters([...semesters, newSemesterObj]);
      setNewSemester('');
      setSuccessMessage('Semester added successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error adding semester:', error);
      setError('Failed to add semester. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSavingChanges(false);
    }
  };

  // Handle editing a semester
  const handleStartEdit = (semester) => {
    setEditingSemester({ ...semester, newName: semester.name });
  };

  const handleCancelEdit = () => {
    setEditingSemester(null);
  };

  const handleUpdateSemester = async (e) => {
    e.preventDefault();
    if (!editingSemester?.newName?.trim()) return;
    
    try {
      setSavingChanges(true);
      await updateSemester(editingSemester.id, editingSemester.newName);
      setSemesters(semesters.map(sem => 
        sem.id === editingSemester.id 
          ? { ...sem, name: editingSemester.newName } 
          : sem
      ));
      setEditingSemester(null);
      setSuccessMessage('Semester updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error updating semester:', error);
      setError('Failed to update semester. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSavingChanges(false);
    }
  };

  // Handle deleting a semester
  const handleDeleteSemester = async (semesterId) => {
    if (!window.confirm('Are you sure you want to delete this semester? This action cannot be undone.')) {
      return;
    }
    
    try {
      setSavingChanges(true);
      await deleteSemester(semesterId);
      setSemesters(semesters.filter(sem => sem.id !== semesterId));
      setSuccessMessage('Semester deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting semester:', error);
      setError('Failed to delete semester. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSavingChanges(false);
    }
  };

  // Handle setting active semester
  const handleSetActiveSemester = async (semesterId) => {
    try {
      setSavingChanges(true);
      await updateActiveSemester(semesterId);
      
      // Update local state
      setSemesters(semesters.map(sem => ({
        ...sem,
        status: sem.id === semesterId ? 'active' : 'inactive'
      })));
      
      setActiveSemesterId(semesterId);
      setSuccessMessage('Active semester updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error updating active semester:', error);
      setError('Failed to update active semester. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSavingChanges(false);
    }
  };

  // Check if a semester number is already in the list
  const isSemesterInList = (semesterNumber) => {
    return semesters.some(sem => sem.name === `Semester ${semesterNumber}`);
  };

  // Toggle the semester guide display
  const toggleSemesterGuide = () => {
    setShowSemesterGuide(!showSemesterGuide);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Semester Settings</h1>
      
      {/* Current Period Info */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-700">
              Current Period: {currentPeriod === 'odd' ? 'July to December (Odd Semesters)' : 'January to May (Even Semesters)'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Available semester numbers for this period: {availableSemesters.join(', ')}
            </p>
          </div>
          <button 
            onClick={toggleSemesterGuide}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <FiInfo className="mr-1" /> Info
          </button>
        </div>
        
        {showSemesterGuide && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
            <p className="font-medium text-blue-700 mb-1">How semesters work:</p>
            <ul className="list-disc pl-5 space-y-1 text-blue-700">
              <li>From July to December: Odd semester period (1, 3, 5, 7)</li>
              <li>From January to May: Even semester period (2, 4, 6, 8)</li>
              <li>June is a transition period before the odd semester begins</li>
            </ul>
          </div>
        )}
      </div>
      
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg flex items-center">
          <FiCheck className="mr-2" />
          {successMessage}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-center">
          <FiAlertCircle className="mr-2" />
          {error}
        </div>
      )}
      
      {/* Quick Add Current Period Semesters */}
      <div className="mb-6 bg-white p-5 rounded-lg shadow-sm">
        <h2 className="text-lg font-medium text-gray-700 mb-3">Quick Add Current Period Semesters</h2>
        <div className="flex flex-wrap gap-2">
          {availableSemesters.map(semNum => (
            <button
              key={semNum}
              onClick={() => handleQuickAddSemester(semNum)}
              disabled={isSemesterInList(semNum) || savingChanges}
              className={`px-3 py-2 rounded-lg flex items-center ${
                isSemesterInList(semNum)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              <FiCalendar className="mr-2" />
              Semester {semNum}
              {isSemesterInList(semNum) && <span className="ml-1 text-xs">(exists)</span>}
            </button>
          ))}
        </div>
      </div>
      
      {/* Add New Semester Form */}
      <div className="mb-8 bg-white p-5 rounded-lg shadow-sm">
        <h2 className="text-lg font-medium text-gray-700 mb-4">Add Custom Semester</h2>
        
        <form onSubmit={handleAddSemester} className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={newSemester}
              onChange={(e) => setNewSemester(e.target.value)}
              placeholder="Enter semester name (e.g. Fall 2025)"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={savingChanges}
            />
          </div>
          
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!newSemester.trim() || savingChanges}
          >
            <FiPlus size={18} />
            <span>Add Semester</span>
          </button>
        </form>
      </div>
      
      {/* Semesters List */}
      <div className="bg-white p-5 rounded-lg shadow-sm">
        <h2 className="text-lg font-medium text-gray-700 mb-4">Manage Semesters</h2>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-3 text-gray-600">Loading semesters...</p>
          </div>
        ) : semesters.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FiCalendar className="mx-auto text-4xl mb-3 text-gray-400" />
            <p>No semesters found. Add your first semester above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester Name</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {semesters.map((semester) => {
                  // Determine if semester is odd or even
                  const semesterNumber = parseInt(semester.name.replace(/\D/g, ''));
                  const semesterType = !isNaN(semesterNumber) && semesterNumber % 2 === 1 ? 'Odd' : 'Even';
                  
                  return (
                    <tr key={semester.id}>
                      <td className="py-3 px-4">
                        {editingSemester?.id === semester.id ? (
                          <input
                            type="text"
                            value={editingSemester.newName}
                            onChange={(e) => setEditingSemester({...editingSemester, newName: e.target.value})}
                            className="w-full px-3 py-1 rounded border"
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium">{semester.name}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <span 
                            className={`inline-block w-3 h-3 rounded-full mr-2 ${semester.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`}
                          ></span>
                          <span>{semester.status === 'active' ? 'Active' : 'Inactive'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {!isNaN(semesterNumber) ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            semesterType === 'Odd' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {semesterType}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {editingSemester?.id === semester.id ? (
                            <>
                              <button
                                onClick={handleUpdateSemester}
                                className="p-1 text-green-600 hover:text-green-800 transition"
                              >
                                <FiSave size={18} />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1 text-gray-600 hover:text-gray-800 transition"
                              >
                                <FiX size={18} />
                              </button>
                            </>
                          ) : (
                            <>
                              {semester.status !== 'active' ? (
                                <button
                                  onClick={() => handleSetActiveSemester(semester.id)}
                                  className="p-1 text-blue-600 hover:text-blue-800 transition"
                                  disabled={savingChanges}
                                >
                                  <span className="flex items-center gap-1">
                                    <FiCheck size={18} /> 
                                    <span className="text-sm">Set Active</span>
                                  </span>
                                </button>
                              ) : (
                                <span className="p-1 text-green-600 flex items-center gap-1">
                                  <FiCheck size={18} /> 
                                  <span className="text-sm font-medium">Active</span>
                                </span>
                              )}
                              <button
                                onClick={() => handleStartEdit(semester)}
                                className="p-1 text-amber-600 hover:text-amber-800 transition"
                                disabled={savingChanges}
                              >
                                <FiEdit2 size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteSemester(semester.id)}
                                className="p-1 text-red-600 hover:text-red-800 transition"
                                disabled={savingChanges || semester.status === 'active'}
                              >
                                <FiTrash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-700 mb-1">About Semester Settings</h3>
          <p className="text-sm text-blue-600">
            The active semester will be used as the default selection across the entire platform.
            All departments, faculty, and timetable builders will see the active semester by default.
            You cannot delete the currently active semester.
          </p>
        </div>
      </div>
    </div>
  );
}
