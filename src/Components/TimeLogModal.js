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
  
  const [isConverting, setIsConverting] = useState(false);
  const [conversionLeaveType, setConversionLeaveType] = useState('Sick Leave');
  const [conversionOtherStr, setConversionOtherStr] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestLeaveType, setRequestLeaveType] = useState('Sick Leave');
  const [requestOtherStr, setRequestOtherStr] = useState('');
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

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
      setIsConverting(false);
      setConversionLeaveType('Sick Leave');
      setConversionOtherStr('');
      setIsRequesting(false);
      setRequestLeaveType('Sick Leave');
      setRequestOtherStr('');
      setConfirmWithdraw(false);
    }
  }, [event]);

  const handleSave = () => {
    if (isConverting) {
      const finalType = conversionLeaveType === 'Other' ? conversionOtherStr : conversionLeaveType;
      if (!finalType.trim()) {
        alert("Please specify the leave type.");
        return;
      }
      const eventName = event.title ? event.title.split(" - ")[0].replace('✅ ', '') : "";
      
      onSave({
        timeIn: '',
        timeOut: '',
        isConfirmed: true,
        isLeave: true,
        leaveType: finalType,
        title: `${eventName} - Leave`,
        isLeaveRequestPending: false,
        pendingLeaveType: '',
        leaveRequestDenied: false
      });
    } else if (isRequesting) {
      const finalType = requestLeaveType === 'Other' ? requestOtherStr : requestLeaveType;
      if (!finalType.trim()) {
        alert("Please specify the leave type.");
        return;
      }
      onSave({
        isLeaveRequestPending: true,
        pendingLeaveType: finalType,
        leaveRequestDenied: false
      });
    } else {
      onSave({ timeIn, timeOut, isConfirmed });
    }
    onClose();
  };

  if (!isOpen || !event) return null;

  const displayDate = event.date || (event.start ? new Date(event.start).toISOString().split('T')[0] : 'Unknown');

  let dateText = displayDate;
  if (event.leaveEndDate && event.leaveEndDate !== displayDate) {
    dateText = `${displayDate} to ${event.leaveEndDate}`;
  } else if (event?.isOvernight && displayDate !== 'Unknown' && displayDate.includes('-')) {
    const d = new Date(displayDate);
    d.setDate(d.getDate() + 1);
    const nextDayNum = String(d.getDate()).padStart(2, '0');
    const [yyyy, mm, dd] = displayDate.split('-');
    dateText = `${yyyy}/${mm}/${dd}-${nextDayNum}`;
  }

  const statusLabel = getEventStatus(
    timeIn,
    timeOut,
    event?.scheduledTimeIn,
    event?.scheduledTimeOut,
    displayDate,
    event?.isOvernight,
    event?.isLeave,
    event?.leaveType
  );

  const eventName = event.title ? event.title.split(" - ")[0] : "";
  const isOwnSchedule = authName && eventName && authName.toLowerCase() === eventName.toLowerCase();
  const canLogTime = userRole === 'user' && isOwnSchedule;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isToday = displayDate === todayStr;

  const nextDay = new Date(displayDate);
  if (displayDate !== 'Unknown') {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  const nextDayStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;
  const isNextDay = nextDayStr === todayStr;
  
  const canLogInToday = isToday;
  const canLogOutToday = isToday || (event?.isOvernight && isNextDay);
  const cleanEventTitle = event.title ? event.title.replace('✅ ', '').replace(/ - Leave(Request)?$/i, '') : '';
  const modalHeading = event.isLeaveRequestPending ? 'Leave Request Details' : canLogTime ? 'Log Time' : event.isLeave ? 'Leave Details' : 'Duty Details';
  const isExpanded = isConverting || isRequesting;

  return (
    <Overlay>
      {isVerifying && <Loader message="Verifying your location..." />}
      <ModalContainer $isExpanded={isExpanded}>
        <ModalTitle>{modalHeading}</ModalTitle>
        {cleanEventTitle && <ModalSubtitle>for {cleanEventTitle}</ModalSubtitle>}
        <CloseButton onClick={onClose}>×</CloseButton>
        <p>Date: {dateText}</p>

        {event.isLeaveRequestPending && (
          <div style={{ padding: '12px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#92400e' }}>⏳ LEAVE REQUEST PENDING</div>
            <div style={{ fontSize: '14px', color: '#78350f', marginTop: '4px' }}>Waiting for administrator approval</div>
          </div>
        )}

        <Grid $isExpanded={isExpanded}>
          <Column>
            {event.scheduledTimeIn && !event.isLeave && (
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

            {event.isLeave && (
              <div style={{ marginBottom: '15px', padding: '16px', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>

                <strong style={{ fontSize: '18px', color: '#334155' }}>Excused on Leave</strong>
                <div style={{ marginTop: '4px', fontSize: '16px', color: '#64748b' }}>{event.leaveType}</div>
                {event.leaveDays && (
                  <div style={{ marginTop: '8px', fontSize: '14px', color: '#64748b' }}>
                    {event.leaveDays} day{event.leaveDays !== 1 ? 's' : ''} • {event.excludeWeekends ? 'Working days' : 'Calendar days'}
                  </div>
                )}
              </div>
            )}

            {!event.isLeave && !event.leaveRequestDenied && !event.isLeaveRequestPending && (
              <>
                {!canLogTime || event.isLeaveRequestPending ? (
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                    <div style={{ fontSize: '15px', color: '#334155', marginBottom: '12px' }}>
                      <strong>Actual Time In:</strong> <span style={{ color: timeIn ? '#0f172a' : '#94a3b8' }}>{timeIn || 'Not logged yet'}</span>
                    </div>
                    <div style={{ fontSize: '15px', color: '#334155' }}>
                      <strong>Actual Time Out:</strong> <span style={{ color: timeOut ? '#0f172a' : '#94a3b8' }}>{timeOut || 'Not logged yet'}</span>
                      {timeOut && statusLabel && statusLabel.includes('Early Timeout') && (
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
                    {!canLogInToday && !canLogOutToday && (
                      <div style={{ padding: '10px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#ef4444', fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }}>
                        ⏳ You can only log time precisely on your scheduled date(s).
                      </div>
                    )}
                    {event?.isOvernight && (
                      <div style={{ padding: '10px', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '6px', color: '#0369a1', fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }}>
                        🌙 Overnight Shift: Time Out can be logged the next day.
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '15px', color: '#475569' }}>
                        <strong>Actual Time In:</strong><br />{timeIn || 'Not logged yet'}
                      </div>
                      {!timeIn ? (
                        <Button style={{ margin: 0, padding: '8px 16px', fontSize: '14px' }} primary disabled={isVerifying || !canLogInToday} title={!canLogInToday ? "You can only log time on the exact scheduled date" : ""} onClick={async () => {
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
                        <strong>Actual Time Out:</strong><br />{timeOut || 'Not logged yet'}
                        {timeOut && statusLabel && statusLabel.includes('Early Timeout') && (
                          <span style={{ color: '#ef4444', fontSize: '13px', marginLeft: '6px', fontWeight: 'bold' }}>(Early)</span>
                        )}
                      </div>
                      {!timeOut ? (
                        <Button style={{ margin: 0, padding: '8px 16px', fontSize: '14px' }} primary={!!timeIn} disabled={!timeIn || isVerifying || !canLogOutToday} title={!canLogOutToday ? "You can only log time on the exact scheduled date" : ""} onClick={async () => {
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
              </>
            )}

            {userRole === 'admin' && !event.isLeaveRequestPending ? (
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

                {!event.isLeave && !isConverting && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                    <Button 
                      style={{ width: '100%', backgroundColor: '#fcd34d', color: '#78350f' }} 
                      onClick={() => setIsConverting(true)}
                    >
                      Convert to Leave
                    </Button>
                  </div>
                )}
              </>
            ) : (
              !event.isLeave && !event.isLeaveRequestPending && isConfirmed && (
                <div style={{ marginTop: '16px', padding: '12px', background: '#dcfce7', color: '#166534', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                  <span style={{ marginRight: '8px', fontSize: '18px' }}>✅</span> This shift has been officially confirmed by an administrator.
                </div>
              )
            )}

            {userRole === 'user' && isOwnSchedule && (
              <>
                {event.leaveRequestDenied && !event.isLeaveRequestPending && !isRequesting && (
                  <div style={{ background: '#fef2f2', padding: '12px', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', marginBottom: '16px', fontWeight: 'bold' }}>
                    ❌ Your leave request was denied by the administrator.
                  </div>
                )}
                {!event.isLeave && !event.isLeaveRequestPending && !isRequesting && !event.leaveRequestDenied && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                    <Button 
                      style={{ width: '100%', backgroundColor: '#fef08a', color: '#854d0e', border: '1px solid #facc15' }} 
                      onClick={() => setIsRequesting(true)}
                    >
                      Request Leave
                    </Button>
                  </div>
                )}
                {event.isLeaveRequestPending && (
                  <div style={{ padding: '16px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a', marginTop: '16px', display: 'flex', flexDirection: 'column' }}>
                    <Label style={{ color: '#d97706', fontSize: '18px', marginTop: 0 }}>⏳ Leave Request Pending</Label>
                    <p style={{ marginTop: '12px', fontSize: '16px' }}>You requested <strong>{event.leaveDays || 1} day{(event.leaveDays || 1) !== 1 ? 's' : ''}</strong> of <strong>{event.pendingLeaveType}</strong>.</p>
                    {event.leaveDays && (
                      <p style={{ marginTop: '8px', fontSize: '14px', color: '#92400e' }}>
                        {event.excludeWeekends ? 'Working days (excluding weekends)' : 'Calendar days (including weekends)'}
                      </p>
                    )}
                    <p style={{ color: '#64748b', fontSize: '14px', marginTop: 'auto', marginBottom: '16px' }}>Waiting for admin approval.</p>
                    {!confirmWithdraw ? (
                      <Button
                        type="button"
                        style={{ backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d' }}
                        onClick={(e) => {
                            e.preventDefault();
                            setConfirmWithdraw(true);
                        }}
                      >
                        Withdraw Request
                      </Button>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button 
                          type="button"
                          style={{ backgroundColor: '#ef4444', color: '#ffffff', border: '1px solid #dc2626', flex: 1 }} 
                          onClick={async (e) => {
                              e.preventDefault();
                              if (onDelete) {
                                await onDelete();
                              }
                              onClose();
                          }}
                        >
                          Confirm Withdraw
                        </Button>
                        <Button 
                          type="button"
                          style={{ backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' }} 
                          onClick={(e) => {
                              e.preventDefault();
                              setConfirmWithdraw(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ marginTop: '16px', fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '10px', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                  ℹ️ If you need to correct a logged time or change your schedule, please go to the Admin.
                </div>
              </>
            )}

            {event.isLeaveRequestPending && userRole === 'admin' && (
              <div style={{ padding: '16px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a', marginTop: '16px', display: 'flex', flexDirection: 'column' }}>
                <Label style={{ color: '#d97706', fontSize: '18px', marginTop: 0 }}>⏳ Leave Request</Label>
                <p style={{ marginTop: '12px', fontSize: '16px' }}>User requested <strong>{event.leaveDays || 1} day{(event.leaveDays || 1) !== 1 ? 's' : ''}</strong> of <strong>{event.pendingLeaveType}</strong>.</p>
                {event.leaveDays && (
                  <p style={{ marginTop: '8px', fontSize: '14px', color: '#92400e' }}>
                    {event.excludeWeekends ? 'Working days (excluding weekends)' : 'Calendar days (including weekends)'}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  <Button primary style={{flex: 1, backgroundColor: '#16a34a'}} onClick={() => {
                      const eventName = event.title ? event.title.split(" - ")[0].replace('✅ ', '') : "";
                      onSave({
                        timeIn: '', timeOut: '', isConfirmed: true, isLeave: true, leaveType: event.pendingLeaveType,
                        isLeaveRequestPending: false, pendingLeaveType: '', leaveRequestDenied: false,
                        title: `${eventName} - Leave`, leaveDays: event.leaveDays, excludeWeekends: event.excludeWeekends
                      });
                      onClose();
                  }}>Approve</Button>
                  <Button style={{flex: 1, backgroundColor: '#ef4444', color: '#fff'}} onClick={() => {
                      onSave({
                        isLeaveRequestPending: false, pendingLeaveType: '', leaveRequestDenied: true
                      });
                      onClose();
                  }}>Deny</Button>
                </div>
              </div>
            )}
          </Column>

          {(isConverting || isRequesting) && (
            <Column>
              {isConverting && (
                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Label style={{ marginTop: 0, marginBottom: '8px', color: '#334155', fontSize: '15px' }}>Leave Type:</Label>
                    <Select value={conversionLeaveType} onChange={e => setConversionLeaveType(e.target.value)}>
                      <option value="Sick Leave">Sick Leave</option>
                      <option value="Informal Leave">Informal Leave</option>
                      <option value="Ordinary Leave">Ordinary Leave</option>
                      <option value="Passes">Passes</option>
                      <option value="Mental Wellness Break (MWB)">Mental Wellness Break (MWB)</option>
                      <option value="Other">Other (Specify)</option>
                    </Select>
                  </div>
                  {conversionLeaveType === 'Other' && (
                    <Input 
                      type="text" 
                      placeholder="Specify leave type..." 
                      value={conversionOtherStr}
                      onChange={e => setConversionOtherStr(e.target.value)}
                    />
                  )}
                  <Button 
                    style={{ marginTop: 'auto', backgroundColor: '#e2e8f0', color: '#475569', padding: '12px', borderRadius: '8px' }} 
                    onClick={() => setIsConverting(false)}
                  >
                    Cancel Conversion
                  </Button>
                </div>
              )}

              {isRequesting && (
                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Label style={{ marginTop: 0, marginBottom: '8px', color: '#334155', fontSize: '15px' }}>Request Leave Type:</Label>
                    <Select value={requestLeaveType} onChange={e => setRequestLeaveType(e.target.value)}>
                      <option value="Sick Leave">Sick Leave</option>
                      <option value="Informal Leave">Informal Leave</option>
                      <option value="Ordinary Leave">Ordinary Leave</option>
                      <option value="Passes">Passes</option>
                      <option value="Mental Wellness Break (MWB)">Mental Wellness Break (MWB)</option>
                      <option value="Other">Other (Specify)</option>
                    </Select>
                  </div>
                  {requestLeaveType === 'Other' && (
                    <Input 
                      type="text" 
                      placeholder="Specify leave type..." 
                      value={requestOtherStr}
                      onChange={e => setRequestOtherStr(e.target.value)}
                    />
                  )}
                  <Button 
                    style={{ marginTop: 'auto', backgroundColor: '#e2e8f0', color: '#475569', padding: '12px', borderRadius: '8px' }} 
                    onClick={() => setIsRequesting(false)}
                  >
                    Cancel Request
                  </Button>
                </div>
              )}

            </Column>
          )}
        </Grid>

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
  align-items: flex-start;
  overflow-y: auto;
  padding: 20px 0;
  z-index: 1000;
`;

const ModalContainer = styled.div`
  background: white;
  padding: 25px;
  border-radius: 15px;
  width: min(90%, 930px);
  max-width: ${props => props.$isExpanded ? '920px' : '520px'};
  max-height: 90vh;
  overflow-y: auto;
  transition: all 0.25s ease-in-out;
  position: relative;

  @media (max-width: 900px) {
    max-width: ${props => props.$isExpanded ? '88vw' : '520px'};
  }

  @media (max-width: 768px) {
    padding: 20px;
    max-width: 94%;
  }

  @media (max-width: 480px) {
    padding: 16px;
    max-width: 96%;
  }
`;

const ModalTitle = styled.h2`
  margin: 0 0 8px;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
  color: #0f172a;
  word-break: break-word;
`;

const ModalSubtitle = styled.p`
  margin: 0 0 18px;
  font-size: 15px;
  color: #475569;
  word-break: break-word;
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

const Grid = styled.div`
  display: grid;
  grid-template-columns: ${props => props.$isExpanded ? 'minmax(0, 1fr) minmax(0, 1fr)' : '1fr'};
  gap: ${props => props.$isExpanded ? '24px' : '16px'};
  align-items: start;
  margin-top: 18px;
  
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: ${props => props.$isExpanded ? '20px' : '16px'};
  }

  @media (max-width: 600px) {
    gap: ${props => props.$isExpanded ? '16px' : '14px'};
  }
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  flex-wrap: wrap;

  @media (max-width: 600px) {
    justify-content: stretch;
  }

  @media (max-width: 480px) {
    flex-direction: column-reverse;
    gap: 8px;
  }
`;

const Button = styled.button`
  padding: 10px 20px;
  border: none;
  cursor: pointer;
  border-radius: 8px;
  background: ${props => props.primary ? "#2563eb" : "#f1f5f9"};
  color: ${props => props.primary ? "white" : "#475569"};
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s;
  min-height: 40px;

  &:hover {
    background: ${props => props.primary ? "#1d4ed8" : "#e2e8f0"};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
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