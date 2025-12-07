/**
 * Tab Management Operations
 * Handles multiple timetable tabs and their state
 */

import { initializeEmptyTimetable } from './timetableOperations.js';

/**
 * Handle tab management operations
 */
export const tabOperations = {
  /**
   * Create a new tab with enhanced configuration
   * @param {number} nextTabId - Next available tab ID
   * @param {Object} initialData - Initial timetable data
   * @param {Object} defaultRoom - Default room for the tab
   * @returns {Object} New tab configuration
   */
  createNewTab: (nextTabId, initialData, defaultRoom = null) => {
    return {
      newTab: {
        id: nextTabId,
        name: `New Timetable ${nextTabId}`,
        isActive: true,
        createdAt: new Date().toISOString(),
        isModified: false
      },
      initialData,
      tabConfig: {
        selectedBranch: '',
        selectedBatch: '',
        selectedType: '',
        selectedDepartment: null,
        selectedFaculty: null,
        selectedRoom: defaultRoom
      }
    };
  },

  /**
   * Switch active tab and ensure state consistency
   * @param {Array} tabs - Current tabs array
   * @param {number} targetTabId - Target tab ID
   * @returns {Array} Updated tabs array
   */
  switchTab: (tabs, targetTabId) => {
    return tabs.map(tab => ({
      ...tab,
      isActive: tab.id === targetTabId,
      lastAccessed: tab.id === targetTabId ? new Date().toISOString() : tab.lastAccessed
    }));
  },

  /**
   * Close a tab and clean up data
   * @param {Array} tabs - Current tabs array
   * @param {number} tabId - Tab ID to close
   * @param {number} activeTabId - Currently active tab ID
   * @returns {Object} Updated state data
   */
  closeTab: (tabs, tabId, activeTabId) => {
    if (tabs.length === 1) {
      return null; // Don't close if it's the only tab
    }

    const updatedTabs = tabs.filter(tab => tab.id !== tabId);
    let newActiveTabId = activeTabId;

    // If closing the active tab, switch to another tab
    if (tabId === activeTabId) {
      const activeIndex = tabs.findIndex(tab => tab.id === activeTabId);
      const newActiveIndex = activeIndex === 0 ? 1 : activeIndex - 1;
      newActiveTabId = tabs[newActiveIndex].id;
    }

    return {
      tabs: updatedTabs,
      newActiveTabId
    };
  },

  /**
   * Rename a tab
   * @param {Array} tabs - Current tabs array
   * @param {number} tabId - Tab ID to rename
   * @param {string} newName - New tab name
   * @returns {Array} Updated tabs array
   */
  renameTab: (tabs, tabId, newName) => {
    return tabs.map(tab => 
      tab.id === tabId 
        ? { ...tab, name: newName }
        : tab
    );
  },

  /**
   * Duplicate a tab
   * @param {Array} tabs - Current tabs array
   * @param {number} sourceTabId - Source tab ID to duplicate
   * @param {number} newTabId - New tab ID
   * @param {Object} timetableData - Timetable data to copy
   * @returns {Object} Updated state with new tab
   */
  duplicateTab: (tabs, sourceTabId, newTabId, timetableData) => {
    const sourceTab = tabs.find(tab => tab.id === sourceTabId);
    if (!sourceTab) {
      return { tabs, newTab: null };
    }

    const newTab = {
      id: newTabId,
      name: `${sourceTab.name} (Copy)`,
      isActive: false
    };

    const updatedTabs = [...tabs, newTab];

    return {
      tabs: updatedTabs,
      newTab,
      copiedData: timetableData
    };
  },

  /**
   * Get tab by ID
   * @param {Array} tabs - Current tabs array
   * @param {number} tabId - Tab ID to find
   * @returns {Object|null} Tab object or null if not found
   */
  getTabById: (tabs, tabId) => {
    return tabs.find(tab => tab.id === tabId) || null;
  },

  /**
   * Get active tab
   * @param {Array} tabs - Current tabs array
   * @returns {Object|null} Active tab object or null if none active
   */
  getActiveTab: (tabs) => {
    return tabs.find(tab => tab.isActive) || null;
  },

  /**
   * Set tab as modified/dirty
   * @param {Array} tabs - Current tabs array
   * @param {number} tabId - Tab ID to mark as modified
   * @param {boolean} isModified - Whether tab is modified
   * @returns {Array} Updated tabs array
   */
  setTabModified: (tabs, tabId, isModified = true) => {
    return tabs.map(tab => 
      tab.id === tabId 
        ? { ...tab, isModified }
        : tab
    );
  },

  /**
   * Check if any tabs have unsaved changes
   * @param {Array} tabs - Current tabs array
   * @returns {boolean} True if any tab has unsaved changes
   */
  hasUnsavedChanges: (tabs) => {
    return tabs.some(tab => tab.isModified);
  },

  /**
   * Get tabs with unsaved changes
   * @param {Array} tabs - Current tabs array
   * @returns {Array} Array of tabs with unsaved changes
   */
  getModifiedTabs: (tabs) => {
    return tabs.filter(tab => tab.isModified);
  },

  /**
   * Save tab state
   * @param {Array} tabs - Current tabs array
   * @param {number} tabId - Tab ID to save
   * @param {Object} saveData - Data to associate with save
   * @returns {Array} Updated tabs array
   */
  saveTab: (tabs, tabId, saveData = {}) => {
    return tabs.map(tab => 
      tab.id === tabId 
        ? { 
            ...tab, 
            isModified: false,
            lastSaved: new Date().toISOString(),
            saveData 
          }
        : tab
    );
  },

  /**
   * Auto-save tab names to localStorage
   * @param {Array} tabs - Current tabs array
   */
  autoSaveTabNames: (tabs) => {
    try {
      const tabNames = tabs.map(tab => ({
        id: tab.id,
        name: tab.name,
        isActive: tab.isActive
      }));
      localStorage.setItem('timetable_tab_names', JSON.stringify(tabNames));
    } catch (error) {
      console.warn('Failed to auto-save tab names:', error);
    }
  },

  /**
   * Load tab names from localStorage
   * @returns {Array} Array of saved tab configurations
   */
  loadSavedTabNames: () => {
    try {
      const saved = localStorage.getItem('timetable_tab_names');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.warn('Failed to load saved tab names:', error);
      return [];
    }
  },

  /**
   * Clear saved tab data
   */
  clearSavedTabs: () => {
    try {
      localStorage.removeItem('timetable_tab_names');
    } catch (error) {
      console.warn('Failed to clear saved tab data:', error);
    }
  }
};

