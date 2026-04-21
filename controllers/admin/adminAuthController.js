// const Admin = require('../../models/Admin');
// const Session = require('../../models/Session');
// const RefreshToken = require('../../models/RefreshToken');
// const jwtHelper = require('../../utils/jwtHelper');
// const { sendWelcomeEmail } = require('../../utils/emailHelper');
// const { successResponse, errorResponse } = require('../../utils/responseHelper');

// // Admin Signup (Only for creating first admin or superadmin)
// exports.adminSignup = async (req, res) => {
//   try {
//     const { name, email, phone, password, department, employeeId, permissions = [] } = req.body;

//     // Check if admin already exists
//     const existingAdmin = await Admin.findOne({
//       $or: [{ email }, { phone }]
//     });
//     if (existingAdmin) {
//       return errorResponse(res, 'Admin with this email or phone already exists', 400);
//     }

//     // Create admin directly (no User model)
//     const admin = await Admin.create({
//       name,
//       email,
//       phone,
//       password,
//       department,
//       employeeId,
//       permissions,
//       isActive: true,
//       isVerified: true,
//       isSuperAdmin: true  // First admin = superadmin
//     });

//     // Send welcome email
//     await sendWelcomeEmail(admin.email, admin.name);

//     successResponse(res, 'Admin created successfully', {
//       admin: {
//         id: admin._id,
//         name: admin.name,
//         email: admin.email,
//         phone: admin.phone,
//         role: admin.role,
//         department: admin.department,
//         employeeId: admin.employeeId,
//         isSuperAdmin: admin.isSuperAdmin
//       }
//     }, 201);

//   } catch (error) {
//     console.error('Admin Signup Error:', error);
//     errorResponse(res, error.message || 'Admin creation failed', 500);
//   }
// };

// // Admin Signin
// exports.adminSignin = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Find admin directly by email
//     const admin = await Admin.findOne({ email });
//     if (!admin) {
//       return errorResponse(res, 'Invalid email or password', 401);
//     }

//     // Check if active
//     if (!admin.isActive) {
//       return errorResponse(res, 'Admin account is deactivated', 403);
//     }

//     // Verify password
//     const isValid = await admin.comparePassword(password);
//     if (!isValid) {
//       return errorResponse(res, 'Invalid email or password', 401);
//     }

//     // Generate tokens
//     const accessToken = jwtHelper.generateAccessToken(admin._id, 'admin');
//     const refreshToken = jwtHelper.generateRefreshToken(admin._id);

//     // Save refresh token
//     await RefreshToken.create({
//       userId: admin._id,
//       token: refreshToken,
//       expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
//     });

//     // Create session
//     await Session.create({
//       adminId: admin._id, 
//       type: 'login_session',
//       userType: 'admin',
//       token: accessToken,
//       deviceInfo: req.headers['user-agent'] || 'Unknown',
//       ipAddress: req.ip || req.connection.remoteAddress,
//       expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
//     });

//     // successResponse(res, 'Admin login successful', {
//     //   admin: {
//     //     id: admin._id,
//     //     name: admin.name,
//     //     email: admin.email,
//     //     phone: admin.phone,
//     //     department: admin.department,
//     //     employeeId: admin.employeeId,
//     //     permissions: admin.permissions,
//     //     isSuperAdmin: admin.isSuperAdmin
//     //   },
//     //   accessToken,
//     //   refreshToken
//     // });

//     res.cookie('jwtAdmin', accessToken, {
//       expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
//       httpOnly: true,
//     });
//     res.redirect('/admin');

//   } catch (error) {
//     console.error('Admin Signin Error:', error);
//     errorResponse(res, error.message || 'Login failed', 500);
//   }
// };

// // Render login page
// exports.renderLogin = async (req, res) => {
//   res.render("login", { error: null });
// };

// // Get Admin Profile
// exports.getAdminProfile = async (req, res) => {
//   try {
//     const admin = await Admin.findById(req.admin._id);

//     if (!admin) {
//       return errorResponse(res, 'Admin not found', 404);
//     }

//     // successResponse(res, 'Admin profile retrieved successfully', {
//     //   admin: admin.toJSON()
//     // });
//     res.render('profile', { admin: req.admin, photo: req.admin.photo });

