/**
 * CallContext.jsx
 *
 * The socket singleton (socket.js) is already connected by SocketProvider.
 * We import getSocket() and call it at emit-time — this always returns
 * the connected instance regardless of React render timing.
 *
 * Socket listeners use the same singleton directly, not React state.
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
import { getSocket } from '../socket'; // ← the already-connected singleton

// ─── STUN ─────────────────────────────────────────────────────────────────────
const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const getLocalUser = () => {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); }
  catch { return {}; }
};

// ─── State ────────────────────────────────────────────────────────────────────
const initialState = {
  callStatus:   'idle',   // 'idle' | 'calling' | 'ringing' | 'in_call'
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

// ─── Context ──────────────────────────────────────────────────────────────────
const CallContext = createContext(null);

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used inside <CallProvider>');
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const CallProvider = ({ children }) => {
  const [state, dispatch] = useReducer(callReducer, initialState);
  const navigate = useNavigate();

  const stateRef          = useRef(state);
  const peerRef           = useRef(null);
  const localStreamRef    = useRef(null);
  const durationTimerRef  = useRef(null);
  const pendingCandidates = useRef([]);

  useEffect(() => { stateRef.current = state; }, [state]);

  // ✅ Core fix: call getSocket() fresh at the moment of emit.
  //    SocketProvider has already called s.connect() so this is always live.
  //    Never store socket in state or a ref — just call getSocket() each time.
  const safeEmit = useCallback((event, data) => {
    const s = getSocket();
    if (!s.connected) {
      console.warn(`[CallContext] safeEmit('${event}') — socket not connected yet, retrying in 300ms`);
      // Retry once after a short delay (handles the rare timing gap on first load)
      setTimeout(() => {
        const s2 = getSocket();
        if (s2.connected) {
          s2.emit(event, data);
        } else {
          console.error(`[CallContext] safeEmit('${event}') — socket still not connected after retry`);
        }
      }, 300);
      return;
    }
    s.emit(event, data);
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    dispatch({ type: 'SET_LOCAL_STREAM', payload: null });
  }, []);

  const closePeerConnection = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
  }, []);

  const stopDurationTimer = useCallback(() => {
    clearInterval(durationTimerRef.current);
    durationTimerRef.current = null;
  }, []);

  const startDurationTimer = useCallback(() => {
    dispatch({ type: 'SET_DURATION', payload: 0 });
    let secs = 0;
    durationTimerRef.current = setInterval(() => {
      secs += 1;
      dispatch({ type: 'SET_DURATION', payload: secs });
    }, 1000);
  }, []);

  const resetCall = useCallback(() => {
    stopLocalStream();
    closePeerConnection();
    stopDurationTimer();
    pendingCandidates.current = [];
    dispatch({ type: 'RESET' });
  }, [stopLocalStream, closePeerConnection, stopDurationTimer]);

  // ─── getUserMedia ──────────────────────────────────────────────────────────

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

  // ─── RTCPeerConnection ────────────────────────────────────────────────────

  const createPeer = useCallback((targetId) => {
    const pc = new RTCPeerConnection(STUN_SERVERS);

    pc.onicecandidate = (e) => {
      if (e.candidate) safeEmit('ice_candidate', { candidate: e.candidate, targetId });
    };

    pc.ontrack = (e) => {
      dispatch({ type: 'SET_REMOTE_STREAM', payload: e.streams[0] });
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] connectionState:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        dispatch({ type: 'SET_CONNECTING', payload: false });
        dispatch({ type: 'SET_CALL_STATUS',  payload: 'in_call' });
        startDurationTimer();
      }
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        resetCall();
        navigate(-1);
      }
    };

    peerRef.current = pc;
    return pc;
  }, [safeEmit, navigate, resetCall, startDurationTimer]);

  // ─── INITIATE CALL ────────────────────────────────────────────────────────

  const initiateCall = useCallback(async (remoteUser, callType) => {
    if (stateRef.current.callStatus !== 'idle') return;

    try {
      dispatch({ type: 'SET_CONNECTING', payload: true });

      const stream = await getMedia(callType);
      const pc     = createPeer(remoteUser._id);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const localUser = getLocalUser();
      dispatch({ type: 'SET_CALL_META', payload: { callStatus: 'calling', callType, remoteUser } });

      safeEmit('call_user', {
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
  }, [getMedia, createPeer, safeEmit, navigate, resetCall]);

  // ─── ACCEPT CALL ──────────────────────────────────────────────────────────

  const acceptCall = useCallback(async () => {
    const { incomingCall } = stateRef.current;
    if (!incomingCall) return;
    try {
      dispatch({ type: 'SET_CONNECTING', payload: true });
      dispatch({ type: 'CLEAR_INCOMING' });

      const stream = await getMedia(incomingCall.callType);
      const pc     = createPeer(incomingCall.caller._id);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));

      for (const c of pendingCandidates.current)
        await pc.addIceCandidate(new RTCIceCandidate(c));
      pendingCandidates.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      dispatch({
        type: 'SET_CALL_META',
        payload: {
          callStatus: 'ringing',
          callType:   incomingCall.callType,
          callId:     incomingCall.callId,
          remoteUser: incomingCall.caller,
        },
      });

      safeEmit('answer_call', {
        callId:   incomingCall.callId,
        answer,
        callerId: incomingCall.caller._id,
      });

      navigate('/calls/active');
    } catch (err) {
      console.error('[acceptCall]', err);
      resetCall();
      alert(err.message || 'Failed to accept call.');
    }
  }, [getMedia, createPeer, safeEmit, navigate, resetCall]);

  // ─── REJECT ───────────────────────────────────────────────────────────────

  const rejectCall = useCallback(() => {
    const { incomingCall } = stateRef.current;
    if (!incomingCall) return;
    safeEmit('call_rejected', {
      callId:   incomingCall.callId,
      callerId: incomingCall.caller._id,
    });
    dispatch({ type: 'CLEAR_INCOMING' });
  }, [safeEmit]);

  // ─── END ──────────────────────────────────────────────────────────────────

  const endCall = useCallback(() => {
    const { callId, remoteUser } = stateRef.current;
    safeEmit('end_call', { callId, targetId: remoteUser?._id });
    resetCall();
    navigate(-1);
  }, [safeEmit, resetCall, navigate]);

  // ─── MUTE / VIDEO ─────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; dispatch({ type: 'TOGGLE_MUTE' }); }
  }, []);

  const toggleVideo = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; dispatch({ type: 'TOGGLE_VIDEO' }); }
  }, []);

  // ─── Socket listeners ─────────────────────────────────────────────────────
  // Attach directly to the singleton — no React state dependency.
  // This runs once on mount. getSocket() returns the same instance
  // that SocketProvider already connected, so listeners work immediately.

  useEffect(() => {
    const s = getSocket();

    const onIncomingCall  = (data) => {
      console.log('[CallContext] incoming_call received:', data);
      dispatch({ type: 'INCOMING_CALL', payload: data });
    };

    const onCallAccepted  = async ({ callId, answer }) => {
      try {
        if (!peerRef.current) return;
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        for (const c of pendingCandidates.current)
          await peerRef.current.addIceCandidate(new RTCIceCandidate(c));
        pendingCandidates.current = [];
        dispatch({ type: 'SET_CALL_META', payload: { callId } });
      } catch (err) { console.error('[onCallAccepted]', err); }
    };

    const onIceCandidate  = async ({ candidate }) => {
      if (!peerRef.current?.remoteDescription) {
        pendingCandidates.current.push(candidate);
        return;
      }
      try { await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch (err) { console.error('[onIceCandidate]', err); }
    };

    const onCallEnded      = () => { resetCall(); navigate(-1); };
    const onCallRejected   = () => resetCall();
    const onCallUnanswered = () => resetCall();
    const onCallCancelled  = () => dispatch({ type: 'CLEAR_INCOMING' });
    const onCallError      = ({ message }) => { alert(message); resetCall(); };

    s.on('incoming_call',   onIncomingCall);
    s.on('call_accepted',   onCallAccepted);
    s.on('ice_candidate',   onIceCandidate);
    s.on('call_ended',      onCallEnded);
    s.on('call_rejected',   onCallRejected);
    s.on('call_unanswered', onCallUnanswered);
    s.on('call_cancelled',  onCallCancelled);
    s.on('call_error',      onCallError);

    return () => {
      s.off('incoming_call',   onIncomingCall);
      s.off('call_accepted',   onCallAccepted);
      s.off('ice_candidate',   onIceCandidate);
      s.off('call_ended',      onCallEnded);
      s.off('call_rejected',   onCallRejected);
      s.off('call_unanswered', onCallUnanswered);
      s.off('call_cancelled',  onCallCancelled);
      s.off('call_error',      onCallError);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only — singleton never changes

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