import React, { useState, useEffect } from "react";
import styled from "styled-components";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import Loader from '../Components/Loader';
import { getEventStatus } from '../utils/statusHelper';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function SummaryPage() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

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

  const handleDateClick = (info) => {
    setSelectedDate(info.dateStr);
  };

  const dayEvents = events.filter(e => e.date === selectedDate);

  const getStatusColor = (status) => {
    if (!status) return '#64748b';
    if (status.includes('Late') || status.includes('Absent') || status.includes('Early Timeout')) return '#ef4444';
    if (status.includes('On Time')) return '#22c55e';
    if (status === 'Pending') return '#f59e0b';
    return '#64748b';
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Duty Summary for ${selectedDate}`, 14, 15);
    
    const header = [["Name / Shift", "Scheduled", "Actual In", "Actual Out", "Status"]];
    const data = dayEvents.map((event) => {
      const status = getEventStatus(
        event.timeIn,
        event.timeOut,
        event.scheduledTimeIn,
        event.scheduledTimeOut,
        event.date
      );
      const nameDisplay = event.title ? event.title : "Unknown";
      
      return [
        nameDisplay,
        `${event.scheduledTimeIn || '?'} - ${event.scheduledTimeOut || '?'}`,
        event.timeIn || '-',
        event.timeOut || '-',
        status || 'Unknown'
      ];
    });

    autoTable(doc, {
      head: header,
      body: data,
      startY: 20,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`duty-summary-${selectedDate}.pdf`);
  };

  return (
    <Container>
      {isLoading && <Loader message="Loading summary..." />}
      <Title>Duty Summary</Title>
      
      <LayoutGrid>
        <CalendarSide>
          <div className="calendar-wrapper">
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev",
                center: "title",
                right: "next",
              }}
              dateClick={handleDateClick}
              height="auto"
              selectable={true}
              // Add simple dot indicators or highlighted background if there are events
              events={events.map(e => ({
                date: e.date,
                display: 'background',
                backgroundColor: e.date === selectedDate ? '#bfdbfe' : 'transparent',
              }))}
            />
          </div>
        </CalendarSide>

        <DataSide>
          <DataHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <h3>Records for: {selectedDate}</h3>
              <span>Total: {dayEvents.length}</span>
            </div>
            <ExportButton onClick={exportPDF} disabled={dayEvents.length === 0}>
              Export to PDF
            </ExportButton>
          </DataHeader>
          
          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <th>Name / Shift</th>
                  <th>Scheduled</th>
                  <th>Actual In</th>
                  <th>Actual Out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dayEvents.length > 0 ? (
                  dayEvents.map(event => {
                    const status = getEventStatus(
                      event.timeIn,
                      event.timeOut,
                      event.scheduledTimeIn,
                      event.scheduledTimeOut,
                      event.date
                    );
                    const nameDisplay = event.title ? event.title : "Unknown";
                    
                    return (
                      <tr key={event.id}>
                        <td><strong>{nameDisplay}</strong></td>
                        <td>{event.scheduledTimeIn || '?'} - {event.scheduledTimeOut || '?'}</td>
                        <td>{event.timeIn || '-'}</td>
                        <td>{event.timeOut || '-'}</td>
                        <td>
                          <StatusBadge color={getStatusColor(status)}>
                            {status || 'Unknown'}
                          </StatusBadge>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="empty-state">No scheduled duties for this date.</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </TableContainer>
        </DataSide>
      </LayoutGrid>
    </Container>
  );
}

export default SummaryPage;

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

const LayoutGrid = styled.div`
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 24px;
  align-items: flex-start;

  @media (max-width: 992px) {
    grid-template-columns: 1fr;
  }
`;

const CalendarSide = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);

  .calendar-wrapper {
    /* FullCalendar custom compact styling */
    .fc-theme-standard .fc-scrollgrid {
      border-color: #e2e8f0;
    }
    .fc-theme-standard td, .fc-theme-standard th {
      border-color: #e2e8f0;
    }
    .fc-button-primary {
      background-color: transparent !important;
      border: none !important;
      color: #64748b !important;
    }
    .fc-button-primary:hover {
      color: #0f172a !important;
    }
    .fc-toolbar-title {
      font-size: 16px;
      color: #1e293b;
      font-weight: 600;
    }
    .fc-col-header-cell-cushion {
      color: #0f172a;
      font-size: 14px;
      padding: 4px;
    }
    .fc-daygrid-day-number {
      color: #475569;
      font-size: 14px;
      padding: 4px;
    }
    .fc-day-today {
      background-color: #f1f5f9 !important;
    }
    .fc-highlight {
      background: #bfdbfe !important;
    }
    .fc-daygrid-day {
      cursor: pointer;
    }
    .fc-daygrid-day:hover {
      background-color: #f8fafc;
    }
  }
`;

const DataSide = styled.div`
  background: white;
  padding: 24px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
`;

const DataHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h3 {
    font-size: 20px;
    color: #1e293b;
    margin: 0;
  }
  
  span {
    background: #e2e8f0;
    color: #475569;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
  }
`;

const TableContainer = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  
  th, td {
    padding: 14px 16px;
    border-bottom: 1px solid #e2e8f0;
    text-align: left;
    white-space: nowrap;
  }

  th {
    color: #64748b;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    background: #f8fafc;
    letter-spacing: 0.5px;
  }
  
  th:first-child {
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
  }
  
  th:last-child {
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
  }

  td {
    color: #334155;
    font-size: 15px;
  }

  strong {
    color: #0f172a;
    font-weight: 600;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody tr:hover td {
    background-color: #f8fafc;
  }

  .empty-state {
    text-align: center;
    padding: 40px;
    color: #94a3b8;
    font-size: 15px;
  }
`;

const StatusBadge = styled.span`
  background-color: ${props => props.color}20;
  color: ${props => props.color};
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
  display: inline-block;
  border: 1px solid ${props => props.color}40;
`;

const ExportButton = styled.button`
  padding: 8px 16px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: #1d4ed8;
  }
  
  &:disabled {
    background: #94a3b8;
    cursor: not-allowed;
  }
`;
