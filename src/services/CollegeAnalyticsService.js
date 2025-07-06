import { getCollegeById, getCollegeStats } from '../components/SuperAdmin/services/CollegeManagement';

/**
 * College Analytics Service
 * Provides analytics and metrics for individual colleges and overall university
 */

/**
 * Get analytics for a specific college
 * @param {string} collegeId - College ID
 * @returns {Promise<Object>} College analytics data
 */
export const getCollegeAnalytics = async (collegeId) => {
  try {
    const college = await getCollegeById(collegeId);
    if (!college) {
      throw new Error('College not found');
    }

    // Mock analytics data - in real app, this would come from various collections
    const analytics = {
      college: college,
      departments: {
        total: getDepartmentCountByType(college.type),
        active: getDepartmentCountByType(college.type) - 1
      },
      faculty: {
        total: getFacultyCountByType(college.type),
        active: getFacultyCountByType(college.type) - 2,
        onLeave: 2
      },
      students: {
        total: getStudentCountByType(college.type),
        undergraduate: Math.floor(getStudentCountByType(college.type) * 0.7),
        postgraduate: Math.floor(getStudentCountByType(college.type) * 0.25),
        phd: Math.floor(getStudentCountByType(college.type) * 0.05)
      },
      courses: {
        total: getCourseCountByType(college.type),
        active: getCourseCountByType(college.type) - 3,
        pending: 3
      },
      rooms: {
        total: getRoomCountByType(college.type),
        occupied: Math.floor(getRoomCountByType(college.type) * 0.6),
        available: Math.floor(getRoomCountByType(college.type) * 0.4)
      },
      budget: {
        allocated: getBudgetByType(college.type),
        utilized: getBudgetByType(college.type) * 0.75,
        remaining: getBudgetByType(college.type) * 0.25
      },
      performance: {
        academicRating: getAcademicRating(college.type),
        researchOutput: getResearchOutput(college.type),
        placementRate: getPlacementRate(college.type)
      }
    };

    return analytics;
  } catch (error) {
    console.error('Error getting college analytics:', error);
    return null;
  }
};

/**
 * Get university-wide analytics
 * @returns {Promise<Object>} University analytics data
 */
export const getUniversityAnalytics = async () => {
  try {
    const collegeStats = await getCollegeStats();
    
    const analytics = {
      overview: {
        totalColleges: collegeStats.totalColleges,
        totalDepartments: collegeStats.totalDepartments,
        totalFaculty: collegeStats.totalFaculty,
        totalStudents: collegeStats.totalFaculty * 50, // Estimated student count
        totalCourses: collegeStats.totalDepartments * 15 // Estimated course count
      },
      collegeBreakdown: collegeStats.collegesByType,
      statusBreakdown: collegeStats.collegesByStatus,
      academicYear: {
        current: '2024-25',
        semesters: 2,
        activeSemester: 'Odd Semester',
        semesterProgress: 65
      },
      facilities: {
        totalRooms: 450,
        laboratories: 85,
        libraries: 6,
        hostels: 12,
        playgrounds: 8
      },
      research: {
        ongoingProjects: 124,
        completedProjects: 89,
        publications: 256,
        patents: 23
      }
    };

    return analytics;
  } catch (error) {
    console.error('Error getting university analytics:', error);
    return null;
  }
};

/**
 * Get comparative analytics between colleges
 * @param {Array} collegeIds - Array of college IDs to compare
 * @returns {Promise<Object>} Comparative analytics data
 */
export const getComparativeAnalytics = async (collegeIds) => {
  try {
    const comparisons = [];
    
    for (const collegeId of collegeIds) {
      const analytics = await getCollegeAnalytics(collegeId);
      if (analytics) {
        comparisons.push({
          college: analytics.college,
          metrics: {
            departments: analytics.departments.total,
            faculty: analytics.faculty.total,
            students: analytics.students.total,
            courses: analytics.courses.total,
            performance: analytics.performance.academicRating
          }
        });
      }
    }
    
    return {
      comparisons,
      summary: {
        totalColleges: comparisons.length,
        avgDepartments: Math.round(comparisons.reduce((sum, c) => sum + c.metrics.departments, 0) / comparisons.length),
        avgFaculty: Math.round(comparisons.reduce((sum, c) => sum + c.metrics.faculty, 0) / comparisons.length),
        avgStudents: Math.round(comparisons.reduce((sum, c) => sum + c.metrics.students, 0) / comparisons.length),
        avgCourses: Math.round(comparisons.reduce((sum, c) => sum + c.metrics.courses, 0) / comparisons.length)
      }
    };
  } catch (error) {
    console.error('Error getting comparative analytics:', error);
    return null;
  }
};

// Helper functions for mock data calculation
function getDepartmentCountByType(type) {
  const counts = {
    'Faculty': 12,
    'College': 8,
    'School': 6,
    'Institute': 10,
    'Department': 1
  };
  return counts[type] || 5;
}

function getFacultyCountByType(type) {
  const counts = {
    'Faculty': 85,
    'College': 45,
    'School': 25,
    'Institute': 65,
    'Department': 15
  };
  return counts[type] || 30;
}

function getStudentCountByType(type) {
  const counts = {
    'Faculty': 2500,
    'College': 1200,
    'School': 800,
    'Institute': 1800,
    'Department': 400
  };
  return counts[type] || 1000;
}

function getCourseCountByType(type) {
  const counts = {
    'Faculty': 120,
    'College': 80,
    'School': 45,
    'Institute': 95,
    'Department': 25
  };
  return counts[type] || 50;
}

function getRoomCountByType(type) {
  const counts = {
    'Faculty': 85,
    'College': 45,
    'School': 25,
    'Institute': 65,
    'Department': 15
  };
  return counts[type] || 30;
}

function getBudgetByType(type) {
  const budgets = {
    'Faculty': 5000000,
    'College': 2500000,
    'School': 1500000,
    'Institute': 4000000,
    'Department': 800000
  };
  return budgets[type] || 2000000;
}

function getAcademicRating(type) {
  const ratings = {
    'Faculty': 4.2,
    'College': 3.8,
    'School': 3.9,
    'Institute': 4.0,
    'Department': 3.7
  };
  return ratings[type] || 3.5;
}

function getResearchOutput(type) {
  const outputs = {
    'Faculty': 85,
    'College': 45,
    'School': 25,
    'Institute': 65,
    'Department': 15
  };
  return outputs[type] || 30;
}

function getPlacementRate(type) {
  const rates = {
    'Faculty': 92,
    'College': 78,
    'School': 65,
    'Institute': 85,
    'Department': 70
  };
  return rates[type] || 75;
}

export default {
  getCollegeAnalytics,
  getUniversityAnalytics,
  getComparativeAnalytics
};
