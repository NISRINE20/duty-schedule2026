import React from "react";
import styled from "styled-components";

function DayScheduleSidebar({ selectedDate, events, onClose, onAddNew }) {
  const dayEvents = events.filter(event => event.date === selectedDate);
  const userRole = localStorage.getItem('authRole');
  
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isPast = selectedDate < todayStr;

  return (
    <Sidebar>
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
                <div className="title">{event.title}</div>
                {event.scheduledTimeIn && <div className="time" style={{color: '#64748b', marginBottom: '4px'}}>Sched: {event.scheduledTimeIn} - {event.scheduledTimeOut}</div>}
                {event.timeIn && <div className="time">In: {event.timeIn}</div>}
                {event.timeOut && (
                  <div className="time">
                    Out: {event.timeOut}
                    {event.scheduledTimeOut && event.timeOut < event.scheduledTimeOut && (
                      <span style={{ color: '#ef4444', fontSize: '13px', marginLeft: '6px', fontWeight: 'bold' }}>(Early)</span>
                    )}
                  </div>
                )}
              </EventItem>
            ))}
          </EventList>
        )}
        {!isPast && userRole === 'admin' && <AddButton onClick={onAddNew}>Add New Schedule</AddButton>}
      </Content>
    </Sidebar>
  );
}

export default DayScheduleSidebar;

// Styled Components
const Sidebar = styled.div`
  position: fixed;
  right: 0;
  top: 0;
  width: 380px;
  height: 100%;
  background: #f8fafc;
  box-shadow: -4px 0 25px rgba(0,0,0,0.1);
  z-index: 1001;
  padding: 30px;
  overflow-y: auto;
  animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  border-left: 1px solid #e2e8f0;

  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  @media (max-width: 768px) {
    width: 100%;
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
    color: #1e293b;
    font-size: 22px;
  }
`;

const CloseButton = styled.button`
  background: #f1f5f9;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #e2e8f0;
    color: #1e293b;
  }
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  
  p {
    color: #64748b;
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
  background: white;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 15px -3px rgba(0,0,0,0.1);
    border-color: #94a3b8;
  }

  .title {
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 12px;
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
`;