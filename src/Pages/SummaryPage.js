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
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const authRole = localStorage.getItem('authRole');
  const authName = localStorage.getItem('authName');

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

  const dayEvents = events.filter(event => {
    if (authRole === 'user' && !event.title?.includes(authName)) {
      return false;
    }

    if (event.date === selectedDate) return true;
    if (event.isOvernight && event.date) {
      const d = new Date(event.date);
      d.setDate(d.getDate() + 1);
      const nextDayStr = d.toISOString().split('T')[0];
      if (nextDayStr === selectedDate) return true;
    }
    return false;
  });

  const getStatusColor = (status) => {
    if (!status) return '#64748b';
    if (status.includes('Late') || status.includes('Absent') || status.includes('Early Timeout')) return '#ef4444';
    if (status.includes('On Time')) return '#22c55e';
    if (status === 'Pending') return '#f59e0b';
    return '#64748b';
  };

  const getDisplayDate = (event) => {
    if (!event.date) return 'Unknown';
    if (event.leaveEndDate && event.leaveEndDate !== event.date) {
      return `${event.date} to ${event.leaveEndDate}`;
    }
    if (event.isOvernight) {
      const d = new Date(event.date);
      d.setDate(d.getDate() + 1);
      const nextDayStr = d.toISOString().split('T')[0];
      return `${event.date} to ${nextDayStr}`;
    }
    return event.date;
  };

  const getShiftFromTitle = (title, isLeave) => {
    if (isLeave) return 'Leave';
    if (!title || !title.includes(' - ')) return 'Unknown';
    return title.split(' - ')[1] || 'Unknown';
  };

  const monthlyEvents = events.filter((event) => {
    if (!event.date) return false;
    if (!event.date.startsWith(selectedMonth)) return false;
    if (authRole === 'user' && !event.title?.includes(authName)) {
      return false;
    }
    return true;
  });

  const monthlyRotationData = Object.values(monthlyEvents.reduce((acc, event) => {
    const name = event.title ? event.title.split(' - ')[0] : 'Unknown';
    const shift = getShiftFromTitle(event.title, event.isLeave);
    if (!acc[name]) {
      acc[name] = { name, Morning: 0, Afternoon: 0, Night: 0, Leave: 0, Other: 0, Total: 0 };
    }
    const key = ['Morning', 'Afternoon', 'Night', 'Leave'].includes(shift) ? shift : 'Other';
    acc[name][key] += 1;
    acc[name].Total += 1;
    return acc;
  }, {})).sort((a, b) => a.name.localeCompare(b.name));

  const loadImg = (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  };

  const exportPDF = async () => {
    setIsLoading(true);
    try {
      const leftLogo = await loadImg('/left-logo.png');
      const rightLogo = await loadImg('/right-logo.png');

      const doc = new jsPDF('landscape');
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const centerX = pageWidth / 2;

      const drawHeaderAndFooter = () => {
        if (leftLogo) {
          const w = 26 * (leftLogo.width / leftLogo.height);
          doc.addImage(leftLogo, 'PNG', 20, 15, w, 26);
        }
        if (rightLogo) {
          const rightH = 32;
          const w = rightH * (rightLogo.width / rightLogo.height);
          doc.addImage(rightLogo, 'PNG', pageWidth - 20 - w, 15 - ((rightH - 26) / 2), w, rightH);
        }

        doc.setFont("times", "bold");
        doc.setFontSize(12);
        doc.setTextColor(100, 116, 139);

        doc.text("HEADQUARTERS", centerX, 20, { align: "center" });
        doc.text("EASTERN MINDANAO COMMAND", centerX, 26, { align: "center" });
        
        doc.setFont("times", "normal");
        doc.setFontSize(11);
        doc.text("ARMED FORCES OF THE PHILIPPINES", centerX, 32, { align: "center" });
        
        doc.setFont("times", "bold");
        doc.text("Office of the Assistant Chief of Unified Command Staff for Personnel, U1", centerX, 38, { align: "center" });
        
        doc.setFont("times", "italic");
        doc.text("Naval Station Felix Apolinario, Panacan, Davao City", centerX, 44, { align: "center" });

        doc.setFont("times", "normal");
        doc.setTextColor(0, 0, 0);
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yy = String(today.getFullYear()).slice(-2);
        doc.text(`${dd}/${mm}/${yy}`, pageWidth - 20, 52, { align: "right" });

        // Add Summary specific title slightly above the table
        doc.setFont("times", "bold");
        doc.setFontSize(11);
        const titleText = authRole === 'admin' 
          ? `Daily Duty Summary: ${selectedDate}` 
          : `Personal Daily Duty Summary: ${selectedDate} - ${authName}`;
        doc.text(titleText, 14, 60);
      };

      drawHeaderAndFooter();
      
      const header = [["Name / Shift", "Date", "Scheduled", "Leave Days", "Actual In", "Actual Out", "Status"]];
      const data = dayEvents.map((event) => {
        const status = getEventStatus(
          event.timeIn,
          event.timeOut,
          event.scheduledTimeIn,
          event.scheduledTimeOut,
          event.date,
          event.isOvernight,
          event.isLeave,
          event.leaveType
        );
        const nameDisplay = event.title ? event.title : "Unknown";
        
        return [
          nameDisplay,
          getDisplayDate(event),
          event.isLeave ? 'Excused' : `${event.scheduledTimeIn || '?'} - ${event.scheduledTimeOut || '?'}`,
          event.isLeave ? (event.leaveDays || 1) : '-',
          event.timeIn || '-',
          event.timeOut || '-',
          status || 'Unknown'
        ];
      });

      autoTable(doc, {
        head: header,
        body: data,
        startY: 65,
        styles: { fontSize: 10, font: 'times' },
        headStyles: { fillColor: [37, 99, 235], font: 'times', fontStyle: 'bold' },
        didDrawPage: function (data) {
          doc.setFont("times", "italic");
          doc.setFontSize(11);
          doc.setTextColor(115, 115, 115);
          doc.text('AFP Core Values: "Honor, Service, Patriotism"', centerX, pageHeight - 15, { align: "center" });
        }
      });

      doc.save(`duty-summary-${selectedDate}.pdf`);
    } catch(err) {
      console.error(err);
      alert("Error generating PDF: " + err.message);
    } finally {
      setIsLoading(false);
    }
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

          <MonthlySection>
            <ReportHeader>
              <div>
                <h3>Monthly Rotation Report</h3>
                <p>Review the shift rotation counts for the selected month.</p>
              </div>
              <MonthInput
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </ReportHeader>
            <RotationTable>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Morning</th>
                  <th>Afternoon</th>
                  <th>Night</th>
                  <th>Leave</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRotationData.length > 0 ? (
                  monthlyRotationData.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{row.Morning}</td>
                      <td>{row.Afternoon}</td>
                      <td>{row.Night}</td>
                      <td>{row.Leave}</td>
                      <td>{row.Total}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="empty-state">No shift rotation records for this month.</td>
                  </tr>
                )}
              </tbody>
            </RotationTable>
          </MonthlySection>

          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <th>Name / Shift</th>
                  <th>Date</th>
                  <th>Scheduled</th>
                  <th>Leave Days</th>
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
                      event.date,
                      event.isOvernight,
                      event.isLeave,
                      event.leaveType
                    );
                    const nameDisplay = event.title ? event.title : "Unknown";
                    
                    return (
                      <tr key={event.id}>
                        <td>
                          <strong>{nameDisplay}</strong>
                          {event.isOvernight && event.date !== selectedDate && (
                            <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>
                              (Overnight)
                            </span>
                          )}
                        </td>
                        <td>{getDisplayDate(event)}</td>
                        <td>{event.isLeave ? <span style={{color: '#94a3b8', fontStyle: 'italic'}}>Excused</span> : `${event.scheduledTimeIn || '?'} - ${event.scheduledTimeOut || '?'}`}</td>
                      <td>{event.isLeave ? (event.leaveDays || 1) : '-'}</td>
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
                    <td colSpan="7" className="empty-state">No scheduled duties for this date.</td>
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

const MonthlySection = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px;
  margin-bottom: 24px;
`;

const ReportHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;

  h3 {
    margin: 0;
    font-size: 18px;
    color: #1e293b;
  }

  p {
    margin: 4px 0 0;
    color: #475569;
    font-size: 14px;
  }
`;

const MonthInput = styled.input`
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: white;
  color: #0f172a;
  font-size: 14px;
  width: 190px;
`;

const RotationTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;

  th, td {
    padding: 10px 12px;
    border-bottom: 1px solid #e2e8f0;
    text-align: left;
    white-space: nowrap;
  }

  th {
    color: #64748b;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    background: #eff6ff;
    letter-spacing: 0.5px;
  }

  td {
    color: #334155;
    font-size: 14px;
  }

  tbody tr:hover td {
    background-color: #f8fafc;
  }

  .empty-state {
    text-align: center;
    padding: 24px;
    color: #94a3b8;
    font-size: 15px;
  }
`;

const TableContainer = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;

  th, td {
    padding: 10px 12px;
    border-bottom: 1px solid #e2e8f0;
    text-align: left;
    white-space: nowrap;
  }

  th {
    color: #64748b;
    font-size: 12px;
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
    font-size: 14px;
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
    padding: 16px;
    color: #94a3b8;
    font-size: 14px;
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
