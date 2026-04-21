// routes/admin/cms.js
const router = require('express').Router();
const { protectAdmin, isAdmin, checkPermission } = require('../../middleware/authMiddleware');

const cmsController = require('../../controllers/admin/cmsController');

// Privacy Policy
router.route('/privacy')
  .get(
    protectAdmin,
    isAdmin,
    checkPermission('cms', 'view'),
    cmsController.getPrivacy
  )
  .post(
    protectAdmin,
    isAdmin,
    checkPermission('cms', 'edit'), // or 'add' – choose what fits your logic
    cmsController.postPrivacy
  );

// Terms & Conditions
router.route('/term')
  .get(
    protectAdmin,
    isAdmin,
    checkPermission('cms', 'view'),
    cmsController.getTerms
  )
  .post(
    protectAdmin,
    isAdmin,
    checkPermission('cms', 'edit'),
    cmsController.postTerms
  );

// FAQ
router.route('/faq')
  .get(
    protectAdmin,
    isAdmin,
    checkPermission('cms', 'view'),
    cmsController.getAllFaqs
  );

router.route('/faq/add')
  .get(
    protectAdmin,
    isAdmin,
    checkPermission('cms', 'edit'),
    cmsController.getAddFaq
  )
  .post(
    protectAdmin,
    isAdmin,
    checkPermission('cms', 'edit'),
    cmsController.postAddFaq
  );

router.route('/faq/edit/:id')
  .get(
    protectAdmin,
    isAdmin,
    checkPermission('cms', 'edit'),
    cmsController.getEditFaq
  )
  .post(
    protectAdmin,
    isAdmin,
    checkPermission('cms', 'edit'),
    cmsController.postEditFaq
  );

router.route('/faq/delete/:id')
  .get(
    protectAdmin,
    isAdmin,
    checkPermission('cms', 'delete'),
    cmsController.deleteFaq
  );

// Contact Us
router.route('/contact')
  .get(
    protectAdmin,
    isAdmin,
    checkPermission('cms', 'view'),
    cmsController.getContact
  )
  .post(
    protectAdmin,
    isAdmin,
    checkPermission('cms', 'edit'),
    cmsController.postContact
  );

module.exports = router;