//   } catch (error) {
//     console.error('Get Admin Profile Error:', error);
//     errorResponse(res, error.message || 'Failed to fetch profile', 500);
//   }
// };

// // Update Admin Profile (FULLY WORKING)
// exports.updateAdminProfile = async (req, res) => {
//   try {
//     const updates = req.body;
//     const allowedFields = ['name', 'phone', 'department', 'employeeId']; // jo update karna allowed hai

//     // Find admin
//     const admin = await Admin.findById(req.admin._id);
//     if (!admin) {
//       return errorResponse(res, 'Admin not found', 404);
//     }

//     // Apply only allowed updates
//     let hasChanges = false;
//     allowedFields.forEach(field => {
//       if (updates[field] !== undefined && updates[field] !== admin[field]) {
//         admin[field] = updates[field];
//         hasChanges = true;
//       }
//     });

//     // Agar kuch change nahi hua to bhi success bhej do (optional)
//     if (!hasChanges) {
//       return successResponse(res, 'No changes detected', { admin: admin.toJSON() });
//     }

//     // Save karo
//     await admin.save();

//     successResponse(res, 'Profile updated successfully!', {
//       admin: admin.toJSON()
//     });

//   } catch (error) {
//     console.error('Update Admin Profile Error:', error);
//     errorResponse(res, 'Update failed', 500);
//   }
// };

// exports.adminLogout = async (req, res) => {
//   try {
//     const adminId = req.admin._id;
//     const authHeader = req.headers.authorization;
//     let token = null;

//     if (authHeader && authHeader.startsWith('Bearer ')) {
//       token = authHeader.split(' ')[1];
//     }

//     if (!token) {
//       res.clearCookie('adminToken', {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === 'production',
//         sameSite: 'strict'
//       });
//       return successResponse(res, 'Logged out successfully (token not found)');
//     }

//     await Session.deleteOne({
//       userId: adminId,
//       token: token
//     });

//     await RefreshToken.deleteOne({
//       userId: adminId,
//       token: { $exists: true }
//     });

//     res.clearCookie('adminToken', {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'strict',
//       path: '/'
//     });

//     return successResponse(res, 'Logged out successfully!');

//   } catch (error) {
//     console.error('Admin Logout Error:', error);
//     return errorResponse(res, 'Logout failed', 500);
//   }
// };

// exports.adminLogoutAll = async (req, res) => {
//   try {
//     const adminId = req.admin._id;

//     await Session.deleteMany({ userId: adminId });

//     await RefreshToken.deleteMany({ userId: adminId });

//     res.clearCookie('adminToken', {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'strict',
//       path: '/'
//     });

//     return successResponse(res, 'Logged out from all devices successfully!');

//   } catch (error) {
//     console.error('Admin Logout All Error:', error);
//     return errorResponse(res, 'Failed to logout from all devices', 500);
//   }
// };

// /* SUB ADMIN ROUTES */

// exports.getSubAdminList = async (req, res) => {
//   const subadmin = await adminModel
//     .find({ role: 'A' })
//     .sort({ createdAt: -1 });

//   res.render('subadmin', { subadmin });
// };

// exports.getSubAdmin = async (req, res) => {
//   const modules = await moduleModel.find();
//   res.render('subadmin_add', { modules });
// };

// exports.postSubAdmin = async (req, res) => {
//     try {
//         const { name, email, password, permissions } = req.body;

//         const isExists = await adminModel.findOne({ email });
//         if (isExists) {
//             req.flash('red', 'This email address already registered!');
//             return res.redirect('/admin/sub-admin/list');
//         }

//         // Convert permissions into required format
//         const formattedPermissions = [
//             ...Object.values(permissions).map(perm => ({
//                 key: perm.module,
//                 module: perm.moduleName,
//                 isView: perm.isView === 'true',
//                 isAdd: perm.isAdd === 'true',
//                 isEdit: perm.isEdit === 'true',
//                 isDelete: perm.isDelete === 'true',
//             })),
//             {
//                 key: 'subadmin',
//                 module: 'Sub Admin',
//                 isView: false,
//                 isAdd: false,
//                 isEdit: false,
//                 isDelete: false,
//             },
//         ];

//         // Create a new admin/sub-admin
//         const newAdmin = new adminModel({
//             name,
//             email,
//             password,
//             role: 'A',
//             permission: formattedPermissions,
//         });

