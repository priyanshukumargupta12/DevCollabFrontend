import { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  PhoneOff, 
  Users,
  Video as VideoIcon,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSocket } from '../context/SocketContext';
import Spinner from './Spinner';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

/**
 * WorkspaceMeeting Component
 * Implements a WebRTC mesh meeting room. All users in the workspace join the same room.
 */
const WorkspaceMeeting = ({ workspaceId, currentUser, workspace }) => {
  const { socket } = useSocket();

  // Call states
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);

  // Device states
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Participant stream mapping: socketId -> participantDetails
  const [peersMap, setPeersMap] = useState(new Map());

  // Refs to hold streams and peer connections
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const peersRef = useRef(new Map()); // socketId -> RTCPeerConnection

  // Clean up streams on unmount
  useEffect(() => {
    return () => {
      cleanupStreamsAndConnections();
    };
  }, []);

  const cleanupStreamsAndConnections = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    peersRef.current.forEach((pc) => {
      pc.close();
    });
    peersRef.current.clear();
    
    if (socket) {
      socket.emit("leave_meeting", { roomId: workspaceId });
      socket.off("meeting_users");
      socket.off("peer_joined");
      socket.off("receive_offer");
      socket.off("receive_answer");
      socket.off("receive_ice_candidate");
      socket.off("peer_left");
      socket.off("peer_status_changed");
    }
  };

  // ─── STAGE 1: Start Media Preview (Cam/Mic setup) ──────────────────────
  const startPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Failed to get local hardware media preview:", err.message);
      toast.error("Camera and Microphone access are required to start meetings.");
    }
  };

  useEffect(() => {
    if (!joined) {
      startPreview();
    }
  }, [joined]);

  // ─── STAGE 2: Join meeting and configure peer signaling ─────────────────
  const handleJoinMeeting = async () => {
    if (!localStreamRef.current) {
      toast.error("No local camera/mic stream captured. Please verify permissions.");
      return;
    }

    setLoading(true);
    setJoined(true);

    try {
      // Connect socket events
      setupSocketSignaling();

      // Notify signaling server that we joined
      socket.emit("join_meeting", {
        roomId: workspaceId,
        userId: currentUser._id,
        username: currentUser.profile?.nickname || currentUser.username,
        avatar: currentUser.avatar,
        audio: !isMuted,
        video: !isVideoOff
      });
    } catch (err) {
      console.error("Meeting join crash:", err);
      toast.error("Failed to join meeting room.");
      setJoined(false);
    } finally {
      setLoading(false);
    }
  };

  const setupSocketSignaling = () => {
    if (!socket) return;

    // A list of other users in the room received from server (Initiator flow)
    socket.on("meeting_users", async (usersList) => {
      console.log("📹 Gathering active meeting peers:", usersList);
      for (const peer of usersList) {
        await initiatePeerConnection(peer);
      }
    });

    // A new user joined the room
    socket.on("peer_joined", (peer) => {
      console.log(`📹 Peer joined: ${peer.username} (${peer.socketId})`);
      setPeersMap(prev => {
        const next = new Map(prev);
        next.set(peer.socketId, {
          socketId: peer.socketId,
          userId: peer.userId,
          username: peer.username,
          avatar: peer.avatar,
          stream: null,
          audio: peer.audio,
          video: peer.video,
          screen: false
        });
        return next;
      });
    });

    // Offer SDP received (Receiver flow)
    socket.on("receive_offer", async ({ senderSocketId, sdp }) => {
      console.log("📹 Received RTCOffer from sender:", senderSocketId);
      const peerConnection = getOrCreatePeerConnection(senderSocketId);

      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit("send_answer", { targetSocketId: senderSocketId, sdp: answer });
      } catch (err) {
        console.error("Failed handling remote offer:", err);
      }
    });

    // Answer SDP received (Initiator response flow)
    socket.on("receive_answer", async ({ senderSocketId, sdp }) => {
      console.log("📹 Received RTCAnswer from:", senderSocketId);
      const peerConnection = peersRef.current.get(senderSocketId);
      if (peerConnection) {
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        } catch (err) {
          console.error("Failed setting remote answer:", err);
        }
      }
    });

    // ICE candidates exchange
    socket.on("receive_ice_candidate", async ({ senderSocketId, candidate }) => {
      const peerConnection = peersRef.current.get(senderSocketId);
      if (peerConnection) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Failed adding ICE Candidate:", err);
        }
      }
    });

    // A peer left the meeting
    socket.on("peer_left", ({ socketId }) => {
      console.log("📹 Peer left meeting:", socketId);
      const pc = peersRef.current.get(socketId);
      if (pc) {
        pc.close();
        peersRef.current.delete(socketId);
      }
      setPeersMap(prev => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    });

    // Peer toggled status (Audio, Video, Screen)
    socket.on("peer_status_changed", ({ socketId, audio, video, screen }) => {
      setPeersMap(prev => {
        const next = new Map(prev);
        if (next.has(socketId)) {
          const peer = next.get(socketId);
          if (audio !== undefined) peer.audio = audio;
          if (video !== undefined) peer.video = video;
          if (screen !== undefined) peer.screen = screen;
          next.set(socketId, { ...peer });
        }
        return next;
      });
    });
  };

  // Initiator: creates connection, binds tracks, creates and sends offer
  const initiatePeerConnection = async (peer) => {
    const peerConnection = getOrCreatePeerConnection(peer.socketId);

    // Save initial peer state
    setPeersMap(prev => {
      const next = new Map(prev);
      next.set(peer.socketId, {
        socketId: peer.socketId,
        userId: peer.userId,
        username: peer.username,
        avatar: peer.avatar,
        stream: null,
        audio: peer.audio,
        video: peer.video,
        screen: peer.screen
      });
      return next;
    });

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit("send_offer", { targetSocketId: peer.socketId, sdp: offer });
    } catch (err) {
      console.error("Error creating WebRTC offer:", err);
    }
  };

  // Creates peer connection object, tracks events, candidate setups
  const getOrCreatePeerConnection = (socketId) => {
    if (peersRef.current.has(socketId)) {
      return peersRef.current.get(socketId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Bind local stream tracks to PC
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Capture candidates and emit via signaling
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("send_ice_candidate", {
          targetSocketId: socketId,
          candidate: event.candidate
        });
      }
    };

    // Render remote media stream when tracks arrive
    pc.ontrack = (event) => {
      console.log("📹 Tracks arrived from remote peer:", socketId);
      const remoteStream = event.streams[0];
      setPeersMap(prev => {
        const next = new Map(prev);
        if (next.has(socketId)) {
          const peer = next.get(socketId);
          peer.stream = remoteStream;
          next.set(socketId, { ...peer });
        }
        return next;
      });
    };

    peersRef.current.set(socketId, pc);
    return pc;
  };

  // ─── STAGE 3: Control actions (Mute, Video, Screen Share, Leave) ──────────
  const handleToggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        if (joined && socket) {
          socket.emit("status_change", { roomId: workspaceId, audio: audioTrack.enabled });
        }
      }
    }
  };

  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        if (joined && socket) {
          socket.emit("status_change", { roomId: workspaceId, video: videoTrack.enabled });
        }
      }
    }
  };

  const handleToggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;

        const screenTrack = stream.getVideoTracks()[0];

        // Replace track in active connections
        peersRef.current.forEach((pc) => {
          const senders = pc.getSenders();
          const videoSender = senders.find(s => s.track && s.track.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(screenTrack);
          }
        });

        // Swap local preview stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        screenTrack.onended = () => {
          stopScreenSharing();
        };

        setIsScreenSharing(true);
        if (socket) {
          socket.emit("status_change", { roomId: workspaceId, screen: true });
        }
      } catch (err) {
        console.error("Failed to share screen:", err);
      }
    } else {
      stopScreenSharing();
    }
  };

  const stopScreenSharing = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    if (localStreamRef.current) {
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];
      peersRef.current.forEach((pc) => {
        const senders = pc.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender && cameraTrack) {
          videoSender.replaceTrack(cameraTrack);
        }
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }

    setIsScreenSharing(false);
    if (socket) {
      socket.emit("status_change", { roomId: workspaceId, screen: false });
    }
  };

  const handleLeaveMeeting = () => {
    cleanupStreamsAndConnections();
    setPeersMap(new Map());
    setJoined(false);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
  };

  // Backend url helpers
  const getBackendUrl = () => {
    return window.location.hostname === 'localhost' 
      ? 'http://localhost:5000' 
      : window.location.origin;
  };

  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    return `${getBackendUrl()}${avatarPath}`;
  };

  const getInitials = (name) => {
    return name ? name.slice(0, 2).toUpperCase() : '??';
  };

  // Render participants feed list
  const activePeers = Array.from(peersMap.values());
  const initials = getInitials(currentUser?.profile?.nickname || currentUser?.username);

  // ─── RENDERING: PRE-CALL JOIN SCREEN ─────────────────────────────────────
  if (!joined) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        maxWidth: '520px',
        margin: '0 auto',
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        gap: '2rem',
        animation: 'slideUp 0.3s ease both'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'var(--color-accent-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-accent-light)',
            margin: '0 auto 0.75rem'
          }}>
            <VideoIcon size={20} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Workspace Meeting Room
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Prepare your camera and microphone before joining the workspace channel.
          </p>
        </div>

        {/* Video local camera preview */}
        <div style={{
          width: '100%',
          aspectRatio: '16/10',
          background: '#07080a',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {isVideoOff ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div className="avatar-circle" style={{ width: 64, height: 64, fontSize: '1.5rem' }}>
                {initials}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Camera is disabled</span>
            </div>
          ) : (
            <video 
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}

          {/* Quick preview hardware toggles overlays */}
          <div style={{
            position: 'absolute',
            bottom: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '0.75rem',
            background: 'rgba(10, 11, 15, 0.75)',
            backdropFilter: 'blur(8px)',
            padding: '0.375rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <button
              onClick={handleToggleAudio}
              style={{
                background: 'none',
                border: 'none',
                color: isMuted ? 'var(--color-error)' : '#fff',
                cursor: 'pointer',
                padding: '0.375rem',
                borderRadius: '50%',
                display: 'flex',
                transition: 'var(--transition-fast)'
              }}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button
              onClick={handleToggleVideo}
              style={{
                background: 'none',
                border: 'none',
                color: isVideoOff ? 'var(--color-error)' : '#fff',
                cursor: 'pointer',
                padding: '0.375rem',
                borderRadius: '50%',
                display: 'flex',
                transition: 'var(--transition-fast)'
              }}
              title={isVideoOff ? "Enable Camera" : "Disable Camera"}
            >
              {isVideoOff ? <VideoOff size={16} /> : <Video size={16} />}
            </button>
          </div>
        </div>

        {/* Join CTA */}
        <button
          onClick={handleJoinMeeting}
          disabled={loading}
          className="btn-primary"
          style={{ width: '100%', padding: '0.8125rem' }}
        >
          {loading ? <Spinner /> : <Sparkles size={16} />}
          {loading ? 'Entering Room...' : 'Join Workspace Call'}
        </button>
      </div>
    );
  }

  // ─── RENDERING: ACTIVE MEETING PANEL ───────────────────────────────────
  // Calculate grid size based on peers
  const totalGridItems = 1 + activePeers.length;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      height: '100%',
      minHeight: '450px',
      background: 'rgba(5, 5, 8, 0.4)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden'
    }}>
      
      {/* Meeting Header */}
      <div style={{
        padding: '0.875rem 1.25rem',
        borderBottom: '1px solid var(--color-border)',
        background: 'rgba(255,255,255,0.01)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            📹 Active Workspace Call
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            ({totalGridItems} in room)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-success)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block', boxShadow: '0 0 10px var(--color-success)' }}></span>
          <span>Signaling Active</span>
        </div>
      </div>

      {/* Grid of Participant Streams */}
      <div style={{
        flex: 1,
        padding: '1.25rem',
        background: '#07080a',
        display: 'grid',
        gridTemplateColumns: totalGridItems === 1 
          ? '1fr' 
          : totalGridItems === 2 
          ? '1fr 1fr' 
          : 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
        alignItems: 'stretch',
        overflowY: 'auto'
      }}>
        {/* Local Stream card */}
        <div style={{
          background: 'rgba(255,255,255,0.01)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          aspectRatio: '16/10'
        }}>
          {isVideoOff ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              {currentUser.avatar ? (
                <img 
                  src={getAvatarUrl(currentUser.avatar)} 
                  alt={currentUser.username} 
                  style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-border)' }}
                />
              ) : (
                <div className="avatar-circle" style={{ width: 56, height: 56, fontSize: '1.25rem' }}>
                  {initials}
                </div>
              )}
            </div>
          ) : (
            <video 
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}

          {/* Badges Overlay */}
          <div style={{
            position: 'absolute',
            bottom: '0.625rem',
            left: '0.625rem',
            background: 'rgba(10, 11, 15, 0.75)',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.7rem',
            color: '#fff',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            <ShieldCheck size={11} color="var(--color-warning)" />
            <span>{currentUser.profile?.nickname || currentUser.username} (You)</span>
          </div>

          {isMuted && (
            <div style={{
              position: 'absolute',
              top: '0.625rem',
              right: '0.625rem',
              background: 'rgba(239, 68, 68, 0.85)',
              padding: '0.25rem',
              borderRadius: '50%',
              color: '#fff',
              display: 'flex'
            }}>
              <MicOff size={11} />
            </div>
          )}
        </div>

        {/* Remote Peers list */}
        {activePeers.map((peer) => {
          const peerInitials = getInitials(peer.username);
          return (
            <div 
              key={peer.socketId}
              style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                aspectRatio: '16/10'
              }}
            >
              {!peer.video || !peer.stream ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  {peer.avatar ? (
                    <img 
                      src={getAvatarUrl(peer.avatar)} 
                      alt={peer.username} 
                      style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-border)' }}
                    />
                  ) : (
                    <div className="avatar-circle" style={{ width: 56, height: 56, fontSize: '1.25rem' }}>
                      {peerInitials}
                    </div>
                  )}
                </div>
              ) : (
                <video 
                  autoPlay
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  ref={(el) => {
                    if (el && peer.stream) {
                      el.srcObject = peer.stream;
                    }
                  }}
                />
              )}

              {/* Peer indicator info */}
              <div style={{
                position: 'absolute',
                bottom: '0.625rem',
                left: '0.625rem',
                background: 'rgba(10, 11, 15, 0.75)',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.7rem',
                color: '#fff',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <span>{peer.username}</span>
                {peer.screen && <span style={{ fontSize: '0.6rem', padding: '0.05rem 0.25rem', background: 'var(--color-accent-subtle)', border: '1px solid var(--color-accent-glow)', borderRadius: 3, color: 'var(--color-accent-light)' }}>SCREEN</span>}
              </div>

              {!peer.audio && (
                <div style={{
                  position: 'absolute',
                  top: '0.625rem',
                  right: '0.625rem',
                  background: 'rgba(239, 68, 68, 0.85)',
                  padding: '0.25rem',
                  borderRadius: '50%',
                  color: '#fff',
                  display: 'flex'
                }}>
                  <MicOff size={11} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Control bar bottom panel */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid var(--color-border)',
        background: 'rgba(15, 17, 23, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        flexShrink: 0
      }}>
        {/* Mic control */}
        <button
          onClick={handleToggleAudio}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: isMuted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isMuted ? 'rgba(239, 68, 68, 0.3)' : 'var(--color-border)'}`,
            color: isMuted ? 'var(--color-error)' : 'var(--color-text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'var(--transition-fast)'
          }}
          className="hover:scale-105"
          title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
        >
          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        {/* Cam control */}
        <button
          onClick={handleToggleVideo}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: isVideoOff ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isVideoOff ? 'rgba(239, 68, 68, 0.3)' : 'var(--color-border)'}`,
            color: isVideoOff ? 'var(--color-error)' : 'var(--color-text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'var(--transition-fast)'
          }}
          className="hover:scale-105"
          title={isVideoOff ? "Start Camera" : "Stop Camera"}
        >
          {isVideoOff ? <VideoOff size={16} /> : <Video size={16} />}
        </button>

        {/* Screen share control */}
        <button
          onClick={handleToggleScreenShare}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: isScreenSharing ? 'var(--color-accent-subtle)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isScreenSharing ? 'var(--color-accent-glow)' : 'var(--color-border)'}`,
            color: isScreenSharing ? 'var(--color-accent-light)' : 'var(--color-text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'var(--transition-fast)'
          }}
          className="hover:scale-105"
          title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
        >
          <Monitor size={16} />
        </button>

        {/* Separator */}
        <div style={{ width: '1px', height: '24px', background: 'var(--color-border)' }}></div>

        {/* Phone leave control */}
        <button
          onClick={handleLeaveMeeting}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--color-error)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'var(--transition-fast)'
          }}
          className="hover:bg-[rgba(239,68,68,0.25)] hover:scale-105"
          title="Leave Meeting"
        >
          <PhoneOff size={16} />
        </button>
      </div>
    </div>
  );
};

export default WorkspaceMeeting;
