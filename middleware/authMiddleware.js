// const { verifyToken } = require('../utils/jwtHelper');
// const User = require('../models/User');
// const Session = require('../models/Session');
// const { unauthorizedResponse } = require('../utils/responseHelper');
// const Admin = require("../models/Admin")
// const Driver = require('../models/Driver');
// const jwt = require("jsonwebtoken")

// // Verify JWT Token
// exports.authenticate = async (req, res, next) => {
//   try {
//     // Get token from header
//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//       return unauthorizedResponse(res, 'No token provided');
//     }

//     const token = authHeader.split(' ')[1];

//     // Verify token
//     const decoded = verifyToken(token);

//     if (!decoded) {
//       return unauthorizedResponse(res, 'Invalid or expired token');
//     }

//     // Check if session exists and is active
//     const session = await Session.findOne({
//       token,
//       userId: decoded.userId,
//       isActive: true,
//       expiresAt: { $gt: new Date() }
//     });

//     if (!session) {
//       return unauthorizedResponse(res, 'Session expired or invalid');
//     }

//     // Get user
//     const user = await User.findById(decoded.userId).select('-password');

//     if (!user || !user.isActive) {
//       return unauthorizedResponse(res, 'User not found or inactive');
//     }

//     // Attach user to request
//     req.user = user;
//     req.token = token;

//     next();
//   } catch (error) {
//     return unauthorizedResponse(res, 'Authentication failed');
//   }
// };


// // exports.authenticateDriver = async (req, res, next) => {
// //   try {
// //     const authHeader = req.headers.authorization;

// //     if (!authHeader || !authHeader.startsWith('Bearer ')) {
// //       return unauthorizedResponse(res, 'No token provided');
// //     }

// //     const token = authHeader.split(' ')[1];

// //     // Verify JWT
// //     const decoded = verifyToken(token);
// //     if (!decoded || !decoded.userId) {
// //       return unauthorizedResponse(res, 'Invalid or expired token');
// //     }

// //     // Check active session
// //     const session = await Session.findOne({
// //       token,
// //       userId: decoded.userId,
// //       isActive: true,
// //       expiresAt: { $gt: new Date() }
// //     });

// //     if (!session) {
// //       return unauthorizedResponse(res, 'Session expired or invalid');
// //     }

// //     const driver = await Driver.findById(decoded.userId)
// //       .select('-password -pin -resetPinToken -resetPinExpires');

// //     if (!driver) {
// //       return unauthorizedResponse(res, 'Driver not found');
// //     }

// //     if (!driver.isActive) {
// //       return unauthorizedResponse(res, 'Your account is deactivated');
// //     }

// //     req.user = driver;
// //     req.user._id = driver._id;
// //     req.token = token;

// //     next(); 

// //   } catch (error) {
// //     console.error('Driver Auth Error:', error);
// //     return unauthorizedResponse(res, 'Authentication failed');
// //   }
// // };

// exports.authenticateDriver = async (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//       return res.status(401).json({ success: false, message: 'No token provided' });
//     }

//     const token = authHeader.split(' ')[1];

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     const driver = await Driver.findById(decoded.id || decoded.userId);
//     if (!driver) {
//       return res.status(401).json({ success: false, message: 'Driver not found' });
//     }

//     if (driver.profileStatus !== 'approved') {
//       return res.status(403).json({ success: false, message: 'Account not approved' });
//     }

//     req.user = driver;
//     next();

//   } catch (error) {
//     console.error('Auth Error:', error);
//     return res.status(401).json({ success: false, message: 'Invalid or expired token' });
//   }
// };
// // Check if user is driver
// exports.isDriver = async (req, res, next) => {
//   if (req.user.role !== 'driver') {
//     return res.status(403).json({
//       success: false,
//       message: 'Access denied. Driver role required.'
//     });
//   }
//   next();
// };

