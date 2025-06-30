import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const TimetableIllustration = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sample timetable data
  const timeSlots = [
    '9:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '1:00 PM',
    '2:00 PM',
    '3:00 PM',
    '4:00 PM'
  ];

  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

  const sampleClasses = [
    { day: 0, time: 0, subject: 'Mathematics', room: 'LT1', color: 'bg-blue-500' },
    { day: 0, time: 1, subject: 'Ap. Physics', room: 'LT2', color: 'bg-green-500' },
    { day: 0, time: 3, subject: 'Ap. Chemistry', room: 'R1', color: 'bg-purple-500' },
    { day: 1, time: 0, subject: 'English', room: 'R2', color: 'bg-red-500' },
    { day: 1, time: 2, subject: 'GRAPHIC SCIENCE', room: 'R3', color: 'bg-indigo-500' },
    { day: 1, time: 4, subject: 'ED-I', room: 'R4', color: 'bg-yellow-500' },
    { day: 2, time: 1, subject: 'CC&CP', room: 'R5', color: 'bg-pink-500' },
    { day: 2, time: 3, subject: 'BEE', room: 'R6', color: 'bg-teal-500' },
    { day: 3, time: 0, subject: 'Thermo', room: 'R7', color: 'bg-blue-500' },
    { day: 3, time: 2, subject: 'EM-I', room: 'DH1', color: 'bg-green-500' },
    { day: 4, time: 1, subject: 'CCA', room: 'DH2', color: 'bg-orange-500' },
    { day: 4, time: 3, subject: 'Chemistry Lab', room: 'AH', color: 'bg-purple-500' },
  ];

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const cellVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  const pulseVariants = {
    initial: { scale: 1, opacity: 0.8 },
    animate: {
      scale: [1, 1.05, 1],
      opacity: [0.8, 1, 0.8],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2 lg:p-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-4 lg:mb-6"
      >
        <h3 className="text-xl lg:text-2xl font-bold text-white mb-2">
          Smart Timetable Management
        </h3>
        <p className="text-blue-200 text-xs lg:text-sm">
          Organize schedules, manage resources, track conflicts
        </p>
        <div className="text-blue-300 text-xs mt-2">
          {currentTime.toLocaleTimeString()}
        </div>
      </motion.div>

      {/* Timetable Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="bg-white/10 backdrop-blur-sm rounded-xl p-2 lg:p-4 border border-white/20 max-w-lg w-full"
      >
        {/* Days Header */}
        <div className="grid grid-cols-6 gap-1 mb-2">
          <div className="text-xs font-semibold text-blue-200 text-center py-1 lg:py-2">
            Time
          </div>
          {days.map((day, index) => (
            <motion.div
              key={day}
              variants={cellVariants}
              className="text-xs font-semibold text-blue-200 text-center py-1 lg:py-2"
            >
              {day}
            </motion.div>
          ))}
        </div>

        {/* Time Slots and Classes - Show fewer on mobile */}
        {timeSlots.slice(0, isMobile ? 6 : 8).map((time, timeIndex) => (
          <div key={time} className="grid grid-cols-6 gap-1 mb-1">
            {/* Time Column */}
            <motion.div
              variants={cellVariants}
              className="text-xs text-blue-300 text-center py-1 lg:py-2 px-1"
            >
              {time}
            </motion.div>
            
            {/* Class Cells */}
            {days.map((day, dayIndex) => {
              const classData = sampleClasses.find(
                c => c.day === dayIndex && c.time === timeIndex
              );
              
              return (
                <motion.div
                  key={`${dayIndex}-${timeIndex}`}
                  variants={cellVariants}
                  className="relative h-8 lg:h-12"
                >
                  {classData ? (
                    <motion.div
                      variants={pulseVariants}
                      initial="initial"
                      animate="animate"
                      className={`${classData.color} rounded-lg p-1 h-full flex flex-col justify-center items-center text-white cursor-pointer hover:scale-105 transition-transform`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className="text-xs font-semibold leading-tight text-center hidden lg:block">
                        {classData.subject}
                      </div>
                      <div className="text-xs font-semibold leading-tight text-center lg:hidden">
                        {classData.subject.slice(0, 4)}
                      </div>
                      <div className="text-xs opacity-80 hidden lg:block">
                        {classData.room}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="bg-white/5 rounded-lg h-full border border-white/10 hover:bg-white/10 transition-colors cursor-pointer" />
                  )}
                </motion.div>
              );
            })}
          </div>
        ))}
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-3 mt-4 lg:mt-6 text-center w-full max-w-lg"
      >
        <div className="bg-white/10 rounded-lg p-2 lg:p-3 border border-white/20">
          <div className="text-blue-300 text-xs font-semibold">Room Management</div>
          <div className="text-blue-200 text-xs mt-1">Smart allocation</div>
        </div>
        <div className="bg-white/10 rounded-lg p-2 lg:p-3 border border-white/20">
          <div className="text-green-300 text-xs font-semibold">Conflict Detection</div>
          <div className="text-green-200 text-xs mt-1">Auto resolution</div>
        </div>
        <div className="bg-white/10 rounded-lg p-2 lg:p-3 border border-white/20">
          <div className="text-purple-300 text-xs font-semibold">Faculty Load</div>
          <div className="text-purple-200 text-xs mt-1">Balanced scheduling</div>
        </div>
      </motion.div>

      {/* Floating Indicators */}
      <motion.div
        className="absolute top-4 right-4 bg-green-500 rounded-full w-3 h-3"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.7, 1, 0.7]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-4 left-4 bg-blue-500 rounded-full w-2 h-2"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.6, 1, 0.6]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5
        }}
      />
    </div>
  );
};

export default TimetableIllustration;
