// const express = require('express');
// const router = express.Router();
// const onboardingController = require('../../controllers/admin/onboardingController');
// const { uploadOnboardingMedia } = require('../../middleware/uploadMiddleware');
// const { protectAdmin, isAdmin } = require('../../middleware/authMiddleware');
// const OnboardingScreen = require("../../models/OnboardingScreen");

// // List all screens (Main page)
// router.get('/', protectAdmin, isAdmin, async (req, res) => {
//   const screens = await OnboardingScreen.find().sort({ type: 1, order: 1 });
  
//   res.render('splash_screen', { 
//     screens,
//     url: req.originalUrl,
//     title: 'Onboarding Screens Management'
//   });
// });

// // Add new screen page
// router.get('/add', protectAdmin, isAdmin, (req, res) => {
//   res.render('splash_screen_add', { 
//     url: req.originalUrl,
//     title: 'Add Onboarding Screen'
//   });
// });

// // Edit existing screen page
// router.get('/edit/:id', protectAdmin, isAdmin, async (req, res) => {
//   const screen = await OnboardingScreen.findById(req.params.id);
//   if (!screen) return res.redirect('/admin/onboarding');
  
//   res.render('splash_screen_edit', { 
//     screen,
//     url: req.originalUrl,
//     title: 'Edit Onboarding Screen'
//   });
// });

// // API / Form Actions
// router.post('/add', protectAdmin, isAdmin, uploadOnboardingMedia, onboardingController.addOrUpdateScreen);


// router.post('/:id', protectAdmin, isAdmin, uploadOnboardingMedia, onboardingController.updateScreen);

// // Other routes remain same
// router.get('/list', protectAdmin, isAdmin, onboardingController.getAdminScreens);

// router.post('/:id/delete', protectAdmin, isAdmin, onboardingController.deleteScreen);

// router.get('/public', onboardingController.getAllScreens);

// module.exports = router;

const express = require('express');
const router = express.Router();

const onboardingController = require('../../controllers/admin/onboardingController');
const { uploadOnboardingMedia } = require('../../middleware/uploadMiddleware');
const OnboardingScreen = require("../../models/OnboardingScreen")


// Middleware
const {
  protectAdmin,
  isAdmin,
  checkPermission
} = require('../../middleware/authMiddleware');

// ========================
// ONBOARDING SCREENS ROUTES
// ========================

// List all onboarding screens (Main page)
router.get(
  '/',
  protectAdmin,
  isAdmin,
  checkPermission('cms', 'view'),     
  async (req, res) => {
    const screens = await OnboardingScreen.find().sort({ type: 1, order: 1 });
    
    res.render('splash_screen', { 
      screens,
      url: req.originalUrl,
      title: 'Onboarding Screens Management'
    });
  }
);

// Add new screen page (GET form)
router.get(
  '/add',
  protectAdmin,
  isAdmin,
  checkPermission('cms', 'add'),      
  (req, res) => {
    res.render('splash_screen_add', { 
      url: req.originalUrl,
      title: 'Add Onboarding Screen'
    });
  }
);

// Edit existing screen page (GET form)
router.get(
  '/edit/:id',
  protectAdmin,
  isAdmin,
  checkPermission('cms', 'edit'),   
  async (req, res) => {
    const screen = await OnboardingScreen.findById(req.params.id);
    if (!screen) {
      req.flash('red', 'Onboarding screen not found');
      return res.redirect('/admin/onboarding');
    }
    
    res.render('splash_screen_edit', { 
      screen,
      url: req.originalUrl,
      title: 'Edit Onboarding Screen'
    });
  }
);

// Create new screen (POST)
router.post(
  '/add',
  protectAdmin,
  isAdmin,
  checkPermission('cms', 'add'),
  uploadOnboardingMedia,
  onboardingController.addOrUpdateScreen
);

// Update existing screen (POST)
router.post(
  '/:id',
  protectAdmin,
  isAdmin,
  checkPermission('cms', 'edit'),
  uploadOnboardingMedia,
  onboardingController.updateScreen
);

// Delete screen
router.post(
  '/:id/delete',
  protectAdmin,
  isAdmin,
  checkPermission('cms', 'delete'),
  onboardingController.deleteScreen
);

// List screens (API - for reference/admin use)
router.get(
  '/list',
  protectAdmin,
  isAdmin,
  checkPermission('cms', 'view'),
  onboardingController.getAdminScreens
);

// Public API - No auth required (for mobile app)
router.get('/public', onboardingController.getAllScreens);

module.exports = router;