// // Check if user is customer
// exports.isCustomer = async (req, res, next) => {
//   if (req.user.role !== 'customer') {
//     return res.status(403).json({
//       success: false,
//       message: 'Access denied. Customer role required.'
//     });
//   }
//   next();
// };

// exports.authenticateAny = async (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//       return res.status(401).json({ success: false, message: 'No token provided' });
//     }

//     const token = authHeader.split(' ')[1];
//     if (!token) return res.status(401).json({ success: false, message: 'Invalid token' });

//     let decoded;
//     try {
//       decoded = jwt.verify(token, process.env.JWT_SECRET);
//     } catch (err) {
//       return res.status(401).json({ success: false, message: 'Token expired or invalid' });
//     }

//     if (!decoded.userId) {
//       return res.status(401).json({ success: false, message: 'Invalid token payload' });
//     }

//     let driver = await Driver.findById(decoded.userId).select('-password -pin');
//     if (driver && driver.isActive) {
//       req.user = driver;
//       req.user.role = 'driver';  
//       req.token = token;
//       return next();
//     }

//     let customer = await User.findById(decoded.userId).select('-password');
//     if (customer && customer.isActive) {
//       req.user = customer;
//       req.user.role = customer.role || 'customer'; 
//       req.token = token;
//       return next();
//     }

//     return res.status(401).json({ success: false, message: 'User not found or inactive' });

//   } catch (error) {
//     console.error('authenticateAny Error:', error);
//     return res.status(401).json({ success: false, message: 'Authentication failed' });
//   }
// };
// // // Check if user is admin
// // exports.isAdmin = async (req, res, next) => {
// //   if (req.user.role !== 'admin') {
// //     return res.status(403).json({
// //       success: false,
// //       message: 'Access denied. Admin role required.'
// //     });
// //   }
// //   next();
// // };

// // exports.protectAdmin = async (req, res, next) => {
// //   try {
// //     let token;

// //     if (req.headers.authorization?.startsWith('Bearer ')) {
// //       token = req.headers.authorization.split(' ')[1];
// //     }

// //     if (!token) {
// //       return res.status(401).json({
// //         success: false,
// //         message: 'Not authorized, no token'
// //       });
// //     }

// //     // Verify token
// //     const decoded = jwt.verify(token, process.env.JWT_SECRET);

// //     // Admin collection se dhundo!
// //     const admin = await Admin.findById(decoded.userId || decoded.id);

// //     if (!admin) {
// //       return res.status(401).json({
// //         success: false,
// //         message: 'Admin not found or invalid token'
// //       });
// //     }

// //     if (!admin.isActive) {
// //       return res.status(403).json({
// //         success: false,
// //         message: 'Admin account is deactivated'
// //       });
// //     }

// //     req.admin = admin;
// //     req.admin.role = 'admin';

// //     next();
// //   } catch (error) {
// //     console.error('protectAdmin Error:', error.message);
// //     return res.status(401).json({
// //       success: false,
// //       message: 'Invalid or expired token'
// //     });
// //   }
// // };

// // exports.protectAdmin = async (req, res, next) => {
// //   try {
// //     let token;

// //     if (req.headers.authorization?.startsWith('Bearer ')) {
// //       token = req.headers.authorization.split(' ')[1];
// //     }

// //     if (!token) {
// //       return res.status(401).json({
// //         success: false,
// //         message: 'Not authorized, no token'
// //       });
// //     }

// //     const decoded = jwt.verify(token, process.env.JWT_SECRET);

// //     const admin = await Admin.findById(decoded.userId || decoded.id);

// //     if (!admin) {
// //       return res.status(401).json({
// //         success: false,
// //         message: 'Admin not found or invalid token'
// //       });
// //     }

// //     if (!admin.isActive) {
// //       return res.status(403).json({
// //         success: false,
// //         message: 'Admin account is deactivated'
// //       });
// //     }

// //     // req.user = admin;          
// //     // req.user.role = 'admin';    

// //     req.admin = admin;
// //     req.admin.role = 'admin';

