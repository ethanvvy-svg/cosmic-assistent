import React, { useState, useEffect } from 'react';
import {
  Mail,
  Calendar as CalendarIcon,
  CheckSquare,
  HardDrive,
  MapPin,
  Send,
  Plus,
  RefreshCw,
  LogOut,
  ExternalLink,
  X,
  AlertTriangle,
  User as UserIcon,
  ShieldCheck,
  Sparkles,
  Play,
  Search,
} from 'lucide-react';
import {
  initAuth,
  googleSignIn,
  googleLogout,
  getAccessToken,
  fetchUserGmailMessages,
  sendGmailMessage,
  fetchGoogleCalendarEvents,
  createGoogleCalendarEvent,
  fetchGoogleTasks,
  createGoogleTask,
  fetchGoogleDriveFiles,
  searchYouTubeVideos,
  GmailEmail,
  GoogleCalendarEvent,
  GoogleTaskItem,
  GoogleDriveFile,
  YouTubeVideoItem,
} from '../utils/googleWorkspace';
import { requestUserLocation, getCachedLocation, UserLocation } from '../utils/location';
import { playClick, playSuccessTone } from '../utils/audio';
import { User } from 'firebase/auth';

interface GoogleWorkspaceHubProps {
  isOpen: boolean;
  onClose: () => void;
  onSendSystemMessage: (text: string) => void;
}

