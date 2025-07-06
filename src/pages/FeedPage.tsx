import { useState, useEffect, useCallback } from 'react';
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
  Tabs,
  Tab,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Comment as CommentIcon,
  Send as SendIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Tooltip from '@mui/material/Tooltip';
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
  privacy: 'public' | 'friends' | 'private';
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
  const [currentTab, setCurrentTab] = useState<'friends' | 'my'>('friends');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<FeedPhoto | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Map of species_id to top photo_id for this user
  const [topSpeciesMap, setTopSpeciesMap] = useState<{ [speciesId: string]: string }>({});
  // Fetch top_species for "My Photos" tab
  useEffect(() => {
    const fetchTopSpecies = async () => {
      if (currentTab !== 'my' || !user) {
        setTopSpeciesMap({});
        return;
      }
      const { data, error } = await supabase
        .from('top_species')
        .select('species_id,photo_id')
        .eq('user_id', user.id);
      if (error || !data) {
        setTopSpeciesMap({});
      } else {
        const map: { [speciesId: string]: string } = {};
        data.forEach((row: any) => {
          map[row.species_id] = row.photo_id;
        });
        setTopSpeciesMap(map);
      }
    };
    fetchTopSpecies();
  }, [currentTab, user, photos]);
  // Set as top photo for a species
  const handleSetAsTopPhoto = async (photo: FeedPhoto) => {
    if (!user) return;
    try {
      await supabase.from('top_species').upsert([
        {
          user_id: user.id,
          species_id: photo.species_id,
          photo_id: photo.id
        }
      ], { onConflict: 'user_id,species_id' });
      setTopSpeciesMap(prev => ({ ...prev, [photo.species_id]: photo.id }));
    } catch (err) {
      setErrorMessage('Failed to set as top photo.');
    }
  };

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

  // Toggle hidden_from_species_view for a photo (must be at top level)
  const handleToggleSpeciesView = async (photo: FeedPhoto) => {
    const newValue = !photo.hidden_from_species_view;
    const { error, data } = await supabase
      .from('photos')
      .update({ hidden_from_species_view: newValue })
      .eq('id', photo.id);
    console.log('handleToggleSpeciesView:', { error, data });
    if (!error) {
      // Check for Postgres error in data (for some drivers, error is in data.message or data[0].message)
      if (data && typeof data === 'object') {
        const arr = data as any[];
        if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object' && 'message' in arr[0]) {
          let msg = arr[0].message;

          console.log('Postgres error in data[0].message:', msg);
          setErrorMessage(msg);
          return;
        }
        if (!Array.isArray(data) && 'message' in data) {
          let msg = (data as any).message;
          if (msg === 'A hidden photo cannot be the top photo for a species') {
            msg = 'Set a different top photo before removing the photo';
          }
          console.log('Postgres error in data.message:', msg);
          setErrorMessage(msg);
          return;
        }
      }
      setPhotos(prev => prev.map(p =>
        p.id === photo.id ? { ...p, hidden_from_species_view: newValue } : p
      ));
    } else {
      let msg = error.message;

      console.log('Supabase error:', error);
      setErrorMessage(msg);
    }
  };

  // Fetch photos from friends
  const fetchPhotos = useCallback(async (pageNum: number = 0, reset: boolean = false) => {
    if (!user) return;

    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      let feedPhotos;
      let error;

      if (currentTab === 'friends') {
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
          .select('id, url, thumbnail_url, species_id, user_id, privacy, created_at')
          .in('user_id', friendIds)
          .in('privacy', ['public', 'friends']) // Respect privacy
          .eq('hidden_from_feed', false)
          .order('created_at', { ascending: false })
          .range(pageNum * ITEMS_PER_PAGE, (pageNum + 1) * ITEMS_PER_PAGE - 1);
        
        feedPhotos = response.data;
        error = response.error;
      } else {
        // Fetch user's own photos (all privacy levels since it's their own)
        const response = await supabase
          .from('photos')
          .select('id, url, thumbnail_url, species_id, user_id, privacy, created_at, hidden_from_species_view')
          .eq('user_id', user.id)
          .eq('hidden_from_feed', false)
          .order('created_at', { ascending: false })
          .range(pageNum * ITEMS_PER_PAGE, (pageNum + 1) * ITEMS_PER_PAGE - 1);
        
        feedPhotos = response.data;
        error = response.error;
      }

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
  }, [user, getUserFriends, currentTab]);

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

  // Handle tab change
  const handleTabChange = (newTab: 'friends' | 'my') => {
    if (newTab !== currentTab) {
      setCurrentTab(newTab);
      setPhotos([]);
      setPage(0);
      setHasMore(true);
      setExpandedComments(new Set());
      setNewComments({});
    }
  };

  useEffect(() => {
    fetchPhotos(0, true);
  }, [fetchPhotos, currentTab]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography align="left" variant="h4" fontWeight={700} gutterBottom>
        Photo Feed
      </Typography>
      
      {/* Tabs */}
      <Tabs 
        value={currentTab} 
        onChange={(_, newValue) => handleTabChange(newValue)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab 
          label="Friends' Photos" 
          value="friends" 
          sx={{ textTransform: 'none', fontWeight: 600 }}
        />
        <Tab 
          label="My Photos" 
          value="my" 
          sx={{ textTransform: 'none', fontWeight: 600 }}
        />
      </Tabs>

      {photos.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No photos to show
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {currentTab === 'friends' 
              ? "Add some friends to see their photos here!"
              : "Upload some bird photos to see them here!"
            }
          </Typography>
        </Box>
      ) : (
        <Stack spacing={3}>
          {photos.map((photo) => (
            <Card key={photo.id} elevation={2}>
              {/* Header */}
              <CardContent sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                    {photo.user_profile.display_name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
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
                <Box sx={{ position: 'relative', borderRadius: 1, overflow: 'hidden' }}>
                  <SupabaseImage
                    path={photo.thumbnail_url || photo.url}
                    alt={`${photo.species_id} by ${photo.user_profile.display_name}`}
                    style={{ 
                      width: '100%', 
                      maxHeight: 400, 
                      objectFit: 'cover',
                      display: 'block'
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
                {currentTab === 'my' && photo.user_id === user?.id && (
                  <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
                    {/* Set as Top Photo Star Icon */}
                    <Tooltip title={topSpeciesMap[photo.species_id] === photo.id ? 'This is your top photo for this species' : 'Set as Top Photo for this species'}>
                      <span>
                        <IconButton
                          aria-label="Set as Top Photo"
                          sx={{ color: topSpeciesMap[photo.species_id] === photo.id ? '#FFD700' : '#b0b0b0', mr: 0.5 }}
                          disabled={topSpeciesMap[photo.species_id] === photo.id}
                          onClick={() => handleSetAsTopPhoto(photo)}
                        >
                          {topSpeciesMap[photo.species_id] === photo.id ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                          ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Toggle Dex visibility" arrow>
                      <IconButton
                        aria-label={photo.hidden_from_species_view ? "Show in Species Grid" : "Hide from Species Grid"}
                        sx={{ color: photo.hidden_from_species_view ? '#b0b0b0' : 'primary.main', mr: 0.5 }}
                        onClick={() => handleToggleSpeciesView(photo)}
                      >
                        {photo.hidden_from_species_view ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      aria-label="Delete Photo"
                      sx={{ color: '#b0b0b0' }}
                      onClick={() => { setPhotoToDelete(photo); setDeleteDialogOpen(true); }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                )}
              </CardActions>

              {/* Comments Section */}
              <Collapse in={expandedComments.has(photo.id)}>
                <Divider />
                <CardContent sx={{ pt: 2 }}>
                  {/* Existing Comments */}
                  {photo.comments.map((comment) => (
                    <Box key={comment.id} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                          {comment.user_profile.display_name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body2">
                            <strong>{comment.user_profile.display_name}</strong> {comment.content}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatRelativeTime(comment.created_at)}
                          </Typography>
                        </Box>
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