// //     next();
// //   } catch (error) {
// //     console.error('protectAdmin Error:', error.message);
// //     return res.status(401).json({
// //       success: false,
// //       message: 'Invalid or expired token'
// //     });
// //   }
// // };


// // exports.protectAdmin = async (req, res, next) => {
// //   try {
// //     let token;

// //     if (req.headers.authorization?.startsWith('Bearer ')) {
// //       token = req.headers.authorization.split(' ')[1];
// //     }

// //     if (!token) {
// //       return res.status(401).json({
// //         success: false,
// //         message: 'Not authorized, no token'
// //       });
// //     }

// //     const decoded = jwt.verify(token, process.env.JWT_SECRET);
// //     const admin = await Admin.findById(decoded.userId || decoded.id);

// //     if (!admin) {
// //       return res.status(401).json({
// //         success: false,
// //         message: 'Admin not found or invalid token'
// //       });
// //     }

// //     if (!admin.isActive) {
// //       return res.status(403).json({
// //         success: false,
// //         message: 'Admin account is deactivated'
// //       });
// //     }

// //     req.user = admin;
// //     req.user.role = 'admin';

// //     req.admin = admin;

// //     next();
// //   } catch (error) {
// //     return res.status(401).json({
// //       success: false,
// //       message: 'Invalid or expired token'
// //     });
// //   }
// // }; 

// // middleware/authMiddleware.js

// exports.protectAdmin = async (req, res, next) => {
//   try {
//     let token;

//     // 1. Header se token (API calls ke liye)
//     if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
//       token = req.headers.authorization.split(' ')[1];
//     } 
//     // 2. Cookie se token (EJS dashboard ke liye) ← YE ADD KAR DO
//     else if (req.cookies.jwtAdmin) {
//       token = req.cookies.jwtAdmin;
//     }

//     // Agar token nahi mila to unauthorized
//     if (!token) {
//       // Agar EJS page hai to login pe redirect, warna JSON error
//       if (req.originalUrl.startsWith('/admin') && req.accepts('html')) {
//         return res.redirect('/admin/signin');
//       }
//       return res.status(401).json({
//         success: false,
//         message: 'Not authorized, no token'
//       });
//     }

//     // Token verify
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // decoded me id ya userId hona chahiye
//     const admin = await Admin.findById(decoded.id || decoded.userId);

//     if (!admin) {
//       if (req.accepts('html')) {
//         res.clearCookie('jwtAdmin');
//         return res.redirect('/admin/signin');
//       }
//       return res.status(401).json({
//         success: false,
//         message: 'Admin not found or invalid token'
//       });
//     }

//     if (!admin.isActive) {
//       res.clearCookie('jwtAdmin');
//       if (req.accepts('html')) {
//         return res.redirect('/admin/signin');
//       }
//       return res.status(403).json({
//         success: false,
//         message: 'Admin account is deactivated'
//       });
//     }

//     req.user = admin;
//     req.user.role = 'admin';
//     req.admin = admin;

//     next();

//   } catch (error) {
//     console.error('Protect Admin Error:', error.message);
//     res.clearCookie('jwtAdmin');
//     if (req.accepts('html')) {
//       return res.redirect('/admin/signin');
//     }
//     return res.status(401).json({
//       success: false,
//       message: 'Invalid or expired token'
//     });
//   }
// };

// exports.isAdmin = (req, res, next) => {
//   if (req.admin && req.admin.role === 'admin') {
//     next();
//   } else {
//     return res.status(403).json({ success: false, message: 'Admin access required' });
//   }
// };

// // Check if user is customer
// exports.isCustomer = async (req, res, next) => {
//   if (req.user.role !== 'customer') {
//     return res.status(403).json({
//       success: false,
//       message: 'Access denied. Customer role required.'
//     });
//   }
//   next();
// };