export const GoogleWorkspaceHub: React.FC<GoogleWorkspaceHubProps> = ({
  isOpen,
  onClose,
  onSendSystemMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'gmail' | 'calendar' | 'tasks' | 'drive' | 'youtube' | 'location'>('gmail');
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // YouTube state
  const [youtubeQuery, setYoutubeQuery] = useState('Iron Man JARVIS AI');
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideoItem[]>([]);
  const [isSearchingYoutube, setIsSearchingYoutube] = useState(false);

  // Data states
  const [emails, setEmails] = useState<GmailEmail[]>([]);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [tasks, setTasks] = useState<GoogleTaskItem[]>([]);
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [location, setLocation] = useState<UserLocation | null>(() => getCachedLocation());

  // Compose Email Modal
  const [composeOpen, setComposeOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);

  // New Event Modal
  const [eventOpen, setEventOpen] = useState(false);
  const [eventSummary, setEventSummary] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('14:00');
  const [eventLocation, setEventLocation] = useState('');

  // New Task Modal
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch tab data when token and tab changes
  useEffect(() => {
    if (!accessToken) return;
    loadCurrentTabData();
  }, [accessToken, activeTab]);

  const loadCurrentTabData = async () => {
    if (!accessToken) return;
    setLoadingData(true);
    setStatusMessage('');
    try {
      if (activeTab === 'gmail') {
        const data = await fetchUserGmailMessages(6);
        setEmails(data);
      } else if (activeTab === 'calendar') {
        const data = await fetchGoogleCalendarEvents();
        setEvents(data);
      } else if (activeTab === 'tasks') {
        const data = await fetchGoogleTasks();
        setTasks(data);
      } else if (activeTab === 'drive') {
        const data = await fetchGoogleDriveFiles(6);
        setDriveFiles(data);
      }
    } catch (err: any) {
      console.warn('Error fetching workspace data:', err);
      setStatusMessage(err.message || 'Failed to load data from Google');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSignIn = async () => {
    playClick();
    setIsLoadingAuth(true);
    setStatusMessage('');
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        playSuccessTone();
        onSendSystemMessage(`Google Workspace connected successfully for ${res.user.email}.`);
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Google Workspace sign-in failed');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleSignOut = async () => {
    playClick();
    await googleLogout();
    setUser(null);
    setAccessToken(null);
    setEmails([]);
    setEvents([]);
    setTasks([]);
    setDriveFiles([]);
  };

  const handleFetchLocation = async () => {
    playClick();
    setLoadingData(true);
    try {
      const loc = await requestUserLocation();
      setLocation(loc);
      playSuccessTone();
      onSendSystemMessage(`Location updated: ${loc.city}, ${loc.country} (${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}).`);
    } catch (e: any) {
      setStatusMessage(e.message || 'Could not retrieve location');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSearchYoutube = async (queryOverride?: string) => {
    const q = (queryOverride || youtubeQuery).trim();
    if (!q) return;
    playClick();
    setIsSearchingYoutube(true);
    setStatusMessage('');
    try {
      const results = await searchYouTubeVideos(q);
      setYoutubeVideos(results);
      playSuccessTone();
      onSendSystemMessage(`YouTube query executed for "${q}" (${results.length} media streams found).`);
    } catch (e: any) {
      console.warn('YouTube search failed:', e);
      setStatusMessage(e.message || 'Could not complete YouTube search');
    } finally {
      setIsSearchingYoutube(false);
    }
  };

  // Explicit confirmation dialog for sending email (MANDATORY per Workspace skill)
  const handleConfirmSendEmail = async () => {
    setConfirmSendOpen(false);
    setLoadingData(true);
    try {
      await sendGmailMessage(emailTo, emailSubject, emailBody);
      playSuccessTone();
      setComposeOpen(false);
      setEmailTo('');
      setEmailSubject('');
      setEmailBody('');
      onSendSystemMessage(`Email successfully dispatched to ${emailTo}.`);
      loadCurrentTabData();
    } catch (e: any) {
      alert(`Failed to send email: ${e.message}`);
    } finally {
      setLoadingData(false);
    }
  };

  // Add Calendar event
  const handleCreateEvent = async () => {
    if (!eventSummary.trim() || !eventDate) return;
    setLoadingData(true);
    try {
      const startDateTime = `${eventDate}T${eventTime}:00Z`;
      const endDateTime = `${eventDate}T${eventTime.slice(0, 2)}:59:00Z`;
      await createGoogleCalendarEvent(eventSummary, startDateTime, endDateTime, '', eventLocation);
      playSuccessTone();
      setEventOpen(false);
      setEventSummary('');
      setEventLocation('');
      onSendSystemMessage(`Calendar event "${eventSummary}" scheduled.`);
      loadCurrentTabData();
    } catch (e: any) {
      alert(`Failed to create calendar event: ${e.message}`);
    } finally {
      setLoadingData(false);
    }
  };

  // Add Task
  const handleCreateTask = async () => {
    if (!taskTitle.trim()) return;
    setLoadingData(true);
    try {
      await createGoogleTask(taskTitle);
      playSuccessTone();
      setTaskOpen(false);
      setTaskTitle('');
      onSendSystemMessage(`Google Task "${taskTitle}" created.`);
      loadCurrentTabData();
    } catch (e: any) {
      alert(`Failed to create task: ${e.message}`);
    } finally {
      setLoadingData(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-cyan-500/20 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-chakra text-[10px] text-cyan-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                GOOGLE WORKSPACE & TELEMETRY INTEGRATION
              </span>
              <h2 className="font-orbitron font-bold text-lg text-white">
                Workspace Hub & Location
              </h2>
            </div>
          </div>
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Banner */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-8 h-8 rounded-full border border-cyan-400/40"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-bold text-xs">
                  {user.displayName?.[0] || 'U'}
                </div>
              )}
              <div>
                <p className="font-orbitron font-semibold text-xs text-white">
                  {user.displayName || 'Google Workspace User'}
                </p>
                <p className="text-[11px] text-slate-400 font-chakra">{user.email}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-300 font-sans">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Connect Google to access your real-time Gmail, Calendar, Tasks & Drive.</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {user ? (
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 text-xs font-chakra flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={isLoadingAuth}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-sans text-xs font-medium flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isLoadingAuth ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 gap-2 overflow-x-auto">
          {[
            { id: 'gmail', label: 'Gmail', icon: Mail, count: emails.length },
            { id: 'calendar', label: 'Calendar', icon: CalendarIcon, count: events.length },
            { id: 'tasks', label: 'Tasks', icon: CheckSquare, count: tasks.length },
            { id: 'drive', label: 'Drive', icon: HardDrive, count: driveFiles.length },
            { id: 'youtube', label: 'YouTube', icon: Play, count: youtubeVideos.length },
            { id: 'location', label: 'Live Location', icon: MapPin },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  playClick();
                  setActiveTab(tab.id as any);
                }}
                className={`py-3 px-3.5 border-b-2 font-chakra text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {statusMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2 font-chakra">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* GMAIL TAB */}
          {activeTab === 'gmail' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-orbitron font-semibold text-sm text-cyan-200">
                  Gmail Inbox Telemetry
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      playClick();
                      loadCurrentTabData();
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-chakra flex items-center gap-1"
                    title="Refresh emails"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
                  </button>
                  {user && (
                    <button
                      onClick={() => {
                        playClick();
                        setComposeOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-chakra text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Compose Email</span>
                    </button>
                  )}
                </div>
              </div>

              {!user ? (
                <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-dashed border-slate-800 space-y-3">
                  <Mail className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">
                    Sign in to your Google Workspace account to read your incoming emails and send messages via voice or HUD.
                  </p>
                </div>
              ) : emails.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400">
                  {loadingData ? 'Scanning Gmail messages...' : 'No recent emails found in inbox.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {emails.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-xl border transition-all ${
                        m.unread
                          ? 'bg-slate-900/90 border-cyan-500/40 shadow-sm'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-chakra text-xs font-bold text-slate-200 truncate">
                          {m.from}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0">
                          {m.date ? new Date(m.date).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <p className="font-chakra text-xs font-semibold text-cyan-300 truncate">
                        {m.subject}
                      </p>
                      <p className="text-xs text-slate-400 font-sans line-clamp-2 mt-1">
                        {m.snippet}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CALENDAR TAB */}
          {activeTab === 'calendar' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-orbitron font-semibold text-sm text-cyan-200">
                  Google Calendar Events
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      playClick();
                      loadCurrentTabData();
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-chakra"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
                  </button>
                  {user && (
                    <button
                      onClick={() => {
                        playClick();
                        setEventOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-chakra text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Event</span>
                    </button>
                  )}
                </div>
              </div>

              {!user ? (
                <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-xs text-slate-400">
                  Please sign in to Google to sync your calendar schedule.
                </div>
              ) : events.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400">
                  {loadingData ? 'Loading schedule...' : 'No upcoming Google Calendar events.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl bg-slate-900/70 border border-cyan-500/20 flex items-start justify-between gap-3"
                    >
                      <div>
                        <h4 className="font-chakra text-xs font-bold text-white">
                          {ev.summary}
                        </h4>
                        <p className="text-[11px] text-cyan-400 font-mono mt-0.5">
                          {ev.start ? new Date(ev.start).toLocaleString() : 'All Day'}
                        </p>
                        {ev.location && (
                          <p className="text-[11px] text-slate-400 font-chakra mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-cyan-400" />
                            <span>{ev.location}</span>
                          </p>
                        )}
                      </div>
                      {ev.htmlLink && (
                        <a
                          href={ev.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300"
                          title="Open in Google Calendar"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TASKS TAB */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-orbitron font-semibold text-sm text-cyan-200">
                  Google Tasks Synced
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      playClick();
                      loadCurrentTabData();
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-chakra"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
                  </button>
                  {user && (
                    <button
                      onClick={() => {
                        playClick();
                        setTaskOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-chakra text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Task</span>
                    </button>
                  )}
                </div>
              </div>

              {!user ? (
                <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-xs text-slate-400">
                  Sign in with Google to synchronize your Google Tasks.
                </div>
              ) : tasks.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400">
                  {loadingData ? 'Fetching task list...' : 'No pending tasks in default Google Tasks list.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <CheckSquare className="w-4 h-4 text-cyan-400" />
                        <span className="font-chakra text-xs text-slate-200 font-medium">
                          {t.title}
                        </span>
                      </div>
                      {t.due && (
                        <span className="text-[10px] font-mono text-slate-400">
                          Due {new Date(t.due).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DRIVE TAB */}
          {activeTab === 'drive' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-orbitron font-semibold text-sm text-cyan-200">
                  Google Drive Documents
                </h3>
                <button
                  onClick={() => {
                    playClick();
                    loadCurrentTabData();
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-chakra"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {!user ? (
                <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-xs text-slate-400">
                  Sign in to browse and search your recent Google Drive files.
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400">
                  {loadingData ? 'Reading Drive files...' : 'No recent files found in Google Drive.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {driveFiles.map((f) => (
                    <div
                      key={f.id}
                      className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3 hover:border-cyan-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <HardDrive className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className="font-chakra text-xs text-slate-200 truncate">
                          {f.name}
                        </span>
                      </div>
                      {f.webViewLink && (
                        <a
                          href={f.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-chakra flex items-center gap-1 shrink-0"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LIVE LOCATION TAB */}
          {activeTab === 'location' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-orbitron font-semibold text-sm text-cyan-200">
                    Real-Time GPS Location Telemetry
                  </h3>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    Provides hyper-accurate localized weather, time, navigation, and regional awareness to COSMIC.
                  </p>
                </div>
                <button
                  onClick={handleFetchLocation}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-chakra text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Update GPS Fix</span>
                </button>
              </div>

              {location ? (
                <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/30 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-chakra text-emerald-400 uppercase tracking-widest font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        ACTIVE GPS LOCK
                      </span>
                      <h4 className="font-orbitron font-bold text-base text-white mt-1">
                        {location.city || 'Detected City'}, {location.country || ''}
                      </h4>
                      <p className="text-xs text-slate-300 font-sans mt-1">
                        {location.displayName}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800">
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800 text-[11px] font-mono">
                      <span className="text-slate-500 block text-[10px]">LATITUDE</span>
                      <span className="text-cyan-300">{location.latitude.toFixed(6)}°</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800 text-[11px] font-mono">
                      <span className="text-slate-500 block text-[10px]">LONGITUDE</span>
                      <span className="text-cyan-300">{location.longitude.toFixed(6)}°</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800 text-[11px] font-mono col-span-2 sm:col-span-1">
                      <span className="text-slate-500 block text-[10px]">ACCURACY</span>
                      <span className="text-emerald-300">±{Math.round(location.accuracy)} meters</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-dashed border-slate-800 space-y-3">
                  <MapPin className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">
                    No GPS coordinates captured yet. Click "Update GPS Fix" to grant location permission.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 6. YOUTUBE VIDEO SEARCH & MEDIA PANEL */}
          {activeTab === 'youtube' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={youtubeQuery}
                    onChange={(e) => setYoutubeQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearchYoutube();
                    }}
                    placeholder="Search YouTube videos, tech talks, sci-fi HUD..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans"
                  />
                </div>
                <button
                  onClick={() => handleSearchYoutube()}
                  disabled={isSearchingYoutube || !youtubeQuery.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 text-white font-chakra text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-red-950/40"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isSearchingYoutube ? 'Searching...' : 'Search YouTube'}</span>
                </button>
              </div>

              {/* Quick Filter Suggestions */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-chakra text-slate-500 uppercase tracking-wider">Fast Presets:</span>
                {['Iron Man JARVIS HUD', 'Tony Stark Workshop AI', 'Sci-Fi Holographic UI', 'Next-Gen Quantum AI'].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setYoutubeQuery(preset);
                      handleSearchYoutube(preset);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-[11px] text-slate-300 hover:text-cyan-300 font-chakra transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Video Grid */}
              {isSearchingYoutube ? (
                <div className="p-12 text-center rounded-xl bg-slate-900/30 border border-slate-800 space-y-3">
                  <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin mx-auto" />
                  <p className="text-xs text-slate-400 font-chakra">Streaming telemetry from YouTube servers...</p>
                </div>
              ) : youtubeVideos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                  {youtubeVideos.map((video) => (
                    <a
                      key={video.id || video.url}
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col rounded-xl bg-slate-900/70 border border-slate-800 hover:border-red-500/50 hover:bg-slate-900 transition-all overflow-hidden shadow-sm hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                    >
                      <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e: any) => {
                            e.target.src = 'https://www.youtube.com/img/desktop/yt_1200.png';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-red-500 transition-transform">
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <div className="p-3 flex-1 flex flex-col justify-between space-y-1.5">
                        <h4 className="font-sans font-semibold text-xs text-slate-100 group-hover:text-red-300 line-clamp-2 transition-colors">
                          {video.title}
                        </h4>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-chakra">
                          <span className="truncate max-w-[140px] text-slate-400">{video.channelTitle}</span>
                          <span className="text-red-400 flex items-center gap-1 group-hover:underline">
                            <span>Watch</span>
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center rounded-xl bg-slate-900/40 border border-dashed border-slate-800 space-y-3">
                  <Play className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">
                    No videos retrieved yet. Search for any topic above or say "COSMIC, search YouTube for..." in chat.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* COMPOSE EMAIL MODAL */}
        {composeOpen && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-30 p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="font-orbitron font-bold text-sm text-cyan-300">Compose Gmail Message</h4>
                <button onClick={() => setComposeOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label className="text-[11px] font-chakra text-slate-400 block mb-1">To Email:</label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 font-sans"
                />
              </div>
              <div>
                <label className="text-[11px] font-chakra text-slate-400 block mb-1">Subject:</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Subject line"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 font-sans"
                />
              </div>
              <div>
                <label className="text-[11px] font-chakra text-slate-400 block mb-1">Message Body:</label>
                <textarea
                  rows={4}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Enter message text..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 font-sans"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setComposeOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-chakra"
              >
                Cancel
              </button>
              <button
                onClick={() => setConfirmSendOpen(true)}
                disabled={!emailTo.trim() || !emailSubject.trim()}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-chakra font-bold flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Email</span>
              </button>
            </div>
          </div>
        )}

        {/* MANDATORY EXPLICIT CONFIRMATION MODAL FOR SENDING EMAIL (Google Workspace Skill Standard) */}
        {confirmSendOpen && (
          <div className="absolute inset-0 bg-slate-950/95 z-40 p-6 flex items-center justify-center">
            <div className="max-w-md w-full p-5 rounded-xl bg-slate-900 border border-rose-500/50 shadow-2xl space-y-4">
              <div className="flex items-center gap-2.5 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h4 className="font-orbitron font-bold text-sm text-white">Confirm Email Dispatch</h4>
              </div>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Are you sure you want to send this email on your behalf?
              </p>
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs space-y-1 font-chakra">
                <p><span className="text-slate-500">To:</span> <span className="text-cyan-300">{emailTo}</span></p>
                <p><span className="text-slate-500">Subject:</span> <span className="text-slate-200">{emailSubject}</span></p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmSendOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-chakra"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSendEmail}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-chakra font-bold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirm & Send</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NEW CALENDAR EVENT MODAL */}
        {eventOpen && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-30 p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="font-orbitron font-bold text-sm text-cyan-300">Schedule Google Calendar Event</h4>
                <button onClick={() => setEventOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label className="text-[11px] font-chakra text-slate-400 block mb-1">Event Title:</label>
                <input
                  type="text"
                  value={eventSummary}
                  onChange={(e) => setEventSummary(e.target.value)}
                  placeholder="Strategy Sync, Doctor Appointment..."
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 font-sans"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-chakra text-slate-400 block mb-1">Date:</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 font-sans"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-chakra text-slate-400 block mb-1">Time:</label>
                  <input
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 font-sans"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-chakra text-slate-400 block mb-1">Location (Optional):</label>
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="Conference Room A / Online"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 font-sans"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEventOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-chakra"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                disabled={!eventSummary.trim() || !eventDate}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-chakra font-bold"
              >
                Save Event
              </button>
            </div>
          </div>
        )}

        {/* NEW TASK MODAL */}
        {taskOpen && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-30 p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="font-orbitron font-bold text-sm text-cyan-300">Create Google Task</h4>
                <button onClick={() => setTaskOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label className="text-[11px] font-chakra text-slate-400 block mb-1">Task Title:</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="What needs to be accomplished, sir?"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 font-sans"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setTaskOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-chakra"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                disabled={!taskTitle.trim()}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-chakra font-bold"
              >
                Create Task
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
