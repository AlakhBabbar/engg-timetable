/**
 * History Management for Undo/Redo Functionality
 * Manages state history for timetable operations
 */

import { CONFIG } from './constants.js';
import { deepCopy } from './utils.js';

/**
 * History management for undo/redo functionality
 */
export const historyManager = {
  /**
   * Add state to history
   * @param {Array} history - Current history array
   * @param {number} historyIndex - Current history index
   * @param {Object} data - Data to add to history
   * @returns {Object} Updated history state
   */
  addToHistory: (history, historyIndex, data) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(deepCopy(data));
    
    // Limit history size to prevent memory issues
    if (newHistory.length > CONFIG.MAX_HISTORY_ENTRIES) {
      newHistory.splice(0, newHistory.length - CONFIG.MAX_HISTORY_ENTRIES);
    }
    
    return {
      history: newHistory,
      historyIndex: newHistory.length - 1
    };
  },

  /**
   * Perform undo operation
   * @param {Array} history - History array
   * @param {number} historyIndex - Current history index
   * @returns {Object|null} Previous state or null if no undo available
   */
  undo: (history, historyIndex) => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      return {
        data: deepCopy(history[newIndex]),
        historyIndex: newIndex
      };
    }
    return null;
  },

  /**
   * Perform redo operation
   * @param {Array} history - History array
   * @param {number} historyIndex - Current history index
   * @returns {Object|null} Next state or null if no redo available
   */
  redo: (history, historyIndex) => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      return {
        data: deepCopy(history[newIndex]),
        historyIndex: newIndex
      };
    }
    return null;
  },

  /**
   * Check if undo is available
   * @param {number} historyIndex - Current history index
   * @returns {boolean} True if undo is available
   */
  canUndo: (historyIndex) => {
    return historyIndex > 0;
  },

  /**
   * Check if redo is available
   * @param {Array} history - History array
   * @param {number} historyIndex - Current history index
   * @returns {boolean} True if redo is available
   */
  canRedo: (history, historyIndex) => {
    return historyIndex < history.length - 1;
  },

  /**
   * Get history summary for debugging
   * @param {Array} history - History array
   * @param {number} historyIndex - Current history index
   * @returns {Object} History summary
   */
  getHistorySummary: (history, historyIndex) => {
    return {
      totalStates: history.length,
      currentIndex: historyIndex,
      canUndo: historyManager.canUndo(historyIndex),
      canRedo: historyManager.canRedo(history, historyIndex),
      memoryUsage: JSON.stringify(history).length // Rough estimate
    };
  },

  /**
   * Clear history (useful for memory management)
   * @param {Object} currentState - Current state to preserve
   * @returns {Object} Reset history with only current state
   */
  clearHistory: (currentState) => {
    return {
      history: [deepCopy(currentState)],
      historyIndex: 0
    };
  },

  /**
   * Compress history by removing old entries
   * @param {Array} history - Current history array
   * @param {number} historyIndex - Current history index
   * @param {number} keepLast - Number of recent entries to keep
   * @returns {Object} Compressed history state
   */
  compressHistory: (history, historyIndex, keepLast = 10) => {
    if (history.length <= keepLast) {
      return { history, historyIndex };
    }

    const startIndex = Math.max(0, history.length - keepLast);
    const compressedHistory = history.slice(startIndex);
    const newIndex = Math.max(0, historyIndex - startIndex);

    return {
      history: compressedHistory,
      historyIndex: newIndex
    };
  }
};

/**
 * Action types for history tracking
 */
export const HISTORY_ACTIONS = {
  COURSE_ADD: 'course_add',
  COURSE_REMOVE: 'course_remove',
  COURSE_MOVE: 'course_move',
  ROOM_CHANGE: 'room_change',
  BATCH_CHANGE: 'batch_change',
  BULK_OPERATION: 'bulk_operation',
  IMPORT_DATA: 'import_data',
  CLEAR_ALL: 'clear_all'
};

/**
 * Enhanced history manager with action tracking
 */
