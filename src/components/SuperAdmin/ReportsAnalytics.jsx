import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';

// Sample data for faculty workload
const facultyWorkloadData = [
  { name: 'CSE', workload: 25 },
  { name: 'ECE', workload: 20 },
  { name: 'MECH', workload: 18 },
  { name: 'CIVIL', workload: 15 },
  { name: 'IT', workload: 22 },
];

// Sample data for room utilization
const roomUtilizationData = [
  { name: 'Occupied', value: 65 },
  { name: 'Available', value: 35 },
];

// Sample data for timetable conflicts (weekly trend)
const conflictsData = [
  { day: 'Mon', conflicts: 4 },
  { day: 'Tue', conflicts: 7 },
  { day: 'Wed', conflicts: 2 },
  { day: 'Thu', conflicts: 5 },
  { day: 'Fri', conflicts: 3 },
  { day: 'Sat', conflicts: 1 },
];

const COLORS = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'];

// Filter options
const semesters = ['Semester 7', 'Semester 6', 'Semester 5'];
const departments = ['All Departments', 'EE', 'ME', 'CE', 'FE', 'AE'];
const faculties = ['All Faculty', 'Senior Professors', 'Associate Professors', 'Assistant Professors', 'Visiting Faculty'];

export default function ReportsAnalytics() {
  const [view, setView] = useState('summary');
  const [selectedSemester, setSelectedSemester] = useState(semesters[0]);
  const [selectedDepartment, setSelectedDepartment] = useState(departments[0]);
  const [selectedFaculty, setSelectedFaculty] = useState(faculties[0]);
  const [sortOrder, setSortOrder] = useState('desc');
  const [chartData, setChartData] = useState({
    facultyWorkload: [...facultyWorkloadData],
    roomUtilization: [...roomUtilizationData],
    conflicts: [...conflictsData]
  });
  const [chartVisible, setChartVisible] = useState(false);

  // Simulate chart loading animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setChartVisible(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Handle sorting of faculty workload data
  const handleSort = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
    
    const sortedData = [...chartData.facultyWorkload].sort((a, b) => {
      return newOrder === 'asc' 
        ? a.workload - b.workload 
        : b.workload - a.workload;
    });
    
    setChartData(prev => ({
      ...prev,
      facultyWorkload: sortedData
    }));
  };

  // Filter dropdown component
  const FilterDropdown = ({ label, options, value, onChange }) => (
    <div className="relative inline-block">
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white border border-gray-200 rounded-full px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
        </svg>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView('summary')}
            className={`px-4 py-2 rounded-full border ${view === 'summary' ? 'bg-indigo-500 text-white' : 'hover:bg-gray-100'}`}
          >
            Summary
          </button>
          <button
            onClick={() => setView('detailed')}
            className={`px-4 py-2 rounded-full border ${view === 'detailed' ? 'bg-indigo-500 text-white' : 'hover:bg-gray-100'}`}
          >
            Detailed View
          </button>
        </div>
      </div>
      
      {/* Filter pills */}
      <div className="flex flex-wrap gap-3 bg-gray-50 p-4 rounded-xl">
        <span className="font-medium text-gray-600">Filters:</span>
        <FilterDropdown 
          label="Semester" 
          options={semesters} 
          value={selectedSemester} 
          onChange={setSelectedSemester} 
        />
        <FilterDropdown 
          label="Department" 
          options={departments} 
          value={selectedDepartment} 
          onChange={setSelectedDepartment} 
        />
        <FilterDropdown 
          label="Faculty Type" 
          options={faculties} 
          value={selectedFaculty} 
          onChange={setSelectedFaculty} 
        />
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 opacity-0 ${chartVisible ? 'opacity-100' : ''} transition-opacity duration-700`}>
        {/* Faculty Workload Bar Chart */}
        <div className="bg-white rounded-3xl shadow-xl p-6 hover:scale-[1.02] transition">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Faculty Workload by Department</h2>
            <button 
              onClick={handleSort}
              className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 flex items-center gap-1"
            >
              Sort {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData.facultyWorkload}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
              />
              <Legend />
              <Bar 
                dataKey="workload" 
                name="Hours per Week"
                radius={[4, 4, 0, 0]} 
                animationDuration={1500}
              >
                {chartData.facultyWorkload.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Room Utilization Pie Chart */}
        <div className="bg-white rounded-3xl shadow-xl p-6 hover:scale-[1.02] transition">
          <h2 className="font-semibold mb-4">Room Utilization</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData.roomUtilization}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label
                animationDuration={1800}
                animationBegin={300}
              >
                {chartData.roomUtilization.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Timetable Conflicts Line Chart */}
      <div className={`bg-white rounded-3xl shadow-xl p-6 hover:scale-[1.02] transition opacity-0 ${chartVisible ? 'opacity-100' : ''} transition-opacity duration-700 delay-300`}>
        <h2 className="font-semibold mb-4">Timetable Conflicts (Weekly Trend)</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData.conflicts}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="conflicts" 
              stroke="#8B5CF6" 
              strokeWidth={3}
              dot={{ r: 6, strokeWidth: 2 }}
              activeDot={{ r: 8 }}
              animationDuration={2000}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-4 justify-center mt-8">
        <button className="px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:opacity-90 transition flex items-center gap-2">
          <span>📥</span> Export as PDF
        </button>
        <button className="px-6 py-3 rounded-full border border-gray-300 hover:bg-gray-100 transition flex items-center gap-2">
          <span>📄</span> Download Excel
        </button>
        <button className="px-6 py-3 rounded-full bg-green-600 text-white hover:bg-green-700 transition flex items-center gap-2">
          <span>✈️</span> Share Report
        </button>
      </div>
    </div>
  );
}
