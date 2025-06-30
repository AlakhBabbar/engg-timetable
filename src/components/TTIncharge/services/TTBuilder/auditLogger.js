/**
 * Audit Logging and Monitoring System
 * Comprehensive logging for timetable operations and user actions
 */

import { CONFIG } from './constants.js';

/**
 * Comprehensive logging and audit trail system
 */
export const auditLogger = {
  /**
   * Log timetable actions for audit trail
   */
  logAction: (action, details) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      details,
      user: 'current_user', // Replace with actual user context
      sessionId: window.sessionStorage.getItem('sessionId') || 'unknown',
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.log('AUDIT LOG:', logEntry);
    
    // Store in local storage for now (in production, send to server)
    try {
      const existingLogs = JSON.parse(localStorage.getItem('timetable_audit_logs') || '[]');
      existingLogs.push(logEntry);
      
      // Keep only last MAX_AUDIT_LOGS entries to prevent storage overflow
      if (existingLogs.length > CONFIG.MAX_AUDIT_LOGS) {
        existingLogs.splice(0, existingLogs.length - CONFIG.MAX_AUDIT_LOGS);
      }
      
      localStorage.setItem('timetable_audit_logs', JSON.stringify(existingLogs));
    } catch (error) {
      console.error('Failed to store audit log:', error);
    }
    
    return logEntry;
  },

  /**
   * Get audit logs for a specific date range
   */
  getLogs: (startDate, endDate) => {
    try {
      const logs = JSON.parse(localStorage.getItem('timetable_audit_logs') || '[]');
      if (!startDate && !endDate) return logs;
      
      return logs.filter(log => {
        const logDate = new Date(log.timestamp);
        if (startDate && logDate < new Date(startDate)) return false;
        if (endDate && logDate > new Date(endDate)) return false;
        return true;
      });
    } catch (error) {
      console.error('Failed to retrieve audit logs:', error);
      return [];
    }
  },

  /**
   * Clear audit logs (admin only)
   */
  clearLogs: () => {
    try {
      localStorage.removeItem('timetable_audit_logs');
      console.log('Audit logs cleared');
    } catch (error) {
      console.error('Failed to clear audit logs:', error);
    }
  },

  /**
   * Get audit log statistics
   */
  getStatistics: () => {
    try {
      const logs = JSON.parse(localStorage.getItem('timetable_audit_logs') || '[]');
      
      const stats = {
        totalLogs: logs.length,
        actionTypes: {},
        userActions: {},
        dateRange: null,
        recentActivity: []
      };

      logs.forEach(log => {
        // Count action types
        stats.actionTypes[log.action] = (stats.actionTypes[log.action] || 0) + 1;
        
        // Count user actions
        stats.userActions[log.user] = (stats.userActions[log.user] || 0) + 1;
      });

      // Get date range
      if (logs.length > 0) {
        const dates = logs.map(log => new Date(log.timestamp)).sort();
        stats.dateRange = {
          earliest: dates[0].toISOString(),
          latest: dates[dates.length - 1].toISOString()
        };
      }

      // Get recent activity (last 10 actions)
      stats.recentActivity = logs.slice(-10).reverse();

      return stats;
    } catch (error) {
      console.error('Failed to generate audit statistics:', error);
      return { totalLogs: 0, error: error.message };
    }
  },

  /**
   * Export audit logs to various formats
   */
  exportLogs: (format = 'json', startDate = null, endDate = null) => {
    const logs = auditLogger.getLogs(startDate, endDate);
    
    switch (format.toLowerCase()) {
      case 'csv':
        return auditLogger.exportToCSV(logs);
      case 'txt':
        return auditLogger.exportToText(logs);
      case 'json':
      default:
        return JSON.stringify(logs, null, 2);
    }
  },

  /**
   * Export logs to CSV format
   */
  exportToCSV: (logs) => {
    if (logs.length === 0) return 'No logs to export';
    
    const headers = ['timestamp', 'action', 'user', 'sessionId', 'details'];
    const csvData = [headers.join(',')];
    
    logs.forEach(log => {
      const row = [
        log.timestamp,
        log.action,
        log.user,
        log.sessionId,
        JSON.stringify(log.details).replace(/"/g, '""') // Escape quotes
      ];
      csvData.push(row.map(field => `"${field}"`).join(','));
    });
    
    return csvData.join('\n');
  },

  /**
   * Export logs to text format
   */
  exportToText: (logs) => {
    if (logs.length === 0) return 'No logs to export';
    
    return logs.map(log => {
      return `[${log.timestamp}] ${log.action} by ${log.user} (Session: ${log.sessionId})\n` +
             `Details: ${JSON.stringify(log.details, null, 2)}\n` +
             '---\n';
    }).join('\n');
  },

  /**
   * Search logs by criteria
   */
  searchLogs: (criteria) => {
    const logs = auditLogger.getLogs();
    const {
      action,
      user,
      sessionId,
      startDate,
      endDate,
      searchText
    } = criteria;
    
    return logs.filter(log => {
      // Filter by action
      if (action && log.action !== action) return false;
      
      // Filter by user
      if (user && log.user !== user) return false;
      
      // Filter by session
      if (sessionId && log.sessionId !== sessionId) return false;
      
      // Filter by date range
      const logDate = new Date(log.timestamp);
      if (startDate && logDate < new Date(startDate)) return false;
      if (endDate && logDate > new Date(endDate)) return false;
      
      // Filter by search text
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const logText = JSON.stringify(log).toLowerCase();
        if (!logText.includes(searchLower)) return false;
      }
      
      return true;
    });
  },

  /**
   * Monitor for suspicious activity
   */
  detectAnomalies: () => {
    const logs = auditLogger.getLogs();
    const anomalies = [];
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    // Check for rapid-fire actions (more than 50 actions in an hour)
    const recentLogs = logs.filter(log => 
      now - new Date(log.timestamp).getTime() < oneHour
    );
    
    if (recentLogs.length > 50) {
      anomalies.push({
        type: 'high_activity',
        severity: 'warning',
        message: `${recentLogs.length} actions in the last hour`,
        data: { actionCount: recentLogs.length, timeWindow: 'hour' }
      });
    }
    
    // Check for repeated failed actions
    const failedActions = logs.filter(log => 
      log.details?.success === false ||
      log.details?.error ||
      log.action.includes('failed')
    );
    
    if (failedActions.length > 10) {
      anomalies.push({
        type: 'repeated_failures',
        severity: 'error',
        message: `${failedActions.length} failed actions detected`,
        data: { failureCount: failedActions.length }
      });
    }
    
    // Check for unusual time patterns (actions outside business hours)
    const businessHours = { start: 8, end: 18 }; // 8 AM to 6 PM
    const offHoursActions = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      const hour = logDate.getHours();
      return hour < businessHours.start || hour > businessHours.end;
    });
    
    if (offHoursActions.length > 20) {
      anomalies.push({
        type: 'off_hours_activity',
        severity: 'info',
        message: `${offHoursActions.length} actions outside business hours`,
        data: { offHoursCount: offHoursActions.length, businessHours }
      });
    }
    
    return anomalies;
  }
};

