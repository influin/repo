const User = require('../models/User');
const axios = require('axios');

// @desc    Get Instagram user media
// @route   GET /api/social/instagram/media
// @access  Private
exports.getInstagramMedia = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.socialAccounts.instagram || !user.socialAccounts.instagram.accessToken) {
      return res.status(400).json({ success: false, message: 'Instagram account not connected' });
    }
    
    const accessToken = user.socialAccounts.instagram.accessToken;
    
    // Get user media
    const mediaResponse = await axios.get(
      `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&access_token=${accessToken}`
    );
    
    res.status(200).json({
      success: true,
      media: mediaResponse.data.data
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Facebook page posts
// @route   GET /api/social/facebook/posts
// @access  Private
exports.getFacebookPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.socialAccounts.facebook || !user.socialAccounts.facebook.accessToken) {
      return res.status(400).json({ success: false, message: 'Facebook page not connected' });
    }
    
    const accessToken = user.socialAccounts.facebook.accessToken;
    const pageId = user.socialAccounts.facebook.pageId;
    
    if (!pageId) {
      return res.status(400).json({ success: false, message: 'No Facebook page connected' });
    }
    
    // Get page posts
    const postsResponse = await axios.get(
      `https://graph.facebook.com/v18.0/${pageId}/posts?fields=id,message,created_time,permalink_url,attachments&access_token=${accessToken}`
    );
    
    res.status(200).json({
      success: true,
      posts: postsResponse.data.data
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get YouTube channel videos
// @route   GET /api/social/youtube/videos
// @access  Private
exports.getYouTubeVideos = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.socialAccounts.youtube || !user.socialAccounts.youtube.accessToken) {
      return res.status(400).json({ success: false, message: 'YouTube channel not connected' });
    }
    
    // Check if token is expired and refresh if needed
    if (user.socialAccounts.youtube.expiresAt && new Date() > new Date(user.socialAccounts.youtube.expiresAt)) {
      // Token is expired, refresh it
      if (!user.socialAccounts.youtube.refreshToken) {
        return res.status(400).json({ success: false, message: 'YouTube token expired and no refresh token available' });
      }
      
      const refreshResponse = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: process.env.YOUTUBE_CLIENT_ID,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET,
        refresh_token: user.socialAccounts.youtube.refreshToken,
        grant_type: 'refresh_token'
      });
      
      const { access_token, expires_in } = refreshResponse.data;
      
      // Calculate new expiration
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);
      
      // Update token in database
      await User.findByIdAndUpdate(req.user._id, {
        'socialAccounts.youtube.accessToken': access_token,
        'socialAccounts.youtube.expiresAt': expiresAt
      });
      
      // Use new token
      user.socialAccounts.youtube.accessToken = access_token;
    }
    
    const accessToken = user.socialAccounts.youtube.accessToken;
    const channelId = user.socialAccounts.youtube.channelId;
    
    // Get channel videos
    const videosResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=50&order=date&type=video&key=${process.env.YOUTUBE_API_KEY}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    
    res.status(200).json({
      success: true,
      videos: videosResponse.data.items
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};