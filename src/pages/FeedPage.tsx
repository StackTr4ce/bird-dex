import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  TextField,
  Button,
  Avatar,
  Chip,
  CircularProgress,
  Stack,
  IconButton,
  Collapse,
  Divider,
  Snackbar,
  Alert,
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import {
  Comment as CommentIcon,
  Send as SendIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import { supabase } from '../supabaseClient';
import { useAuth } from '../components/AuthProvider';
import SupabaseImage from '../components/SupabaseImage';

interface FeedPhoto {
  id: string;
  url: string;
  thumbnail_url?: string;
  species_id: string;
  user_id: string;
  created_at: string;
  hidden_from_species_view?: boolean;
  user_profile: {
    display_name: string;
    email?: string;
  };
  comments: FeedComment[];
  comment_count: number;
}

interface FeedComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_profile: {
    display_name: string;
    email?: string;
  };
}

const ITEMS_PER_PAGE = 10;

const FeedPage = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<FeedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [newComments, setNewComments] = useState<{[key: string]: string}>({});
  const [commenting, setCommenting] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<FeedPhoto | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get user's friends
  const getUserFriends = useCallback(async () => {
    if (!user) return [];
    
    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester, addressee')
      .or(`requester.eq.${user.id},addressee.eq.${user.id}`)
      .eq('status', 'accepted');

    if (!friendships) return [];

    // Extract friend IDs (exclude current user)
    const friendIds = friendships.map(friendship => 
      friendship.requester === user.id ? friendship.addressee : friendship.requester
    );

    return friendIds;
  }, [user]);




  // Fetch only friends' photos for Feed page
  const fetchPhotos = useCallback(async (pageNum: number = 0, reset: boolean = false) => {
    if (!user) return;

    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      // Fetch friends' photos
      const friendIds = await getUserFriends();
      if (friendIds.length === 0) {
        setPhotos([]);
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const response = await supabase
        .from('photos')
        .select('id, url, thumbnail_url, species_id, user_id, created_at')
        .in('user_id', friendIds.length > 0 ? friendIds : ['00000000-0000-0000-0000-000000000000'])
        .eq('hidden_from_feed', false)
        .order('created_at', { ascending: false })
        .range(pageNum * ITEMS_PER_PAGE, (pageNum + 1) * ITEMS_PER_PAGE - 1);

      const feedPhotos = response.data;
      const error = response.error;
      if (error) throw error;

      // Get user profiles for the photo owners
      const userIds = [...new Set(feedPhotos?.map(p => p.user_id) || [])];
      const { data: userProfiles } = await supabase
        .from('user_profiles_public')
        .select('user_id, display_name')
        .in('user_id', userIds);

      // Create a map for quick user profile lookup
      const userProfilesMap = userProfiles?.reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as {[key: string]: any}) || {};

      // Get comment counts for each photo
      const photoIds = feedPhotos?.map(p => p.id) || [];
      let commentCountsMap: {[key: string]: number} = {};
      
      if (photoIds.length > 0) {
        const { data: commentCounts } = await supabase
          .from('comments')
          .select('photo_id')
          .in('photo_id', photoIds);
        
        // Count comments for each photo
        commentCounts?.forEach(comment => {
          commentCountsMap[comment.photo_id] = (commentCountsMap[comment.photo_id] || 0) + 1;
        });
      }


      // Transform data to match our interface
      const transformedPhotos: FeedPhoto[] = (feedPhotos || []).map((photo: any) => {
        const userProfile = userProfilesMap[photo.user_id];
        let displayName = 'Unknown User';
        if (userProfile) {
          displayName = userProfile.display_name?.trim() ? userProfile.display_name : 'Unknown User';
        }
        return {
          ...photo,
          hidden_from_species_view: photo.hidden_from_species_view ?? false,
          user_profile: {
            display_name: displayName,
          },
          comments: [],
          comment_count: commentCountsMap[photo.id] || 0,
        };
      });

      if (reset || pageNum === 0) {
        setPhotos(transformedPhotos);
      } else {
        setPhotos(prev => [...prev, ...transformedPhotos]);
      }

      setHasMore(transformedPhotos.length === ITEMS_PER_PAGE);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, getUserFriends]);

  // Load more photos
  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchPhotos(page + 1);
    }
  };

  // Fetch comments for a specific photo
  const fetchComments = async (photoId: string) => {
    const { data: comments } = await supabase
      .from('comments')
      .select('id, content, created_at, user_id')
      .eq('photo_id', photoId)
      .order('created_at', { ascending: true });

    if (comments && comments.length > 0) {
      // Get user profiles for comment authors
      const userIds = [...new Set(comments.map(c => c.user_id))];
      const { data: userProfiles } = await supabase
        .from('user_profiles_public')
        .select('user_id, display_name')
        .in('user_id', userIds);

      // Create a map for quick user profile lookup
      const userProfilesMap = userProfiles?.reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as {[key: string]: any}) || {};

      const transformedComments: FeedComment[] = comments.map(comment => {
        const userProfile = userProfilesMap[comment.user_id];
        return {
          ...comment,
          user_profile: {
            display_name: userProfile?.display_name || comment.user_id || 'Unknown User',
          },
        };
      });

      setPhotos(prev => prev.map(photo => 
        photo.id === photoId 
          ? { ...photo, comments: transformedComments }
          : photo
      ));
    }
  };

  // Toggle comments visibility
  const toggleComments = async (photoId: string) => {
    const newExpanded = new Set(expandedComments);
    
    if (expandedComments.has(photoId)) {
      newExpanded.delete(photoId);
    } else {
      newExpanded.add(photoId);
      // Fetch comments if not already loaded
      const photo = photos.find(p => p.id === photoId);
      if (photo && photo.comments.length === 0 && photo.comment_count > 0) {
        await fetchComments(photoId);
      }
    }
    
    setExpandedComments(newExpanded);
  };

  // Add a new comment
  const addComment = async (photoId: string) => {
    const content = newComments[photoId]?.trim();
    if (!content || !user) return;

    setCommenting(prev => new Set([...prev, photoId]));

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          photo_id: photoId,
          user_id: user.id,
          content: content,
        });

      if (error) throw error;

      // Clear the comment input
      setNewComments(prev => ({ ...prev, [photoId]: '' }));
      
      // Refresh comments for this photo
      await fetchComments(photoId);
      
      // Update comment count
      setPhotos(prev => prev.map(photo => 
        photo.id === photoId 
          ? { ...photo, comment_count: photo.comment_count + 1 }
          : photo
      ));
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setCommenting(prev => {
        const newSet = new Set(prev);
        newSet.delete(photoId);
        return newSet;
      });
    }
  };

  // Delete photo (hard delete, including from storage)
  const handleDeletePhoto = async (photo: FeedPhoto) => {
    // Remove from storage only if not referenced in quest_entries (handled in SQL)
    const { error, data } = await supabase.rpc('delete_or_hide_photo', { photo_id: photo.id });
    if (!error) {
      // Check for Postgres error in data (for some drivers, error is in data.message)
      if (data && data.message) {
        setErrorMessage(data.message);
        setDeleteDialogOpen(false);
        setPhotoToDelete(null);
      } else {
        setPhotos(photos => photos.filter(p => p.id !== photo.id));
        setDeleteDialogOpen(false);
        setPhotoToDelete(null);
      }
    } else {
      setErrorMessage(error.message);
      setDeleteDialogOpen(false);
      setPhotoToDelete(null);
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };


  // Remove tab change logic

  useEffect(() => {
    fetchPhotos(0, true);
  }, [fetchPhotos]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 600, px: { xs: 0.5, sm: 2 }, mx: 'auto' }}>
        <Typography align="center" variant="h4" fontWeight={700} gutterBottom sx={{ width: '100%' }}>
          Photo Feed
        </Typography>

        {photos.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, width: '100%' }}>
            <Typography variant="h6" color="text.secondary" align="center">
              No photos to show
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Add some friends to see their photos here!
            </Typography>
          </Box>
        ) : (
          <Stack spacing={3} sx={{ width: '100%' }}>
            {photos.map((photo) => (
              <Card key={photo.id} elevation={2} sx={{ width: '100%' }}>
                {/* Header */}
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, pl: 1, pr: 1 }}>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {photo.user_profile.display_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatRelativeTime(photo.created_at)}
                      </Typography>
                    </Box>
                    <Chip 
                      label={photo.species_id} 
                      size="small" 
                      variant="outlined"
                    />
                  </Box>
                  {/* Photo */}
                  <Box sx={{ position: 'relative', borderRadius: 1, overflow: 'hidden', width: '100%' }}>
                    <SupabaseImage
                      path={photo.url}
                      alt={`${photo.species_id} by ${photo.user_profile.display_name}`}
                      style={{
                        width: '100%',
                        maxWidth: '100%',
                        maxHeight: 400,
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </Box>
                </CardContent>
                {/* Actions */}
                <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                  <Button
                    startIcon={<CommentIcon />}
                    endIcon={expandedComments.has(photo.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    onClick={() => toggleComments(photo.id)}
                    size="small"
                  >
                    {photo.comment_count} {photo.comment_count === 1 ? 'Comment' : 'Comments'}
                  </Button>
                  {/* No photo actions for Feed page (friends' photos only) */}
                </CardActions>
                {/* Comments Section */}
                <Collapse in={expandedComments.has(photo.id)}>
                  <Divider />
                  <CardContent sx={{ pt: 2 }}>
                    {/* Existing Comments */}
                    {photo.comments.map((comment) => (
                      <Box key={comment.id} sx={{ mb: 2 }}>
                        {/* Row 1: Avatar and user name */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                            {comment.user_profile.display_name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography variant="body2" align="left" sx={{ fontWeight: 600 }}>
                            {comment.user_profile.display_name}
                          </Typography>
                        </Box>
                        {/* Row 2: Comment text */}
                        <Box sx={{ pl: 5, mt: 0.5, mb: 0.5 }}>
                          <Typography variant="body2" align="left">
                            {comment.content}
                          </Typography>
                        </Box>
                        {/* Row 3: Time */}
                        <Box sx={{ pl: 5, display: 'flex', justifyContent: 'flex-end' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
                            {formatRelativeTime(comment.created_at)}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                    {/* Add Comment */}
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Add a comment..."
                        value={newComments[photo.id] || ''}
                        onChange={(e) => setNewComments(prev => ({ ...prev, [photo.id]: e.target.value }))}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            addComment(photo.id);
                          }
                        }}
                      />
                      <IconButton
                        onClick={() => addComment(photo.id)}
                        disabled={!newComments[photo.id]?.trim() || commenting.has(photo.id)}
                        color="primary"
                      >
                        {commenting.has(photo.id) ? (
                          <CircularProgress size={20} />
                        ) : (
                          <SendIcon />
                        )}
                      </IconButton>
                    </Box>
                  </CardContent>
                </Collapse>
              </Card>
            ))}
            {/* Load More */}
            {hasMore && (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Button
                  onClick={loadMore}
                  disabled={loadingMore}
                  variant="outlined"
                >
                  {loadingMore ? <CircularProgress size={20} /> : 'Load More'}
                </Button>
              </Box>
            )}
          </Stack>
        )}
      </Box>
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setPhotoToDelete(null); }}
        aria-labelledby="delete-photo-dialog-title"
        aria-describedby="delete-photo-dialog-description"
      >
        <DialogTitle id="delete-photo-dialog-title">Delete Photo?</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-photo-dialog-description">
            Are you sure you want to delete this photo? This will also delete all comments on this photo. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteDialogOpen(false); setPhotoToDelete(null); }}>
            Cancel
          </Button>
          <Button onClick={() => { if (photoToDelete) handleDeletePhoto(photoToDelete); }} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      {/* Error Snackbar */}
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setErrorMessage(null)} severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FeedPage;