/**
 * Action type constants for consistent logging
 */
export const AUDIT_ACTIONS = {
  // Timetable operations
  COURSE_ADD: 'course_add',
  COURSE_REMOVE: 'course_remove',
  COURSE_MOVE: 'course_move',
  COURSE_UPDATE: 'course_update',
  
  // Room operations
  ROOM_ASSIGN: 'room_assign',
  ROOM_CHANGE: 'room_change',
  ROOM_REMOVE: 'room_remove',
  
  // Faculty operations
  FACULTY_ASSIGN: 'faculty_assign',
  FACULTY_CHANGE: 'faculty_change',
  FACULTY_REMOVE: 'faculty_remove',
  
  // Batch operations
  BATCH_CREATE: 'batch_create',
  BATCH_UPDATE: 'batch_update',
  BATCH_DELETE: 'batch_delete',
  
  // Data operations
  DATA_IMPORT: 'data_import',
  DATA_EXPORT: 'data_export',
  DATA_BACKUP: 'data_backup',
  DATA_RESTORE: 'data_restore',
  
  // System operations
  SYSTEM_LOGIN: 'system_login',
  SYSTEM_LOGOUT: 'system_logout',
  SYSTEM_ERROR: 'system_error',
  SYSTEM_WARNING: 'system_warning',
  
  // Tab operations
  TAB_CREATE: 'tab_create',
  TAB_SWITCH: 'tab_switch',
  TAB_CLOSE: 'tab_close',
  TAB_RENAME: 'tab_rename',
  
  // Conflict operations
  CONFLICT_DETECTED: 'conflict_detected',
  CONFLICT_RESOLVED: 'conflict_resolved',
  CONFLICT_IGNORED: 'conflict_ignored',
  
  // Settings operations
  SETTINGS_UPDATE: 'settings_update',
  PREFERENCES_CHANGE: 'preferences_change'
};

