import React, { useState, useEffect } from "react";
import styled from "styled-components";

function ScheduleModal({ isOpen, onClose, selectedDate, onSave }) {
  const [isRepeating, setIsRepeating] = useState(false);
  const [untilDate, setUntilDate] = useState("");
  const [selectedDays, setSelectedDays] = useState([]);
  const [shiftType, setShiftType] = useState('Morning');
  const [leaveType, setLeaveType] = useState('Sick Leave');
  const [otherLeaveStr, setOtherLeaveStr] = useState('');

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
      setShiftType('Morning');
      setLeaveType('Sick Leave');
      setOtherLeaveStr('');
      if (selectedDate) {
        // We'll treat the string YYYY-MM-DD correctly, taking timezone into account
        const [year, month, day] = selectedDate.split('-');
        const d = new Date(year, month - 1, day);
        setSelectedDays([d.getDay()]);
      } else {
        setSelectedDays([]);
      }
    }
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  return (
    <Overlay>
      <ModalContainer $isRepeating={isRepeating}>
        <h2>Add Duty Schedule</h2>
        <p>Date: {selectedDate}</p>

        <Grid $isRepeating={isRepeating}>
          <Column>
            <Label>Name:</Label>
            <Input type="text" id="name" />

            <Label>Shift:</Label>
            <Select id="shift" value={shiftType} onChange={e => setShiftType(e.target.value)}>
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
              <option value="Night">Night</option>
              <option value="Leave">Leave</option>
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
              </>
            )}

            <CheckboxContainer style={{ marginTop: '16px' }}>
              <input 
                type="checkbox" 
                id="isRepeating" 
                checked={isRepeating} 
                onChange={(e) => setIsRepeating(e.target.checked)} 
              />
              <label htmlFor="isRepeating">Repeat Schedule?</label>
            </CheckboxContainer>
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
              
              if (isRepeating && !untilDate) {
                alert("Please select an Until Date for the repeating schedule.");
                return;
              }
              if (isRepeating && selectedDays.length === 0) {
                alert("Please select at least one day to repeat.");
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
                leaveType: finalLeaveType
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