//         await newAdmin.save();
//         req.flash('green', 'Sub Admin added successfully.');
//         res.redirect('/admin/sub-admin/list');
//     } catch (error) {
//         req.flash('red', 'Something went wrong!');
//         res.redirect('/admin/sub-admin/list');
//     }
// };

// exports.changeAdminStatus = async (req, res) => {
//     try {
//         const user = await adminModel.findById(req.params.id);

//         user.isActive = req.params.status;

//         await user.save();

//         req.flash('green', 'Status changed successfully.');
//         res.redirect('/admin/sub-admin/list');
//     } catch (error) {
//         if (error.name === 'CastError' || error.name === 'TypeError')
//             req.flash('red', 'User not found!');
//         else req.flash('red', error.message);
//         res.redirect('/admin/sub-admin/list'); 
//     }
// };

// exports.getEditSubAdmin = async (req, res) => {
//     const admin = await adminModel.findById(req.params.id);
//     res.render('subadmin_edit', { admin });
// };

// exports.postEditSubAdmin = async (req, res) => {
//     try {
//         const { name, email, password, permissions } = req.body;

//         // if(isExists){
//         //     req.flash('red', 'This email address already registered!');
//         //     return res.redirect("/admin/sub-admin/list");
//         // }

//         const admin = await adminModel.findById(req.params.id);

//         // Convert permissions into required format
//         const formattedPermissions = Object.values(permissions).map(perm => ({
//             key: perm.module,
//             module: perm.moduleName,
//             isView: perm.isView === 'true',
//             isAdd: perm.isAdd === 'true',
//             isEdit: perm.isEdit === 'true',
//             isDelete: perm.isDelete === 'true',
//         }));

//         // Create a new admin/sub-admin
//         admin.name = name;
//         admin.email = email;
//         admin.password = password;
//         admin.permission = formattedPermissions;

//         await admin.save();

//         req.flash('green', 'Sub Admin updated successfully.');
//         res.redirect('/admin/sub-admin/list');
//     } catch (error) {
//         req.flash('red', 'Something went wrong!');
//         res.redirect('/admin/sub-admin/list');
//     }
// };

// exports.deleteAccountSubAdmin = async (req, res, next) => {
//     try {
//         const subadmin = await adminModel.findByIdAndDelete(req.params.id);

//         // const modifiedEmail = `${subadmin.email}_deleted_${Date.now()}`;


//         // subadmin.isDelete = true;
//         // subadmin.token = '';
//         // subadmin.fcmToken = '';
//         // subadmin.email = modifiedEmail;

//         //Points Removed

//         // await subadmin.save();

//         req.flash('green', 'Sub Admin deleted successfully.');
//         res.redirect('/admin/sub-admin/list');
//     } catch (error) {
//         req.flash('red', error.message);
//         res.redirect('/admin/sub-admin/list');
//     }
// };


const Admin = require('../../models/Admin');
const Session = require('../../models/Session');
const RefreshToken = require('../../models/RefreshToken');
const jwtHelper = require('../../utils/jwtHelper');
const { sendWelcomeEmail } = require('../../utils/emailHelper');
const { successResponse, errorResponse } = require('../../utils/responseHelper');

// Admin Signup (Only for creating first Super Admin)
exports.adminSignup = async (req, res) => {
  try {
    const { name, email, phone, password, department, employeeId } = req.body;

    // Check if any admin exists
    const existingAdmins = await Admin.countDocuments();
    if (existingAdmins > 0) {
      return errorResponse(res, 'Admin signup is disabled. Contact super admin to create new admins.', 403);
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      $or: [{ email }, { phone }]
    });
    if (existingAdmin) {
      return errorResponse(res, 'Admin with this email or phone already exists', 400);
    }

    // Create first admin as Super Admin
    const admin = await Admin.create({
      name,
      email,
      phone,
      password,
      department,
      employeeId,
      role: 'S', // First admin is Super Admin
      isActive: true
    });

    // Send welcome email
    await sendWelcomeEmail(admin.email, admin.name);

    successResponse(res, 'Super Admin created successfully', {
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        department: admin.department,
        employeeId: admin.employeeId
      }
    }, 201);

  } catch (error) {
    console.error('Admin Signup Error:', error);
    errorResponse(res, error.message || 'Admin creation failed', 500);
  }
};

