export const getEventStatus = (timeIn, timeOut, scheduledTimeIn, scheduledTimeOut, displayDate, isOvernight = false, isLeave = false, leaveType = "") => {
  if (isLeave) return leaveType || "On Leave";
  if (!scheduledTimeIn) return null;

  const baseDate = new Date(`${displayDate}T00:00:00`);
  
  const getFullObj = (timeStr, offsetDays = 0) => {
    if (!timeStr) return null;
    if (timeStr.includes('T')) return new Date(timeStr); // handles full ISO timestamps
    
    const [hh, mm] = timeStr.split(':');
    const d = new Date(baseDate);
    d.setDate(d.getDate() + offsetDays);
    d.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
    return d;
  };

  const schedInObj = getFullObj(scheduledTimeIn, 0);
  const schedOutObj = getFullObj(scheduledTimeOut || '23:59', isOvernight ? 1 : 0);

  let label = "";

  if (!timeIn) {
    const isPast = new Date() > schedOutObj;
    return isPast ? "Absent" : "Pending";
  }

  const actualInObj = getFullObj(timeIn, 0);
  
  if (actualInObj > schedInObj) {
    label = "Late";
  } else {
    label = "On Time";
  }

  if (timeOut && scheduledTimeOut) {
    // If timeOut is an ISO string, getFullObj uses its exact date.
    // If it's a "HH:mm" string for an overnight shift, we guess it is next day if HH:mm < timeIn.
    let isNextDay = false;
    if (!timeOut.includes('T') && isOvernight && actualInObj) {
      if (timeOut < timeIn) isNextDay = true;
    }
    
    const actualOutObj = getFullObj(timeOut, isNextDay ? 1 : 0);
    if (actualOutObj < schedOutObj) {
      label += " (Early Timeout)";
    }
  }

  return label;
};


