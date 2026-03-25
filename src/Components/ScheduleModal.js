import React from "react";
import styled from "styled-components";

function ScheduleModal({ isOpen, onClose, selectedDate, onSave }) {
  if (!isOpen) return null;

  return (
    <Overlay>
      <ModalContainer>
        <h2>Add Duty Schedule</h2>
        <p>Date: {selectedDate}</p>

        <Label>Name:</Label>
        <Input type="text" id="name" />

        <Label>Shift:</Label>
        <Select id="shift">
          <option value="Morning">Morning</option>
          <option value="Afternoon">Afternoon</option>
          <option value="Night">Night</option>
        </Select>

        <Label>Scheduled Time In:</Label>
        <Input type="time" id="scheduledTimeIn" defaultValue="08:00" />
        
        <Label>Scheduled Time Out:</Label>
        <Input type="time" id="scheduledTimeOut" defaultValue="17:00" />

        <ButtonGroup>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            primary
            onClick={() => {
              const name = document.getElementById("name").value;
              const shift = document.getElementById("shift").value;
              const scheduledTimeIn = document.getElementById("scheduledTimeIn").value;
              const scheduledTimeOut = document.getElementById("scheduledTimeOut").value;
              onSave({ name, shift, scheduledTimeIn, scheduledTimeOut });
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
  align-items: center;
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
  max-width: 450px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
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