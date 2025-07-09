import React from 'react';
import { FiAlertTriangle, FiUser, FiMapPin, FiExternalLink } from 'react-icons/fi';

/**
 * Conflict Warning Component
 * Displays teacher and room conflicts in the right panel
 */
const ConflictWarning = ({ 
  teacherConflicts = [], 
  roomConflicts = [], 
  onNavigateToConflict 
}) => {
  if (teacherConflicts.length === 0 && roomConflicts.length === 0) {
    return null;
  }

  const handleConflictClick = (conflict) => {
    if (onNavigateToConflict) {
      onNavigateToConflict(conflict);
    }
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <FiAlertTriangle className="text-red-600" size={20} />
        <h3 className="text-sm font-semibold text-red-800">
          Conflicts Detected
        </h3>
      </div>

      {/* Teacher Conflicts */}
      {teacherConflicts.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <FiUser className="text-red-600" size={16} />
            <h4 className="text-sm font-medium text-red-700">
              Teacher Conflicts ({teacherConflicts.length})
            </h4>
          </div>
          <div className="space-y-2">
            {teacherConflicts.map((conflict, index) => (
              <div
                key={index}
                className="bg-red-100 border border-red-200 rounded-md p-3 hover:bg-red-200 cursor-pointer transition-colors"
                onClick={() => handleConflictClick(conflict)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-red-800">
                        {conflict.teacherName} ({conflict.teacherCode})
                      </span>
                      <FiExternalLink className="text-red-600" size={12} />
                    </div>
                    <div className="text-xs text-red-700">
                      <div className="font-medium">
                        {conflict.semester} - {conflict.branch} - {conflict.batch} - {conflict.type}
                      </div>
                      <div className="mt-1">
                        {conflict.day} at {conflict.timeSlot}
                      </div>
                      <div className="mt-1 text-red-600">
                        Course: {conflict.courseCode} - {conflict.courseName}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Room Conflicts */}
      {roomConflicts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FiMapPin className="text-red-600" size={16} />
            <h4 className="text-sm font-medium text-red-700">
              Room Conflicts ({roomConflicts.length})
            </h4>
          </div>
          <div className="space-y-2">
            {roomConflicts.map((conflict, index) => (
              <div
                key={index}
                className="bg-red-100 border border-red-200 rounded-md p-3 hover:bg-red-200 cursor-pointer transition-colors"
                onClick={() => handleConflictClick(conflict)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-red-800">
                        Room {conflict.roomId} ({conflict.roomName})
                      </span>
                      <FiExternalLink className="text-red-600" size={12} />
                    </div>
                    <div className="text-xs text-red-700">
                      <div className="font-medium">
                        {conflict.semester} - {conflict.branch} - {conflict.batch} - {conflict.type}
                      </div>
                      <div className="mt-1">
                        {conflict.day} at {conflict.timeSlot}
                      </div>
                      <div className="mt-1 text-red-600">
                        Course: {conflict.courseCode} - {conflict.courseName}
                      </div>
                      <div className="mt-1 text-red-600">
                        Teacher: {conflict.teacherName} ({conflict.teacherCode})
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConflictWarning;
