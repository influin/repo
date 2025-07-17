const User = require('../models/User');
const axios = require('axios');
const querystring = require('querystring');

// Environment variables needed in .env file:
// INSTAGRAM_CLIENT_ID
// INSTAGRAM_CLIENT_SECRET
// INSTAGRAM_REDIRECT_URI
// FACEBOOK_APP_ID
// FACEBOOK_APP_SECRET
// FACEBOOK_REDIRECT_URI
// YOUTUBE_CLIENT_ID
// YOUTUBE_CLIENT_SECRET
// YOUTUBE_REDIRECT_URI
// API_BASE_URL (your backend URL)

// Instagram Authentication
// @desc    Redirect to Instagram OAuth
// @route   GET /api/social/auth/instagram
// @access  Private
exports.instagramAuthRedirect = async (req, res) => {
  const instagramAuthUrl = `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_CLIENT_ID}&redirect_uri=${process.env.INSTAGRAM_REDIRECT_URI}&scope=user_profile,user_media&response_type=code`;
  res.redirect(instagramAuthUrl);
};

// @desc    Instagram OAuth callback
// @route   GET /api/social/auth/instagram/callback
// @access  Private
exports.instagramAuthCallback = async (req, res) => {
  try {
    const { code } = req.query;
    
    // Exchange code for access token
    const tokenResponse = await axios.post('https://api.instagram.com/oauth/access_token', 
      querystring.stringify({
        client_id: process.env.INSTAGRAM_CLIENT_ID,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
        code
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const { access_token, user_id } = tokenResponse.data;
    
    // Get user profile information
    const profileResponse = await axios.get(`https://graph.instagram.com/me?fields=id,username&access_token=${access_token}`);
    const { username } = profileResponse.data;
    
    // Update user's social accounts
    await User.findByIdAndUpdate(req.user._id, {
      'socialAccounts.instagram': {
        username,
        accountId: user_id,
        accessToken: access_token,
        connectedAt: new Date()
      }
    });
    
    // Redirect to frontend with success message
    res.redirect(`${process.env.FRONTEND_URL}/social-connect/success?platform=instagram`);
  } catch (error) {
    console.error('Instagram auth error:', error.response?.data || error.message);
    res.redirect(`${process.env.FRONTEND_URL}/social-connect/error?platform=instagram&error=${encodeURIComponent(error.message)}`);
  }
};

// Facebook Authentication
// @desc    Redirect to Facebook OAuth
// @route   GET /api/social/auth/facebook
// @access  Private
exports.facebookAuthRedirect = async (req, res) => {
  const facebookAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${process.env.FACEBOOK_REDIRECT_URI}&scope=pages_show_list,pages_read_engagement,pages_manage_posts&state=${req.user._id}`;
  res.redirect(facebookAuthUrl);
};

// @desc    Facebook OAuth callback
// @route   GET /api/social/auth/facebook/callback
// @access  Private
exports.facebookAuthCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = state; // We passed user ID in state parameter
    
    // Exchange code for access token
    const tokenResponse = await axios.get(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${process.env.FACEBOOK_REDIRECT_URI}&client_secret=${process.env.FACEBOOK_APP_SECRET}&code=${code}`);
    
    const { access_token } = tokenResponse.data;
    
    // Get user's pages
    const pagesResponse = await axios.get(`https://graph.facebook.com/v18.0/me/accounts?access_token=${access_token}`);
    
    // If user has pages, use the first one
    if (pagesResponse.data.data && pagesResponse.data.data.length > 0) {
      const page = pagesResponse.data.data[0];
      
      // Update user's social accounts with page info
      await User.findByIdAndUpdate(userId, {
        'socialAccounts.facebook': {
          username: page.name,
          pageId: page.id,
          accessToken: page.access_token, // Page-specific token
          connectedAt: new Date()
        }
      });
    } else {
      // User has no pages, just store the user access token
      const userResponse = await axios.get(`https://graph.facebook.com/v18.0/me?fields=name&access_token=${access_token}`);
      
      await User.findByIdAndUpdate(userId, {
        'socialAccounts.facebook': {
          username: userResponse.data.name,
          accessToken: access_token,
          connectedAt: new Date()
        }
      });
    }
    
    // Redirect to frontend with success message
    res.redirect(`${process.env.FRONTEND_URL}/social-connect/success?platform=facebook`);
  } catch (error) {
    console.error('Facebook auth error:', error.response?.data || error.message);
    res.redirect(`${process.env.FRONTEND_URL}/social-connect/error?platform=facebook&error=${encodeURIComponent(error.message)}`);
  }
};

// YouTube Authentication
// @desc    Redirect to YouTube (Google) OAuth
// @route   GET /api/social/auth/youtube
// @access  Private
exports.youtubeAuthRedirect = async (req, res) => {
  const youtubeAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.YOUTUBE_CLIENT_ID}&redirect_uri=${process.env.YOUTUBE_REDIRECT_URI}&response_type=code&scope=https://www.googleapis.com/auth/youtube.readonly&access_type=offline&state=${req.user._id}`;
  res.redirect(youtubeAuthUrl);
};