export const enhancedHistoryManager = {
  /**
   * Add state to history with action metadata
   * @param {Array} history - Current history array
   * @param {number} historyIndex - Current history index
   * @param {Object} data - Data to add to history
   * @param {string} actionType - Type of action performed
   * @param {Object} metadata - Additional metadata about the action
   * @returns {Object} Updated history state
   */
  addWithAction: (history, historyIndex, data, actionType, metadata = {}) => {
    const historyEntry = {
      state: deepCopy(data),
      action: {
        type: actionType,
        timestamp: new Date().toISOString(),
        metadata
      }
    };

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(historyEntry);
    
    // Limit history size
    if (newHistory.length > CONFIG.MAX_HISTORY_ENTRIES) {
      newHistory.splice(0, newHistory.length - CONFIG.MAX_HISTORY_ENTRIES);
    }
    
    return {
      history: newHistory,
      historyIndex: newHistory.length - 1
    };
  },

  /**
   * Get action description for display
   * @param {Object} historyEntry - History entry with action metadata
   * @returns {string} Human-readable action description
   */
  getActionDescription: (historyEntry) => {
    if (!historyEntry.action) {
      return 'Unknown action';
    }

    const { type, metadata } = historyEntry.action;
    const timestamp = new Date(historyEntry.action.timestamp).toLocaleTimeString();

    switch (type) {
      case HISTORY_ACTIONS.COURSE_ADD:
        return `Added ${metadata.courseCode || 'course'} at ${timestamp}`;
      case HISTORY_ACTIONS.COURSE_REMOVE:
        return `Removed ${metadata.courseCode || 'course'} at ${timestamp}`;
      case HISTORY_ACTIONS.COURSE_MOVE:
        return `Moved ${metadata.courseCode || 'course'} from ${metadata.from} to ${metadata.to} at ${timestamp}`;
      case HISTORY_ACTIONS.ROOM_CHANGE:
        return `Changed room for ${metadata.courseCode || 'course'} at ${timestamp}`;
      case HISTORY_ACTIONS.BATCH_CHANGE:
        return `Changed batch configuration at ${timestamp}`;
      case HISTORY_ACTIONS.BULK_OPERATION:
        return `Bulk operation: ${metadata.description || 'multiple changes'} at ${timestamp}`;
      case HISTORY_ACTIONS.IMPORT_DATA:
        return `Imported timetable data at ${timestamp}`;
      case HISTORY_ACTIONS.CLEAR_ALL:
        return `Cleared all timetable data at ${timestamp}`;
      default:
        return `${type} at ${timestamp}`;
    }
  },

  /**
   * Get history timeline for UI display
   * @param {Array} history - History array with action metadata
   * @param {number} historyIndex - Current history index
   * @param {number} maxEntries - Maximum entries to return
   * @returns {Array} Timeline entries for display
   */
  getTimeline: (history, historyIndex, maxEntries = 10) => {
    const timeline = [];
    const startIndex = Math.max(0, historyIndex - maxEntries + 1);
    
    for (let i = startIndex; i <= historyIndex; i++) {
      const entry = history[i];
      if (entry) {
        timeline.push({
          index: i,
          description: enhancedHistoryManager.getActionDescription(entry),
          isCurrent: i === historyIndex,
          timestamp: entry.action?.timestamp || null
        });
      }
    }

    return timeline.reverse(); // Most recent first
  },

  /**
   * Search history by action type
   * @param {Array} history - History array
   * @param {string} actionType - Action type to search for
   * @returns {Array} Matching history entries
   */
  searchByActionType: (history, actionType) => {
    return history
      .map((entry, index) => ({ ...entry, index }))
      .filter(entry => entry.action?.type === actionType);
  },

  /**
   * Get history statistics
   * @param {Array} history - History array
   * @returns {Object} Statistics about history usage
   */
  getStatistics: (history) => {
    const stats = {
      totalActions: history.length,
      actionTypes: {},
      timeRange: null,
      memoryUsage: JSON.stringify(history).length
    };

    history.forEach(entry => {
      if (entry.action?.type) {
        stats.actionTypes[entry.action.type] = (stats.actionTypes[entry.action.type] || 0) + 1;
      }
    });

    if (history.length > 0) {
      const timestamps = history
        .map(entry => entry.action?.timestamp)
        .filter(Boolean)
        .map(ts => new Date(ts));
      
      if (timestamps.length > 0) {
        stats.timeRange = {
          start: new Date(Math.min(...timestamps)).toISOString(),
          end: new Date(Math.max(...timestamps)).toISOString()
        };
      }
    }

    return stats;
  }
};
