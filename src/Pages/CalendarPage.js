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
import { db } from '../firebase';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import Loader from '../Components/Loader';


function CalendarPage() {
  const location = useLocation();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [timeLogOpen, setTimeLogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

  console.log('Rendering CalendarPage, modalOpen:', modalOpen, 'selectedDate:', selectedDate);

  const handleDateClick = (info) => {
    setSelectedDate(info.dateStr);
  };

  const formattedEvents = events.map((e) => {
    const name = e.title ? e.title.split(" - ")[0] : "";
    const bgColor = e.isLeave ? "#94a3b8" : getColorForName(name);

    let titleStatus = e.title;
    if (e.isLeave) {
      titleStatus = `${name} - ${e.leaveType}`;
    } else if (e.isConfirmed) {
      titleStatus = `✅ ${e.title}`;
    } else if (e.leaveRequestDenied) {
      titleStatus = `❌ ${e.title}`;
    } else if (e.isLeaveRequestPending) {
      titleStatus = `⏳ ${e.title}`;
    }

    let eventProps = {
      ...e,
      start: e.date,
      title: titleStatus,
      backgroundColor: bgColor,
      borderColor: bgColor,
      textColor: e.isLeave ? "#ffffff" : "#0f172a",
    };

    if (e.isOvernight && e.date) {
      const d = new Date(e.date);
      // FullCalendar's all-day 'end' is exclusive, meaning we need to add 2 days to span exactly 2 boxes (today and tomorrow).
      d.setDate(d.getDate() + 2);
      eventProps.end = d.toISOString().split('T')[0];
    }

    return eventProps;
  });

  const handleSave = async ({ name, shift, scheduledTimeIn, scheduledTimeOut, isRepeating, selectedDays, untilDate, isLeave, leaveType }) => {
    setIsLoading(true);
    try {
      const isOvernight = scheduledTimeOut && scheduledTimeIn ? scheduledTimeOut <= scheduledTimeIn : false;
      const datesToCreate = [];

      if (isRepeating && untilDate && selectedDays.length > 0) {
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

      const promises = datesToCreate.map(date => 
        addDoc(collection(db, 'dutyEvents'), {
          title: `${name} - ${shift}`,
          date: date,
          timeIn: "",
          timeOut: "",
          scheduledTimeIn: scheduledTimeIn || "",
          scheduledTimeOut: scheduledTimeOut || "",
          isConfirmed: false,
          isOvernight: isOvernight,
          isLeave: isLeave || false,
          leaveType: leaveType || ""
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
              setSelectedDate(info.event.startStr || info.event.start?.toISOString().split('T')[0]);
              setSelectedEvent({
                id: clickedId,
                title: info.event.title,
                date: info.event.startStr || info.event.start?.toISOString().split('T')[0],
                timeIn: '',
                timeOut: ''
              });
            }
            setTimeLogOpen(true);
          }}
          events={formattedEvents}
          height={650}
          selectable={true}
        />
      </CalendarBox>

      <ScheduleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedDate={selectedDate}
        onSave={handleSave}
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

      {selectedDate && (
        <DayScheduleSidebar
          selectedDate={selectedDate}
          events={events}
          onClose={() => setSelectedDate(null)}
          onAddNew={() => setModalOpen(true)}
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
  color: #1e293b;
  font-weight: 700;
  border-bottom: 3px solid #e2e8f0;
  padding-bottom: 12px;
`;

const CalendarBox = styled.div`
  background: #ffffff;
  padding: 24px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);

  /* FullCalendar custom styling for high contrast */
  .fc-theme-standard .fc-scrollgrid {
    border-color: #e2e8f0;
  }
  .fc-theme-standard td, .fc-theme-standard th {
    border-color: #e2e8f0;
  }
  .fc-button-primary {
    background-color: #2563eb !important;
    border-color: #2563eb !important;
    text-transform: capitalize;
    font-weight: 600;
  }
  .fc-button-active {
    background-color: #1d4ed8 !important;
  }
  .fc-col-header-cell-cushion {
    color: #0f172a;
    font-size: 16px;
    padding: 8px;
    text-transform: uppercase;
  }
  .fc-daygrid-day-number {
    color: #475569;
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
    background-color: #f8fafc !important;
  }
  .fc-day-past .fc-daygrid-day-number,
  .fc-day-past .fc-col-header-cell-cushion {
    color: #94a3b8 !important;
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