import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import Loader from '../Components/Loader';

const DAY_COLORS = {
  Monday: '#ef4444',
  Tuesday: '#f97316',
  Wednesday: '#eab308',
  Thursday: '#22c55e',
  Friday: '#06b6d4',
  Saturday: '#3b82f6',
  Sunday: '#a855f7'
};

function TemplatesPage() {
  const [templates, setTemplates] = useState({
    Monday: [{ name: '', shift: '', timeIn: '', timeOut: '' }],
    Tuesday: [{ name: '', shift: '', timeIn: '', timeOut: '' }],
    Wednesday: [{ name: '', shift: '', timeIn: '', timeOut: '' }],
    Thursday: [{ name: '', shift: '', timeIn: '', timeOut: '' }],
    Friday: [{ name: '', shift: '', timeIn: '', timeOut: '' }],
    Saturday: [{ name: '', shift: '', timeIn: '', timeOut: '' }],
    Sunday: [{ name: '', shift: '', timeIn: '', timeOut: '' }],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState({ open: false, title: '', message: '', isError: false });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'config', 'templates'));
        if (docSnap.exists()) {
          setTemplates(docSnap.data());
        }
      } catch (e) {
        console.error("Error fetching templates:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const saveTemplates = async () => {
    setIsLoading(true);
    try {
      await setDoc(doc(db, 'config', 'templates'), templates);
      setShowConfirmModal({ open: true, title: 'Success', message: 'Templates configuration saved successfully!', isError: false });
    } catch (e) {
      setShowConfirmModal({ open: true, title: 'Error', message: `Error saving templates: ${e.message}`, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const applyTemplate = async () => {
    if (!selectedMonth) {
      setShowConfirmModal({ open: true, title: 'Error', message: 'Please select a month.', isError: true });
      return;
    }
    setIsLoading(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const eventsToCreate = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
        const dayTemplates = templates[dayOfWeek] || [];

        dayTemplates.forEach((shift) => {
          if (shift.name && shift.shift && shift.timeIn && shift.timeOut) {
            eventsToCreate.push({
              title: `${shift.name} - ${shift.shift}`,
              date: date,
              timeIn: "",
              timeOut: "",
              scheduledTimeIn: shift.timeIn,
              scheduledTimeOut: shift.timeOut,
              isConfirmed: false,
              isOvernight: false,
              isLeave: false,
              leaveType: "",
              leaveEndDate: "",
              leaveDays: 0,
              excludeWeekends: false,
              isLeaveRequestPending: false,
              pendingLeaveType: "",
              leaveRequestDenied: false
            });
          }
        });
      }

      if (eventsToCreate.length === 0) {
        setShowConfirmModal({ open: true, title: 'No Events', message: 'No valid shifts found in the template for the selected month.', isError: true });
        setIsLoading(false);
        return;
      }

      const promises = eventsToCreate.map(event => addDoc(collection(db, 'dutyEvents'), event));
      await Promise.all(promises);

      setShowConfirmModal({ open: true, title: 'Success', message: `Applied template to ${eventsToCreate.length} duty events for ${selectedMonth}!`, isError: false });
    } catch (e) {
      console.error("Error applying template:", e);
      setShowConfirmModal({ open: true, title: 'Error', message: `Error applying template: ${e.message}`, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (day, index, field, value) => {
    setTemplates(prev => {
      const updatedDay = [...prev[day]];
      updatedDay[index] = { ...updatedDay[index], [field]: value };
      return { ...prev, [day]: updatedDay };
    });
  };

  const addAssignment = (day) => {
    setTemplates(prev => ({
      ...prev,
      [day]: [...prev[day], { name: '', shift: '', timeIn: '', timeOut: '' }]
    }));
  };

  const removeAssignment = async (day, index) => {
    const target = templates[day][index];
    
    setIsLoading(true);
    // Auto-sync deletion to the Calendar for the current month
    if (target && target.name) {
      await removeFromCalendar(day, target.name, target.shift);
    }

    setTemplates(prev => {
      const updatedDay = prev[day].filter((_, i) => i !== index);
      return { ...prev, [day]: updatedDay };
    });
    setIsLoading(false);
  };

  const removeFromCalendar = async (dayName, personName, shiftTitle) => {
    try {
      const eventsSnapshot = await getDocs(collection(db, 'dutyEvents'));
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();

      const deletePromises = [];

      eventsSnapshot.docs.forEach(docSnap => {
         const e = { id: docSnap.id, ...docSnap.data() };
         if (!e.date) return;
         
         const eDate = new Date(e.date);
         if (eDate.getFullYear() === year && eDate.getMonth() === month) {
            const eDayName = eDate.toLocaleDateString('en-US', { weekday: 'long' });
            if (eDayName === dayName) {
               const eTitle = e.title.replace('✅ ', '').trim().toLowerCase();
               const targetTitle = `${personName} - ${shiftTitle}`.toLowerCase();
               
               if (eTitle === targetTitle) {
                  deletePromises.push(deleteDoc(doc(db, 'dutyEvents', e.id)));
               }
            }
         }
      });
      await Promise.all(deletePromises);
    } catch (e) {
      console.error("Error removing from calendar:", e);
    }
  };

  const applyToMonth = async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    setIsLoading(true);
    try {
      const eventsSnapshot = await getDocs(collection(db, 'dutyEvents'));
      const currentEvents = eventsSnapshot.docs.map(d => ({id: d.id, ...d.data()}));
      
      const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      let addedCount = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Skip previous dates in the month
        if (dateStr < todayStr) continue;

        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const dayTemplates = templates[dayName] || [];
        
        for (const template of dayTemplates) {
          if (template.name && template.shift) {
            const targetTitle = `${template.name} - ${template.shift}`;
            
            // Anti-duplication check: Ensure shift doesn't already exist for this user on this day
            const alreadyExists = currentEvents.some(e => 
              e.date === dateStr && e.title.replace('✅ ', '').trim().toLowerCase() === targetTitle.toLowerCase()
            );

            if (!alreadyExists) {
              await addDoc(collection(db, 'dutyEvents'), {
                title: targetTitle,
                date: dateStr,
                timeIn: "",
                timeOut: "",
                scheduledTimeIn: template.timeIn || '',
                scheduledTimeOut: template.timeOut || '',
                isConfirmed: false,
                isOvernight: false,
                isLeave: false,
                leaveType: "",
                leaveEndDate: "",
                leaveDays: 0,
                excludeWeekends: false,
                isLeaveRequestPending: false,
                pendingLeaveType: "",
                leaveRequestDenied: false
              });
              addedCount++;
            }
          }
        }
      }
      setShowConfirmModal({ open: true, title: 'Template Applied', message: `Successfully generated and added ${addedCount} new scheduled shifts to the calendar!`, isError: false });
    } catch (e) {
      setShowConfirmModal({ open: true, title: 'Error', message: `Failed to apply templates: ${e.message}`, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      {isLoading && <Loader message="Processing templates..." />}
      <Title>Monthly Schedule Templates</Title>
      <Description>Set default duties for each day of the week. Then apply to the current month.</Description>
      <TemplateForm>
        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
          <DayCard key={day} $dayColor={DAY_COLORS[day]}>
            <DayHeader>
              <DayLabel>{day}</DayLabel>
              <AddButton onClick={() => addAssignment(day)}>+ Add Person</AddButton>
            </DayHeader>
            <AssignmentsArea>
              {(templates[day] || []).map((assignment, index) => (
                <RowContainer key={index}>
                  <InputGroup>
                    <Input
                      type="text"
                      placeholder="Name"
                      value={assignment.name}
                      onChange={(e) => handleChange(day, index, 'name', e.target.value)}
                    />
                    <Select
                      value={assignment.shift}
                      onChange={(e) => handleChange(day, index, 'shift', e.target.value)}
                    >
                      <option value="">Shift</option>
                      <option value="Morning">Morning</option>
                      <option value="Afternoon">Afternoon</option>
                      <option value="Night">Night</option>
                    </Select>
                  </InputGroup>
                  <InputGroup>
                    <label style={{flex: 1, fontSize: '13px', color: '#64748b', fontWeight: '500'}}>Time In
                      <Input
                        type="time"
                        style={{marginTop: '4px', width: '100%', boxSizing: 'border-box'}}
                        value={assignment.timeIn}
                        onChange={(e) => handleChange(day, index, 'timeIn', e.target.value)}
                      />
                    </label>
                    <label style={{flex: 1, fontSize: '13px', color: '#64748b', fontWeight: '500'}}>Time Out
                      <Input
                        type="time"
                        style={{marginTop: '4px', width: '100%', boxSizing: 'border-box'}}
                        value={assignment.timeOut}
                        onChange={(e) => handleChange(day, index, 'timeOut', e.target.value)}
                      />
                    </label>
                  </InputGroup>
                  <RemoveButton onClick={() => removeAssignment(day, index)} title="Remove assignment">✕</RemoveButton>
                </RowContainer>
              ))}
              {(!templates[day] || templates[day].length === 0) && <span style={{color: '#94a3b8', fontStyle: 'italic', display: 'block', textAlign: 'center', padding: '16px 0'}}>No assignments yet.</span>}
            </AssignmentsArea>
          </DayCard>
        ))}
      </TemplateForm>
      <ButtonContainer>
        <SaveButton onClick={saveTemplates}>Save Templates</SaveButton>
        <ApplyButton onClick={applyToMonth}>Apply Template to Current Month</ApplyButton>
      </ButtonContainer>

      {showConfirmModal.open && (
        <Overlay onClick={() => setShowConfirmModal({ ...showConfirmModal, open: false })}>
          <ModalContainer onClick={(e) => e.stopPropagation()}>
            <IconWrapper>
              {showConfirmModal.isError ? "⚠️" : "✨"}
            </IconWrapper>
            <ModalTitle $isError={showConfirmModal.isError}>{showConfirmModal.title}</ModalTitle>
            <ModalMessage>{showConfirmModal.message}</ModalMessage>
            <CloseBtn onClick={() => setShowConfirmModal({ ...showConfirmModal, open: false })}>
              Got it
            </CloseBtn>
          </ModalContainer>
        </Overlay>
      )}
    </Container>
  );
}

export default TemplatesPage;

// Styled Components
const Container = styled.div`
  padding: 20px 24px;
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 20px 16px;
  }
`;

const Title = styled.h2`
  margin-bottom: 8px;
  font-size: clamp(22px, 3.5vw, 28px);
  color: #1e293b;
  font-weight: 700;
`;

const Description = styled.p`
  margin-bottom: 24px;
  color: #475569;
  font-size: clamp(15px, 2.5vw, 18px);
`;

const TemplateForm = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
  align-items: start;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const DayCard = styled.div`
  background: #ffffff;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
  border-top: 6px solid ${(p) => p.$dayColor || '#2563eb'};
  display: flex;
  flex-direction: column;
`;

const DayHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 8px;
`;

const DayLabel = styled.h3`
  font-size: 22px;
  color: #0f172a;
  margin: 0;
`;

const AssignmentsArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const RowContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #f8fafc;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  position: relative;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    border-color: #cbd5e1;
  }
`;

const InputGroup = styled.div`
  display: flex;
  gap: 8px;

  @media (max-width: 480px) {
    flex-direction: column;
    gap: 8px;
  }
`;

const Input = styled.input`
  flex: 1;
  padding: 8px 10px;
  border: 2px solid #cbd5e1;
  border-radius: 6px;
  font-size: 14px;
  outline: none;

  &:focus {
    border-color: #2563eb;
  }
`;

const Select = styled.select`
  flex: 1;
  padding: 8px 10px;
  border: 2px solid #cbd5e1;
  border-radius: 6px;
  font-size: 14px;
  outline: none;

  &:focus {
    border-color: #2563eb;
  }
`;

const AddButton = styled.button`
  padding: 8px 16px;
  background: transparent;
  color: #2563eb;
  border: 2px solid #2563eb;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s;

  &:hover {
    background: #eff6ff;
  }
`;

const RemoveButton = styled.button`
  position: absolute;
  top: -10px;
  right: -10px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #ffffff;
  color: #ef4444;
  border: 2px solid #ef4444;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: #ef4444;
    color: white;
    transform: scale(1.1);
  }
  
  @media (max-width: 768px) {
    margin: 0;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 32px;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const SaveButton = styled.button`
  padding: 16px 28px;
  background: #ffffff;
  color: #2563eb;
  border: 2px solid #2563eb;
  border-radius: 10px;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  flex: 1;
  transition: all 0.2s;

  &:hover {
    background: #eff6ff;
    transform: translateY(-2px);
  }
`;

const ApplyButton = styled.button`
  padding: 16px 28px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  flex: 2;
  transition: all 0.2s;

  &:hover {
    background: #1d4ed8;
    transform: translateY(-2px);
  }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(15, 23, 42, 0.6);
  display: flex; justify-content: center; align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
`;

const ModalContainer = styled.div`
  background: white;
  padding: 32px 24px;
  border-radius: 16px;
  text-align: center;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
`;

const IconWrapper = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`;

const ModalTitle = styled.h2`
  margin: 0 0 12px 0;
  font-size: 24px;
  color: ${props => props.$isError ? '#ef4444' : '#10b981'};
`;

const ModalMessage = styled.p`
  margin: 0 0 24px 0;
  color: #475569;
  font-size: 16px;
  line-height: 1.5;
`;

const CloseBtn = styled.button`
  background: #2563eb;
  color: white;
  border: none;
  padding: 12px 32px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #1d4ed8;
  }
`;