const { verifyToken } = require('../utils/jwtHelper');
const User = require('../models/User');
const Session = require('../models/Session');
const { unauthorizedResponse } = require('../utils/responseHelper');
const Admin = require("../models/Admin");
const Driver = require('../models/Driver');
const jwt = require("jsonwebtoken");
const { promisify } = require('util');

// Existing authenticate methods remain same...
exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorizedResponse(res, 'No token provided');
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return unauthorizedResponse(res, 'Invalid or expired token');
    }
    const session = await Session.findOne({
      token,
      userId: decoded.userId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });
    if (!session) {
      return unauthorizedResponse(res, 'Session expired or invalid');
    }
    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) {
      return unauthorizedResponse(res, 'User not found or inactive');
    }
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    return unauthorizedResponse(res, 'Authentication failed');
  }
};

exports.authenticateDriver = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const driver = await Driver.findById(decoded.id || decoded.userId);
    if (!driver) {
      return res.status(401).json({ success: false, message: 'Driver not found' });
    }
    if (driver.profileStatus !== 'approved') {
      return res.status(403).json({ success: false, message: 'Account not approved' });
    }
    req.user = driver;
    next();
  } catch (error) {
    console.error('Auth Error:', error);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

exports.authenticateAny = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Invalid token' });
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Token expired or invalid' });
    }
    if (!decoded.userId) {
      return res.status(401).json({ success: false, message: 'Invalid token payload' });
    }
    let driver = await Driver.findById(decoded.userId).select('-password -pin');
    if (driver && driver.isActive) {
      req.user = driver;
      req.user.role = 'driver';
      req.token = token;
      return next();
    }
    let customer = await User.findById(decoded.userId).select('-password');
    if (customer && customer.isActive) {
      req.user = customer;
      req.user.role = customer.role || 'customer';
      req.token = token;
      return next();
    }
    return res.status(401).json({ success: false, message: 'User not found or inactive' });
  } catch (error) {
    console.error('authenticateAny Error:', error);
    return res.status(401).json({ success: false, message: 'Authentication failed' });
  }
};

// ============================================
// NEW: Admin Authentication Middleware
// ============================================

exports.checkAdmin = async (req, res, next) => {
  try {
    const token = req.cookies['jwtAdmin'];
    req.session.checkAdminSuccess = true;

    if (!token) {
      req.flash('red', 'Please login as admin first!');
      return res.redirect('/admin/login');
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id || decoded._id || decoded.userId);

    if (!admin) {
      req.flash('red', 'Please login as admin first!');
      return res.redirect('/admin/login');
    }

    // Check if Sub Admin and blocked
    if (admin.role === 'A' && !admin.isActive) {
      req.flash('red', 'Your account has been blocked, Please contact admin.');
      return res.redirect('/admin/login');
    }

    // Attach admin to request
    req.admin = admin;
    res.locals.photo = admin.photo;
    res.locals.admin = admin; // Make available in views
    req.session.checkAdminSuccess = undefined;

    next();

  } catch (error) {
    if (error.message === 'invalid signature') {
      req.flash('red', 'Invalid token! Please login again.');
    } else {
      req.flash('red', error.message);
    }
    res.redirect('/admin/login');
  }
};

// ============================================
// NEW: Permission Check Middleware
// ============================================

// exports.checkPermission = (moduleKey, action) => {
//   return async (req, res, next) => {
//     try {
//       const admin = req.admin;

//       if (!admin) {
//         req.flash('red', 'Unauthorized access!');
//         return res.redirect('/admin/login');
//       }

//       // Super Admin (role: 'S') has full access
//       if (admin.role === 'S') {
//         return next();
//       }

//       // Sub Admin (role: 'A') - check permissions
//       if (admin.role === 'A') {
//         const permission = admin.permission.find(p => p.key === moduleKey);

//         if (!permission) {
//           req.flash('red', 'You do not have access to this module.');
//           return res.redirect('/admin/dashboard');
//         }