// Admin Signin
exports.adminSignin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    if (!admin.isActive) {
      return errorResponse(res, 'Admin account is deactivated', 403);
    }

    const isValid = await admin.comparePassword(password);
    if (!isValid) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    // Generate tokens
    const accessToken = jwtHelper.generateAccessToken(admin._id, admin.role === 'S' ? 'superadmin' : 'admin');
    const refreshToken = jwtHelper.generateRefreshToken(admin._id);

    // Save refresh token
    await RefreshToken.create({
      userId: admin._id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // Create session
    await Session.create({
      userId: admin._id,
      type: 'login_session',
      userType: admin.role === 'S' ? 'superadmin' : 'admin',
      token: accessToken,
      deviceInfo: req.headers['user-agent'] || 'Unknown',
      ipAddress: req.ip || req.connection.remoteAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // res.cookie('jwtAdmin', accessToken, {
    //   expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    //   httpOnly: true,
    // });

    res.cookie('jwtAdmin', accessToken, {
      httpOnly: true,                     // Security: can't be accessed by JS
      secure: process.env.NODE_ENV === 'production',  // true in production (HTTPS)
      sameSite: 'strict',                 // Prevents CSRF
      maxAge: 90 * 24 * 60 * 60 * 1000,   // 90 days in ms
      path: '/',                          // Available on all paths
    });
    res.redirect('/admin/dashboard');

  } catch (error) {
    console.error('Admin Signin Error:', error);
    errorResponse(res, error.message || 'Login failed', 500);
  }
};

// Render login page
exports.renderLogin = async (req, res) => {
  res.render("login", { error: null });
};

// Get Admin Profile
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);

    if (!admin) {
      return errorResponse(res, 'Admin not found', 404);
    }

    res.render('profile', { admin: req.admin, photo: req.admin.photo });

  } catch (error) {
    console.error('Get Admin Profile Error:', error);
    errorResponse(res, error.message || 'Failed to fetch profile', 500);
  }
};

// Update Admin Profile
exports.updateAdminProfile = async (req, res) => {
  try {
    const updates = req.body;
    const allowedFields = ['name', 'phone', 'department', 'employeeId'];

    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return errorResponse(res, 'Admin not found', 404);
    }

    let hasChanges = false;
    allowedFields.forEach(field => {
      if (updates[field] !== undefined && updates[field] !== admin[field]) {
        admin[field] = updates[field];
        hasChanges = true;
      }
    });

    if (!hasChanges) {
      return successResponse(res, 'No changes detected', { admin: admin.toJSON() });
    }

    await admin.save();

    successResponse(res, 'Profile updated successfully!', {
      admin: admin.toJSON()
    });

  } catch (error) {
    console.error('Update Admin Profile Error:', error);
    errorResponse(res, 'Update failed', 500);
  }
};

exports.adminLogout = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const token = req.cookies.jwtAdmin;

    if (token) {
      await Session.deleteOne({ userId: adminId, token });
      await RefreshToken.deleteOne({ userId: adminId });
    }

    res.clearCookie('jwtAdmin', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    req.flash('success', 'Logged out successfully!');

    return res.redirect('/admin/signin');

  } catch (error) {
    console.error('Admin Logout Error:', error);
    req.flash('error', 'Logout failed. Please try again.');
    return res.redirect('/admin/login');
  }
};

