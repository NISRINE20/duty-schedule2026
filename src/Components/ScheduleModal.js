import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { calculateLeaveEndDate } from "../utils/leaveCalculations";

function ScheduleModal({ isOpen, onClose, selectedDate, onSave, modalType }) {
  const [isRepeating, setIsRepeating] = useState(false);
  const [untilDate, setUntilDate] = useState("");
  const [selectedDays, setSelectedDays] = useState([]);
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveDays, setLeaveDays] = useState(1);
  const [excludeWeekends, setExcludeWeekends] = useState(false);
  const [shiftType, setShiftType] = useState('Morning');
  const [leaveType, setLeaveType] = useState('Sick Leave');
  const [otherLeaveStr, setOtherLeaveStr] = useState('');
  const [name, setName] = useState('');

  const authName = localStorage.getItem('authName');

  const daysOfWeek = [
    { label: 'Sun', value: 0 },
    { label: 'Mon', value: 1 },
    { label: 'Tue', value: 2 },
    { label: 'Wed', value: 3 },
    { label: 'Thu', value: 4 },
    { label: 'Fri', value: 5 },
    { label: 'Sat', value: 6 }
  ];

  useEffect(() => {
    if (isOpen) {
      setIsRepeating(false);
      setUntilDate("");
      setShiftType(modalType === 'leave' ? 'Leave' : 'Morning');
      setLeaveType('Sick Leave');
      setOtherLeaveStr('');
      setLeaveDays(1);
      setExcludeWeekends(false);
      setLeaveEndDate(selectedDate || '');
      setName(authName || '');
      if (selectedDate) {
        // We'll treat the string YYYY-MM-DD correctly, taking timezone into account
        const [year, month, day] = selectedDate.split('-');
        const d = new Date(year, month - 1, day);
        setSelectedDays([d.getDay()]);
      } else {
        setSelectedDays([]);
      }
    }
  }, [isOpen, selectedDate, modalType, authName]);

  // Recalculate leave end date when days or weekend exclusion changes
  useEffect(() => {
    if (modalType === 'leave' && selectedDate && leaveDays > 0) {
      const calculatedEndDate = calculateLeaveEndDate(selectedDate, leaveDays, excludeWeekends);
      setLeaveEndDate(calculatedEndDate);
    }
  }, [selectedDate, leaveDays, excludeWeekends, modalType]);

  if (!isOpen) return null;

  return (
    <Overlay>
      <ModalContainer $isRepeating={isRepeating}>
        <h2>{modalType === 'leave' ? 'Request Leave' : 'Add Duty Schedule'}</h2>
        <CloseButton onClick={onClose}>×</CloseButton>
        <p>Date: {selectedDate}</p>

        <Grid $isRepeating={isRepeating}>
          <Column>
            <Label>Name:</Label>
            <Input type="text" id="name" value={name} onChange={e => setName(e.target.value)} />

            <Label>Shift:</Label>
            <Select id="shift" value={shiftType} onChange={e => setShiftType(e.target.value)}>
              {modalType === 'leave' ? (
                <option value="Leave">Leave</option>
              ) : (
                <>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Night">Night</option>
                  <option value="Leave">Leave</option>
                </>
              )}
            </Select>

            {shiftType !== 'Leave' ? (
              <>
                <Label>Scheduled Time In:</Label>
                <Input type="time" id="scheduledTimeIn" defaultValue="08:00" />
                
                <Label>Scheduled Time Out:</Label>
                <Input type="time" id="scheduledTimeOut" defaultValue="17:00" />
              </>
            ) : (
              <>
                <Label>Leave Type:</Label>
                <Select value={leaveType} onChange={e => setLeaveType(e.target.value)}>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Informal Leave">Informal Leave</option>
                  <option value="Ordinary Leave">Ordinary Leave</option>
                  <option value="Passes">Passes</option>
                  <option value="Mental Wellness Break (MWB)">Mental Wellness Break (MWB)</option>
                  <option value="Other">Other (Specify)</option>
                </Select>
                {leaveType === 'Other' && (
                  <Input
                    type="text"
                    placeholder="Specify leave type..."
                    style={{ marginTop: '12px' }}
                    value={otherLeaveStr}
                    onChange={e => setOtherLeaveStr(e.target.value)}
                  />
                )}

                <Label style={{ marginTop: '16px' }}>Number of Leave Days:</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={leaveDays}
                  onChange={(e) => setLeaveDays(Math.max(1, parseInt(e.target.value) || 1))}
                />

                <CheckboxContainer style={{ marginTop: '12px' }}>
                  <input
                    type="checkbox"
                    id="excludeWeekends"
                    checked={excludeWeekends}
                    onChange={(e) => setExcludeWeekends(e.target.checked)}
                  />
                  <label htmlFor="excludeWeekends">Exclude weekends (working days only)</label>
                </CheckboxContainer>

                <Label style={{ marginTop: '16px' }}>Leave End Date:</Label>
                <Input
                  type="date"
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  min={selectedDate}
                />
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  {excludeWeekends ? 'Working days' : 'Calendar days'} • {leaveDays} day{leaveDays !== 1 ? 's' : ''} requested
                </div>
              </>
            )}

            {modalType !== 'leave' && (
              <CheckboxContainer style={{ marginTop: '16px' }}>
                <input
                  type="checkbox"
                  id="isRepeating"
                  checked={isRepeating}
                  onChange={(e) => setIsRepeating(e.target.checked)}
                />
                <label htmlFor="isRepeating">Repeat Schedule?</label>
              </CheckboxContainer>
            )}
          </Column>

          {isRepeating && (
            <Column>
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', flex: 1, height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                <Label style={{ marginTop: 0 }}>Select Days:</Label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {daysOfWeek.map(day => (
                    <DayToggle 
                      key={day.value}
                      active={selectedDays.includes(day.value)}
                      onClick={() => {
                        if (selectedDays.includes(day.value)) {
                          setSelectedDays(selectedDays.filter(d => d !== day.value));
                        } else {
                          setSelectedDays([...selectedDays, day.value]);
                        }
                      }}
                    >
                      {day.label}
                    </DayToggle>
                  ))}
                </div>

                <Label style={{ marginTop: 'auto' }}>Until Date:</Label>
                <Input 
                  type="date" 
                  id="untilDate" 
                  value={untilDate}
                  onChange={(e) => setUntilDate(e.target.value)}
                  min={selectedDate}
                  style={{ boxSizing: 'border-box' }}
                />
              </div>
            </Column>
          )}
        </Grid>

        <ButtonGroup>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            primary
            onClick={() => {
              const name = document.getElementById("name").value.trim();
              if (!name) {
                alert("Please enter a name.");
                return;
              }

              let scheduledTimeIn = "";
              let scheduledTimeOut = "";
              let isLeave = false;
              let finalLeaveType = "";

              if (shiftType !== 'Leave') {
                scheduledTimeIn = document.getElementById("scheduledTimeIn").value;
                scheduledTimeOut = document.getElementById("scheduledTimeOut").value;
              } else {
                isLeave = true;
                finalLeaveType = leaveType === 'Other' ? otherLeaveStr : leaveType;
                if (!finalLeaveType.trim()) {
                  alert("Please specify the leave type.");
                  return;
                }
              }
              
              if (modalType !== 'leave' && isRepeating && !untilDate) {
                alert("Please select an Until Date for the repeating schedule.");
                return;
              }
              if (modalType !== 'leave' && isRepeating && selectedDays.length === 0) {
                alert("Please select at least one day to repeat.");
                return;
              }
              if (shiftType === 'Leave' && !leaveEndDate) {
                alert("Please select the leave end date.");
                return;
              }
              if (shiftType === 'Leave' && leaveEndDate < selectedDate) {
                alert("Leave end date cannot be before the start date.");
                return;
              }
              if (shiftType === 'Leave' && leaveDays < 1) {
                alert("Number of leave days must be at least 1.");
                return;
              }

              onSave({ 
                name, 
                shift: shiftType, 
                scheduledTimeIn, 
                scheduledTimeOut, 
                isRepeating, 
                selectedDays, 
                untilDate,
                isLeave,
                leaveType: finalLeaveType,
                leaveEndDate,
                leaveDays,
                excludeWeekends
              });
              onClose();
            }}
          >
            Save
          </Button>
        </ButtonGroup>
      </ModalContainer>
    </Overlay>
  );
}

