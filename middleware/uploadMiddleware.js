// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// [
//   'public/uploads/documents',
//   'public/uploads/profiles',
//   'public/uploads/journey',
//   'public/uploads/signatures',
//   'public/uploads/maintenance',
//   'public/uploads/expenses',
//   'public/uploads/onboarding',
//   'public/uploads/chat'
// ].forEach(dir => {
//   if (!fs.existsSync(dir)) {
//     fs.mkdirSync(dir, { recursive: true });
//   }
// });

// // COMMON FILE FILTERS

// const allowImagesAndPdf = (req, file, cb) => {
//   const allowed = /jpeg|jpg|png|pdf/;
//   const ext = allowed.test(path.extname(file.originalname).toLowerCase());
//   const mime = allowed.test(file.mimetype);
//   if (ext && mime) cb(null, true);
//   else cb(new Error('Only images (jpg, png) & PDF allowed!'), false);
// };

// const allowImagesOnly = (req, file, cb) => {
//   const allowed = /jpeg|jpg|png|gif|webp/;
//   const ext = allowed.test(path.extname(file.originalname).toLowerCase());
//   const mime = allowed.test(file.mimetype);
//   if (ext && mime) cb(null, true);
//   else cb(new Error('Only image files allowed!'), false);
// };

// const allowOnboardingMedia = (req, file, cb) => {
//   const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
//     'video/mp4', 'video/quicktime', 'video/webm'];
//   if (allowed.includes(file.mimetype)) cb(null, true);
//   else cb(new Error('Only images & videos (mp4, mov, webm) allowed for onboarding!'), false);
// };

// // ==================== CHAT MEDIA FILTER ====================
// const allowChatMedia = (req, file, cb) => {
//   const allowedMimeTypes = [
//     'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
//     'video/mp4', 'video/quicktime', 'video/webm',
//     'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg',
//     'application/pdf',
//     'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .doc, .docx
//     'text/plain'
//   ];

//   if (allowedMimeTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error('File type not allowed in chat! Allowed: images, videos, audio, PDF, documents'), false);
//   }
// };

// // ==================== CHAT STORAGE ====================
// const chatStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/uploads/chat/');
//   },
//   filename: (req, file, cb) => {
//     const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, `chat-${unique}${path.extname(file.originalname)}`);
//   }
// });

// // DYNAMIC STORAGE (Smart Folder Detection)
// const smartStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     let folder = 'public/uploads/documents/';

//     if (file.fieldname.includes('profile')) folder = 'public/uploads/profiles/';
//     if (file.fieldname.includes('journey') || file.fieldname === 'image') folder = 'public/uploads/journey/';
//     if (file.fieldname === 'signature') folder = 'public/uploads/signatures/';
//     if (['invoice', 'receipt', 'before_photo', 'after_photo', 'report', 'warranty', 'before_service_photo', 'after_service_photo', 'service_receipt'].includes(file.fieldname)) {
//       folder = 'public/uploads/maintenance/';
//     }
//     if (['fuel_receipt', 'meter_photo', 'vehicle_photo'].includes(file.fieldname)) {
//       folder = 'public/uploads/expenses/';
//     }
//     if (file.fieldname === 'media' && req.path.includes('onboarding')) {
//       folder = 'public/uploads/onboarding/';
//     }

//     cb(null, folder);
//   },
//   filename: (req, file, cb) => {
//     const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, `${file.fieldname}-${unique}${path.extname(file.originalname)}`);
//   }
// });

// // ONBOARDING SPECIFIC STORAGE (Clean & Dedicated)
// const onboardingStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/uploads/onboarding/');
//   },
//   filename: (req, file, cb) => {
//     const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, `onboarding-${unique}${path.extname(file.originalname)}`);
//   }
// });

// // MULTER INSTANCES

// const upload = multer({
//   storage: smartStorage,
//   limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
//   fileFilter: allowImagesAndPdf
// });

// const uploadImageOnly = multer({
//   storage: smartStorage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
//   fileFilter: allowImagesOnly
// });

// const uploadOnboarding = multer({
//   storage: onboardingStorage,
//   limits: { fileSize: 50 * 1024 * 1024 }, // 50MB (for video)
//   fileFilter: allowOnboardingMedia
// });

// const uploadChatMedia = multer({
//   storage: chatStorage,
//   limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max for chat files
//   fileFilter: allowChatMedia
// });

// // EXPORTS — SAB KUCH YAHAN SE USE HOGA!

// module.exports = {
//   // General Uploads
//   uploadDocument: upload.single('document'),
//   uploadProfileImage: upload.single('profileImage'),
//   uploadJourneyImage: uploadImageOnly.single('image'),
//   uploadEndJourneyImage: upload.array("photos", 10),
//   uploadSignature: uploadImageOnly.single('signature'),
//   uploadMultipleDocuments: upload.array('documents', 15),

