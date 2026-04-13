import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { verifyLocation } from "../utils/geolocation";
import { getEventStatus } from "../utils/statusHelper";
import Loader from './Loader';

function TimeLogModal({ isOpen, onClose, event, onSave, onDelete }) {
  const [timeIn, setTimeIn] = useState(event?.timeIn || '');
  const [timeOut, setTimeOut] = useState(event?.timeOut || '');
  const [isConfirmed, setIsConfirmed] = useState(event?.isConfirmed || false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [locationError, setLocationError] = useState('');

  const userRole = localStorage.getItem('authRole');
  const authName = localStorage.getItem('authName');

  useEffect(() => {
    if (event) {
      setTimeIn(event.timeIn || '');
      setTimeOut(event.timeOut || '');
      setIsConfirmed(event?.isConfirmed || false);
      setShowConfirm(false);
      setLocationError('');
      setIsVerifying(false);
    }
  }, [event]);

  const handleSave = () => {
    onSave({ timeIn, timeOut, isConfirmed });
    onClose();
  };

  if (!isOpen || !event) return null;

  const displayDate = event.date || (event.start ? new Date(event.start).toISOString().split('T')[0] : 'Unknown');

  const statusLabel = getEventStatus(
    timeIn,
    timeOut,
    event?.scheduledTimeIn,
    event?.scheduledTimeOut,
    displayDate
  );

  const eventName = event.title ? event.title.split(" - ")[0] : "";
  const isOwnSchedule = authName && eventName && authName.toLowerCase() === eventName.toLowerCase();
  const canLogTime = userRole === 'user' && isOwnSchedule;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isToday = displayDate === todayStr;

  return (
    <Overlay>
      {isVerifying && <Loader message="Verifying your location..." />}
      <ModalContainer>
        <h2>{canLogTime ? 'Log Time' : 'Duty Details'} for {event.title}</h2>
        <p>Date: {displayDate}</p>

        {event.scheduledTimeIn && (
          <div style={{ marginBottom: '15px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '15px', color: '#475569' }}>
              <strong>Scheduled Time:</strong> {event.scheduledTimeIn} - {event.scheduledTimeOut || '?'}
            </div>
            {statusLabel && (
              <div style={{ marginTop: '8px', fontSize: '16px', fontWeight: 'bold', color: statusLabel.includes('Late') || statusLabel.includes('Absent') || statusLabel.includes('Early Timeout') ? '#ef4444' : (statusLabel.includes('On Time') ? '#22c55e' : '#f59e0b') }}>
                Status: {statusLabel}
              </div>
            )}
          </div>
        )}

        {!canLogTime ? (
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
            <div style={{ fontSize: '15px', color: '#334155', marginBottom: '12px' }}>
              <strong>Actual Time In:</strong> <span style={{ color: timeIn ? '#0f172a' : '#94a3b8' }}>{timeIn || 'Not logged yet'}</span>
            </div>
            <div style={{ fontSize: '15px', color: '#334155' }}>
              <strong>Actual Time Out:</strong> <span style={{ color: timeOut ? '#0f172a' : '#94a3b8' }}>{timeOut || 'Not logged yet'}</span>
              {timeOut && event.scheduledTimeOut && timeOut < event.scheduledTimeOut && (
                <span style={{ color: '#ef4444', fontSize: '13px', marginLeft: '6px', fontWeight: 'bold' }}>(Early Timeout)</span>
              )}
            </div>
            
            {!isOwnSchedule && userRole === 'user' && (
              <div style={{ marginTop: '12px', color: '#ef4444', fontSize: '14px', fontWeight: 'bold' }}>
                You can only log time for your own assigned schedules.
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginTop: '10px', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!isToday && (
              <div style={{ padding: '10px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#ef4444', fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }}>
                ⏳ You can only log time exactly on {displayDate}.
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '15px', color: '#475569' }}>
                <strong>Actual Time In:</strong><br/>{timeIn || 'Not logged yet'}
              </div>
              {!timeIn ? (
                <Button style={{ margin: 0, padding: '8px 16px', fontSize: '14px' }} primary disabled={isVerifying || !isToday} title={!isToday ? "You can only log time on the exact scheduled date" : ""} onClick={async () => {
                  setLocationError('');
                  setIsVerifying(true);
                  const result = await verifyLocation();
                  setIsVerifying(false);
                  
                  if (!result.allowed) {
                    setLocationError(result.error || `Verification failed: You are ${result.distance} meters away.`);
                    return;
                  }

                  const now = new Date();
                  setTimeIn(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
                }}>
                  {isVerifying ? 'Verifying Locator...' : 'Log Time In'}
                </Button>
              ) : (
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓ Recorded</span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '15px', color: '#475569' }}>
                <strong>Actual Time Out:</strong><br/>{timeOut || 'Not logged yet'}
                {timeOut && event.scheduledTimeOut && timeOut < event.scheduledTimeOut && (
                  <span style={{ color: '#ef4444', fontSize: '13px', marginLeft: '6px', fontWeight: 'bold' }}>(Early)</span>
                )}
              </div>
              {!timeOut ? (
                <Button style={{ margin: 0, padding: '8px 16px', fontSize: '14px' }} primary={!!timeIn} disabled={!timeIn || isVerifying || !isToday} title={!isToday ? "You can only log time on the exact scheduled date" : ""} onClick={async () => {
                  setLocationError('');
                  setIsVerifying(true);
                  const result = await verifyLocation();
                  setIsVerifying(false);
                  
                  if (!result.allowed) {
                    setLocationError(result.error || `Verification failed: You are ${result.distance} meters away.`);
                    return;
                  }

                  const now = new Date();
                  setTimeOut(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
                }}>
                  {isVerifying ? 'Verifying Locator...' : 'Log Time Out'}
                </Button>
              ) : (
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓ Recorded</span>
              )}
            </div>
            
            {locationError && (
              <div style={{ color: '#ef4444', fontSize: '14px', fontWeight: 'bold', background: '#fef2f2', padding: '10px', borderRadius: '6px', border: '1px solid #fca5a5' }}>
                📍 {locationError}
              </div>
            )}
          </div>
        )}

        {userRole === 'admin' ? (
          <>
            <Label>Admin Status:</Label>
            <CheckboxLabel style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
              />
              Mark as Shift Confirmed
            </CheckboxLabel>
          </>
        ) : (
          isConfirmed && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#dcfce7', color: '#166534', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
              <span style={{ marginRight: '8px', fontSize: '18px' }}>✅</span> This shift has been officially confirmed by an administrator.
            </div>
          )
        )}

        {userRole === 'user' && (
          <div style={{ marginTop: '16px', fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '10px', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
            ℹ️ If you need to correct a logged time or change your schedule, please go to the Admin.
          </div>
        )}

        <ButtonGroup>
          {userRole === 'admin' && onDelete && !showConfirm && (
            <Button 
              style={{ backgroundColor: '#ef4444', color: 'white', marginRight: 'auto' }} 
              onClick={(e) => {
                e.preventDefault();
                setShowConfirm(true);
              }}
            >
              Delete
            </Button>
          )}
          {userRole === 'admin' && onDelete && showConfirm && (
            <Button 
              style={{ backgroundColor: '#7f1d1d', color: 'white', marginRight: 'auto', border: '2px solid red' }} 
              onClick={(e) => {
                e.preventDefault();
                onDelete();
              }}
            >
              Confirm Delete?
            </Button>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button primary onClick={handleSave}>
            Save
          </Button>
        </ButtonGroup>
      </ModalContainer>
    </Overlay>
  );
}

export default TimeLogModal;

// Styled Components (similar to ScheduleModal)
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContainer = styled.div`
  background: white;
  padding: 25px;
  border-radius: 15px;
  width: 90%;
  max-width: 400px;

  @media (max-width: 480px) {
    padding: 20px;
  }
`;

const Label = styled.label`
  display: block;
  margin-top: 15px;
  font-weight: bold;
`;

const ButtonGroup = styled.div`
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const Button = styled.button`
  padding: 8px 15px;
  border: none;
  cursor: pointer;
  border-radius: 5px;
  background: ${props => props.primary ? "#2563eb" : "#ccc"};
  color: ${props => props.primary ? "white" : "black"};
  font-weight: bold;

  &:hover {
    opacity: 0.9;
  }
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  font-size: 16px;
  cursor: pointer;
  
  input {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }
`;