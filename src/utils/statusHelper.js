export const getEventStatus = (timeIn, timeOut, scheduledTimeIn, scheduledTimeOut, displayDate) => {
  if (!scheduledTimeIn) return null;
  let label = "";
  if (!timeIn) {
    const isPast = new Date() > new Date(`${displayDate}T${scheduledTimeOut || '23:59'}:00`);
    return isPast ? "Absent" : "Pending";
  }
  if (timeIn > scheduledTimeIn) label = "Late";
  else label = "On Time";

  if (timeOut && scheduledTimeOut && timeOut < scheduledTimeOut) {
    label += " (Early Timeout)";
  }
  return label;
};