export default ScheduleModal;

// Styled Components
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow-y: auto;
  padding: 20px 0;
  z-index: 1000;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContainer = styled.div`
  background: #ffffff;
  padding: 32px;
  border-radius: 16px;
  width: 90%;
  max-width: ${props => props.$isRepeating ? '900px' : '500px'};
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease-in-out;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;

  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  @media (max-width: 900px) {
    max-width: ${props => props.$isRepeating ? '85vw' : '500px'};
  }

  @media (max-width: 768px) {
    padding: 24px;
    max-width: 90%;
  }

  @media (max-width: 600px) {
    padding: 20px;
    max-width: 95%;
  }

  h2 {
    margin-top: 0;
    color: #1e293b;
    font-size: 24px;
    margin-bottom: 8px;
  }

  p {
    color: #64748b;
    margin-bottom: 24px;
    font-size: 16px;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: ${props => props.$isRepeating ? '1fr 1fr' : '1fr'};
  gap: ${props => props.$isRepeating ? '24px' : '16px'};
  align-items: ${props => props.$isRepeating ? 'start' : 'stretch'};
  transition: all 0.3s ease-in-out;

  @media (max-width: 768px) {
    grid-template-columns: ${props => props.$isRepeating ? '1fr 1fr' : '1fr'};
    gap: ${props => props.$isRepeating ? '16px' : '12px'};
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: 0;
  }
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  display: block;
  margin-top: 16px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 6px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #cbd5e1;
  border-radius: 8px;
  font-size: 16px;
  color: #0f172a;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus {
    border-color: #2563eb;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #cbd5e1;
  border-radius: 8px;
  font-size: 16px;
  color: #0f172a;
  outline: none;
  transition: border-color 0.2s;
  background: white;
  box-sizing: border-box;

  &:focus {
    border-color: #2563eb;
  }
`;

const ButtonGroup = styled.div`
  margin-top: 32px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;

const Button = styled.button`
  padding: 12px 24px;
  border: none;
  cursor: pointer;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s;
  background: ${props => props.primary ? "#2563eb" : "#f1f5f9"};
  color: ${props => props.primary ? "white" : "#475569"};
  box-shadow: ${props => props.primary ? "0 4px 10px rgba(37, 99, 235, 0.2)" : "none"};

  &:hover {
    background: ${props => props.primary ? "#1d4ed8" : "#e2e8f0"};
    transform: ${props => props.primary ? "translateY(-1px)" : "none"};
    box-shadow: ${props => props.primary ? "0 6px 15px rgba(37, 99, 235, 0.3)" : "none"};
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  margin-top: 16px;
  gap: 8px;

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  label {
    font-size: 16px;
    font-weight: 500;
    color: #334155;
    cursor: pointer;
  }
`;

const DayToggle = styled.div`
  padding: 6px 14px;
  border-radius: 20px;
  background: ${props => props.active ? '#2563eb' : '#e2e8f0'};
  color: ${props => props.active ? 'white' : '#475569'};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.active ? '#1d4ed8' : '#cbd5e1'};
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 24px;
  color: #64748b;
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
    color: #334155;
  }
`;