import { Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useChat } from '../context/ChatContext';
import ConversationList from '../components/ConversationList';

export default function MessagesLayout() {
  const { fetchConversations, joinViaInvite, setInviteBanner } = useChat();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inviteCode = searchParams.get('invite');
  const inviteInFlight = useRef(false);
  const successTimerRef = useRef(null);
  const [inviteStatus, setInviteStatus] = useState({ loading: false, error: '' });

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    let active = true;
    if (!inviteCode || inviteInFlight.current) return undefined;

    inviteInFlight.current = true;
    setInviteStatus({ loading: true, error: '' });

    (async () => {
      try {
        const data = await joinViaInvite(inviteCode);
        await fetchConversations();

        if (data?.status === 'member' && data?.conversationId) {
          toast.success('Joined group successfully');
          setInviteBanner({
            conversationId: data.conversationId,
            message: 'Joined group successfully.',
          });
          if (active) {
            navigate(`/messages/chat/${data.conversationId}`, { replace: true });
          }
        } else if (data?.status === 'pending') {
          toast.success('Join request sent');
          if (active) navigate('/messages', { replace: true });
        } else {
          toast.success('Invite processed');
          if (active) navigate('/messages', { replace: true });
        }
      } catch (err) {
        const message = err?.response?.data?.message || 'Invite is invalid or expired';
        setInviteStatus({ loading: false, error: message });
        toast.error(message);
        if (active) navigate('/messages', { replace: true });
      } finally {
        if (active) {
          setInviteStatus((prev) => ({ ...prev, loading: false }));
          if (successTimerRef.current) clearTimeout(successTimerRef.current);
          successTimerRef.current = setTimeout(() => {
            setInviteBanner(null);
          }, 3500);
        }
        inviteInFlight.current = false;
      }
    })();

    return () => { active = false; };
  }, [inviteCode, joinViaInvite, fetchConversations, navigate]);

  useEffect(() => () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
  }, []);

  return (
    <div className="flex h-full bg-white dark:bg-dark-card transition-colors">
      <div className="w-96 border-r border-gray-200 dark:border-dark-border flex flex-col bg-white dark:bg-dark-card">
        <div className="flex-1 overflow-y-auto">
          <ConversationList />
        </div>
      </div>
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-dark-bg transition-colors">
        {inviteStatus.loading && (
          <div className="px-4 py-2 text-xs text-[#2563EB] bg-[#DBEAFE]">
            Joining group via invite...
          </div>
        )}
        {inviteStatus.error && (
          <div className="px-4 py-2 text-xs text-red-600 bg-red-50">
            {inviteStatus.error}
          </div>
        )}
        <Outlet />
      </div>
    </div>
  );
}