exports.adminLogoutAll = async (req, res) => {
  try {
    const adminId = req.admin._id;

    await Session.deleteMany({ userId: adminId });
    await RefreshToken.deleteMany({ userId: adminId });

    res.clearCookie('jwtAdmin', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    return successResponse(res, 'Logged out from all devices successfully!');

  } catch (error) {
    console.error('Admin Logout All Error:', error);
    return errorResponse(res, 'Failed to logout from all devices', 500);
  }
};

// 
exports.getChangePass = (req, res) => {
  res.render('change_pass', {
    title: 'Change Password',
    url: req.originalUrl,
    messages: req.flash()
  });
};

exports.postChangePass = async (req, res) => {
  try {
    const { currentpass, newpass, cfnewpass } = req.body;

    if (!currentpass || !newpass || !cfnewpass) {
      req.flash('error', 'All fields are required');
      return res.redirect('/admin/changepass');
    }

    if (newpass !== cfnewpass) {
      req.flash('error', 'New password and confirm password do not match');
      return res.redirect('/admin/changepass');
    }

    if (newpass.length < 8) {
      req.flash('error', 'New password must be at least 8 characters long');
      return res.redirect('/admin/changepass');
    }
    if (newpass === currentpass) {
      req.flash('error', 'New password cannot be the same as current password');
      return res.redirect('/admin/changepass');
    }

    // 4. Find admin
    const admin = await Admin.findOne({ email: req.admin.email }).select('+password');

    if (!admin) {
      req.flash('error', 'Admin not found');
      return res.redirect('/admin/changepass');
    }

    const isMatch = await admin.comparePassword(currentpass);
    if (!isMatch) {
      req.flash('error', 'Current password is incorrect');
      return res.redirect('/admin/changepass');
    }

    admin.password = newpass;
    await admin.save();

    req.flash('success', 'Password changed successfully! Please login again with new password.');
    res.redirect('/admin/logout');
  } catch (error) {
    console.error('Change Password Error:', error);

    if (error.name === 'ValidationError') {
      Object.values(error.errors).forEach(err => {
        req.flash('error', err.message);
      });
    } else {
      req.flash('error', 'Something went wrong. Please try again.');
    }

    res.redirect('/admin/changepass');
  }
};

/* ============================================
   SUB ADMIN ROUTES (Only Super Admin Access)
   ============================================ */

// Get Sub Admin List
exports.getSubAdminList = async (req, res) => {
  try {
    const subadmins = await Admin
      .find({ role: 'A' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.render('subadmin_list', {
      subadmins,
      admin: req.admin,
      title: "sub-admin",
      url: req.originalUrl
    });
  } catch (error) {
    req.flash('red', 'Error fetching sub admins');
    res.redirect('/admin/dashboard');
  }
};

// Render Add Sub Admin Form (unchanged - already good)
exports.getAddSubAdmin = async (req, res) => {
  try {
    const modules = [
      { key: 'customers', name: 'Customer Management' },
      { key: 'drivers', name: 'Driver Management' },
      { key: 'orders', name: 'Order Management' },
      { key: 'deliveries', name: 'Delivery Management' },
      { key: 'vehicles', name: 'vehicle Management' },
      { key: 'chat', name: 'Chat' },
      { key: 'regions', name: 'regions' },
      { key: 'expenses', name: 'Expense' },
      { key: 'Remark', name: 'Remark' },
      { key: 'cms', name: 'CMS' }
    ];

    res.render('subadmin_add', {
      modules,
      admin: req.admin,
      title: 'Add Sub Admin',
      url: req.originalUrl,
      messages: req.flash() // ← Add this for flash messages
    });
  } catch (error) {
    console.error('Get Add Sub Admin Error:', error);
    req.flash('red', 'Error loading form');
    res.redirect('/admin/sub-admin/list');
  }
};

// Create Sub Admin - FIXED & ROBUST VERSION
exports.postSubAdmin = async (req, res) => {
  try {
    console.log('=== SUB ADMIN FORM SUBMITTED ===');
    console.log('Body Data:', req.body); // Yeh print hoga agar data aaya
    console.log('Permissions Raw:', req.body.permissions);

    const { name, email, phone, password, department, employeeId, permissions } = req.body;

    if (!name || !email || !password) {
      req.flash('red', 'Name, Email and Password are required!');
      return res.redirect('/admin/sub-admin/add');
    }

    const isExists = await Admin.findOne({ email });
    if (isExists) {
      req.flash('red', 'This email address is already registered!');
      return res.redirect('/admin/sub-admin/add');
    }

    let formattedPermissions = [];
    if (permissions && typeof permissions === 'object') {
      formattedPermissions = Object.keys(permissions).map(key => {
        const p = permissions[key];
        return {
          key,
          module: p.moduleName,
          isView: p.isView === 'true',
          isAdd: p.isAdd === 'true',
          isEdit: p.isEdit === 'true',
          isDelete: p.isDelete === 'true'
        };
      });
    }

    const newAdmin = await Admin.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone || null,
      password,
      department: department || 'General',
      employeeId: employeeId || `EMP-${Date.now()}`,
      role: 'A',
      permission: formattedPermissions,
      isActive: true
    });

    console.log('Sub Admin Created Successfully:', newAdmin.email);
    req.flash('green', 'Sub Admin added successfully!');
    res.redirect('/admin/sub-admin/list');

  } catch (error) {
    console.error('Create Sub Admin Error:', error);
    req.flash('red', error.message || 'Failed to create sub admin');
    res.redirect('/admin/sub-admin/add');
  }
};
// Change Sub Admin Status
exports.changeAdminStatus = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      req.flash('red', 'Sub Admin not found!');
      return res.redirect('/admin/sub-admin/list');
    }

    if (admin.role === 'S') {
      req.flash('red', 'Cannot change Super Admin status!');
      return res.redirect('/admin/sub-admin/list');
    }

    admin.isActive = req.params.status === 'true';
    await admin.save();

    req.flash('green', 'Status changed successfully.');
    res.redirect('/admin/sub-admin/list');

  } catch (error) {
    console.error('Change Status Error:', error);
    req.flash('red', error.message || 'User not found!');
    res.redirect('/admin/sub-admin/list');
  }
};

