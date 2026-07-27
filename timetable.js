const courses = [
  {
    code: 'EE2102',
    name: 'Network Analysis and Synthesis',
    shortName: 'Network Analysis',
    type: 'lecture',
    department: 'EE',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)',
  },
  {
    code: 'EE2101',
    name: 'Measurements and Instrumentation',
    shortName: 'Measurements',
    type: 'lecture',
    department: 'EE',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
  },
  {
    code: 'EC2101',
    name: 'Analog Circuits',
    shortName: 'Analog Circuits',
    type: 'lecture',
    department: 'EC',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4, #22d3ee)',
  },
  {
    code: 'EE2103',
    name: 'Electrical Machines – I',
    shortName: 'Elec. Machines',
    type: 'lecture',
    department: 'EE',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
  },
  {
    code: 'EC2102',
    name: 'Signals and Systems',
    shortName: 'Signals & Systems',
    type: 'lecture',
    department: 'EC',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981, #34d399)',
  },
];

const schedule = {
  Monday: [
    { code: 'EE2102', time: '9:00 AM – 9:55 AM', startHour: 9, startMin: 0, endHour: 9, endMin: 55, room: 'LT-102' },
    { code: 'EE2101', time: '10:00 AM – 10:55 AM', startHour: 10, startMin: 0, endHour: 10, endMin: 55, room: 'LT-102' },
    { code: 'EC2101', time: '11:00 AM – 11:55 AM', startHour: 11, startMin: 0, endHour: 11, endMin: 55, room: 'LT-102' },
    { code: 'EE2103', time: '12:00 PM – 12:55 PM', startHour: 12, startMin: 0, endHour: 12, endMin: 55, room: 'LT-102' },
    { code: 'EC2102', time: '3:00 PM – 3:55 PM', startHour: 15, startMin: 0, endHour: 15, endMin: 55, room: 'LT-102' },
  ],
  Tuesday: [
    { code: 'EE2102', time: '9:00 AM – 9:55 AM', startHour: 9, startMin: 0, endHour: 9, endMin: 55, room: 'LT-102' },
    { code: 'EE2101', time: '10:00 AM – 10:55 AM', startHour: 10, startMin: 0, endHour: 10, endMin: 55, room: 'LT-102' },
    { code: 'EC2101', time: '11:00 AM – 11:55 AM', startHour: 11, startMin: 0, endHour: 11, endMin: 55, room: 'LT-102' },
    { code: 'EE2103', time: '12:00 PM – 12:55 PM', startHour: 12, startMin: 0, endHour: 12, endMin: 55, room: 'LT-102' },
  ],
  Wednesday: [
    { code: 'EC2102', time: '3:00 PM – 3:55 PM', startHour: 15, startMin: 0, endHour: 15, endMin: 55, room: 'LT-102', label: 'Tutorial' },
  ],
  Thursday: [
    { code: 'EE2102', time: '9:00 AM – 9:55 AM', startHour: 9, startMin: 0, endHour: 9, endMin: 55, room: 'LT-102' },
    { code: 'EE2101', time: '10:00 AM – 10:55 AM', startHour: 10, startMin: 0, endHour: 10, endMin: 55, room: 'LT-102' },
    { code: 'EC2101', time: '11:00 AM – 11:55 AM', startHour: 11, startMin: 0, endHour: 11, endMin: 55, room: 'LT-102' },
    { code: 'EE2103', time: '12:00 PM – 12:55 PM', startHour: 12, startMin: 0, endHour: 12, endMin: 55, room: 'LT-102' },
    { code: 'EC2102', time: '3:00 PM – 3:55 PM', startHour: 15, startMin: 0, endHour: 15, endMin: 55, room: 'LT-102' },
  ],
  Friday: [],
  Saturday: [],
  Sunday: [],
};

module.exports = {
  getAllCourses() {
    return courses;
  },
  getCourse(code) {
    return courses.find((c) => c.code === code);
  },
  getClassesForDay(day) {
    const dayClasses = schedule[day] || [];
    return dayClasses.map((cls) => {
      const course = courses.find((c) => c.code === cls.code);
      return { ...course, ...cls };
    });
  },
  getSchedule() {
    return schedule;
  },
};