//   // Driver Documents
//   uploadDriverDocuments: upload.fields([
//     { name: 'licenseFront', maxCount: 1 },
//     { name: 'licenseBack', maxCount: 1 },
//     { name: 'rcFront', maxCount: 1 },
//     { name: 'rcBack', maxCount: 1 },
//     // { name: 'aadhaarFront', maxCount: 1 },
//     // { name: 'panCard', maxCount: 1 },
//     // { name: 'otherDocument', maxCount: 5 }
//   ]),

//   // Maintenance Documents
//   uploadMaintenanceDocuments: upload.fields([
//     { name: 'invoice', maxCount: 5 },
//     { name: 'receipt', maxCount: 5 },
//     { name: 'before_service_photo', maxCount: 10 },
//     { name: 'after_service_photo', maxCount: 10 },
//     { name: 'report', maxCount: 5 },
//     { name: 'warranty', maxCount: 5 },
//     { name: 'service_receipt', maxCount: 1 }
//   ]),

//   // Expense Receipts
//   uploadExpenseReceipts: upload.fields([
//     { name: 'fuel_receipt', maxCount: 1 },
//     { name: 'meter_photo', maxCount: 1 },
//     { name: 'expense_bill', maxCount: 1 },
//     { name: 'vehicle_photo', maxCount: 1 }
//   ]),

//   // ONBOARDING (SPLASH + TUTORIAL)
//   uploadOnboardingMedia: uploadOnboarding.single('media'),

//   ///chat
//   uploadChatMedia: uploadChatMedia.single('media'),

//   // Error Handler (Use in Routes)
//   handleUploadError: (err, req, res, next) => {
//     if (err instanceof multer.MulterError) {
//       if (err.code === 'LIMIT_FILE_SIZE') {
//         return res.status(400).json({ success: false, message: 'File too large!' });
//       }
//       if (err.code === 'LIMIT_UNEXPECTED_FILE') {
//         return res.status(400).json({ success: false, message: `Invalid field: ${err.field}` });
//       }
//     }
//     if (err) return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
//     next();
//   },

//   // Require File Middleware
//   requireFile: (field = 'file') => (req, res, next) => {
//     if (!req.file && !req.files?.[field]) {
//       return res.status(400).json({ success: false, message: `${field} is required` });
//     }
//     next();
//   }
// };


const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ==================== CREATE UPLOAD DIRECTORIES ====================
[
  'public/uploads/documents',
  'public/uploads/profiles',
  'public/uploads/journey',
  'public/uploads/signatures',
  'public/uploads/maintenance',
  'public/uploads/expenses',
  'public/uploads/onboarding',
  'public/uploads/chat',
  'public/uploads/documents'
].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ==================== COMMON FILE FILTERS ====================

const allowImagesAndPdf = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|pdf/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) cb(null, true);
  else cb(new Error('Only images (jpg, png) & PDF allowed!'), false);
};

const allowImagesOnly = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) cb(null, true);
  else cb(new Error('Only image files allowed!'), false);
};

const allowOnboardingMedia = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/webm'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only images & videos (mp4, mov, webm) allowed for onboarding!'), false);
};

const allowChatMedia = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/webm',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed in chat! Allowed: images, videos, audio, PDF, documents'), false);
  }
};

// ==================== STORAGE CONFIGURATIONS ====================

// CHAT STORAGE
const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/chat/');
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `chat-${unique}${path.extname(file.originalname)}`);
  }
});

// DYNAMIC STORAGE (Smart Folder Detection)
const smartStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'public/uploads/documents/';

    if (file.fieldname.includes('profile')) folder = 'public/uploads/profiles/';
    if (file.fieldname.includes('journey') || file.fieldname === 'image') folder = 'public/uploads/journey/';
    if (file.fieldname === 'signature') folder = 'public/uploads/signatures/';
    if (['invoice', 'receipt', 'before_photo', 'after_photo', 'report', 'warranty', 'before_service_photo', 'after_service_photo', 'service_receipt'].includes(file.fieldname)) {
      folder = 'public/uploads/maintenance/';
    }
    if (['fuel_receipt', 'meter_photo', 'vehicle_photo'].includes(file.fieldname)) {
      folder = 'public/uploads/expenses/';
    }
    if (file.fieldname === 'media' && req.path.includes('onboarding')) {
      folder = 'public/uploads/onboarding/';
    }

    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${unique}${path.extname(file.originalname)}`);
  }
});

// ONBOARDING SPECIFIC STORAGE
const onboardingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/onboarding/');
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `onboarding-${unique}${path.extname(file.originalname)}`);
  }
});

// DRIVER DOCUMENTS STORAGE (Dedicated)
const driverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/documents/');
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${unique}${path.extname(file.originalname)}`);
  }
});

