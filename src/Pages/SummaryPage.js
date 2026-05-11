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
  const [monthlySearchName, setMonthlySearchName] = useState("");
  const [expandedRowName, setExpandedRowName] = useState(null);

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
    if (event.leaveRequestDenied) {
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
    if (event.leaveRequestDenied) {
      return false;
    }
    return true;
  });

  const allMonthlyRotationData = Object.values(monthlyEvents.reduce((acc, event) => {
    const name = event.title ? event.title.split(' - ')[0] : 'Unknown';
    const shift = getShiftFromTitle(event.title, event.isLeave);
    if (!acc[name]) {
      acc[name] = { name, AM: 0, PM: 0, Leave: 0, Total: 0, events: [] };
    }
    let key = 'Other';
    if (['AM', 'Morning'].includes(shift)) key = 'AM';
    else if (['PM', 'Afternoon', 'Night'].includes(shift)) key = 'PM';
    else if (shift === 'Leave') key = 'Leave';
    if (key !== 'Other') {
      acc[name][key] += 1;
    }
    acc[name].Total += 1;
    acc[name].events.push(event);
    return acc;
  }, {})).sort((a, b) => a.name.localeCompare(b.name));

  const monthlyRotationData = allMonthlyRotationData.filter(row => 
    row.name.toLowerCase().includes(monthlySearchName.toLowerCase())
  );

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

  const exportMonthlyPDF = async () => {
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

        doc.setFont("times", "bold");
        doc.setFontSize(11);
        let titleText = `Monthly Duty Summary: ${selectedMonth}`;
        if (monthlySearchName && monthlyRotationData.length === 1) {
          titleText += ` - ${monthlyRotationData[0].name}`;
        } else if (monthlySearchName && monthlyRotationData.length > 1) {
          titleText += ` (Filtered)`;
        }
        doc.text(titleText, 14, 60);
      };

      drawHeaderAndFooter();
      
      const detailedHeader = [["Name", "Date", "Shift/Status", "Actual In", "Actual Out", "Remarks"]];
      const detailedData = [];
      monthlyRotationData.forEach(row => {
        row.events.sort((a,b) => a.date.localeCompare(b.date)).forEach(e => {
          let shiftName = e.title.split(' - ')[1] || 'Duty';
          if (shiftName === 'Morning') shiftName = 'AM';
          if (shiftName === 'Afternoon' || shiftName === 'Night') shiftName = 'PM';

          detailedData.push([
            row.name,
            e.date,
            e.isLeave ? `Excused` : shiftName,
            e.timeIn || '--',
            e.timeOut || '--',
            e.isLeave ? e.leaveType : ''
          ]);
        });
      });

      autoTable(doc, {
        head: detailedHeader,
        body: detailedData,
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

      doc.save(`monthly-summary-${selectedMonth}${monthlySearchName ? `-${monthlySearchName}` : ''}.pdf`);
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
          <MonthlySection>
            <ReportHeader>
              <div>
                <h3>Monthly Rotation Report</h3>
                <p>Review the shift rotation counts for the selected month.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <SearchInput
                  type="text"
                  placeholder="Search name..."
                  value={monthlySearchName}
                  onChange={(e) => setMonthlySearchName(e.target.value)}
                />
                <MonthInput
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
                <ExportButton onClick={exportMonthlyPDF} disabled={monthlyRotationData.length === 0}>
                  Export PDF
                </ExportButton>
              </div>
            </ReportHeader>
            <RotationTable>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>AM</th>
                  <th>PM</th>
                  <th>Leave</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRotationData.length > 0 ? (
                  monthlyRotationData.map((row) => (
                    <React.Fragment key={row.name}>
                      <tr>
                        <td>{row.name}</td>
                        <td>{row.AM}</td>
                        <td>{row.PM}</td>
                        <td>{row.Leave}</td>
                        <td>{row.Total}</td>
                        <td>
                          <button 
                            onClick={() => setExpandedRowName(expandedRowName === row.name ? null : row.name)}
                            style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s' }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#dbeafe'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                          >
                            {expandedRowName === row.name ? 'Hide Details' : 'See More'}
                          </button>
                        </td>
                      </tr>
                      {expandedRowName === row.name && (
                        <tr>
                          <td colSpan="6" style={{ background: '#f8fafc', padding: '16px', borderBottom: '2px solid #e2e8f0' }}>
                            <div style={{ fontSize: '14px', color: '#334155' }}>
                              <strong style={{ display: 'block', marginBottom: '10px', color: '#0f172a' }}>Scheduled Dates for {row.name}:</strong>
                              {row.events.length > 0 ? (
                                <ul style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  {row.events.sort((a,b) => a.date.localeCompare(b.date)).map(e => {
                                    let shiftDisplay = e.title.split(' - ')[1] || 'Duty';
                                    if (shiftDisplay === 'Morning') shiftDisplay = 'AM';
                                    if (shiftDisplay === 'Afternoon' || shiftDisplay === 'Night') shiftDisplay = 'PM';

                                    return (
                                      <li key={e.id} style={{ marginBottom: '8px' }}>
                                        {!e.isLeave && <strong style={{ color: '#2563eb' }}>{e.date}</strong>}
                                        {!e.isLeave && ` - ${shiftDisplay}`}
                                        {!e.isLeave && (
                                          <span style={{ color: '#0f766e', fontSize: '13px', marginLeft: '12px' }}>
                                            (In: {e.timeIn || '--'} | Out: {e.timeOut || '--'})
                                          </span>
                                        )}
                                        {e.isLeave && (
                                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>
                                            {getDisplayDate(e)} - Excused ({e.leaveType})
                                          </span>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>No specific schedule records found.</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="empty-state">No shift rotation records for this month.</td>
                  </tr>
                )}
              </tbody>
            </RotationTable>
          </MonthlySection>

          <div style={{ marginTop: '12px', borderTop: '2px solid #e2e8f0', paddingTop: '24px' }}>
            <DataHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h3>Daily Records for: {selectedDate}</h3>
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
                    let nameDisplay = event.title ? event.title : "Unknown";
                    if (nameDisplay.includes(' - ')) {
                      const parts = nameDisplay.split(' - ');
                      let shift = parts[1];
                      if (shift === 'Morning') shift = 'AM';
                      if (shift === 'Afternoon' || shift === 'Night') shift = 'PM';
                      nameDisplay = `${parts[0]} - ${shift}`;
                    }
                    
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
          </div>
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
  color: ${({ theme }) => theme.text.primary};
  font-weight: 700;
  border-bottom: 3px solid ${({ theme }) => theme.border.main};
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
  background: ${({ theme }) => theme.bg.card};
  padding: 20px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.border.main};
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);

  .calendar-wrapper {
    /* FullCalendar custom compact styling */
    .fc-theme-standard .fc-scrollgrid {
      border-color: ${({ theme }) => theme.border.main};
    }
    .fc-theme-standard td, .fc-theme-standard th {
      border-color: ${({ theme }) => theme.border.main};
    }
    .fc-button-primary {
      background-color: transparent !important;
      border: none !important;
      color: ${({ theme }) => theme.text.muted} !important;
    }
    .fc-button-primary:hover {
      color: ${({ theme }) => theme.text.primary} !important;
    }
    .fc-toolbar-title {
      font-size: 16px;
      color: ${({ theme }) => theme.text.primary};
      font-weight: 600;
    }
    .fc-theme-standard .fc-col-header-cell {
      background: ${({ theme }) => theme.bg.card} !important;
      border-color: ${({ theme }) => theme.border.main} !important;
    }
    .fc-col-header-cell,
    .fc-col-header-cell-cushion {
      color: ${({ theme }) => theme.text.primary} !important;
    }
    .fc-col-header-cell-cushion {
      font-size: 14px;
      padding: 4px;
      text-transform: uppercase;
      font-weight: 700;
    }
    .fc-daygrid-day-number {
      color: ${({ theme }) => theme.text.secondary} !important;
      font-size: 14px;
      font-weight: 600;
      padding: 4px;
    }
    .fc-day-today {
      background-color: ${({ theme }) => theme.bg.hover} !important;
    }
    .fc-highlight {
      background: ${({ theme }) => theme.primary.light} !important;
    }
    .fc-daygrid-day {
      cursor: pointer;
    }
    .fc-daygrid-day:hover {
      background-color: ${({ theme }) => theme.bg.main};
    }
  }
`;

const DataSide = styled.div`
  background: ${({ theme }) => theme.bg.card};
  padding: 24px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.border.main};
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
`;

const DataHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h3 {
    font-size: 20px;
    color: ${({ theme }) => theme.text.primary};
    margin: 0;
  }
  
  span {
    background: ${({ theme }) => theme.bg.hover};
    color: ${({ theme }) => theme.text.secondary};
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
  }
`;

const MonthlySection = styled.div`
  background: ${({ theme }) => theme.bg.main};
  border: 1px solid ${({ theme }) => theme.border.main};
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
    color: ${({ theme }) => theme.text.primary};
  }

  p {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.text.secondary};
    font-size: 14px;
  }
`;

const MonthInput = styled.input`
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.border.main};
  border-radius: 10px;
  background: ${({ theme }) => theme.bg.input};
  color: ${({ theme }) => theme.text.primary};
  font-size: 14px;
  width: 190px;
`;

const SearchInput = styled.input`
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.border.main};
  border-radius: 10px;
  background: ${({ theme }) => theme.bg.input};
  color: ${({ theme }) => theme.text.primary};
  font-size: 14px;
  width: 190px;
  
  &::placeholder {
    color: ${({ theme }) => theme.text.muted};
  }
`;

const RotationTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;

  th, td {
    padding: 10px 12px;
    border-bottom: 1px solid ${({ theme }) => theme.border.main};
    text-align: left;
    white-space: nowrap;
  }

  th {
    color: ${({ theme }) => theme.text.secondary};
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    background: ${({ theme }) => theme.bg.accent};
    letter-spacing: 0.5px;
  }

  td {
    color: ${({ theme }) => theme.text.primary};
    font-size: 14px;
  }

  tbody tr:hover td {
    background-color: ${({ theme }) => theme.bg.hover};
  }

  .empty-state {
    text-align: center;
    padding: 24px;
    color: ${({ theme }) => theme.text.muted};
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
    border-bottom: 1px solid ${({ theme }) => theme.border.main};
    text-align: left;
    white-space: nowrap;
  }

  th {
    color: ${({ theme }) => theme.text.secondary};
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    background: ${({ theme }) => theme.bg.hover};
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
    color: ${({ theme }) => theme.text.primary};
    font-size: 14px;
  }

  strong {
    color: ${({ theme }) => theme.text.primary};
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
