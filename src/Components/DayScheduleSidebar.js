import React from "react";
import styled from "styled-components";

function DayScheduleSidebar({ selectedDate, events, onClose, onAddNew, onMarkLeave, onEditEvent }) {
  const dayEvents = events.filter(event => {
    if (event.date === selectedDate) return true;

    if (event.leaveEndDate && event.date) {
      const start = new Date(event.date);
      const end = new Date(event.leaveEndDate);
      const target = new Date(selectedDate);
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      target.setHours(0,0,0,0);
      if (target >= start && target <= end) return true;
    }
    
    if (event.isOvernight && event.date) {
      const d = new Date(event.date);
      d.setDate(d.getDate() + 1);
      const nextDayStr = d.toISOString().split('T')[0];
      if (nextDayStr === selectedDate) return true;
    }
    
    return false;
  });

  const userRole = localStorage.getItem('authRole');
  const hasLeave = dayEvents.some(event => event.isLeave || event.isLeaveRequestPending);
  
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isPast = selectedDate < todayStr;

  return (
    <Backdrop onClick={onClose}>
      <Sidebar onClick={(e) => e.stopPropagation()}>
        <Header>
          <h3>Schedules for {selectedDate}</h3>
          <CloseButton onClick={onClose}>×</CloseButton>
        </Header>
        <Content>
          {dayEvents.length === 0 ? (
            <p>No schedules for this day.</p>
          ) : (
            <EventList>
              {dayEvents.map((event, index) => (
                <EventItem key={index}>
                  <EventHeader>
                    <div className="title">
                      {event.title}
                      {event.isLeave && event.leaveEndDate && event.leaveEndDate !== event.date && (
                        <span className="range-label">
                          ({event.date} - {event.leaveEndDate})
                        </span>
                      )}
                      {event.isOvernight && event.date === selectedDate && (
                        <span className="overnight-label">
                          (Spans to next day)
                        </span>
                      )}
                      {event.isOvernight && event.date !== selectedDate && (
                        <span className="overnight-label">
                          (Overnight)
                        </span>
                      )}
                    </div>
                    {userRole === 'admin' && event.id && onEditEvent && (
                      <EditButton onClick={() => onEditEvent(event)}>Edit</EditButton>
                    )}
                  </EventHeader>
                  {event.scheduledTimeIn && <div className="time schedule">Sched: {event.scheduledTimeIn} - {event.scheduledTimeOut || '?'}</div>}
                  {event.timeIn && <div className="time">In: {event.timeIn}</div>}
                  {event.timeOut && (
                    <div className="time">
                      Out: {event.timeOut}
                    </div>
                  )}
                </EventItem>
              ))}
            </EventList>
          )}
          {!isPast && userRole === 'admin' && <AddButton onClick={onAddNew}>Add New Schedule</AddButton>}
          {!isPast && userRole !== 'admin' && (
            <>
              <AddButton
                onClick={onMarkLeave}
                disabled={hasLeave}
                style={{ backgroundColor: hasLeave ? '#94a3b8' : '#f59e0b', cursor: hasLeave ? 'not-allowed' : 'pointer' }}
              >
                Mark as Leave
              </AddButton>
              {hasLeave && <Note>Leave is already requested or scheduled for this day.</Note>}
            </>
          )}
        </Content>
      </Sidebar>
    </Backdrop>
  );
}

export default DayScheduleSidebar;

// Styled Components
const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
`;

const Sidebar = styled.div`
  position: relative;
  width: min(100%, 540px);
  max-height: 92vh;
  background: #ffffff;
  box-shadow: 0 25px 80px rgba(15, 23, 42, 0.25);
  z-index: 1001;
  padding: 30px;
  overflow-y: auto;
  animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid #e2e8f0;
  border-radius: 24px;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(24px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (max-width: 768px) {
    width: 100%;
    max-height: 95vh;
    padding: 20px;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e2e8f0;

  h3 {
    margin: 0;
    color: #0f172a;
    font-size: 22px;
  }
`;

const CloseButton = styled.button`
  background: #ffffff;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #2563eb;
    color: #ffffff;
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(37, 99, 235, 0.3);
  }

  &:disabled {
    background: #94a3b8;
    box-shadow: none;
    transform: none;
    color: #ffffff;
    cursor: not-allowed;
  }
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  
  p {
    color: #475569;
    font-size: 16px;
  }
`;

const EventList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const EventItem = styled.li`
  padding: 20px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.15);
  transition: transform 0.2s;

  &:hover {
    background: #f1f5f9;
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(37, 99, 235, 0.2);
  }

  &:disabled {
    background: #94a3b8;
    box-shadow: none;
    transform: none;
    color: #ffffff;
    cursor: not-allowed;
  }

  .title {
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 12px;
  }

  .overnight-label {
    font-size: 12px;
    background: #eff6ff;
    color: #0f172a;
    padding: 4px 8px;
    border-radius: 6px;
    margin-left: 8px;
    font-weight: 700;
  }

  .time {
    font-size: 15px;
    color: #475569;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    
    &::before {
      content: '🕒';
      font-size: 14px;
    }
  }

  .schedule {
    margin-bottom: 4px;
  }
`;

const EventHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
`;

const EditButton = styled.button`
  padding: 8px 14px;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  transition: all 0.2s;

  &:hover {
    background: #d97706;
  }
`;

const AddButton = styled.button`
  margin-top: 16px;
  width: 100%;
  padding: 14px 24px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);

  &:hover {
    background: #1d4ed8;
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(37, 99, 235, 0.3);
  }

  &:disabled {
    background: #e2e8f0;
    box-shadow: none;
    transform: none;
    color: #ffffff;
    cursor: not-allowed;
  }
`;

const Note = styled.div`
  color: #2563eb;
  font-size: 14px;
  line-height: 1.4;
  margin-top: 8px;
`;
