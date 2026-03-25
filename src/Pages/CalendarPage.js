import React, { useState, useEffect } from "react";
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

function CalendarPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [timeLogOpen, setTimeLogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

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
    });
    return () => unsubscribe();
  }, []);

  console.log('Rendering CalendarPage, modalOpen:', modalOpen, 'selectedDate:', selectedDate);

  const handleDateClick = (info) => {
    setSelectedDate(info.dateStr);
  };

  const formattedEvents = events.map((e) => {
    const name = e.title ? e.title.split(" - ")[0] : "";
    const bgColor = getColorForName(name);

    const titleStatus = e.isConfirmed ? `✅ ${e.title}` : e.title;

    return {
      ...e,
      title: titleStatus,
      backgroundColor: bgColor,
      borderColor: bgColor,
      textColor: "#0f172a",
    };
  });

  const handleSave = async ({ name, shift, scheduledTimeIn, scheduledTimeOut }) => {
    try {
      await addDoc(collection(db, 'dutyEvents'), {
        title: `${name} - ${shift}`,
        date: selectedDate,
        timeIn: "",
        timeOut: "",
        scheduledTimeIn: scheduledTimeIn || "",
        scheduledTimeOut: scheduledTimeOut || "",
        isConfirmed: false
      });
      setModalOpen(false);
    } catch (e) {
      alert("Error adding event: " + e.message);
    }
  };

  return (
    <Container>
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
        onSave={async ({ timeIn, timeOut, isConfirmed }) => {
          try {
            await updateDoc(doc(db, 'dutyEvents', selectedEvent.id), { timeIn, timeOut, isConfirmed });
            setSelectedEvent(prev => ({ ...prev, timeIn, timeOut, isConfirmed }));
          } catch (e) {
            alert("Error saving: " + e.message);
          }
        }}
        onDelete={async () => {
          try {
            await deleteDoc(doc(db, 'dutyEvents', selectedEvent.id));
            setTimeLogOpen(false);
            setSelectedEvent(null);
          } catch (e) {
            alert("Error deleting event: " + e.message);
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