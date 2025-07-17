const express = require('express');
const router = express.Router();
const { 
  instagramAuthRedirect,
  instagramAuthCallback,
  facebookAuthRedirect,
  facebookAuthCallback,
  youtubeAuthRedirect,
  youtubeAuthCallback,
  getConnectedAccounts,
  disconnectSocialAccount
} = require('../controllers/socialAuthController');

const {
  getInstagramMedia,
  getFacebookPosts,
  getYouTubeVideos
} = require('../controllers/socialContentController');

const { protectUser } = require('../middleware/userAuth');

// Authentication routes
router.get('/auth/instagram', protectUser, instagramAuthRedirect);
router.get('/auth/instagram/callback', instagramAuthCallback);

router.get('/auth/facebook', protectUser, facebookAuthRedirect);
router.get('/auth/facebook/callback', facebookAuthCallback);

router.get('/auth/youtube', protectUser, youtubeAuthRedirect);
router.get('/auth/youtube/callback', youtubeAuthCallback);

// Account management routes
router.get('/accounts', protectUser, getConnectedAccounts);
router.delete('/accounts/:platform', protectUser, disconnectSocialAccount);

// Content management routes
router.get('/instagram/media', protectUser, getInstagramMedia);
router.get('/facebook/posts', protectUser, getFacebookPosts);
router.get('/youtube/videos', protectUser, getYouTubeVideos);

module.exports = router;