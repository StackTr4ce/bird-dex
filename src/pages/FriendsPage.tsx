import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Alert, 
  CircularProgress,
  Stack,
  Chip
} from '@mui/material';
import { supabase } from '../supabaseClient';
import { useAuth } from '../components/AuthProvider';

interface FriendshipData {
  id: string;
  requester: string;
  addressee: string;
  status: 'pending' | 'accepted';
  created_at: string;
}

interface FriendDisplayData extends FriendshipData {
  friendDisplayName?: string;
}

const FriendsPage = () => {
  const { user } = useAuth();
  const [friendDisplayName, setFriendDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [friends, setFriends] = useState<FriendDisplayData[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendDisplayData[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendDisplayData[]>([]);

  // Helper function to get user display name by ID
  const getUserDisplayName = async (userId: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles_public')
        .select('display_name')
        .eq('user_id', userId)
        .single();
      if (error || !data) {
        return `User ${userId.slice(0, 8)}...`;
      }
      return data.display_name || `User ${userId.slice(0, 8)}...`;
    } catch (error) {
      return `User ${userId.slice(0, 8)}...`;
    }
  };

  useEffect(() => {
    if (user) {
      fetchFriends();
    }
  }, [user]);

  const fetchFriends = async () => {
    if (!user) return;

    // Get accepted friendships (both directions)
    const { data: acceptedFriends } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester.eq.${user.id},addressee.eq.${user.id}`)
      .eq('status', 'accepted');

    // Get pending requests sent by user
    const { data: sentRequests } = await supabase
      .from('friendships')
      .select('*')
      .eq('requester', user.id)
      .eq('status', 'pending');

    // Get pending requests received by user
    const { data: receivedRequests } = await supabase
      .from('friendships')
      .select('*')
      .eq('addressee', user.id)
      .eq('status', 'pending');

    // Populate friend emails
    const friendsWithDisplayNames = await Promise.all(
      (acceptedFriends || []).map(async (friendship) => {
        const friendId = friendship.requester === user.id ? friendship.addressee : friendship.requester;
        const friendDisplayName = await getUserDisplayName(friendId);
        return { ...friendship, friendDisplayName };
      })
    );

    const sentWithDisplayNames = await Promise.all(
      (sentRequests || []).map(async (request) => {
        const friendDisplayName = await getUserDisplayName(request.addressee);
        return { ...request, friendDisplayName };
      })
    );

    const receivedWithDisplayNames = await Promise.all(
      (receivedRequests || []).map(async (request) => {
        const friendDisplayName = await getUserDisplayName(request.requester);
        return { ...request, friendDisplayName };
      })
    );

    setFriends(friendsWithDisplayNames);
    setPendingRequests(sentWithDisplayNames);
    setFriendRequests(receivedWithDisplayNames);
  };

  const sendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !friendDisplayName.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      // Look up user by display name in user_profiles_public
      const { data: targetUser, error: lookupError } = await supabase
        .from('user_profiles_public')
        .select('user_id, display_name')
        .ilike('display_name', friendDisplayName.trim())
        .single();

      if (lookupError || !targetUser) {
        setMessage({ type: 'error', text: 'User not found. Please check the display name.' });
        setLoading(false);
        return;
      }

      // Check if it's the same user
      if (targetUser.user_id === user.id) {
        setMessage({ type: 'error', text: 'You cannot send a friend request to yourself.' });
        setLoading(false);
        return;
      }

      // Check if friendship already exists
      const { data: existingFriendship } = await supabase
        .from('friendships')
        .select('*')
        .or(`and(requester.eq.${user.id},addressee.eq.${targetUser.user_id}),and(requester.eq.${targetUser.user_id},addressee.eq.${user.id})`)
        .single();

      if (existingFriendship) {
        if (existingFriendship.status === 'accepted') {
          setMessage({ type: 'error', text: 'You are already friends with this user.' });
        } else {
          setMessage({ type: 'error', text: 'A friend request already exists with this user.' });
        }
        setLoading(false);
        return;
      }

      // Send friend request
      const { error: insertError } = await supabase
        .from('friendships')
        .insert({
          requester: user.id,
          addressee: targetUser.user_id,
          status: 'pending'
        });

      if (insertError) {
        setMessage({ type: 'error', text: insertError.message || 'Failed to send friend request.' });
      } else {
        setMessage({ 
          type: 'success', 
          text: `Friend request sent to ${targetUser.display_name || friendDisplayName}!` 
        });
        setFriendDisplayName('');
        fetchFriends(); // Refresh the lists
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send friend request.' });
    }

    setLoading(false);
  };

  const acceptFriendRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);

    if (!error) {
      fetchFriends();
    }
  };

  const removeFriend = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (!error) {
      fetchFriends();
    }
  };

  return (
    <Box>
      <Typography align="left" variant="h4" fontWeight={700} gutterBottom>
        Friends
      </Typography>
      <Typography align="left" variant="subtitle1" color="text.secondary" gutterBottom sx={{ pb: 1 }}>
        Manage your BirdDex friends and requests.
      </Typography>

      {/* Add Friend Form */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Add Friend
        </Typography>
        <Box component="form" onSubmit={sendFriendRequest}>
          <Stack spacing={2}>
            <TextField
              label="Friend's Display Name"
              value={friendDisplayName}
              onChange={(e) => setFriendDisplayName(e.target.value)}
              fullWidth
              required
              disabled={loading}
              helperText="Enter the display name of the friend you want to add (case-insensitive)"
            />
            <Button
              type="submit"
              variant="contained"
              disabled={loading || !friendDisplayName.trim()}
              sx={{ alignSelf: 'flex-start' }}
            >
              {loading ? <CircularProgress size={20} /> : 'Send Friend Request'}
            </Button>
          </Stack>
        </Box>
        {message && (
          <Alert severity={message.type} sx={{ mt: 2 }}>
            {message.text}
          </Alert>
        )}
      </Paper>

      {/* Friend Requests */}
      {friendRequests.length > 0 && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Friend Requests
          </Typography>
          <Stack spacing={2}>
            {friendRequests.map((request) => (
              <Box key={request.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography>{request.friendDisplayName}</Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => acceptFriendRequest(request.id)}
                  >
                    Accept
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => removeFriend(request.id)}
                  >
                    Decline
                  </Button>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Pending Requests
          </Typography>
          <Stack spacing={2}>
            {pendingRequests.map((request) => (
              <Box key={request.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography>{request.friendDisplayName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Request sent
                  </Typography>
                </Box>
                <Chip label="Pending" color="warning" variant="outlined" />
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Friends List */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          My Friends ({friends.length})
        </Typography>
        {friends.length === 0 ? (
          <Typography color="text.secondary">
            No friends yet. Send some friend requests to get started!
          </Typography>
        ) : (
          <Stack spacing={2}>
            {friends.map((friend) => (
              <Box key={friend.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography>{friend.friendDisplayName}</Typography>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => removeFriend(friend.id)}
                >
                  Remove
                </Button>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
};

export default FriendsPage;
