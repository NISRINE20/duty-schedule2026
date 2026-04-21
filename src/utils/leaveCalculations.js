// Date calculation utilities for leave management

/**
 * Checks if a given date is a weekend (Saturday or Sunday)
 * @param {Date} date - The date to check
 * @returns {boolean} - True if the date is a weekend
 */
export const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
};

/**
 * Calculates the end date for leave based on start date, number of days, and whether to exclude weekends
 * @param {string} startDateStr - Start date in YYYY-MM-DD format
 * @param {number} numDays - Number of leave days requested
 * @param {boolean} excludeWeekends - Whether to exclude weekends from the calculation
 * @returns {string} - End date in YYYY-MM-DD format
 */
export const calculateLeaveEndDate = (startDateStr, numDays, excludeWeekends = false) => {
  if (!startDateStr || numDays <= 0) return startDateStr;

  const startDate = new Date(startDateStr);
  let currentDate = new Date(startDate);
  let daysCounted = 0;

  // Start counting from the day after the start date
  currentDate.setDate(currentDate.getDate() + 1);

  while (daysCounted < numDays) {
    if (!excludeWeekends || !isWeekend(currentDate)) {
      daysCounted++;
    }

    if (daysCounted < numDays) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // Go back one day to get the actual end date
  currentDate.setDate(currentDate.getDate() - 1);

  return currentDate.toISOString().split('T')[0];
};

/**
 * Gets all dates in a leave period
 * @param {string} startDateStr - Start date in YYYY-MM-DD format
 * @param {string} endDateStr - End date in YYYY-MM-DD format
 * @returns {string[]} - Array of date strings in YYYY-MM-DD format
 */
export const getLeaveDateRange = (startDateStr, endDateStr) => {
  const dates = [];
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

/**
 * Calculates the number of leave days between two dates, optionally excluding weekends
 * @param {string} startDateStr - Start date in YYYY-MM-DD format
 * @param {string} endDateStr - End date in YYYY-MM-DD format
 * @param {boolean} excludeWeekends - Whether to exclude weekends from the count
 * @returns {number} - Number of leave days
 */
export const calculateLeaveDays = (startDateStr, endDateStr, excludeWeekends = false) => {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  let days = 0;

  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    if (!excludeWeekends || !isWeekend(currentDate)) {
      days++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return days;
};