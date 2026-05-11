export const getEventStatus = (timeIn, timeOut, scheduledTimeIn, scheduledTimeOut, displayDate, isOvernight = false, isLeave = false, leaveType = "") => {
  if (isLeave) return leaveType || "On Leave";
  if (!scheduledTimeIn) return null;

  const baseDate = new Date(`${displayDate}T00:00:00`);

  const parseTimeParts = (timeStr) => {
    if (!timeStr || timeStr.includes('T')) return null;
    const [hh, mm] = timeStr.split(':').map((part) => parseInt(part, 10));
    return { hours: hh, minutes: mm, normalized: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}` };
  };

  const compareTimeStrings = (first, second) => {
    const firstParts = parseTimeParts(first);
    const secondParts = parseTimeParts(second);
    if (!firstParts || !secondParts) return 0;
    if (firstParts.hours !== secondParts.hours) return firstParts.hours - secondParts.hours;
    return firstParts.minutes - secondParts.minutes;
  };

  const getFullObj = (timeStr, offsetDays = 0) => {
    if (!timeStr) return null;
    if (timeStr.includes('T')) return new Date(timeStr);

    const { hours, minutes } = parseTimeParts(timeStr) || {};
    if (hours == null || minutes == null) return null;

    const d = new Date(baseDate);
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const shouldOffsetToNextDay = (timeStr, referenceTimeStr) => {
    if (!timeStr || !referenceTimeStr) return false;
    return compareTimeStrings(timeStr, referenceTimeStr) < 0;
  };

  const schedInObj = getFullObj(scheduledTimeIn, 0);
  const schedOutObj = getFullObj(scheduledTimeOut || '23:59', isOvernight ? 1 : 0);

  let label = "";

  if (!timeIn) {
    const isPast = new Date() > schedOutObj;
    return isPast ? "Absent" : "Pending";
  }

  let actualInOffset = 0;
  if (!timeIn.includes('T') && isOvernight && scheduledTimeOut) {
    const isAfterMidnightWindow = compareTimeStrings(timeIn, scheduledTimeOut) <= 0;
    if (isAfterMidnightWindow && shouldOffsetToNextDay(timeIn, scheduledTimeIn)) {
      actualInOffset = 1;
    }
  }

  const actualInObj = getFullObj(timeIn, actualInOffset);

  if (actualInObj > schedInObj) {
    label = "Late";
  } else {
    label = "On Time";
  }

  if (timeOut && scheduledTimeOut) {
    let isNextDay = false;
    if (!timeOut.includes('T') && isOvernight) {
      if (shouldOffsetToNextDay(timeOut, scheduledTimeIn)) {
        isNextDay = true;
      }
    }

    const actualOutObj = getFullObj(timeOut, isNextDay ? 1 : 0);
    if (actualOutObj && schedOutObj && actualOutObj < schedOutObj) {
      label += " (Early Timeout)";
    }
  }

  return label;
};