/**
 * Create new tab
 * @param {number} tabId - Tab ID
 * @param {string} tabName - Tab name
 * @returns {Object} New tab object
 */
export const createTab = (tabId, tabName = `Timetable ${tabId}`) => {
  return {
    id: tabId,
    name: tabName,
    isActive: false,
    isModified: false,
    createdAt: new Date().toISOString(),
    data: initializeEmptyTimetable()
  };
};

/**
 * Update tabs when switching
 * @param {Array} tabs - Current tabs
 * @param {number} activeTabId - ID of active tab
 * @returns {Array} Updated tabs
 */
export const updateTabsOnSwitch = (tabs, activeTabId) => {
  return tabs.map(tab => ({
    ...tab,
    isActive: tab.id === activeTabId
  }));
};

/**
 * Validate tab operations
 */
export const tabValidator = {
  /**
   * Check if tab name is valid
   * @param {string} name - Tab name to validate
   * @param {Array} existingTabs - Existing tabs to check against
   * @param {number} excludeTabId - Tab ID to exclude from duplicate check
   * @returns {Object} Validation result
   */
  validateTabName: (name, existingTabs = [], excludeTabId = null) => {
    if (!name || name.trim().length === 0) {
      return {
        isValid: false,
        message: 'Tab name cannot be empty'
      };
    }

    if (name.trim().length > 50) {
      return {
        isValid: false,
        message: 'Tab name must be 50 characters or less'
      };
    }

    const isDuplicate = existingTabs.some(tab => 
      tab.name.toLowerCase() === name.toLowerCase() && 
      tab.id !== excludeTabId
    );

    if (isDuplicate) {
      return {
        isValid: false,
        message: 'Tab name already exists'
      };
    }

    return {
      isValid: true,
      message: 'Tab name is valid'
    };
  },

  /**
   * Check if tab can be closed
   * @param {Object} tab - Tab to check
   * @param {Array} allTabs - All tabs
   * @returns {Object} Validation result
   */
  canCloseTab: (tab, allTabs) => {
    if (allTabs.length === 1) {
      return {
        canClose: false,
        message: 'Cannot close the last remaining tab'
      };
    }

    if (tab.isModified) {
      return {
        canClose: true,
        requiresConfirmation: true,
        message: 'Tab has unsaved changes. Are you sure you want to close it?'
      };
    }

    return {
      canClose: true,
      requiresConfirmation: false,
      message: 'Tab can be closed safely'
    };
  },

  /**
   * Validate tab state before switching
   * @param {Object} currentTab - Current tab
   * @param {Object} targetTab - Target tab
   * @returns {Object} Validation result
   */
  validateTabSwitch: (currentTab, targetTab) => {
    if (!targetTab) {
      return {
        canSwitch: false,
        message: 'Target tab does not exist'
      };
    }

    if (currentTab && currentTab.isModified) {
      return {
        canSwitch: true,
        requiresConfirmation: true,
        message: 'Current tab has unsaved changes. Switch anyway?'
      };
    }

    return {
      canSwitch: true,
      requiresConfirmation: false,
      message: 'Can switch tabs safely'
    };
  },

  /**
   * Get tab display information
   * @param {Object} tab - Tab object
   * @returns {Object} Display information
   */
  getTabDisplayInfo: (tab) => {
    const displayName = tab.isModified ? `${tab.name} *` : tab.name;
    const tooltip = tab.isModified 
      ? `${tab.name} (modified)` 
      : tab.name;
    
    return {
      displayName,
      tooltip,
      hasChanges: tab.isModified,
      canClose: true // This would be determined by other factors
    };
  },

  /**
   * Bulk operations for tabs
   */
  bulkOperations: {
    /**
     * Close all tabs except the specified one
     * @param {Array} tabs - Current tabs array
     * @param {number} keepTabId - Tab ID to keep open
     * @returns {Array} Updated tabs array
     */
    closeAllExcept: (tabs, keepTabId) => {
      return tabs.filter(tab => tab.id === keepTabId);
    },

    /**
     * Save all modified tabs
     * @param {Array} tabs - Current tabs array
     * @returns {Array} Updated tabs array
     */
    saveAllModified: (tabs) => {
      return tabs.map(tab => 
        tab.isModified 
          ? { 
              ...tab, 
              isModified: false,
              lastSaved: new Date().toISOString()
            }
          : tab
      );
    },

    /**
     * Mark all tabs as unmodified
     * @param {Array} tabs - Current tabs array
     * @returns {Array} Updated tabs array
     */
    markAllSaved: (tabs) => {
      return tabs.map(tab => ({ ...tab, isModified: false }));
    }
  }
};
