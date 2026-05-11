import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import styled from "styled-components";
import ScheduleModal from "../Components/ScheduleModal";
import DayScheduleSidebar from "../Components/DayScheduleSidebar";
import TimeLogModal from "../Components/TimeLogModal";
import { db, auth } from '../firebase';
import { STORAGE_KEYS } from '../constants';
import { calculateLeaveEndDate } from '../utils/leaveCalculations';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import Loader from '../Components/Loader';


function CalendarPage() {
  const location = useLocation();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [timeLogOpen, setTimeLogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modalType, setModalType] = useState('schedule');

  const USER_COLORS = [
    "#bae6fd", "#bbf7d0", "#fef08a", "#fbcfe8", "#fed7aa", "#e9d5ff", "#ccfbf1", "#fecaca", "#e5e7eb"
  ];

  const getColorForName = (name) => {
    if (!name) return "#f1f5f9";
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "dutyEvents"), (snapshot) => {
      const data = snapshot.docs.map(docSnapshot => ({ 
        id: docSnapshot.id, 
        ...docSnapshot.data() 
      }));
      setEvents(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (location.state && location.state.openEventId && events.length > 0) {
      const match = events.find(e => String(e.id) === String(location.state.openEventId));
      if (match) {
        setSelectedDate(match.date);
        setSelectedEvent(match);
        setTimeLogOpen(true);
        window.history.replaceState({}, document.title);
      }
    }
  }, [events, location.state]);

  const userRole = localStorage.getItem('authRole');
  const authName = localStorage.getItem('authName') || '';
  const currentUserId = auth.currentUser?.uid || localStorage.getItem(STORAGE_KEYS.AUTH_UID) || '';

  const visibleEvents = events.filter((e) => {
    if (userRole === 'admin') return true;
    const owner = e.title ? e.title.split(' - ')[0] : '';
    if (e.isLeaveRequestPending || e.leaveRequestDenied) {
      return e.userId === currentUserId || owner.toLowerCase() === authName.toLowerCase();
    }
    return true;
  });

  const handleEditEvent = (eventData) => {
    setSelectedDate(eventData.date);
    setModalType(eventData.isLeave ? 'leave' : 'schedule');
    setEditingEvent(eventData);
    setSidebarOpen(false);
    setTimeLogOpen(false);
    setModalOpen(true);
  };

  const handleUpdate = async (updatedFields, eventId) => {
    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'dutyEvents', eventId), updatedFields);
      setEvents((prevEvents) => prevEvents.map((evt) => evt.id === eventId ? { ...evt, ...updatedFields } : evt));
      setModalOpen(false);
      setEditingEvent(null);
    } catch (e) {
      alert('Error updating event: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  console.log('Rendering CalendarPage, modalOpen:', modalOpen, 'selectedDate:', selectedDate);

  const handleDateClick = (info) => {
    setSelectedDate(info.dateStr);
    setSidebarOpen(true);
  };

  const formattedEvents = visibleEvents.map((e) => {
    const name = e.title ? e.title.split(" - ")[0] : "";
    let bgColor = e.isLeave ? "#94a3b8" : getColorForName(name);
    if (e.isLeaveRequestPending) bgColor = "#fef08a";
    if (e.leaveRequestDenied) bgColor = "#fee2e2";

    let titleStatus = e.title;
    if (e.isLeave) {
      titleStatus = `${name} - ${e.leaveType}`;
      if (e.isConfirmed) {
        titleStatus = `✅ ${titleStatus}`;
      }
    } else if (e.leaveRequestDenied) {
      titleStatus = `❌ ${name} - Leave Request Denied`;
    } else if (e.isLeaveRequestPending) {
      titleStatus = `⏳ PENDING: ${name} - ${e.pendingLeaveType} Request`;
    } else if (e.isConfirmed) {
      titleStatus = `✅ ${e.title}`;
    }

    if (e.isOvernight) {
      titleStatus += " (Overnight)";
    }
    if ((e.isLeave || e.leaveRequestDenied) && e.leaveEndDate && e.leaveEndDate !== e.date) {
      titleStatus += ` (${e.date} - ${e.leaveEndDate})`;
    }

    let eventProps = {
      ...e,
      start: e.date,
      title: titleStatus,
      backgroundColor: bgColor,
      borderColor: bgColor,
      textColor: e.isLeave ? "#ffffff" : e.leaveRequestDenied ? "#991b1b" : e.isLeaveRequestPending ? "#92400e" : "#0f172a",
    };

    if (e.isLeave || e.leaveRequestDenied) {
      // Leave events and denied leave requests are all-day entries
      eventProps.allDay = true;
      if (e.leaveEndDate) {
        const d = new Date(e.leaveEndDate);
        d.setDate(d.getDate() + 1);
        eventProps.end = d.toISOString().split('T')[0];
      } else if (e.leaveDays > 1 && e.date) {
        const calculatedEndDate = calculateLeaveEndDate(e.date, e.leaveDays, e.excludeWeekends);
        if (calculatedEndDate && calculatedEndDate !== e.date) {
          const d = new Date(calculatedEndDate);
          d.setDate(d.getDate() + 1);
          eventProps.end = d.toISOString().split('T')[0];
        }
      }
    } else {
      // Regular schedule events are timed
      eventProps.allDay = false;
      if (e.scheduledTimeIn && e.scheduledTimeOut) {
        eventProps.start = `${e.date}T${e.scheduledTimeIn}`;
        if (e.isOvernight) {
          const nextDay = new Date(e.date);
          nextDay.setDate(nextDay.getDate() + 1);
          const nextDayStr = nextDay.toISOString().split('T')[0];
          eventProps.end = `${nextDayStr}T${e.scheduledTimeOut}`;
        } else {
          eventProps.end = `${e.date}T${e.scheduledTimeOut}`;
        }
      }
    }

    return eventProps;
  });

  const handleSave = async ({ name, shift, scheduledTimeIn, scheduledTimeOut, isRepeating, selectedDays, untilDate, isLeave, leaveType, leaveEndDate, leaveDays, excludeWeekends }) => {
    setIsLoading(true);
    try {
      const isOvernight = scheduledTimeOut && scheduledTimeIn ? scheduledTimeOut <= scheduledTimeIn : false;
      const datesToCreate = [];

      if (modalType === 'leave' && leaveEndDate) {
        // For leave, create a single multi-day event
        datesToCreate.push(selectedDate);
      } else if (isRepeating && untilDate && selectedDays.length > 0) {
        let current = new Date(selectedDate);
        const end = new Date(untilDate);
        
        while (current <= end) {
          if (selectedDays.includes(current.getDay())) {
            datesToCreate.push(current.toISOString().split('T')[0]);
          }
          current.setDate(current.getDate() + 1);
        }
      } else {
        datesToCreate.push(selectedDate);
      }

      if (datesToCreate.length === 0) {
        alert("The selected range doesn't include any of the chosen days.");
        setIsLoading(false);
        return;
      }

      const currentUserId = auth.currentUser?.uid || localStorage.getItem(STORAGE_KEYS.AUTH_UID) || "";
      const promises = datesToCreate.map(date => 
        addDoc(collection(db, 'dutyEvents'), {
          title: modalType === 'leave' ? `${name} - Leave Request` : `${name} - ${shift}`,
          date: date,
          timeIn: "",
          timeOut: "",
          scheduledTimeIn: scheduledTimeIn || "",
          scheduledTimeOut: scheduledTimeOut || "",
          isConfirmed: false,
          isOvernight: isOvernight,
          isLeave: isLeave || false,
          leaveType: isLeave ? leaveType || "" : "",
          leaveEndDate: leaveEndDate || "",
          leaveDays: isLeave ? leaveDays || 1 : 0,
          excludeWeekends: isLeave ? excludeWeekends || false : false,
          isLeaveRequestPending: modalType === 'leave' ? true : false,
          pendingLeaveType: modalType === 'leave' ? leaveType : "",
          leaveRequestDenied: false,
          userId: currentUserId
        })
      );

      await Promise.all(promises);
      setModalOpen(false);
    } catch (e) {
      alert("Error adding event: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      {isLoading && <Loader message="Loading calendar..." />}
      <Title>Duty Schedule</Title>
      
      <CalendarBox>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          dateClick={handleDateClick}
          eventClick={(info) => {
            const clickedId = info.event.id;
            const storedEvent = events.find((e) => String(e.id) === String(clickedId));
            if (storedEvent) {
              setSelectedDate(storedEvent.date);
              setSelectedEvent(storedEvent);
            } else {
              // fallback if not in state for some reason
              const fallbackDate = info.event.startStr || info.event.start?.toISOString().split('T')[0];
              setSelectedDate(fallbackDate);
              setSelectedEvent({
                id: clickedId,
                title: info.event.title,
                date: fallbackDate,
                timeIn: '',
                timeOut: ''
              });
            }
            setSidebarOpen(true);
            setTimeLogOpen(true);
          }}
          events={formattedEvents}
          height={650}
          selectable={true}
        />
      </CalendarBox>

      <ScheduleModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingEvent(null);
        }}
        selectedDate={selectedDate}
        event={editingEvent}
        onSave={handleSave}
        onUpdate={handleUpdate}
        modalType={modalType}
      />

      <TimeLogModal
        isOpen={timeLogOpen}
        onClose={() => setTimeLogOpen(false)}
        event={selectedEvent}
        onSave={async (updates) => {
          setIsLoading(true);
          try {
            await updateDoc(doc(db, 'dutyEvents', selectedEvent.id), updates);
            setSelectedEvent(prev => ({ ...prev, ...updates }));
          } catch (e) {
            alert("Error saving: " + e.message);
          } finally {
            setIsLoading(false);
          }
        }}
        onDelete={async () => {
          setIsLoading(true);
          try {
            await deleteDoc(doc(db, 'dutyEvents', selectedEvent.id));
            setTimeLogOpen(false);
            setSelectedEvent(null);
          } catch (e) {
            alert("Error deleting event: " + e.message);
          } finally {
            setIsLoading(false);
          }
        }}
      />

      {selectedDate && sidebarOpen && (
        <DayScheduleSidebar
          selectedDate={selectedDate}
          events={visibleEvents}
          onClose={() => setSidebarOpen(false)}
          onAddNew={() => {
            setTimeLogOpen(false);
            setSidebarOpen(false);
            setModalType('schedule');
            setModalOpen(true);
          }}
          onMarkLeave={() => {
            setTimeLogOpen(false);
            setSidebarOpen(false);
            setModalType('leave');
            setModalOpen(true);
          }}
          onEditEvent={handleEditEvent}
        />
      )}
    </Container>
  );
}

export default CalendarPage;

// Styled Components
const Container = styled.div`
  padding: 30px;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const Title = styled.h2`
  margin-bottom: 24px;
  font-size: 28px;
  color: ${({ theme }) => theme.text.primary};
  font-weight: 700;
  border-bottom: 3px solid ${({ theme }) => theme.border.main};
  padding-bottom: 12px;
`;

const CalendarBox = styled.div`
  background: ${({ theme }) => theme.bg.card};
  padding: 24px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.border.main};
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);

  /* FullCalendar custom styling for high contrast */
  .fc-theme-standard .fc-scrollgrid {
    border-color: ${({ theme }) => theme.border.main};
  }
  .fc-theme-standard td, .fc-theme-standard th {
    border-color: ${({ theme }) => theme.border.main};
  }
  .fc-button-primary {
    background-color: ${({ theme }) => theme.primary.main} !important;
    border-color: ${({ theme }) => theme.primary.main} !important;
    text-transform: capitalize;
    font-weight: 600;
    color: #ffffff !important;
  }
  .fc-button-active {
    background-color: ${({ theme }) => theme.primary.hover} !important;
  }
  .fc-col-header-cell-cushion {
    color: ${({ theme }) => theme.text.primary};
    font-size: 16px;
    padding: 8px;
    text-transform: uppercase;
  }
  .fc-daygrid-day-number {
    color: ${({ theme }) => theme.text.secondary};
    font-size: 16px;
    font-weight: 600;
  }
  .fc-event {
    cursor: pointer;
    transition: transform 0.2s;
  }
  .fc-event:hover {
    transform: scale(1.02);
  }

  /* Styling for past dates - keeping grey background but allowing interaction */
  .fc-day-past {
    background-color: ${({ theme }) => theme.bg.main} !important;
  }
  .fc-day-past .fc-daygrid-day-number,
  .fc-day-past .fc-col-header-cell-cushion {
    color: ${({ theme }) => theme.text.muted} !important;
  }
  .fc-day-past .fc-event {
    opacity: 0.8;
  }

  @media (max-width: 768px) {
    padding: 12px;
    .fc-header-toolbar {
      flex-direction: column;
      gap: 12px;
    }
  }
`;