//         // Check specific action permission
//         if (!permission[action]) {
//           req.flash('red', `You do not have permission to ${action.replace('is', '').toLowerCase()} in this module.`);
//           return res.redirect('/admin/dashboard');
//         }
//       }

//       next();

//     } catch (error) {
//       console.error('Permission Check Error:', error);
//       req.flash('red', 'Something went wrong!');
//       res.redirect('/admin/dashboard');
//     }
//   };
// };

// exports.checkPermission = (moduleKey, action) => {
//   return async (req, res, next) => {
//     console.log(`[checkPermission] Called for module: ${moduleKey}, action: ${action}`);
//     console.log('[checkPermission] Current admin permissions:', req.admin?.permission);

//     try {
//       const admin = req.admin;

//       if (!admin) {
//         console.log('[checkPermission] No admin object');
//         return res.status(401).json({ success: false, message: 'Unauthorized' });
//       }

//       // Super Admin bypass
//       if (admin.role === 'S') {
//         console.log('[checkPermission] Super Admin bypass');
//         return next();
//       }

//       // Normalize keys to lowercase
//       const normalizedModuleKey = moduleKey.toLowerCase();

//       // Find matching permission (case-insensitive)
//       const permission = admin.permission?.find(p => 
//         (p.key || '').toLowerCase() === normalizedModuleKey
//       );

//       if (!permission) {
//         console.log(`[checkPermission] No permission found for module: ${moduleKey} (normalized: ${normalizedModuleKey})`);
//         return res.status(403).json({ 
//           success: false, 
//           message: `Permission denied - No access to ${moduleKey}` 
//         });
//       }

//       // Map action to permission field
//       const actionMap = {
//         'read': 'isView',
//         'create': 'isAdd',
//         'update': 'isEdit',
//         'delete': 'isDelete'
//       };

//       const permField = actionMap[action.toLowerCase()];
//       if (!permField) {
//         console.log(`[checkPermission] Unknown action: ${action}`);
//         return res.status(403).json({ success: false, message: 'Invalid action' });
//       }

//       if (!permission[permField]) {
//         console.log(`[checkPermission] Permission denied: ${permField} is false for ${moduleKey}`);
//         return res.status(403).json({ 
//           success: false, 
//           message: `Permission denied - No ${action} permission for ${moduleKey}` 
//         });
//       }

//       console.log(`[checkPermission] Granted: ${moduleKey} - ${action} (${permField}: true)`);
//       next();

//     } catch (error) {
//       console.error('[checkPermission] Error:', error);
//       return res.status(500).json({ success: false, message: 'Permission check failed' });
//     }
//   };
// };

