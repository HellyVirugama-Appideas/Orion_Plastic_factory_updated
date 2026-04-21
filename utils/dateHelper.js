// Format date to readable string
exports.formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Format datetime to readable string
exports.formatDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Calculate time difference in minutes
exports.getTimeDifferenceMinutes = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end - start;
  return Math.round(diffMs / 60000);
};

// Calculate time difference in hours
exports.getTimeDifferenceHours = (startDate, endDate) => {
  const minutes = exports.getTimeDifferenceMinutes(startDate, endDate);
  return (minutes / 60).toFixed(2);
};

// Add minutes to date
exports.addMinutes = (date, minutes) => {
  return new Date(date.getTime() + minutes * 60000);
};

// Check if date is past
exports.isPast = (date) => {
  return new Date(date) < new Date();
};

// Check if date is future
exports.isFuture = (date) => {
  return new Date(date) > new Date();
};

// Get time ago string
exports.getTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  
  return Math.floor(seconds) + ' seconds ago';
};