// Render Edit Sub Admin Form
exports.getEditSubAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin || admin.role === 'S') {
      req.flash('red', 'Sub Admin not found!');
      return res.redirect('/admin/sub-admin/list');
    }

    const modules = [
      { key: 'customers', name: 'Customer Management' },
      { key: 'drivers', name: 'Driver Management' },
      { key: 'orders', name: 'Order Management' },
      { key: 'deliveries', name: 'Delivery Management' },
      { key: 'vehicles', name: 'vehicle Management' },
      { key: 'chat', name: 'Chat' },
      { key: 'regions', name: 'regions' },
      { key: 'expenses', name: 'Expense' },
      { key: 'Remark', name: 'Remark' },
      { key: 'cms', name: 'CMS' }
    ];

    res.render('subadmin_edit', {
      admin: admin,
      modules,
      title: 'Edit Sub Admin',
      url: req.originalUrl,
      currentAdmin: req.admin
    });

  } catch (error) {
    req.flash('red', 'Error loading sub admin');
    res.redirect('/admin/sub-admin/list');
  }
};

// Update Sub Admin
exports.postEditSubAdmin = async (req, res) => {
  try {
    const { name, email, password, department, employeeId, permissions } = req.body;

    const admin = await Admin.findById(req.params.id);

    if (!admin || admin.role === 'S') {
      req.flash('red', 'Sub Admin not found!');
      return res.redirect('/admin/sub-admin/list');
    }

    // Format permissions
    const formattedPermissions = Object.values(permissions || {}).map(perm => ({
      key: perm.module,
      module: perm.moduleName,
      isView: perm.isView === 'true' || perm.isView === true,
      isAdd: perm.isAdd === 'true' || perm.isAdd === true,
      isEdit: perm.isEdit === 'true' || perm.isEdit === true,
      isDelete: perm.isDelete === 'true' || perm.isDelete === true
    }));

    // Update fields
    admin.name = name;
    admin.email = email;
    admin.department = department || admin.department;
    admin.employeeId = employeeId || admin.employeeId;

    if (password && password.trim() !== '') {
      admin.password = password;
    }

    admin.permission = formattedPermissions;

    await admin.save();

    req.flash('green', 'Sub Admin updated successfully.');
    res.redirect('/admin/sub-admin/list');

  } catch (error) {
    console.error('Update Sub Admin Error:', error);
    req.flash('red', error.message || 'Something went wrong!');
    res.redirect('/admin/sub-admin/list');
  }
};

/// delete sub admin
exports.deleteSubAdmin = async (req, res) => {
  try {
    console.log('Deleting sub-admin ID:', req.params.id);

    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      req.flash('red', 'Sub Admin not found!');
      return res.redirect('/admin/sub-admin/list');
    }

    if (admin.role === 'S') {
      req.flash('red', 'Cannot delete Super Admin!');
      return res.redirect('/admin/sub-admin/list');
    }

    await Admin.findByIdAndDelete(req.params.id);
    await Session.deleteMany({ adminId: req.params.id });
    await RefreshToken.deleteMany({ userId: req.params.id });

    req.flash('green', 'Sub Admin deleted successfully!');
    res.redirect('/admin/sub-admin/list');

  } catch (error) {
    console.error('Delete Sub Admin Error:', error);
    req.flash('red', 'Failed to delete sub admin');
    res.redirect('/admin/sub-admin/list');
  }
};