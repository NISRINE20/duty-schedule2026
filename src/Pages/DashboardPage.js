import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import TimeLogModal from "../Components/TimeLogModal";

import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import Loader from '../Components/Loader';


const USER_COLORS = [
  "#bae6fd", // sky blue
  "#bbf7d0", // green
  "#fef08a", // yellow
  "#fbcfe8", // pink
  "#fed7aa", // orange
  "#e9d5ff", // purple
  "#ccfbf1", // teal
  "#fecaca", // red
  "#e5e7eb", // gray
];

const getColorForName = (name) => {
  if (!name) return "#f1f5f9";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
};

const BellIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="#0f172a" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

function DashboardPage() {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [filterShift, setFilterShift] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [timeLogOpen, setTimeLogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const userRole = localStorage.getItem('authRole');

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

  const today = new Date().toISOString().split("T")[0];

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (filterDate && event.date !== filterDate) return false;
      if (search && !event.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterShift && !event.title.toLowerCase().includes(filterShift.toLowerCase())) return false;
      return true;
    });
  }, [events, search, filterShift, filterDate]);

  const todaysDuties = useMemo(() => {
    return events.filter((event) => event.date === today);
  }, [events, today]);

  const next7Days = useMemo(() => {
    const list = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      list.push({ date: dateStr, duties: events.filter((e) => e.date === dateStr) });
    }
    return list;
  }, [events]);

  const unassigned = useMemo(() => events.filter((e) => !e.title || e.title.trim() === ""), [events]);

  const overlapping = useMemo(() => {
    const byDate = {};
    events.forEach((e) => {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    });
    return Object.entries(byDate)
      .filter(([_, list]) => list.length > 1)
      .flatMap(([date, list]) => list.map((e) => ({ ...e, date })));
  }, [events]);

  const upcomingHour = useMemo(() => {
    const now = new Date();
    return events.filter((e) => {
      const dt = new Date(e.date + "T" + (e.timeIn || "00:00") + ":00");
      const diff = dt - now;
      return diff >= 0 && diff <= 3600000;
    });
  }, [events]);

  const pendingLeaves = useMemo(() => events.filter(e => e.isLeaveRequestPending), [events]);


  const handleCardClick = (eventData) => {
    setSelectedEvent(eventData);
    setTimeLogOpen(true);
  };



  return (
    <PageContainer>
      {isLoading && <Loader message="Loading dashboard..." />}
      {userRole === 'admin' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <button
            onClick={() => setAlertsOpen(true)}
            style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '8px', transition: 'transform 0.2s', display: 'flex', alignItems: 'center' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            title="System Alerts"
          >
            <BellIcon />
            {(unassigned.length + overlapping.length + upcomingHour.length + pendingLeaves.length) > 0 && (
              <span style={{ position: 'absolute', top: '0', right: '-2px', background: '#ef4444', color: 'white', borderRadius: '10px', minWidth: '18px', padding: '2px 4px', fontSize: '11px', fontWeight: 'bold', border: '2px solid #f8fafc', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                {unassigned.length + overlapping.length + upcomingHour.length + pendingLeaves.length}
              </span>
            )}
          </button>
        </div>
      )}
      {userRole === 'user' && (
        <div style={{ background: '#eff6ff', color: '#1e40af', padding: '16px', borderRadius: '12px', border: '1px solid #bfdbfe', marginBottom: '32px', display: 'flex', alignItems: 'center', fontSize: '16px' }}>
          <span style={{ marginRight: '12px', fontSize: '20px' }}>ℹ️</span>
          <span><strong>Note:</strong> If there are any changes needed for your schedule or logged times, please go to the Administrator.</span>
        </div>
      )}


      <FilterRow>
        <FilterInput value={search} placeholder="Search by person/shift" onChange={(e) => setSearch(e.target.value)} />
        <FilterInput value={filterDate} type="date" onChange={(e) => setFilterDate(e.target.value)} />
        <FilterSelect value={filterShift} onChange={(e) => setFilterShift(e.target.value)}>
          <option value="">All shifts</option>
          <option value="Morning">Morning</option>
          <option value="Afternoon">Afternoon</option>
          <option value="Night">Night</option>
        </FilterSelect>
      </FilterRow>

      {(search || filterDate || filterShift) && (
        <>
          <SectionTitle>Search Results</SectionTitle>
          <CardGrid>
            {filteredEvents.length === 0 ? (
              <Card>No results found</Card>
            ) : (
              filteredEvents.map((event) => {
                const [name, shift] = (event.title || "").split(" - ");
                const isLeave = event.isLeave;
                return (
                  <Card key={event.id} color={isLeave ? "#e2e8f0" : getColorForName(name)} onClick={() => handleCardClick(event)}>
                    <CardHeader>
                      <strong>{name}</strong>
                      {!isLeave && !event.isLeaveRequestPending && (
                        <StatusBadge $confirmed={event.isConfirmed}>
                          {event.isConfirmed ? "✅ Confirmed" : "Pending"}
                        </StatusBadge>
                      )}
                      {event.isLeaveRequestPending && (
                        <StatusBadge $confirmed={false} style={{ background: '#fffbeb', color: '#d97706', borderColor: '#fde68a' }}>
                          ⏳ Leave Requested
                        </StatusBadge>
                      )}
                    </CardHeader>
                    {isLeave ? (
                      <div><strong>Excused:</strong> {event.leaveType}</div>
                    ) : (
                      <>
                        <div>{shift}</div>
                        <div>{event.date}</div>
                        {event.scheduledTimeIn && <div style={{ fontSize: '14px', color: '#666' }}>Scheduled: {event.scheduledTimeIn} - {event.scheduledTimeOut}</div>}
                        {event.timeIn && <div>In: {event.timeIn}</div>}
                        {event.timeOut && <div>Out: {event.timeOut}</div>}
                      </>
                    )}
                  </Card>
                );
              })
            )}
          </CardGrid>
        </>
      )}

      <SectionTitle>Today on Duty ({today})</SectionTitle>
      <CardGrid>{todaysDuties.length === 0 ? <Card>No duty assigned today</Card> : todaysDuties.map((event) => {
        const [name, shift] = (event.title || "").split(" - ");
        const isLeave = event.isLeave;
        return (
          <Card key={event.id} color={isLeave ? "#e2e8f0" : getColorForName(name)} onClick={() => handleCardClick(event)}>
            <CardHeader>
              <strong>{name}</strong>
              {!isLeave && !event.isLeaveRequestPending && (
                <StatusBadge $confirmed={event.isConfirmed}>
                  {event.isConfirmed ? "✅ Confirmed" : "Pending"}
                </StatusBadge>
              )}
              {event.isLeaveRequestPending && (
                <StatusBadge $confirmed={false} style={{ background: '#fffbeb', color: '#d97706', borderColor: '#fde68a' }}>
                  ⏳ Leave Requested
                </StatusBadge>
              )}
            </CardHeader>
            {isLeave ? (
              <div><strong>Excused:</strong> {event.leaveType}</div>
            ) : (
              <>
                <div>{shift}</div>
                {event.scheduledTimeIn && <div style={{ fontSize: '14px', color: '#666' }}>Scheduled: {event.scheduledTimeIn} - {event.scheduledTimeOut}</div>}
                {event.timeIn && <div>In: {event.timeIn}</div>}
                {event.timeOut && <div>Out: {event.timeOut}</div>}
              </>
            )}
          </Card>
        );
      })}</CardGrid>

      <SectionTitle>Upcoming 7 Days</SectionTitle>
      <UpcomingList>{next7Days.map(({ date, duties }) => (
        <UpcomingItem key={date}>
          <strong>{date}</strong> - {duties.length} duties
          {duties.map((d) => <div key={`${d.id}-upcoming`} style={{ fontSize: '0.85em', padding: '4px 0' }}>{d.isLeave ? `${d.title.split(" - ")[0]} - Excused (${d.leaveType})` : `${d.title} ${d.scheduledTimeIn ? `| Sched: ${d.scheduledTimeIn}-${d.scheduledTimeOut}` : ''} ${d.timeIn ? `| In:${d.timeIn}` : ''} ${d.timeOut ? `| Out:${d.timeOut}` : ''}`}</div>)}
        </UpcomingItem>
      ))}</UpcomingList>



      <TimeLogModal
        isOpen={timeLogOpen}
        onClose={() => setTimeLogOpen(false)}
        event={selectedEvent}
        onSave={async (updates) => {
          setIsLoading(true);
          try {
            await updateDoc(doc(db, 'dutyEvents', selectedEvent.id), updates);
            setTimeLogOpen(false);
          } catch (e) {
            alert("Error saving log: " + e.message);
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

      {alertsOpen && (
        <AlertOverlay onClick={() => setAlertsOpen(false)}>
          <AlertModalContainer onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, color: '#1e293b', fontSize: '24px' }}>System Alerts</h2>
              <button
                onClick={() => setAlertsOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            {pendingLeaves.length > 0 && (
              <AlertCard style={{ background: '#fffbeb', color: '#d97706', borderColor: '#fde68a', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <div>Pending Leave Requests: {pendingLeaves.length}</div>
                  <div style={{ marginTop: '12px', fontSize: '16px', fontWeight: 'normal' }}>
                    {pendingLeaves.map(e => (
                      <div
                        key={e.id}
                        style={{ marginBottom: '6px', color: '#b45309', cursor: 'pointer' }}
                        onClick={() => {
                          setAlertsOpen(false);
                          navigate('/calendar', { state: { openEventId: e.id } });
                        }}
                        onMouseOver={(ev) => ev.currentTarget.style.textDecoration = 'underline'}
                        onMouseOut={(ev) => ev.currentTarget.style.textDecoration = 'none'}
                      >
                        • <strong>{e.title ? e.title.split(' - ')[0] : 'Unknown User'}</strong> requested for {e.date}
                      </div>
                    ))}
                  </div>
                </div>
              </AlertCard>
            )}
            <AlertCard>{unassigned.length ? `Unassigned shifts: ${unassigned.length}` : "No unassigned shifts"}</AlertCard>
            <AlertCard>{overlapping.length ? `Overlapping shifts: ${overlapping.length}` : "No overlapping shifts"}</AlertCard>
            <AlertCard>{upcomingHour.length ? `Upcoming within 1 hour: ${upcomingHour.length}` : "No upcoming duties in 1 hour"}</AlertCard>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <Button onClick={() => setAlertsOpen(false)}>Close</Button>
            </div>
          </AlertModalContainer>
        </AlertOverlay>
      )}
    </PageContainer>
  );
}

export default DashboardPage;

const PageContainer = styled.div`
  padding: 30px 40px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #0f172a;
  background: #f8fafc;

  @media (max-width: 768px) {
    padding: 20px 16px;
  }
`;

const Button = styled.button`
  padding: 16px 28px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 18px;
  font-weight: 600;
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);

  &:hover {
    transform: scale(1.03);
    box-shadow: 0 8px 18px rgba(37, 99, 235, 0.3);
    background: #1d4ed8;
  }

  @media (max-width: 768px) {
    padding: 14px 20px;
    font-size: 16px;
    flex: 1;
    min-width: 100px;
  }
`;

const FilterRow = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 32px;
`;

const FilterInput = styled.input`
  padding: 16px 20px;
  background: #ffffff;
  border: 2px solid #cbd5e1;
  border-radius: 10px;
  font-size: 18px;
  color: #0f172a;
  outline: none;
  transition: all 0.2s ease;
  flex: 1;

  &::placeholder {
    color: #64748b;
  }

  &:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }

  @media (max-width: 768px) {
    padding: 14px 16px;
    font-size: 16px;
  }
`;

const FilterSelect = styled.select`
  padding: 16px 20px;
  background: #ffffff;
  border: 2px solid #cbd5e1;
  border-radius: 10px;
  font-size: 18px;
  color: #0f172a;
  outline: none;
  transition: all 0.2s ease;
  appearance: none;
  flex: 1;

  &:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }

  option {
    color: #0f172a;
  }

  @media (max-width: 768px) {
    padding: 14px 16px;
    font-size: 16px;
  }
`;

const SectionTitle = styled.h3`
  margin-top: 40px;
  margin-bottom: 20px;
  border-bottom: 3px solid #e2e8f0;
  padding-bottom: 12px;
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;

  @media (max-width: 768px) {
    font-size: 22px;
    margin-top: 24px;
    padding-bottom: 8px;
  }
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
  }
`;

const Card = styled.div`
  background: ${(p) => p.color || "#ffffff"};
  color: #0f172a;
  padding: 24px;
  border-radius: 12px;
  min-height: 120px;
  border: 1px solid #cbd5e1;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  font-size: 20px;
  position: relative;
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 8px;
    height: 100%;
    background: rgba(0,0,0,0.15); /* Adds a subtle dark edge indicator */
  }

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  }

  div {
    margin-bottom: 8px;
  }

  strong {
    font-size: 24px;
    font-weight: 700;
    display: block;
    margin-bottom: 10px;
    color: #000;
  }

  @media (max-width: 768px) {
    font-size: 16px;
    padding: 16px;
    min-height: auto;
    strong {
      font-size: 20px;
      margin-bottom: 6px;
    }
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2px !important;
`;

const StatusBadge = styled.span`
  background: ${(p) => p.$confirmed ? '#dcfce7' : '#f1f5f9'};
  color: ${(p) => p.$confirmed ? '#166534' : '#64748b'};
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  border: 1px solid ${(p) => p.$confirmed ? '#bbf7d0' : '#e2e8f0'};
`;

const UpcomingList = styled.div`
  max-height: 320px;
  overflow-y: auto;
  padding: 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: #f1f5f9;
  
  &::-webkit-scrollbar {
    width: 10px;
  }
  &::-webkit-scrollbar-track {
    background: #e2e8f0;
    border-radius: 5px;
  }
  &::-webkit-scrollbar-thumb {
    background: #94a3b8;
    border-radius: 5px;
  }
`;

const UpcomingItem = styled.div`
  margin-bottom: 16px;
  padding: 18px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  font-size: 20px;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.01);
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    border-color: #94a3b8;
  }

  strong {
    color: #0f62fe;
    font-weight: 700;
  }

  @media (max-width: 768px) {
    font-size: 16px;
    padding: 12px;
  }
`;



const AlertCard = styled.div`
  background: #fef2f2;
  color: #b91c1c;
  border: 2px solid #fecaca;
  padding: 18px 24px;
  border-radius: 10px;
  margin-bottom: 12px;
  font-weight: 600;
  font-size: 20px;
  display: flex;
  align-items: center;

  &::before {
    content: '⚠️';
    margin-right: 14px;
    font-size: 24px;
  }

  @media (max-width: 768px) {
    font-size: 16px;
    padding: 12px 16px;
    &::before {
      margin-right: 10px;
      font-size: 20px;
    }
  }
`;

const AlertOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
`;

const AlertModalContainer = styled.div`
  background: #ffffff;
  padding: 32px;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  @media (max-width: 768px) {
    padding: 20px;
    width: 95%;
  }
`;
