// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');

// // Ensure upload directories exist
// const uploadDirs = [
//   'public/uploads/documents',
//   'public/uploads/profiles'
// ];

// uploadDirs.forEach(dir => {
//   if (!fs.existsSync(dir)) {
//     fs.mkdirSync(dir, { recursive: true });
//   }
// });

// // Storage configuration for documents
// const documentStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/uploads/documents/');
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
//   }
// });

// // Storage configuration for profile images
// const profileStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/uploads/profiles/');
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
//   }
// });

// // File filter
// const fileFilter = (req, file, cb) => {
//   const allowedTypes = /jpeg|jpg|png|pdf/;
//   const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
//   const mimetype = allowedTypes.test(file.mimetype);

//   if (mimetype && extname) {
//     return cb(null, true);
//   } else {
//     cb(new Error('Only .png, .jpg, .jpeg and .pdf format allowed!'));
//   }
// };

// // Document upload configuration
// const documentUpload = multer({
//   storage: documentStorage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
//   fileFilter: fileFilter
// });

// // Profile upload configuration
// const profileUpload = multer({
//   storage: profileStorage,
//   limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
//   fileFilter: fileFilter
// });

// module.exports = {
//   documentUpload,
//   profileUpload
// };
///////////////////////////////////////////////////////////////////////////////////

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ======================== CREATE FOLDERS IF NOT EXIST ========================
const uploadDirs = [
  'public/uploads/documents',
  'public/uploads/profiles',
  'public/uploads/temp' // optional
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created folder: ${dir}`);
  }
});

// ======================== COMMON FILE FILTER ========================
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only .png, .jpg, .jpeg and .pdf files are allowed!'));
  }
};

// ======================== STORAGE CONFIGS ========================

// 1. Document Storage (Aadhaar, License, RC, etc.)
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/documents/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 2. Profile Photo Storage (Sirf profile photo ke liye)
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/profiles/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + req.user._id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// ======================== MULTER INSTANCES ========================

// 1. Single Document Upload (jaise single file update)
const uploadSingleDocument = multer({
  storage: documentStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter
});

// 2. Single Profile Photo Upload
const uploadProfilePhoto = multer({
  storage: profileStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter
});

// 3. Multiple Documents with SPECIFIC fieldnames (Recommended)
const uploadMultipleDocuments = multer({
  storage: documentStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
}).fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'aadhaarFront', maxCount: 1 },
  { name: 'aadhaarBack', maxCount: 1 },
  { name: 'licenseFront', maxCount: 1 },
  { name: 'licenseBack', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'vehicleRC', maxCount: 1 },
  { name: 'vehicleInsurance', maxCount: 1 },
  { name: 'policeVerification', maxCount: 1 },
  { name: 'otherDocument', maxCount: 1 }
]);

// 4. Accept ANY fieldnames (Best for testing & flexibility)
const uploadAnyDocuments = multer({
  storage: documentStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
}).any(); // ← SAB KUCH ACCEPT KAREGA (profilePhoto, doc1, file123, etc.)

// ======================== EXPORT ALL ========================
module.exports = {
  // Single uploads
  uploadSingleDocument: uploadSingleDocument.single('document'),     // fieldname: "document"
  uploadProfilePhoto: uploadProfilePhoto.single('profilePhoto'),      // fieldname: "profilePhoto"

  // Multiple uploads
  uploadMultipleDocuments,  
  uploadAnyDocuments,       

  // Raw multer instances (agar custom chahiye)
  documentUpload: multer({ storage: documentStorage, fileFilter }),
  profileUpload: multer({ storage: profileStorage, fileFilter })
}; 