// CUSTOMER DOCUMENTS STORAGE (Dedicated - same folder as driver)
const customerStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/documents/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${unique}${path.extname(file.originalname)}`);
  }
});

// Hidden Screenshot Storage (dedicated folder)
const hiddenScreenshotStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'public/uploads/hidden/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `hidden-${unique}${path.extname(file.originalname)}`);
  }
});

// ==================== MULTER INSTANCES ====================

const upload = multer({
  storage: smartStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: allowImagesAndPdf
});

const uploadImageOnly = multer({
  storage: smartStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: allowImagesOnly
});

const uploadOnboarding = multer({
  storage: onboardingStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB (for video)
  fileFilter: allowOnboardingMedia
});

const uploadChatMedia = multer({
  storage: chatStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max for chat files
  fileFilter: allowChatMedia
});

// Driver Documents - CREATE (required files)
const uploadDriverDocuments = multer({
  storage: driverStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: allowImagesOnly
}).fields([
  { name: 'licenseFront', maxCount: 1 },
  { name: 'licenseBack', maxCount: 1 },
  { name: 'mulkiaFront', maxCount: 1 },
  { name: 'mulkiaBack', maxCount: 1 },

   { name: 'MulkiaFront',  maxCount: 1 },  // ✅ ADD — admin panel (capital M)
  { name: 'MulkiaBack',   maxCount: 1 },  // ✅ ADD — admin panel (capital M)
]);

// Driver Documents - UPDATE (optional files)
const uploadUpdateDriverDocuments = multer({
  storage: driverStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: allowImagesOnly
}).fields([
  { name: 'licenseFront', maxCount: 1 },
  { name: 'licenseBack', maxCount: 1 },
  { name: 'mulkiaFront', maxCount: 1 },
  { name: 'mulkiaBack', maxCount: 1 },

   { name: 'MulkiaFront',  maxCount: 1 },  // ✅ ADD — admin panel (capital M)
  { name: 'MulkiaBack',   maxCount: 1 },  
]);

// Customer Documents - UPDATE (optional files)
const uploadUpdateCustomerDocuments = multer({
  storage: customerStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: allowImagesAndPdf
}).fields([
  { name: 'gstCertificate', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'shopLicense', maxCount: 1 },
  { name: 'otherDoc', maxCount: 1 }
]);

// Proof photos (multiple) + company stamp (single) – Dono ek saath
const uploadProofAndStamp = multer({
  storage: smartStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: allowImagesOnly
}).fields([
  { name: 'photos', maxCount: 10 },       // multiple proof photos
  { name: 'companyStamp', maxCount: 1 }   // single company stamp image
]);


// ==================== EXPORTS ====================

module.exports = {
  // General Uploads
  uploadDocument: upload.single('document'),
  uploadProfileImage: upload.single('profileImage'),
  uploadJourneyImage: uploadImageOnly.single('image'),
  uploadSignature: uploadImageOnly.single('signature'),
  uploadMultipleDocuments: upload.array('documents', 15),

  // Driver Documents
  uploadDriverDocuments,           // For CREATE (required)
  uploadUpdateDriverDocuments,     // For UPDATE (optional)

  uploadUpdateCustomerDocuments,
  uploadProofAndStamp,

  // Maintenance Documents
  uploadMaintenanceDocuments: upload.fields([
    { name: 'invoice', maxCount: 5 },
    { name: 'receipt', maxCount: 5 },
    { name: 'before_service_photo', maxCount: 10 },
    { name: 'after_service_photo', maxCount: 10 },
    { name: 'report', maxCount: 5 },
    { name: 'warranty', maxCount: 5 },
    { name: 'service_receipt', maxCount: 1 }
  ]),

  // Expense Receipts
  uploadExpenseReceipts: upload.fields([
    { name: 'fuel_receipt', maxCount: 1 },
    { name: 'meter_photo', maxCount: 1 },
    { name: 'expense_bill', maxCount: 1 },
    { name: 'vehicle_photo', maxCount: 1 }
  ]),

  // Onboarding
  uploadOnboardingMedia: uploadOnboarding.single('media'),

  // Chat
  uploadChatMedia: uploadChatMedia.single('media'),

  // Error Handler
  handleUploadError: (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File too large!' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ success: false, message: `Invalid field: ${err.field}` });
      }
    }
    if (err) return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
    next();
  },

  // Require File Middleware
  requireFile: (field = 'file') => (req, res, next) => {
    if (!req.file && !req.files?.[field]) {
      return res.status(400).json({ success: false, message: `${field} is required` });
    }
    next();
  }
};  