import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { db, auth } from '../firebase';
import { STORAGE_KEYS } from '../constants';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import Loader from '../Components/Loader';

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState({ open: false, title: '', message: '', isError: false });
  const [deletionModalOpen, setDeletionModalOpen] = useState(false);
  const [shiftsToDelete, setShiftsToDelete] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'config', 'templates'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.roster)) {
            setTemplates(data.roster);
          } else {
            // Migration handling: if old format, just reset to empty.
            setTemplates([]);
          }
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
      await setDoc(doc(db, 'config', 'templates'), { roster: templates });
      setShowConfirmModal({ open: true, title: 'Success', message: 'Templates configuration saved successfully!', isError: false });
    } catch (e) {
      setShowConfirmModal({ open: true, title: 'Error', message: `Error saving templates: ${e.message}`, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (index, field, value) => {
    setTemplates(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addAssignment = () => {
    setTemplates(prev => [
      ...prev, 
      { name: '', shift: '', timeIn: '', timeOut: '', days: [...ALL_DAYS] } // Default to working all 7 days
    ]);
  };

  const removeAssignment = (index) => {
    setTemplates(prev => prev.filter((_, i) => i !== index));
  };

  const applyToRange = async () => {
    if (!startDate || !endDate) {
      setShowConfirmModal({ open: true, title: 'Error', message: 'Please select both start and end dates.', isError: true });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      setShowConfirmModal({ open: true, title: 'Error', message: 'Start date must be before end date.', isError: true });
      return;
    }

    setIsLoading(true);
    try {
      const eventsSnapshot = await getDocs(collection(db, 'dutyEvents'));
      const currentEvents = eventsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      let addedCount = 0;
      let skippedCount = 0;
      const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
      const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
      
      const startUtc = Date.UTC(sYear, sMonth - 1, sDay);
      const endUtc = Date.UTC(eYear, eMonth - 1, eDay);
      const daysDiff = Math.round((endUtc - startUtc) / (1000 * 60 * 60 * 24));

      if (daysDiff > 365) {
        setShowConfirmModal({ open: true, title: 'Error', message: 'Please select a range of 1 year or less.', isError: true });
        setIsLoading(false);
        return;
      }

      for (let i = 0; i <= daysDiff; i++) {
        const currentDate = new Date(Date.UTC(sYear, sMonth - 1, sDay + i));
        
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

        const currentUserId = auth.currentUser?.uid || localStorage.getItem(STORAGE_KEYS.AUTH_UID) || "";

        for (const template of templates) {
          if (template.name && template.shift && template.days && template.days.includes(dayName)) {
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
                leaveRequestDenied: false,
                userId: currentUserId
              });
              addedCount++;
            } else {
              skippedCount++;
            }
          }
        }
      }
      
      let message = `Successfully processed dates from ${startDate} to ${endDate}.\n\nAdded ${addedCount} new shifts to the calendar.`;
      if (skippedCount > 0) {
        message += ` (${skippedCount} shifts were skipped because they already exist to prevent duplicates).`;
      }
      
      setShowConfirmModal({ open: true, title: 'Template Applied', message: message, isError: false });
    } catch (e) {
      setShowConfirmModal({ open: true, title: 'Error', message: `Failed to apply templates: ${e.message}`, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const findShiftsToDelete = async () => {
    if (!startDate || !endDate) {
      setShowConfirmModal({ open: true, title: 'Error', message: 'Please select both start and end dates.', isError: true });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      setShowConfirmModal({ open: true, title: 'Error', message: 'Start date must be before end date.', isError: true });
      return;
    }

    setIsLoading(true);
    try {
      const eventsSnapshot = await getDocs(collection(db, 'dutyEvents'));
      const currentEvents = eventsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Filter events that fall in the date range
      const shiftsInRange = currentEvents.filter(e => e.date >= startDate && e.date <= endDate);

      // Group them by title
      const grouped = {};
      shiftsInRange.forEach(event => {
        const title = event.title.replace('✅ ', '').trim();
        if (!grouped[title]) {
          grouped[title] = [];
        }
        grouped[title].push(event);
      });

      const groupedArray = Object.keys(grouped).map(title => ({
        title,
        events: grouped[title],
        count: grouped[title].length
      }));

      setShiftsToDelete(groupedArray);
      setDeletionModalOpen(true);
    } catch (e) {
       setShowConfirmModal({ open: true, title: 'Error', message: `Failed to find shifts: ${e.message}`, isError: true });
    } finally {
       setIsLoading(false);
    }
  };

  const deleteSpecificShifts = async (eventsToDel) => {
    setIsDeleting(true);
    try {
      for (const ev of eventsToDel) {
         await deleteDoc(doc(db, 'dutyEvents', ev.id));
      }
      
      // Update local state to remove them immediately from the UI
      const idsToDelete = eventsToDel.map(e => e.id);
      setShiftsToDelete(prev => {
         return prev.map(group => ({
            ...group,
            events: group.events.filter(e => !idsToDelete.includes(e.id)),
            count: group.events.filter(e => !idsToDelete.includes(e.id)).length
         })).filter(group => group.count > 0);
      });

      setShowConfirmModal({ open: true, title: 'Success', message: `Successfully deleted ${eventsToDel.length} shift(s).`, isError: false });
    } catch(e) {
      setShowConfirmModal({ open: true, title: 'Error', message: `Failed to delete shifts: ${e.message}`, isError: true });
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteAllInRange = async () => {
     const allEvents = shiftsToDelete.flatMap(group => group.events);
     if (allEvents.length === 0) return;
     await deleteSpecificShifts(allEvents);
     setDeletionModalOpen(false);
  };

  return (
    <Container>
      {isLoading && <Loader message="Processing templates..." />}
      <Title>Master Schedule Template</Title>
      <Description>Set your standard team shifts and select their working days. Then apply it to any date range!</Description>
      
      <TemplateForm>
        <DayCard $dayColor="#3b82f6">
          <DayHeader>
            <DayLabel>Master Roster</DayLabel>
            <AddButton onClick={addAssignment}>+ Add Person</AddButton>
          </DayHeader>
          <AssignmentsArea>
            {templates.map((assignment, index) => (
              <RowContainer key={index}>
                <InputsWrapper>
                  <InputGroup>
                    <Input
                      type="text"
                      placeholder="Name"
                      value={assignment.name}
                      onChange={(e) => handleChange(index, 'name', e.target.value)}
                    />
                    <Select
                      value={assignment.shift}
                      onChange={(e) => handleChange(index, 'shift', e.target.value)}
                    >
                      <option value="">Shift</option>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </Select>
                  </InputGroup>
                  <InputGroup>
                    <label style={{ flex: 1, fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Time In
                      <Input
                        type="time"
                        style={{ marginTop: '4px', width: '100%', boxSizing: 'border-box' }}
                        value={assignment.timeIn}
                        onChange={(e) => handleChange(index, 'timeIn', e.target.value)}
                      />
                    </label>
                    <label style={{ flex: 1, fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Time Out
                      <Input
                        type="time"
                        style={{ marginTop: '4px', width: '100%', boxSizing: 'border-box' }}
                        value={assignment.timeOut}
                        onChange={(e) => handleChange(index, 'timeOut', e.target.value)}
                      />
                    </label>
                  </InputGroup>
                </InputsWrapper>
                
                <DaysSelector>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginRight: '4px', alignSelf: 'center' }}>Working Days:</span>
                  {ALL_DAYS.map(day => (
                     <DayCheckboxLabel key={day}>
                       <input 
                         type="checkbox" 
                         checked={assignment.days?.includes(day)}
                         onChange={(e) => {
                           const currentDays = assignment.days || [];
                           const newDays = e.target.checked 
                             ? [...currentDays, day]
                             : currentDays.filter(d => d !== day);
                           handleChange(index, 'days', newDays);
                         }}
                       />
                       {day.substring(0, 3)}
                     </DayCheckboxLabel>
                  ))}
                </DaysSelector>

                <RemoveButton onClick={() => removeAssignment(index)} title="Remove assignment">✕</RemoveButton>
              </RowContainer>
            ))}
            {templates.length === 0 && <span style={{ color: '#94a3b8', fontStyle: 'italic', display: 'block', textAlign: 'center', padding: '16px 0' }}>No assignments yet. Click "+ Add Person" to get started.</span>}
          </AssignmentsArea>
        </DayCard>
      </TemplateForm>
      
      <ButtonContainer>
        <SaveButton onClick={saveTemplates}>Save Templates</SaveButton>
        <ApplySection>
          <DateInputGroup>
             <DateWrapper>
               <DateLabel>Start:</DateLabel>
               <DateInput 
                 type="date" 
                 value={startDate} 
                 onChange={(e) => setStartDate(e.target.value)} 
                 title="Select Start Date"
               />
             </DateWrapper>
             <DateWrapper>
               <DateLabel>End:</DateLabel>
               <DateInput 
                 type="date" 
                 value={endDate} 
                 onChange={(e) => setEndDate(e.target.value)} 
                 title="Select End Date"
               />
             </DateWrapper>
           </DateInputGroup>
           <ApplyButton onClick={applyToRange}>Apply Template</ApplyButton>
         </ApplySection>
       </ButtonContainer>

       <DeleteContainer>
         <DeleteButton onClick={findShiftsToDelete}>Find & Delete Shifts</DeleteButton>
       </DeleteContainer>

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

      {deletionModalOpen && (
        <Overlay onClick={() => setDeletionModalOpen(false)}>
          <DeletionModalContainer onClick={e => e.stopPropagation()}>
            <ModalTitle>Delete Shifts</ModalTitle>
            <ModalMessage style={{ marginBottom: '16px' }}>
               Found <strong>{shiftsToDelete.reduce((acc, curr) => acc + curr.count, 0)}</strong> shift(s) from {startDate} to {endDate}.
            </ModalMessage>
            
            {shiftsToDelete.length > 0 && (
               <DeleteAllBtn onClick={deleteAllInRange} disabled={isDeleting}>
                  {isDeleting ? "Processing..." : "Delete ALL Shifts in Range"}
               </DeleteAllBtn>
            )}

            <ShiftsList>
               {shiftsToDelete.length === 0 ? (
                  <p style={{ color: '#64748b', fontStyle: 'italic', margin: '20px 0' }}>No shifts found in this date range.</p>
               ) : (
                  shiftsToDelete.map((group, idx) => (
                     <ShiftGroupRow key={idx}>
                        <div style={{ textAlign: 'left' }}>
                           <strong style={{ display: 'block', color: '#0f172a' }}>{group.title}</strong>
                           <span style={{ fontSize: '13px', color: '#64748b' }}>{group.count} shift(s) scheduled</span>
                        </div>
                        <DeleteSmallBtn 
                           onClick={() => deleteSpecificShifts(group.events)}
                           disabled={isDeleting}
                        >
                           Delete
                        </DeleteSmallBtn>
                     </ShiftGroupRow>
                  ))
               )}
            </ShiftsList>

            <CloseBtn onClick={() => setDeletionModalOpen(false)} style={{ marginTop: '24px', background: '#e2e8f0', color: '#0f172a', width: '100%' }}>
              Close
            </CloseBtn>
          </DeletionModalContainer>
        </Overlay>
      )}
    </Container>
  );
}

export default TemplatesPage;

// Styled Components
const Container = styled.div`
  padding: 20px 24px;
  max-width: 900px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 20px 16px;
  }
`;

const Title = styled.h2`
  margin-bottom: 8px;
  font-size: clamp(22px, 3.5vw, 28px);
  color: ${({ theme }) => theme.text.primary};
  font-weight: 700;
`;

const Description = styled.p`
  margin-bottom: 24px;
  color: ${({ theme }) => theme.text.secondary};
  font-size: clamp(15px, 2.5vw, 18px);
`;

const TemplateForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const DayCard = styled.div`
  background: ${({ theme }) => theme.bg.card};
  padding: 24px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.border.main};
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
  border-top: 6px solid ${(p) => p.$dayColor || '#2563eb'};
  display: flex;
  flex-direction: column;
`;

const DayHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  border-bottom: 2px solid ${({ theme }) => theme.border.main};
  padding-bottom: 12px;
`;

const DayLabel = styled.h3`
  font-size: 24px;
  color: ${({ theme }) => theme.text.primary};
  margin: 0;
`;

const AssignmentsArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 55vh;
  overflow-y: auto;
  padding-right: 8px;

  /* Scrollbar Styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.border.main};
    border-radius: 10px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

const RowContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: ${({ theme }) => theme.bg.main};
  padding: 20px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.border.main};
  position: relative;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    border-color: ${({ theme }) => theme.border.focus};
  }
`;

const InputsWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
`;

const InputGroup = styled.div`
  display: flex;
  gap: 12px;
  flex: 1;
  min-width: 250px;

  @media (max-width: 480px) {
    flex-direction: column;
    gap: 8px;
    min-width: 100%;
  }
`;

const Input = styled.input`
  flex: 1;
  padding: 10px 12px;
  border: 2px solid ${({ theme }) => theme.border.main};
  border-radius: 6px;
  font-size: 14px;
  background: ${({ theme }) => theme.bg.input};
  color: ${({ theme }) => theme.text.primary};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.primary.main};
  }
`;

const Select = styled.select`
  flex: 1;
  padding: 10px 12px;
  border: 2px solid ${({ theme }) => theme.border.main};
  border-radius: 6px;
  font-size: 14px;
  background: ${({ theme }) => theme.bg.input};
  color: ${({ theme }) => theme.text.primary};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.primary.main};
  }
`;

const DaysSelector = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px dashed ${({ theme }) => theme.border.main};
`;

const DayCheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: ${({ theme }) => theme.text.primary};
  cursor: pointer;
  background: ${({ theme }) => theme.bg.card};
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.border.main};
  transition: all 0.2s;
  
  &:hover {
    background: ${({ theme }) => theme.bg.accent};
  }
`;

const AddButton = styled.button`
  padding: 8px 20px;
  background: transparent;
  color: ${({ theme }) => theme.primary.main};
  border: 2px solid ${({ theme }) => theme.primary.main};
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 15px;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.bg.accent};
  }
`;

const RemoveButton = styled.button`
  position: absolute;
  top: -12px;
  right: -12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ theme }) => theme.bg.card};
  color: #ef4444;
  border: 2px solid #ef4444;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);

  &:hover {
    background: #ef4444;
    color: white;
    transform: scale(1.1);
  }
  
  @media (max-width: 768px) {
    top: -8px;
    right: -8px;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end; /* This ensures the SaveButton matches the bottom of ApplyButton */
  gap: 20px;
  margin-top: 32px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const ApplySection = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex: 2;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const DateInputGroup = styled.div`
  display: flex;
  gap: 12px;
  flex: 2;
  
  @media (max-width: 480px) {
    flex-direction: column;
  }
`;

const DateWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
`;

const DateLabel = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.text.secondary};
  font-weight: 500;
`;

const DateInput = styled.input`
  padding: 14px;
  border: 2px solid ${({ theme }) => theme.border.main};
  border-radius: 10px;
  font-size: 15px;
  background: ${({ theme }) => theme.bg.input};
  color: ${({ theme }) => theme.text.primary};
  outline: none;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;

  &:focus {
    border-color: ${({ theme }) => theme.primary.main};
  }
`;

const SaveButton = styled.button`
  padding: 16px 28px;
  background: ${({ theme }) => theme.bg.card};
  color: ${({ theme }) => theme.primary.main};
  border: 2px solid ${({ theme }) => theme.primary.main};
  border-radius: 10px;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  flex: 1;
  transition: all 0.2s;
  height: 54px; /* match the ApplyButton height */
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.bg.accent};
    transform: translateY(-2px);
  }
`;

const ApplyButton = styled.button`
  padding: 16px 28px;
  background: ${({ theme }) => theme.primary.main};
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  flex: 1;
  transition: all 0.2s;
  height: 54px;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.primary.hover};
    transform: translateY(-2px);
  }
`;

const DeleteButton = styled.button`
  padding: 14px 32px;
  background: transparent;
  color: #ef4444;
  border: 2px solid #ef4444;
  border-radius: 10px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background: #ef4444;
    color: white;
    transform: translateY(-2px);
  }
`;

const DeleteContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 24px;
  width: 100%;
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
  background: ${({ theme }) => theme.bg.card};
  color: ${({ theme }) => theme.text.primary};
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
  color: ${({ theme }) => theme.text.secondary};
  font-size: 16px;
  line-height: 1.5;
  white-space: pre-wrap;
`;

const CloseBtn = styled.button`
  background: ${({ theme }) => theme.primary.main};
  color: white;
  border: none;
  padding: 12px 32px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.primary.hover};
  }
`;

const DeletionModalContainer = styled(ModalContainer)`
  max-width: 480px;
  padding: 24px;
`;

const ShiftsList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 8px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
  }
`;

const ShiftGroupRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
`;

const DeleteAllBtn = styled.button`
  width: 100%;
  background: #ef4444;
  color: white;
  border: none;
  padding: 14px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  margin-bottom: 8px;
  transition: all 0.2s;

  &:hover {
    background: #dc2626;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DeleteSmallBtn = styled.button`
  background: #fee2e2;
  color: #ef4444;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #ef4444;
    color: white;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;