/**
 * Performance logging for operations
 */
export const performanceLogger = {
  /**
   * Log performance metrics
   */
  logPerformance: (operation, metrics) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      metrics: {
        duration: metrics.duration || 0,
        memoryUsage: metrics.memoryUsage || 0,
        success: metrics.success !== false,
        errorMessage: metrics.errorMessage || null
      },
      system: {
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        availableMemory: navigator.deviceMemory || 'unknown',
        connectionType: navigator.connection?.effectiveType || 'unknown'
      }
    };
    
    // Store performance logs separately
    try {
      const existingLogs = JSON.parse(localStorage.getItem('timetable_performance_logs') || '[]');
      existingLogs.push(logEntry);
      
      // Keep only last 500 performance logs
      if (existingLogs.length > 500) {
        existingLogs.splice(0, existingLogs.length - 500);
      }
      
      localStorage.setItem('timetable_performance_logs', JSON.stringify(existingLogs));
    } catch (error) {
      console.error('Failed to store performance log:', error);
    }
    
    return logEntry;
  },

  /**
   * Get performance statistics
   */
  getPerformanceStats: () => {
    try {
      const logs = JSON.parse(localStorage.getItem('timetable_performance_logs') || '[]');
      
      if (logs.length === 0) {
        return { totalOperations: 0, message: 'No performance data available' };
      }
      
      const durations = logs.map(log => log.metrics.duration).filter(d => d > 0);
      const memoryUsages = logs.map(log => log.metrics.memoryUsage).filter(m => m > 0);
      const successCount = logs.filter(log => log.metrics.success).length;
      
      return {
        totalOperations: logs.length,
        successRate: (successCount / logs.length) * 100,
        averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
        minDuration: durations.length > 0 ? Math.min(...durations) : 0,
        maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
        averageMemoryUsage: memoryUsages.length > 0 ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length : 0,
        operationCounts: logs.reduce((counts, log) => {
          counts[log.operation] = (counts[log.operation] || 0) + 1;
          return counts;
        }, {}),
        timeRange: {
          start: logs[0]?.timestamp,
          end: logs[logs.length - 1]?.timestamp
        }
      };
    } catch (error) {
      console.error('Failed to get performance statistics:', error);
      return { error: error.message };
    }
  },

  /**
   * Clear performance logs
   */
  clearPerformanceLogs: () => {
    try {
      localStorage.removeItem('timetable_performance_logs');
      console.log('Performance logs cleared');
    } catch (error) {
      console.error('Failed to clear performance logs:', error);
    }
  }
};

/**
 * Error logging and reporting
 */
export const errorLogger = {
  /**
   * Log application errors
   */
  logError: (error, context = {}) => {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: window.sessionStorage.getItem('sessionId') || 'unknown'
    };
    
    console.error('ERROR LOG:', errorEntry);
    
    // Store error logs
    try {
      const existingLogs = JSON.parse(localStorage.getItem('timetable_error_logs') || '[]');
      existingLogs.push(errorEntry);
      
      // Keep only last 100 error logs
      if (existingLogs.length > 100) {
        existingLogs.splice(0, existingLogs.length - 100);
      }
      
      localStorage.setItem('timetable_error_logs', JSON.stringify(existingLogs));
    } catch (storageError) {
      console.error('Failed to store error log:', storageError);
    }
    
    // Also log to audit trail
    auditLogger.logAction(AUDIT_ACTIONS.SYSTEM_ERROR, {
      errorType: error.name,
      errorMessage: error.message,
      context
    });
    
    return errorEntry;
  },

  /**
   * Get error statistics
   */
  getErrorStats: () => {
    try {
      const logs = JSON.parse(localStorage.getItem('timetable_error_logs') || '[]');
      
      return {
        totalErrors: logs.length,
        errorTypes: logs.reduce((types, log) => {
          types[log.error.name] = (types[log.error.name] || 0) + 1;
          return types;
        }, {}),
        recentErrors: logs.slice(-10).reverse(),
        timeRange: logs.length > 0 ? {
          start: logs[0]?.timestamp,
          end: logs[logs.length - 1]?.timestamp
        } : null
      };
    } catch (error) {
      console.error('Failed to get error statistics:', error);
      return { error: error.message };
    }
  },

  /**
   * Clear error logs
   */
  clearErrorLogs: () => {
    try {
      localStorage.removeItem('timetable_error_logs');
      console.log('Error logs cleared');
    } catch (error) {
      console.error('Failed to clear error logs:', error);
    }
  }
};
