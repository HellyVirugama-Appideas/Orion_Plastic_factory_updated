// const { validationErrorResponse } = require('../utils/responseHelper');

// // Validate email format
// exports.validateEmail = (req, res, next) => {
//   const { email } = req.body;
//   const emailRegex = /^\S+@\S+\.\S+$/;
  
//   if (!email || !emailRegex.test(email)) {
//     return validationErrorResponse(res, ['Invalid email format']);
//   }
//   next();
// };

// // Validate phone number
// exports.validatePhone = (req, res, next) => {
//   const { phone } = req.body;
//   const phoneRegex = /^[0-9]{10}$/;
  
//   if (!phone || !phoneRegex.test(phone)) {
//     return validationErrorResponse(res, ['Invalid phone number. Must be 10 digits.']);
//   }
//   next();
// };

// // Validate password strength
// exports.validatePassword = (req, res, next) => {
//   const { password } = req.body;
  
//   if (!password || password.length < 6) {
//     return validationErrorResponse(res, ['Password must be at least 6 characters long']);
//   }
//   next();
// };

// // Validate PIN format
// exports.validatePin = (req, res, next) => {
//   const { pin } = req.body;
//   const pinRegex = /^\d{4}$/;
  
//   if (!pin || !pinRegex.test(pin)) {
//     return validationErrorResponse(res, ['PIN must be exactly 4 digits']);
//   }
//   next();
// };

// // Validate required fields
// exports.validateRequiredFields = (fields) => {
//   return (req, res, next) => {
//     const errors = [];
    
//     fields.forEach(field => {
//       if (!req.body[field]) {
//         errors.push(`${field} is required`);
//       }
//     });
    
//     if (errors.length > 0) {
//       return validationErrorResponse(res, errors);
//     }
    
//     next();
//   };
// };


const { validationErrorResponse } = require('../utils/responseHelper');

// Validate email format
exports.validateEmail = (req, res, next) => {
  const { email } = req.body;
  const emailRegex = /^\S+@\S+\.\S+$/;
  
  if (!email || !emailRegex.test(email)) {
    return validationErrorResponse(res, ['Invalid email format']);
  }
  next();
};

// Validate phone number
exports.validatePhone = (req, res, next) => {
  const { phone } = req.body;
  const phoneRegex = /^[0-9]{10}$/;
  
  if (!phone || !phoneRegex.test(phone)) {
    return validationErrorResponse(res, ['Invalid phone number. Must be 10 digits.']);
  }
  next();
};

// Validate password strength
exports.validatePassword = (req, res, next) => {
  const { password } = req.body;
  
  if (!password || password.length < 6) {
    return validationErrorResponse(res, ['Password must be at least 6 characters long']);
  }
  next();
};

// Validate PIN format (for single PIN field)
exports.validatePin = (req, res, next) => {
  const { pin } = req.body;
  const pinRegex = /^\d{4}$/;
  
  if (!pin || !pinRegex.test(pin)) {
    return validationErrorResponse(res, ['PIN must be exactly 4 digits']);
  }
  next();
};

// Validate Change PIN (for currentPin and newPin)
exports.validateChangePin = (req, res, next) => {
  const { currentPin, newPin } = req.body;
  const pinRegex = /^\d{4}$/;
  
  const errors = [];
  
  if (!currentPin) {
    errors.push('Current PIN is required');
  } else if (!pinRegex.test(currentPin)) {
    errors.push('Current PIN must be exactly 4 digits');
  }
  
  if (!newPin) {
    errors.push('New PIN is required');
  } else if (!pinRegex.test(newPin)) {
    errors.push('New PIN must be exactly 4 digits');
  }
  
  if (errors.length > 0) {
    return validationErrorResponse(res, errors);
  }
  
  next();
};

// Validate Reset PIN (for phone, resetToken, newPin)
exports.validateResetPin = (req, res, next) => {
  const { phone, resetToken, newPin } = req.body;
  const pinRegex = /^\d{4}$/;
  const phoneRegex = /^[0-9]{10}$/;
  
  const errors = [];
  
  if (!phone) {
    errors.push('Phone number is required');
  } else if (!phoneRegex.test(phone)) {
    errors.push('Phone number must be 10 digits');
  }
  
  if (!resetToken) {
    errors.push('Reset token is required');
  }
  
  if (!newPin) {
    errors.push('New PIN is required');
  } else if (!pinRegex.test(newPin)) {
    errors.push('New PIN must be exactly 4 digits');
  }
  
  if (errors.length > 0) {
    return validationErrorResponse(res, errors);
  }
  
  next();
};

// Validate required fields
exports.validateRequiredFields = (fields) => {
  return (req, res, next) => {
    const errors = [];
    
    fields.forEach(field => {
      if (!req.body[field]) {
        errors.push(`${field} is required`);
      }
    });
    
    if (errors.length > 0) {
      return validationErrorResponse(res, errors);
    }
    
    next();
  };
};
// Validate license number format
exports.validateLicenseNumber = (req, res, next) => {
  const { licenseNumber } = req.body;
  
  if (!licenseNumber) {
    return next();
  }

  // Basic validation - adjust regex based on your country's format
  if (licenseNumber.length < 8 || licenseNumber.length > 20) {
    return errorResponse(res, 'Invalid license number format', 400);
  }

  next();
};