// @desc    YouTube (Google) OAuth callback
// @route   GET /api/social/auth/youtube/callback
// @access  Private
exports.youtubeAuthCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = state; // We passed user ID in state parameter
    
    // Exchange code for tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', 
      {
        client_id: process.env.YOUTUBE_CLIENT_ID,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.YOUTUBE_REDIRECT_URI
      }
    );
    
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    // Get YouTube channel info
    const channelResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });
    
    if (channelResponse.data.items && channelResponse.data.items.length > 0) {
      const channel = channelResponse.data.items[0];
      const channelId = channel.id;
      const channelName = channel.snippet.title;
      const thumbnailUrl = channel.snippet.thumbnails.default.url;
      
      // Calculate token expiration
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);
      
      // Update user's social accounts
      await User.findByIdAndUpdate(userId, {
        'socialAccounts.youtube': {
          channelId,
          channelName,
          thumbnailUrl,
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt,
          connectedAt: new Date()
        }
      });
    }
    
    // Redirect to frontend with success message
    res.redirect(`${process.env.FRONTEND_URL}/social-connect/success?platform=youtube`);
  } catch (error) {
    console.error('YouTube auth error:', error.response?.data || error.message);
    res.redirect(`${process.env.FRONTEND_URL}/social-connect/error?platform=youtube&error=${encodeURIComponent(error.message)}`);
  }
};

// Social Media Management
// @desc    Get user's connected social accounts
// @route   GET /api/social/accounts
// @access  Private
exports.getConnectedAccounts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('socialAccounts');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Create a sanitized version without tokens for security
    const sanitizedAccounts = {
      instagram: user.socialAccounts.instagram ? {
        username: user.socialAccounts.instagram.username,
        accountId: user.socialAccounts.instagram.accountId,
        connectedAt: user.socialAccounts.instagram.connectedAt,
        isConnected: !!user.socialAccounts.instagram.accessToken
      } : null,
      facebook: user.socialAccounts.facebook ? {
        username: user.socialAccounts.facebook.username,
        pageId: user.socialAccounts.facebook.pageId,
        connectedAt: user.socialAccounts.facebook.connectedAt,
        isConnected: !!user.socialAccounts.facebook.accessToken
      } : null,
      youtube: user.socialAccounts.youtube ? {
        channelName: user.socialAccounts.youtube.channelName,
        channelId: user.socialAccounts.youtube.channelId,
        thumbnailUrl: user.socialAccounts.youtube.thumbnailUrl,
        connectedAt: user.socialAccounts.youtube.connectedAt,
        isConnected: !!user.socialAccounts.youtube.accessToken
      } : null
    };
    
    res.status(200).json({
      success: true,
      socialAccounts: sanitizedAccounts
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Disconnect a social account
// @route   DELETE /api/social/accounts/:platform
// @access  Private
exports.disconnectSocialAccount = async (req, res) => {
  try {
    const { platform } = req.params;
    
    if (!['instagram', 'facebook', 'youtube'].includes(platform)) {
      return res.status(400).json({ success: false, message: 'Invalid platform' });
    }
    
    const updateQuery = {};
    updateQuery[`socialAccounts.${platform}`] = {};
    
    await User.findByIdAndUpdate(req.user._id, updateQuery);
    
    res.status(200).json({
      success: true,
      message: `${platform.charAt(0).toUpperCase() + platform.slice(1)} account disconnected successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};