exports.checkPermission = (moduleKey, action) => {
  return async (req, res, next) => {
    console.log(`\n[checkPermission DEBUG] Module: ${moduleKey}, Action: ${action}`);
    console.log('[checkPermission] Admin email:', req.admin?.email);
    console.log('[checkPermission] Permission array length:', req.admin?.permission?.length || 0);
    console.log('[checkPermission] Raw permission array:', JSON.stringify(req.admin?.permission || [], null, 2));

    try {
      const admin = req.admin;
      if (!admin) {
        console.log('[checkPermission] No admin');
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Super Admin bypass
      if (admin.role === 'S') {
        console.log('[checkPermission] Super Admin full access');
        return next();
      }

      // Normalize (case-insensitive)
      const keyLower = moduleKey.toLowerCase();

      // Safe find
      const permission = admin.permission?.find(p => {
        const pKey = p?.key || '';
        const match = pKey.toLowerCase() === keyLower;
        console.log(`  Checking key: ${pKey} vs ${keyLower} → ${match ? 'MATCH' : 'no'}`);
        return match;
      });

      if (!permission) {
        console.log(`[checkPermission] NO MATCH FOUND for ${moduleKey}`);
        return res.status(403).json({
          success: false,
          message: `Permission denied - No access to ${moduleKey}`
        });
      }

      // Action mapping
      const map = { read: 'isView', view: 'isView', create: 'isAdd', update: 'isEdit', edit: 'isEdit', delete: 'isDelete' };
      const field = map[action.toLowerCase()];

      if (!field) {
        console.log(`[checkPermission] Invalid action: ${action}`);
        return res.status(403).json({ success: false, message: 'Invalid action' });
      }

      if (permission[field] !== true) {
        console.log(`[checkPermission] DENIED - ${field} = ${permission[field]}`);
        req.flash(
          'red',
          'You do not have permission for this action.'
        );
        return res.redirect('/admin');
        // return res.status(403).json({
        //   success: false,
        //   message: `Permission denied - No ${action} for ${moduleKey}`
        // });
      }

      console.log(`[checkPermission] SUCCESS - ${moduleKey} ${action} granted`);
      next();

    } catch (err) {
      console.error('[checkPermission] ERROR:', err);
      return res.status(500).json({ success: false, message: 'Permission check failed' });
    }
  };
};

// ============================================
// Protect Admin (For API Routes)
// ============================================

// Helper to get token from cookie or header
const getToken = (req) => {
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  if (req.cookies?.jwtAdmin) {
    return req.cookies.jwtAdmin;
  }
  return null;
};

// Main admin protection middleware (for both API & EJS)
// exports.protectAdmin = async (req, res, next) => {
//   try {
//     console.log('[MIDDLEWARE] Request method:', req.method, 'Path:', req.path);
//     const token = getToken(req);
//     if (!token) {
//       req.flash('red', 'Please login as admin');
//       return res.redirect('/admin/signin');
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     console.log('[protectAdmin] Decoded token:', decoded);

//     const admin = await Admin.findById(decoded.id || decoded.userId || decoded._id)
//       .select('-password');

//     if (!admin) {
//       console.log('[protectAdmin] Admin not found');
//       res.clearCookie('jwtAdmin');
//       req.flash('red', 'Admin account not found');
//       return res.redirect('/admin/signin');
//     }

//     if (!admin.isActive) {
//       res.clearCookie('jwtAdmin');
//       req.flash('red', 'Admin account deactivated');
//       return res.redirect('/admin/signin');
//     }

//     // Direct assign – NO .toObject()
//     req.admin = admin;
//     req.admin.role = admin.role;  // Safety net

//     req.user = admin;
//     req.user.role = admin.role;

//     console.log('[protectAdmin] Admin attached (direct):', {
//       id: req.admin._id.toString(),
//       email: req.admin.email,
//       role: req.admin.role
//     });

//     next();

//   } catch (error) {
//     console.error('[protectAdmin] Error:', error.message);
//     res.clearCookie('jwtAdmin');
//     req.flash('red', 'Authentication failed');
//     return res.redirect('/admin/signin');
//   }
// };

exports.protectAdmin = async (req, res, next) => {
  try {
    console.log('[MIDDLEWARE] Request method:', req.method, 'Path:', req.path);

    const token = getToken(req);

    if (!token) {
      console.log('[protectAdmin] No token found');

      // Check if this is an API request (JSON) or web request
      if (req.accepts('json') && !req.accepts('html')) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      req.flash('red', 'Please login as admin');
      return res.redirect('/admin/signin');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[protectAdmin] Decoded token:', decoded);

    const admin = await Admin.findById(decoded.id || decoded.userId || decoded._id)
      .select('-password');

    if (!admin) {
      console.log('[protectAdmin] Admin not found');

      // Don't clear cookie on API requests during operation
      if (req.accepts('json') && !req.accepts('html')) {
        return res.status(401).json({
          success: false,
          message: 'Admin account not found'
        });
      }

      res.clearCookie('jwtAdmin');
      req.flash('red', 'Admin account not found');
      return res.redirect('/admin/signin');
    }

    if (!admin.isActive) {
      console.log('[protectAdmin] Admin account deactivated');

      // Don't clear cookie on API requests during operation
      if (req.accepts('json') && !req.accepts('html')) {
        return res.status(403).json({
          success: false,
          message: 'Admin account deactivated'
        });
      }

      res.clearCookie('jwtAdmin');
      req.flash('red', 'Admin account deactivated');
      return res.redirect('/admin/signin');
    }

    // Attach admin to request
    req.admin = admin;
    req.admin.role = admin.role;

    req.user = admin;
    req.user.role = admin.role;

    console.log('[protectAdmin] Admin authenticated:', {
      id: req.admin._id.toString(),
      email: req.admin.email,
      role: req.admin.role
    });

    next();

  } catch (error) {
    console.error('[protectAdmin] Error:', error.message);

    // Check if this is a token verification error
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {

      // For API requests, don't clear cookie, just return error
      if (req.accepts('json') && !req.accepts('html')) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      // Only clear cookie for web navigation
      res.clearCookie('jwtAdmin');
      req.flash('red', 'Session expired. Please login again');
      return res.redirect('/admin/signin');
    }

    // For other errors, don't clear cookie
    if (req.accepts('json') && !req.accepts('html')) {
      return res.status(500).json({
        success: false,
        message: 'Authentication failed'
      });
    }

    req.flash('red', 'Authentication failed');
    return res.redirect('/admin/signin');
  }
};


// Super Admin only middleware
exports.isSuperAdmin = (req, res, next) => {
  console.log('[isSuperAdmin] Full req.admin:', req.admin);

  if (!req.admin) {
    console.log('[isSuperAdmin] req.admin is missing');
    req.flash('red', 'Session expired. Please login again.');
    return res.redirect('/admin/signin');
  }

  const role = req.admin.role;

  console.log('[isSuperAdmin] Role value:', role);

  if (role !== 'S') {
    console.log('[isSuperAdmin] Not superadmin. Role was:', role);
    req.flash('red', 'Super Admin access required');
    return res.redirect('/admin/dashboard');
  }

  console.log('[isSuperAdmin] Super Admin access granted');
  next();
};

// Simple admin check (normal admin OR super admin)


// exports.isAdmin = (req, res, next) => {
//   console.log('[isAdmin] Checking role:', req.admin?.role);

//   if (!req.admin) {
//     console.log('[isAdmin] No admin object');
//     req.flash('red', 'Session expired. Please login again.');
//     return res.redirect('/admin/signin');
//   }

//   // Allow BOTH Super Admin ('S') and Sub Admin ('A')
//   if (req.admin.role === 'S' || req.admin.role === 'A') {
//     console.log('[isAdmin] Access granted for role:', req.admin.role);
//     return next();
//   }

//   console.log('[isAdmin] Access denied for role:', req.admin.role);
//   if (req.accepts('html')) {
//     req.flash('red', 'Admin access required');
//     return res.redirect('/admin/dashboard');
//   }

//   return res.status(403).json({ success: false, message: 'Permission denied - Admin access required' });
// };

exports.isAdmin = (req, res, next) => {
  console.log('[isAdmin] Checking admin role:', req.admin?.role);

  if (!req.admin) {
    console.log('[isAdmin] No admin object - redirecting');
    req.flash('red', 'Session expired. Please login again.');
    return res.redirect('/admin/signin');
  }

  // Allow BOTH Super Admin ('S') AND Sub Admin ('A')
  if (req.admin.role === 'S' || req.admin.role === 'A') {
    console.log('[isAdmin] Access granted for role:', req.admin.role);
    return next();
  }

  console.log('[isAdmin] Access denied for role:', req.admin.role);
  if (req.accepts('html')) {
    req.flash('red', 'Admin access required');
    return res.redirect('/admin/dashboard');
  }

  return res.status(403).json({
    success: false,
    message: 'Permission denied - Admin access required'
  });
};

exports.isDriver = async (req, res, next) => {
  if (req.user.role !== 'driver') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Driver role required.'
    });
  }
  next();
};

exports.isCustomer = async (req, res, next) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Customer role required.'
    });
  }
  next();
};