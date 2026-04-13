/**
 * CallContext.jsx
 *
 * FIXES vs your original:
 *
 * 1. safeEmit → waitForConnection():
 *    Original retried once after 300ms then gave up.
 *    New version polls every 100ms for up to 5s then does a final
 *    socket.once('connect') so no emit is ever silently dropped.
 *
 * 2. call_ringing listener added:
 *    Server emits 'call_ringing' with callId back to caller.
 *    Original never listened for it, so stateRef.current.callId was
 *    always null when endCall fired — server got end_call with callId:null.
 *
 * 3. acceptCall: capture incomingCall fields before CLEAR_INCOMING:
 *    Original did dispatch(CLEAR_INCOMING) then read incomingCall.callType
 *    — already null by then. Fixed by destructuring first.
 *
 * 4. navigate('/calls') instead of navigate(-1):
 *    navigate(-1) goes to an arbitrary previous page (could be login).
 *    Explicit path is predictable.
 *
 * 5. createPeer uses navigateRef + resetCallRef:
 *    onconnectionstatechange closed over stale navigate/resetCall.
 *    Refs are always current regardless of when the event fires.
 *
 * 6. closePeerConnection nulls event handlers before close():
 *    Prevents onconnectionstatechange firing 'closed' and calling
 *    resetCall a second time after we already reset.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../socket';

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
};

const getLocalUser = () => {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); }
  catch { return {}; }
};

// ─── State ────────────────────────────────────────────────────────────────────
const initialState = {
  callStatus:   'idle',
  callType:     null,
  callId:       null,
  localStream:  null,
  remoteStream: null,
  isMuted:      false,
  isVideoOff:   false,
  incomingCall: null,
  remoteUser:   null,
  callDuration: 0,
  isConnecting: false,
};

function callReducer(state, action) {
  switch (action.type) {
    case 'SET_CALL_STATUS':   return { ...state, callStatus:   action.payload };
    case 'SET_CALL_META':     return { ...state, ...action.payload };
    case 'SET_LOCAL_STREAM':  return { ...state, localStream:  action.payload };
    case 'SET_REMOTE_STREAM': return { ...state, remoteStream: action.payload };
    case 'TOGGLE_MUTE':       return { ...state, isMuted:      !state.isMuted };
    case 'TOGGLE_VIDEO':      return { ...state, isVideoOff:   !state.isVideoOff };
    case 'INCOMING_CALL':     return { ...state, incomingCall: action.payload };
    case 'CLEAR_INCOMING':    return { ...state, incomingCall: null };
    case 'SET_DURATION':      return { ...state, callDuration: action.payload };
    case 'SET_CONNECTING':    return { ...state, isConnecting: action.payload };
    case 'RESET':             return { ...initialState };
    default:                  return state;
  }
}

const CallContext = createContext(null);

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used inside <CallProvider>');
  return ctx;
};

export const CallProvider = ({ children }) => {
  const [state, dispatch] = useReducer(callReducer, initialState);
  const navigate = useNavigate();

  const stateRef          = useRef(state);
  const peerRef           = useRef(null);
  const localStreamRef    = useRef(null);
  const durationTimerRef  = useRef(null);
  const pendingCandidates = useRef([]);
  const navigateRef       = useRef(navigate);
  const resetCallRef      = useRef(null);

  useEffect(() => { stateRef.current = state; },    [state]);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  // ── waitForConnection ──────────────────────────────────────────────────────
  // Polls until socket.connected is true, then emits.
  // Guarantees no event is silently dropped due to timing gaps.
  const waitForConnection = useCallback((event, data, maxWaitMs = 5000) => {
    const s = getSocket();

    if (s.connected) {
      s.emit(event, data);
      return;
    }

    console.warn(`[CallContext] socket not ready, queuing '${event}'...`);
    const started  = Date.now();
    const interval = setInterval(() => {
      const s2 = getSocket();
      if (s2.connected) {
        clearInterval(interval);
        console.log(`[CallContext] socket ready after ${Date.now() - started}ms → emit '${event}'`);
        s2.emit(event, data);
      } else if (Date.now() - started >= maxWaitMs) {
        clearInterval(interval);
        console.warn(`[CallContext] still not connected after ${maxWaitMs}ms, attaching once-listener for '${event}'`);
        // Last resort: emit as soon as connect fires
        s2.once('connect', () => {
          console.log(`[CallContext] connected (late) → emit '${event}'`);
          s2.emit(event, data);
        });
        if (!s2.connected) s2.connect();
      }
    }, 100);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    dispatch({ type: 'SET_LOCAL_STREAM', payload: null });
  }, []);

  const closePeerConnection = useCallback(() => {
    if (peerRef.current) {
      // Null handlers first so 'closed' state doesn't re-trigger resetCall
      peerRef.current.onconnectionstatechange = null;
      peerRef.current.onicecandidate          = null;
      peerRef.current.ontrack                 = null;
      peerRef.current.close();
      peerRef.current = null;
    }
  }, []);

  const stopDurationTimer = useCallback(() => {
    clearInterval(durationTimerRef.current);
    durationTimerRef.current = null;
  }, []);

  const startDurationTimer = useCallback(() => {
    dispatch({ type: 'SET_DURATION', payload: 0 });
    let secs = 0;
    durationTimerRef.current = setInterval(
      () => dispatch({ type: 'SET_DURATION', payload: ++secs }),
      1000
    );
  }, []);

  const resetCall = useCallback(() => {
    stopLocalStream();
    closePeerConnection();
    stopDurationTimer();
    pendingCandidates.current = [];
    dispatch({ type: 'RESET' });
  }, [stopLocalStream, closePeerConnection, stopDurationTimer]);

  // Keep ref current so createPeer closure is never stale
  useEffect(() => { resetCallRef.current = resetCall; }, [resetCall]);

  // ── getUserMedia ──────────────────────────────────────────────────────────
  const getMedia = useCallback(async (callType) => {
    const constraints = callType === 'video'
      ? { audio: true, video: { width: 1280, height: 720, facingMode: 'user' } }
      : { audio: true, video: false };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      dispatch({ type: 'SET_LOCAL_STREAM', payload: stream });
      return stream;
    } catch (err) {
      if (err.name === 'NotAllowedError')
        throw new Error('Camera/microphone permission denied. Please allow access and try again.');
      if (err.name === 'NotFoundError')
        throw new Error('Camera or microphone not found on this device.');
      throw err;
    }
  }, []);

  // ── RTCPeerConnection ─────────────────────────────────────────────────────
  const createPeer = useCallback((targetId) => {
    const pc = new RTCPeerConnection(STUN_SERVERS);

    pc.onicecandidate = (e) => {
      if (e.candidate) waitForConnection('ice_candidate', { candidate: e.candidate, targetId });
    };

    pc.ontrack = (e) => {
      dispatch({ type: 'SET_REMOTE_STREAM', payload: e.streams[0] });
    };

    // Use refs — this closure may fire long after the component re-renders
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] connectionState:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        dispatch({ type: 'SET_CONNECTING', payload: false });
        dispatch({ type: 'SET_CALL_STATUS',  payload: 'in_call' });
        startDurationTimer();
      }
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        resetCallRef.current?.();
        navigateRef.current('/calls');
      }
    };

    peerRef.current = pc;
    return pc;
  }, [waitForConnection, startDurationTimer]);

  // ── INITIATE CALL ─────────────────────────────────────────────────────────
  const initiateCall = useCallback(async (remoteUser, callType) => {
    if (stateRef.current.callStatus !== 'idle') return;

    try {
      dispatch({ type: 'SET_CONNECTING', payload: true });

      const stream = await getMedia(callType);

      // Guard: another call may have started while awaiting getMedia
      if (stateRef.current.callStatus !== 'idle' &&
          stateRef.current.callStatus !== 'calling') {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const pc = createPeer(remoteUser._id);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const localUser = getLocalUser();
      dispatch({ type: 'SET_CALL_META', payload: { callStatus: 'calling', callType, remoteUser } });

      waitForConnection('call_user', {
        receiverId: remoteUser._id,
        callType,
        offer,
        callerInfo: {
          name:   localUser.name   || 'Unknown',
          avatar: localUser.avatar || localUser.profilePicture || '',
        },
      });

      navigate('/calls/active');
    } catch (err) {
      console.error('[initiateCall]', err);
      resetCall();
      alert(err.message || 'Failed to start call.');
    }
  }, [getMedia, createPeer, waitForConnection, navigate, resetCall]);

  // ── ACCEPT CALL ───────────────────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    const { incomingCall } = stateRef.current;
    if (!incomingCall) return;

    // FIX: destructure BEFORE dispatching CLEAR_INCOMING — after that dispatch
    // stateRef.current.incomingCall is null and these values are gone
    const { callId, callType, caller, offer } = incomingCall;

    try {
      dispatch({ type: 'SET_CONNECTING', payload: true });
      dispatch({ type: 'CLEAR_INCOMING' });

      const stream = await getMedia(callType);
      const pc     = createPeer(caller._id);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      for (const c of pendingCandidates.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); }
        catch (e) { console.warn('[acceptCall] bad ICE candidate:', e); }
      }
      pendingCandidates.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      dispatch({
        type: 'SET_CALL_META',
        payload: { callStatus: 'ringing', callType, callId, remoteUser: caller },
      });

      waitForConnection('answer_call', { callId, answer, callerId: caller._id });
      navigate('/calls/active');
    } catch (err) {
      console.error('[acceptCall]', err);
      resetCall();
      alert(err.message || 'Failed to accept call.');
    }
  }, [getMedia, createPeer, waitForConnection, navigate, resetCall]);

  // ── REJECT ────────────────────────────────────────────────────────────────
  const rejectCall = useCallback(() => {
    const { incomingCall } = stateRef.current;
    if (!incomingCall) return;
    waitForConnection('call_rejected', {
      callId:   incomingCall.callId,
      callerId: incomingCall.caller._id,
    });
    dispatch({ type: 'CLEAR_INCOMING' });
  }, [waitForConnection]);

  // ── END ───────────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    const { callId, remoteUser } = stateRef.current;
    waitForConnection('end_call', { callId, targetId: remoteUser?._id });
    resetCall();
    navigate('/calls');
  }, [waitForConnection, resetCall, navigate]);

  // ── MUTE / VIDEO ──────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; dispatch({ type: 'TOGGLE_MUTE' }); }
  }, []);

  const toggleVideo = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; dispatch({ type: 'TOGGLE_VIDEO' }); }
  }, []);

  // ── Socket listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSocket();

    const onIncomingCall = (data) => {
      console.log('[CallContext] ✅ incoming_call received:', data);
      dispatch({ type: 'INCOMING_CALL', payload: data });
    };

    // FIX: was missing — server emits call_ringing with callId so caller
    // can store it; without this callId stays null and endCall sends null
    const onCallRinging = ({ callId }) => {
      console.log('[CallContext] call_ringing — callId:', callId);
      dispatch({ type: 'SET_CALL_META', payload: { callId } });
    };

    const onCallAccepted = async ({ callId, answer }) => {
      try {
        if (!peerRef.current) return;
        dispatch({ type: 'SET_CALL_META', payload: { callId } });
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        for (const c of pendingCandidates.current) {
          try { await peerRef.current.addIceCandidate(new RTCIceCandidate(c)); }
          catch (e) { console.warn('[onCallAccepted] bad ICE candidate:', e); }
        }
        pendingCandidates.current = [];
      } catch (err) { console.error('[onCallAccepted]', err); }
    };

    const onIceCandidate = async ({ candidate }) => {
      if (!peerRef.current || !peerRef.current.remoteDescription) {
        pendingCandidates.current.push(candidate);
        return;
      }
      try { await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch (err) { console.warn('[onIceCandidate]', err); }
    };

    const onCallEnded      = () => { resetCall(); navigate('/calls'); };
    const onCallRejected   = () => resetCall();
    const onCallUnanswered = () => resetCall();
    const onCallCancelled  = () => dispatch({ type: 'CLEAR_INCOMING' });
    const onCallError      = ({ message }) => { alert(message); resetCall(); };

    s.on('incoming_call',   onIncomingCall);
    s.on('call_ringing',    onCallRinging);
    s.on('call_accepted',   onCallAccepted);
    s.on('ice_candidate',   onIceCandidate);
    s.on('call_ended',      onCallEnded);
    s.on('call_rejected',   onCallRejected);
    s.on('call_unanswered', onCallUnanswered);
    s.on('call_cancelled',  onCallCancelled);
    s.on('call_error',      onCallError);

    return () => {
      s.off('incoming_call',   onIncomingCall);
      s.off('call_ringing',    onCallRinging);
      s.off('call_accepted',   onCallAccepted);
      s.off('ice_candidate',   onIceCandidate);
      s.off('call_ended',      onCallEnded);
      s.off('call_rejected',   onCallRejected);
      s.off('call_unanswered', onCallUnanswered);
      s.off('call_cancelled',  onCallCancelled);
      s.off('call_error',      onCallError);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => resetCall(), [resetCall]);

  return (
    <CallContext.Provider value={{
      ...state,
      initiateCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleVideo,
    }}>
      {children}
    </CallContext.Provider>
  );
};

export default CallContext;