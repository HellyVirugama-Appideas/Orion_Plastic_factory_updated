const Expense = require('../../models/Expense');
const Driver = require('../../models/Driver');
const Journey = require('../../models/Journey');
const Delivery = require('../../models/Delivery');

// ==================== FUEL EXPENSES ====================

// GET PREVIOUS METER READING 
exports.getPreviousMeterReading = async (req, res) => {
  try {
    const { vehicleNumber } = req.query;

    const driver = await Driver.findById(req.user._id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    // Get last expense for this vehicle
    const lastExpense = await Expense.findOne({
      driver: driver._id,
      'vehicle.vehicleNumber': vehicleNumber,
      expenseType: 'fuel'
    }).sort({ 'meterReading.current': -1 });

    const previousMeterReading = lastExpense ? lastExpense.meterReading.current : 0;

    res.status(200).json({
      success: true,
      data: {
        previousMeterReading,
        vehicleNumber,
        lastExpenseDate: lastExpense ? lastExpense.expenseDate : null
      }
    });

  } catch (error) {
    console.error('Get previous meter reading error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch previous meter reading',
      error: error.message
    });
  }
};

// exports.createFuelExpense = async (req, res) => {
//   try {
//     // 1. Form-data se saare fields safely lete hain
//     const fuelQuantityStr     = req.body.fuelQuantity;
//     const pricePerLitreStr    = req.body.pricePerLitre;
//     const totalFuelCostStr    = req.body.totalFuelCost;
//     const currentMeterReadingStr = req.body.currentMeterReading;
//     const fuelType            = req.body.fuelType || 'petrol';
//     const stationName         = req.body.stationName || '';
//     const stationAddress      = req.body.stationAddress || '';
//     const stationLatitudeStr  = req.body.stationLatitude;
//     const stationLongitudeStr = req.body.stationLongitude;
//     const description         = req.body.description || '';
//     const category            = req.body.category || 'operational';
//     const journeyId           = req.body.journeyId || null;
//     const deliveryId          = req.body.deliveryId || null;
//     const expenseDate         = req.body.expenseDate;
//     const expenseTime         = req.body.expenseTime;

//     const files = req.files || {};

//     // 2. Required numeric fields validation
//     const fuelQuantity       = fuelQuantityStr ? parseFloat(fuelQuantityStr) : NaN;
//     const pricePerLitre      = pricePerLitreStr ? parseFloat(pricePerLitreStr) : NaN;
//     const currentMeterReading = currentMeterReadingStr ? parseFloat(currentMeterReadingStr) : NaN;

//     if (isNaN(fuelQuantity) || fuelQuantity <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Fuel quantity is required and must be a positive number'
//       });
//     }

//     if (isNaN(pricePerLitre) || pricePerLitre <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Price per litre is required and must be a positive number'
//       });
//     }

//     if (isNaN(currentMeterReading) || currentMeterReading < 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Current meter reading is required and must be valid'
//       });
//     }

//     // 3. Get logged-in driver from token
//     const driver = await Driver.findById(req.user._id);
//     if (!driver) {
//       return res.status(404).json({
//         success: false,
//         message: 'Driver profile not found'
//       });
//     }

//     // 4. Vehicle number automatically driver profile se le lo
//     if (!driver.vehicleNumber) {
//       return res.status(400).json({
//         success: false,
//         message: 'No vehicle number found in your profile. Please update your profile first.'
//       });
//     }

//     const vehicleNumber = driver.vehicleNumber.toString().trim().toUpperCase();

//     // 5. Previous meter reading (same vehicle ke liye)
//     const lastExpense = await Expense.findOne({
//       driver: driver._id,
//       'vehicle.vehicleNumber': vehicleNumber,
//       expenseType: 'fuel'
//     }).sort({ 'meterReading.current': -1 }).select('meterReading.current');

//     const previousMeterReading = lastExpense ? lastExpense.meterReading.current : 0;

//     // 6. Total cost calculate karo
//     const calculatedTotal = parseFloat((fuelQuantity * pricePerLitre).toFixed(2));
//     const finalTotalCost = totalFuelCostStr ? parseFloat(totalFuelCostStr) : calculatedTotal;

//     // 7. Date handling
//     let finalExpenseDate = new Date();
//     if (expenseDate) {
//       const timePart = expenseTime ? expenseTime : '00:00';
//       const dateTimeStr = `${expenseDate}T${timePart}:00`;
//       finalExpenseDate = new Date(dateTimeStr);
//       if (isNaN(finalExpenseDate.getTime())) {
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid date/time format. Use YYYY-MM-DD and optional HH:MM'
//         });
//       }
//     }

//     // 8. Expense create karo
//     const expense = new Expense({
//       expenseType: 'fuel',
//       driver: driver._id,
//       vehicle: {
//         vehicleNumber,
//         model: driver.vehicleModel || 'N/A'
//       },
//       journey: journeyId,
//       delivery: deliveryId,
//       fuelDetails: {
//         quantity: fuelQuantity,
//         pricePerLitre: pricePerLitre,
//         totalFuelCost: finalTotalCost,
//         fuelType,
//         stationName,
//         stationAddress,
//         stationLocation: {
//           latitude: stationLatitudeStr ? parseFloat(stationLatitudeStr) : null,
//           longitude: stationLongitudeStr ? parseFloat(stationLongitudeStr) : null
//         }
//       },
//       meterReading: {
//         current: currentMeterReading,
//         previous: previousMeterReading,
//         difference: currentMeterReading - previousMeterReading
//       },
//       description,
//       category,
//       approvalWorkflow: {
//         submittedBy: driver._id,
//         submittedAt: new Date()
//       },
//       expenseDate: finalExpenseDate
//     });

//     // 9. File handling
//     const uploadedReceipts = [];

//     if (files.fuel_receipt?.[0]) {
//       uploadedReceipts.push({
//         type: 'fuel_receipt',
//         url: `/uploads/expenses/${files.fuel_receipt[0].filename}`,
//         filename: files.fuel_receipt[0].filename
//       });
//     }

//     if (files.meter_photo?.[0]) {
//       uploadedReceipts.push({
//         type: 'meter_photo',
//         url: `/uploads/expenses/${files.meter_photo[0].filename}`,
//         filename: files.meter_photo[0].filename
//       });
//     }

//     if (files.payment_receipt?.[0]) {
//       if (!expense.paymentReceiptPhoto) expense.paymentReceiptPhoto = [];
//       expense.paymentReceiptPhoto.push({
//         url: `/uploads/expenses/${files.payment_receipt[0].filename}`,
//         filename: files.payment_receipt[0].filename
//       });
//     }

//     if (uploadedReceipts.length > 0) {
//       expense.receipts = uploadedReceipts;
//     }

//     // 10. Save & response
//     await expense.save();
//     await expense.populate('driver', 'name phone vehicleNumber');

//     // 11. Frontend ko vehicle number bhej dete hain (pre-filled ke liye useful)
//     res.status(201).json({
//       success: true,
//       message: 'Fuel expense created successfully!',
//       data: {
//         expense,
//         vehicleNumber,              
        
//         totalAmount: finalTotalCost,
//         receiptsUploaded: uploadedReceipts.length,
//         nextStep: uploadedReceipts.length > 0 ? 'submitted' : 'uploadReceipts',
//         uploadMoreUrl: `/api/driver/expenses/${expense._id}/receipts`
//       }
//     });

//   } catch (error) {
//     console.error('Create fuel expense error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to create fuel expense',
//       error: error.message
//     });
//   }
// };   

exports.createFuelExpense = async (req, res) => {
  try {
    // 1. Form-data se saare fields safely lete hain
    const fuelQuantityStr     = req.body.fuelQuantity;
    const pricePerLitreStr    = req.body.pricePerLitre;
    const totalFuelCostStr    = req.body.totalFuelCost;
    const currentMeterReadingStr = req.body.currentMeterReading;
    const fuelType            = req.body.fuelType || 'petrol';
    const stationName         = req.body.stationName || '';
    const stationAddress      = req.body.stationAddress || '';
    const stationLatitudeStr  = req.body.stationLatitude;
    const stationLongitudeStr = req.body.stationLongitude;
    const description         = req.body.description || '';
    const category            = req.body.category || 'operational';
    const journeyId           = req.body.journeyId || null;
    const deliveryId          = req.body.deliveryId || null;

    // NEW: Date & Time fields (same as vehicle expense)
    const expenseDate         = req.body.expenseDate;     // e.g. "2025-12-30" or "2025/12/30"
    const expenseTime         = req.body.expenseTime;     // e.g. "14:30" or "14:30:00"

    const files = req.files || {};

    // 2. Required numeric fields validation
    const fuelQuantity       = fuelQuantityStr ? parseFloat(fuelQuantityStr) : NaN;
    const pricePerLitre      = pricePerLitreStr ? parseFloat(pricePerLitreStr) : NaN;
    const currentMeterReading = currentMeterReadingStr ? parseFloat(currentMeterReadingStr) : NaN;

    if (isNaN(fuelQuantity) || fuelQuantity <= 0) {
      return res.status(400).json({ success: false, message: 'Fuel quantity is required and must be a positive number' });
    }

    if (isNaN(pricePerLitre) || pricePerLitre <= 0) {
      return res.status(400).json({ success: false, message: 'Price per litre is required and must be a positive number' });
    }

    if (isNaN(currentMeterReading) || currentMeterReading < 0) {
      return res.status(400).json({ success: false, message: 'Current meter reading is required and must be valid' });
    }

    // 3. Get logged-in driver
    const driver = await Driver.findById(req.user._id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    if (!driver.vehicleNumber) {
      return res.status(400).json({
        success: false,
        message: 'No vehicle number found in your profile. Please update your profile first.'
      });
    }

    const vehicleNumber = driver.vehicleNumber.toString().trim().toUpperCase();

    // 4. Previous meter reading
    const lastExpense = await Expense.findOne({
      driver: driver._id,
      'vehicle.vehicleNumber': vehicleNumber,
      expenseType: 'fuel'
    }).sort({ 'meterReading.current': -1 }).select('meterReading.current');

    const previousMeterReading = lastExpense ? lastExpense.meterReading.current : 0;

    // 5. Total cost
    const calculatedTotal = parseFloat((fuelQuantity * pricePerLitre).toFixed(2));
    const finalTotalCost = totalFuelCostStr ? parseFloat(totalFuelCostStr) : calculatedTotal;

    // 6. IMPROVED DATE HANDLING (same as createVehicleExpense)
    let finalExpenseDate = new Date();

    if (expenseDate) {
      try {
        let cleanDate = (expenseDate || '').trim();
        let cleanTime = (expenseTime || '00:00').trim();

        // Normalize slashes → dashes
        cleanDate = cleanDate.replace(/\//g, '-');

        // Add seconds if time is HH:MM format
        if (cleanTime.length === 5 && cleanTime.includes(':')) {
          cleanTime += ':00';
        }

        const dateTimeStr = `${cleanDate}T${cleanTime}`;

        // Debug logs (remove in production if not needed)
        console.log('[FUEL DATE DEBUG] Raw:', expenseDate, expenseTime);
        console.log('[FUEL DATE DEBUG] Cleaned:', cleanDate, cleanTime);
        console.log('[FUEL DATE DEBUG] Final string:', dateTimeStr);

        finalExpenseDate = new Date(dateTimeStr);

        if (isNaN(finalExpenseDate.getTime())) {
          throw new Error('Invalid date after parsing');
        }
      } catch (err) {
        console.error('[FUEL DATE ERROR]', err.message);
        return res.status(400).json({
          success: false,
          message: 'Invalid date/time format. Use: 2025-12-30 and 14:30 (or 2025/12/30 also accepted)'
        });
      }
    }

    // 7. Create expense document
    const expense = new Expense({
      expenseType: 'fuel',
      driver: driver._id,
      vehicle: {
        vehicleNumber,
        model: driver.vehicleModel || 'N/A'
      },
      journey: journeyId,
      delivery: deliveryId,
      fuelDetails: {
        quantity: fuelQuantity,
        pricePerLitre,
        totalFuelCost: finalTotalCost,
        fuelType,
        stationName,
        stationAddress,
        stationLocation: {
          latitude: stationLatitudeStr ? parseFloat(stationLatitudeStr) : null,
          longitude: stationLongitudeStr ? parseFloat(stationLongitudeStr) : null
        }
      },
      meterReading: {
        current: currentMeterReading,
        previous: previousMeterReading,
        difference: currentMeterReading - previousMeterReading
      },
      description,
      category,
      approvalWorkflow: {
        submittedBy: driver._id,
        submittedAt: new Date()
      },
      expenseDate: finalExpenseDate
    });

    // 8. File handling (same as before)
    const uploadedReceipts = [];

    if (files.fuel_receipt?.[0]) {
      uploadedReceipts.push({
        type: 'fuel_receipt',
        url: `/uploads/expenses/${files.fuel_receipt[0].filename}`,
        filename: files.fuel_receipt[0].filename
      });
    }

    if (files.meter_photo?.[0]) {
      uploadedReceipts.push({
        type: 'meter_photo',
        url: `/uploads/expenses/${files.meter_photo[0].filename}`,
        filename: files.meter_photo[0].filename
      });
    }

    if (files.payment_receipt?.[0]) {
      expense.paymentReceiptPhoto = expense.paymentReceiptPhoto || [];
      expense.paymentReceiptPhoto.push({
        url: `/uploads/expenses/${files.payment_receipt[0].filename}`,
        filename: files.payment_receipt[0].filename
      });
    }

    if (uploadedReceipts.length > 0) {
      expense.receipts = uploadedReceipts;
    }

    // 9. Save & populate
    await expense.save();
    await expense.populate('driver', 'name phone vehicleNumber');

    // 10. Response (same format)
    res.status(201).json({
      success: true,
      message: 'Fuel expense created successfully!',
      data: {
        expense,
        vehicleNumber,
        totalAmount: finalTotalCost,
        receiptsUploaded: uploadedReceipts.length,
        nextStep: uploadedReceipts.length > 0 ? 'submitted' : 'uploadReceipts',
        uploadMoreUrl: `/api/driver/expenses/${expense._id}/receipts`,
        // Bonus: return formatted date & time for frontend
        expenseDate: finalExpenseDate.toISOString().split('T')[0],          // YYYY-MM-DD
        expenseTime: finalExpenseDate.toTimeString().split(' ')[0].substring(0, 5)  // HH:MM
      }
    });

  } catch (error) {
    console.error('Create fuel expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create fuel expense',
      error: error.message
    });
  }
};

// exports.createVehicleExpense = async (req, res) => {
//   try {
//     const expenseAmountStr   = req.body.expenseAmount;
//     const expenseType        = req.body.expenseType || 'maintenance';
//     const additionalNotes    = req.body.additionalNotes || '';
//     const description        = req.body.description || '';
//     const category           = req.body.category || 'operational';
//     const journeyId          = req.body.journeyId || null;
//     const deliveryId         = req.body.deliveryId || null;
//     const expenseDate        = req.body.expenseDate;         // YYYY/MM/DD or YYYY-MM-DD
//     const expenseTime        = req.body.expenseTime;         // HH:MM or HH:MM:SS

//     const files = req.files || {};

//     const expenseAmount = expenseAmountStr ? parseFloat(expenseAmountStr) : NaN;

//     // Basic amount validation
//     if (isNaN(expenseAmount) || expenseAmount <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Expense amount is required and must be greater than 0'
//       });
//     }

//     // Find driver
//     const driver = await Driver.findById(req.user._id);
//     if (!driver) {
//       return res.status(404).json({
//         success: false,
//         message: 'Driver profile not found'
//       });
//     }

//     if (!driver.vehicleNumber) {
//       return res.status(400).json({
//         success: false,
//         message: 'No vehicle number found in your profile. Please update profile first.'
//       });
//     }

//     const vehicleNumber = driver.vehicleNumber.toString().trim().toUpperCase();

//     // ========== DATE HANDLING ==========
//     let finalExpenseDate = new Date();

//     if (expenseDate) {
//       try {
//         let cleanDate = (expenseDate || '').trim();
//         let cleanTime = (expenseTime || '00:00').trim();

//         // Normalize slashes → dashes
//         cleanDate = cleanDate.replace(/\//g, '-');

//         // Add seconds if missing
//         if (cleanTime.length === 5 && cleanTime.includes(':')) {
//           cleanTime += ':00';
//         }

//         const dateTimeStr = `${cleanDate}T${cleanTime}`;
        
//         console.log('[DATE DEBUG] Raw:', expenseDate, expenseTime);
//         console.log('[DATE DEBUG] Cleaned:', cleanDate, cleanTime);
//         console.log('[DATE DEBUG] Final string:', dateTimeStr);

//         finalExpenseDate = new Date(dateTimeStr);

//         if (isNaN(finalExpenseDate.getTime())) {
//           throw new Error('Invalid date after parsing');
//         }

//       } catch (err) {
//         console.error('[DATE ERROR]', err.message);
//         return res.status(400).json({
//           success: false,
//           message: `Invalid date/time format. Use: 2025-12-25 and 17:00 (or 2025/12/25 also accepted)`
//         });
//       }
//     }

//     // ========== CREATE EXPENSE DOCUMENT ==========
//     const expense = new Expense({
//       expenseType: expenseType || 'vehicle',
//       driver: driver._id,

//       vehicle: {
//         vehicleNumber,
//         model: driver.vehicleModel || 'N/A'
//       },

//       journey: journeyId,
//       delivery: deliveryId,

//       vehicleExpenseDetails: {
//         expenseAmount,
//         expenseType,
//         additionalNotes
//       },

//       description,
//       category,

//       approvalWorkflow: {
//         submittedBy: driver._id,
//         submittedAt: new Date()
//       },

//       expenseDate: finalExpenseDate,

//       // meterReading field is completely removed
//     });

//     // ========== FILE HANDLING ==========
//     const uploadedReceipts = [];

//     if (files.expense_bill?.[0]) {
//       uploadedReceipts.push({
//         type: 'expense_bill',
//         url: `/uploads/expenses/${files.expense_bill[0].filename}`,
//         filename: files.expense_bill[0].filename
//       });
//     }

//     if (uploadedReceipts.length > 0) {
//       expense.receipts = uploadedReceipts;
//     }

//     // ========== SAVE & RESPONSE ==========
//     await expense.save();
//     await expense.populate('driver', 'name phone vehicleNumber');

//     res.status(201).json({
//       success: true,
//       message: 'Vehicle expense created successfully!',
//       data: {
//         expense,
//         vehicleNumber,
//         expenseAmount,
//         expenseDate: finalExpenseDate.toISOString().split('T')[0], // YYYY-MM-DD
//         expenseTime: finalExpenseDate.toTimeString().split(' ')[0].substring(0, 5), // HH:MM
//         receiptsUploaded: uploadedReceipts.length,
//         nextStep: uploadedReceipts.length > 0 ? 'submitted' : 'uploadReceipts',
//         uploadMoreUrl: `/api/driver/expenses/${expense._id}/receipts`
//       }
//     });

//   } catch (error) {
//     console.error('Create vehicle expense error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to create vehicle expense',
//       error: error.message
//     });
//   }
// };


// exports.createVehicleExpense = async (req, res) => {
//   try {
//     const {
//       expenseAmount: expenseAmountStr,
//       expenseType = 'maintenance', // Default value
//       additionalNotes = '',
//       description = '',
//       category = 'operational',
//       journeyId = null,
//       deliveryId = null,
//       expenseDate,
//       expenseTime
//     } = req.body;

//     const files = req.files || {};

//     // Parse amount
//     const expenseAmount = expenseAmountStr ? parseFloat(expenseAmountStr) : NaN;

//     if (isNaN(expenseAmount) || expenseAmount <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Expense amount is required and must be greater than 0'
//       });
//     }

//     // Find driver
//     const driver = await Driver.findById(req.user._id);
//     if (!driver) {
//       return res.status(404).json({
//         success: false,
//         message: 'Driver profile not found'
//       });
//     }

//     if (!driver.vehicleNumber) {
//       return res.status(400).json({
//         success: false,
//         message: 'No vehicle number found in your profile. Please update profile first.'
//       });
//     }

//     const vehicleNumber = driver.vehicleNumber.toString().trim().toUpperCase();

//     // ========== DATE HANDLING ==========
//     let finalExpenseDate = new Date();

//     if (expenseDate) {
//       try {
//         let cleanDate = (expenseDate || '').trim();
//         let cleanTime = (expenseTime || '00:00').trim();

//         // Normalize slashes → dashes
//         cleanDate = cleanDate.replace(/\//g, '-');

//         // Add seconds if missing
//         if (cleanTime.length === 5 && cleanTime.includes(':')) {
//           cleanTime += ':00';
//         }

//         const dateTimeStr = `${cleanDate}T${cleanTime}`;

//         console.log('[DATE DEBUG] Raw:', expenseDate, expenseTime);
//         console.log('[DATE DEBUG] Cleaned:', cleanDate, cleanTime);
//         console.log('[DATE DEBUG] Final string:', dateTimeStr);

//         finalExpenseDate = new Date(dateTimeStr);

//         if (isNaN(finalExpenseDate.getTime())) {
//           throw new Error('Invalid date after parsing');
//         }
//       } catch (err) {
//         console.error('[DATE ERROR]', err.message);
//         return res.status(400).json({
//           success: false,
//           message: `Invalid date/time format. Use: 2025-12-25 and 17:00 (or 2025/12/25 also accepted)`
//         });
//       }
//     }

//     // ========== VALIDATE EXPENSE TYPE ==========
//     const validExpenseTypes = [
//       'maintenance',      // From your dropdown
//       'general',          // From your dropdown
//       'washing',          // From your dropdown
//       'other',            // From your dropdown
//       'fuel',             // Common in trucking
//       'toll',             // Very common in India
//       'repair',           // Common
//       'parking',          // Common
//       'insurance'         // Optional
//     ];

//     if (!validExpenseTypes.includes(expenseType)) {
//       return res.status(400).json({
//         success: false,
//         message: `Invalid expense type. Valid options: ${validExpenseTypes.join(', ')}`
//       });
//     }

//     // ========== CREATE EXPENSE DOCUMENT ==========
//     const expense = new Expense({
//       expenseType,  // Now comes from dropdown (validated)
//       driver: driver._id,

//       vehicle: {
//         vehicleNumber,
//         model: driver.vehicleModel || 'N/A'
//       },

//       journey: journeyId,
//       delivery: deliveryId,

//       vehicleExpenseDetails: {
//         expenseAmount,
//         expenseType,          // Sub-type (same as main expenseType here)
//         additionalNotes
//       },

//       description,
//       category,

//       approvalWorkflow: {
//         submittedBy: driver._id,
//         submittedAt: new Date()
//       },

//       expenseDate: finalExpenseDate
//     });

//     // ========== FILE HANDLING ==========
//     const uploadedReceipts = [];

//     if (files.expense_bill?.[0]) {
//       uploadedReceipts.push({
//         type: 'expense_bill',
//         url: `/uploads/expenses/${files.expense_bill[0].filename}`,
//         filename: files.expense_bill[0].filename
//       });
//     }

//     if (uploadedReceipts.length > 0) {
//       expense.receipts = uploadedReceipts;
//     }

//     // ========== SAVE & RESPONSE ==========
//     await expense.save();
//     await expense.populate('driver', 'name phone vehicleNumber');

//     res.status(201).json({
//       success: true,
//       message: 'Vehicle expense created successfully!',
//       data: {
//         expense,
//         vehicleNumber,
//         expenseAmount,
//         expenseDate: finalExpenseDate.toISOString().split('T')[0], // YYYY-MM-DD
//         expenseTime: finalExpenseDate.toTimeString().split(' ')[0].substring(0, 5), // HH:MM
//         receiptsUploaded: uploadedReceipts.length,
//         nextStep: uploadedReceipts.length > 0 ? 'submitted' : 'uploadReceipts',
//         uploadMoreUrl: `/api/driver/expenses/${expense._id}/receipts`
//       }
//     });

//   } catch (error) {
//     console.error('Create vehicle expense error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to create vehicle expense',
//       error: error.message
//     });
//   }
// };
// ==================== FILE UPLOADS ====================

// UPLOAD RECEIPTS & PHOTOS (Steps 5, 6, 7 of Add Expense forms)

exports.createVehicleExpense = async (req, res) => {
  try {
    const {
      expenseAmount: expenseAmountStr,
      subCategory = 'maintenance',         // ← NEW: this comes from dropdown
      additionalNotes = '',
      description = '',
      category = 'operational',
      journeyId = null,
      deliveryId = null,
      expenseDate,
      expenseTime
    } = req.body;

    const files = req.files || {};

    const expenseAmount = expenseAmountStr ? parseFloat(expenseAmountStr) : NaN;

    if (isNaN(expenseAmount) || expenseAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Expense amount is required and must be greater than 0'
      });
    }

    // Validate subCategory
    const validSubCategories = [
      'maintenance', 'repair', 'washing', 'toll', 
      'parking', 'insurance', 'general', 'other'
    ];

    if (!validSubCategories.includes(subCategory)) {
      return res.status(400).json({
        success: false,
        message: `Invalid sub-category. Valid options: ${validSubCategories.join(', ')}`
      });
    }

    const driver = await Driver.findById(req.user._id);
    if (!driver || !driver.vehicleNumber) {
      return res.status(400).json({
        success: false,
        message: 'Driver or vehicle number not found. Update profile first.'
      });
    }

    const vehicleNumber = driver.vehicleNumber.toString().trim().toUpperCase();

    // Date handling (same as before)
    let finalExpenseDate = new Date();
    if (expenseDate) {
      try {
        let cleanDate = (expenseDate || '').trim().replace(/\//g, '-');
        let cleanTime = (expenseTime || '00:00').trim();
        if (cleanTime.length === 5) cleanTime += ':00';
        finalExpenseDate = new Date(`${cleanDate}T${cleanTime}`);
        if (isNaN(finalExpenseDate.getTime())) throw new Error();
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Invalid date/time. Use format: 2025-12-30 and 14:30'
        });
      }
    }

    const expense = new Expense({
      expenseType: 'vehicle',                    // ← FIXED: always 'vehicle'
      subCategory,                               // ← NEW: main differentiator
      driver: driver._id,
      vehicle: {
        vehicleNumber,
        model: driver.vehicleModel || 'N/A'
      },
      journey: journeyId,
      delivery: deliveryId,
      vehicleExpenseDetails: {
        expenseAmount,
        expenseType: subCategory,                // keep for backward compatibility
        additionalNotes
      },
      description,
      category,
      approvalWorkflow: {
        submittedBy: driver._id,
        submittedAt: new Date()
      },
      expenseDate: finalExpenseDate
    });

    // File handling (same)
    const uploadedReceipts = [];
    if (files.expense_bill?.[0]) {
      uploadedReceipts.push({
        type: 'expense_bill',
        url: `/uploads/expenses/${files.expense_bill[0].filename}`,
        filename: files.expense_bill[0].filename
      });
    }
    if (uploadedReceipts.length) expense.receipts = uploadedReceipts;

    await expense.save();
    await expense.populate('driver', 'name phone vehicleNumber');

    res.status(201).json({
      success: true,
      message: 'Vehicle expense created successfully!',
      data: {
        expense,
        vehicleNumber,
        subCategory,                      // show which type was selected
        expenseAmount,
        expenseDate: finalExpenseDate.toISOString().split('T')[0],
        expenseTime: finalExpenseDate.toTimeString().split(' ')[0].substring(0, 5)
      }
    });

  } catch (error) {
    console.error('Create vehicle expense error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};


exports.uploadReceipts = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const files = req.files;

    if (!files || Object.keys(files).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    const driver = await Driver.findById(req.user._id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    if (expense.driver.toString() !== driver._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only upload receipts for your own expenses'
      });
    }

    const uploadedReceipts = [];

    // Step 5: Fuel Receipt Photo (for fuel expenses)
    if (files.fuel_receipt && files.fuel_receipt[0]) {
      uploadedReceipts.push({
        type: 'fuel_receipt',
        url: `/uploads/expenses/${files.fuel_receipt[0].filename}`,
        filename: files.fuel_receipt[0].filename
      });
    }

    // Step 5: Meter Reading Photo
    if (files.meter_photo && files.meter_photo[0]) {
      uploadedReceipts.push({
        type: 'meter_photo',
        url: `/uploads/expenses/${files.meter_photo[0].filename}`,
        filename: files.meter_photo[0].filename
      });
    }

    // Expense Bill (for vehicle expenses)
    if (files.expense_bill && files.expense_bill[0]) {
      uploadedReceipts.push({
        type: 'expense_bill',
        url: `/uploads/expenses/${files.expense_bill[0].filename}`,
        filename: files.expense_bill[0].filename
      });
    }

    // Step 7: Payment Receipt Photo
    if (files.payment_receipt && files.payment_receipt[0]) {
      expense.paymentReceiptPhoto.push({
        url: `/uploads/expenses/${files.payment_receipt[0].filename}`,
        filename: files.payment_receipt[0].filename
      });
    }


    // Add receipts to array
    expense.receipts = [...expense.receipts, ...uploadedReceipts];
    await expense.save();
    await expense.populate('driver', 'name phone vehicleNumber');

    return res.status(200).json({
      success: true,
      message: 'Files uploaded successfully! Your expense is now submitted for approval.',
      data: {
        expenseId: expense._id,
        uploadedReceipts,
        totalReceipts: expense.receipts.length,
        browseUploadFiles: expense.browseUploadFiles.length,
        paymentReceiptPhoto: expense.paymentReceiptPhoto.length,
        status: expense.approvalStatus
      }
    });

  } catch (error) {
    console.error('Upload receipts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload files',
      error: error.message
    });
  }
};

// ==================== GET EXPENSES ====================

// GET MY EXPENSES - With tab filters (All, Fuel, Maintenance, Vehicle)
// exports.getMyExpenses = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 20,
//       expenseType = 'all',  // Tab filter: 'all', 'fuel', 'maintenance', 'vehicle'
//       approvalStatus,
//       startDate,
//       endDate
//     } = req.query;

//     const driver = await Driver.findById(req.user._id);
//     if (!driver) {
//       return res.status(404).json({
//         success: false,
//         message: 'Driver profile not found'
//       });
//     }

//     const query = { driver: driver._id };

//     // Apply tab filter
//     if (expenseType && expenseType !== 'all') {
//       query.expenseType = expenseType;
//     }

//     if (approvalStatus) query.approvalStatus = approvalStatus;

//     if (startDate || endDate) {
//       query.expenseDate = {};
//       if (startDate) query.expenseDate.$gte = new Date(startDate);
//       if (endDate) query.expenseDate.$lte = new Date(endDate);
//     }

//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     const expenses = await Expense.find(query)
//       .populate('journey', 'startTime endTime distance')
//       .populate('delivery', 'trackingNumber orderId')
//       .sort({ expenseDate: -1 })
//       .skip(skip)
//       .limit(parseInt(limit));

//     // Format expenses to match UI cards
//     const formattedExpenses = expenses.map(exp => {
//       const baseData = {
//         _id: exp._id,
//         expenseType: exp.expenseType,
//         date: exp.expenseDate,
//         vehicle: exp.vehicle,
//         status: exp.approvalStatus,
//         meterReading: exp.meterReading.current
//       };

//       if (exp.expenseType === 'fuel') {
//         return {
//           ...baseData,
//           amount: exp.fuelDetails.totalFuelCost,
//           quantity: exp.fuelDetails.quantity,
//           stationName: exp.fuelDetails.stationName,
//           fuelType: exp.fuelDetails.fuelType,
//           mileage: exp.mileageData.averageMileage
//         };
//       } else {
//         return {
//           ...baseData,
//           amount: exp.vehicleExpenseDetails?.expenseAmount || 0,
//           notes: exp.vehicleExpenseDetails?.additionalNotes || exp.description
//         };
//       }
//     });

//     const total = await Expense.countDocuments(query);

//     // Statistics for all tabs
//     const stats = await Expense.aggregate([
//       { $match: { driver: driver._id } },
//       {
//         $group: {
//           _id: null,
//           totalExpenses: {
//             $sum: {
//               $cond: [
//                 { $eq: ['$expenseType', 'fuel'] },
//                 '$fuelDetails.totalFuelCost',
//                 '$vehicleExpenseDetails.expenseAmount'
//               ]
//             }
//           },
//           totalFuel: { $sum: '$fuelDetails.quantity' },
//           totalDistance: { $sum: '$mileageData.distanceCovered' },
//           avgMileage: { $avg: '$mileageData.averageMileage' },
//           totalRecords: { $sum: 1 },
//           pendingCount: {
//             $sum: { $cond: [{ $eq: ['$approvalStatus', 'pending'] }, 1, 0] }
//           },
//           approvedCount: {
//             $sum: { $cond: [{ $eq: ['$approvalStatus', 'approved_by_finance'] }, 1, 0] }
//           },
//           rejectedCount: {
//             $sum: { $cond: [{ $eq: ['$approvalStatus', 'rejected'] }, 1, 0] }
//           },
//           fuelCount: {
//             $sum: { $cond: [{ $eq: ['$expenseType', 'fuel'] }, 1, 0] }
//           },
//           maintenanceCount: {
//             $sum: { $cond: [{ $eq: ['$expenseType', 'maintenance'] }, 1, 0] }
//           },
//           vehicleCount: {
//             $sum: { $cond: [{ $in: ['$expenseType', ['vehicle', 'repair', 'toll', 'parking', 'other']] }, 1, 0] }
//           }
//         }
//       }
//     ]);

//     res.status(200).json({
//       success: true,
//       data: {
//         expenses: formattedExpenses,
//         pagination: {
//           total,
//           page: parseInt(page),
//           pages: Math.ceil(total / parseInt(limit)),
//           limit: parseInt(limit)
//         },
//         statistics: stats[0] || {},
//         activeFilter: expenseType
//       }
//     });

//   } catch (error) {
//     console.error('Get my expenses error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch expenses',
//       error: error.message
//     });
//   }
// };

// exports.getMyExpenses = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 20,
//       expenseType = 'all',          // 'all', 'fuel', 'maintenance', 'vehicle'
//       status,                       // common name used in frontend/postman
//       approvalStatus,               // optional - for backward compatibility
//       startDate,
//       endDate
//     } = req.query;

//     const driver = await Driver.findById(req.user._id);
//     if (!driver) {
//       return res.status(404).json({ success: false, message: 'Driver not found' });
//     }

//     const query = { driver: driver._id };

//     // 1. Expense Type Filter (Tabs)
//     if (expenseType && expenseType !== 'all') {
//       if (expenseType === 'vehicle') {
//         query.expenseType = { $in: ['vehicle', 'repair', 'toll', 'parking', 'washing', 'other', 'general', 'insurance'] };
//       } else if (expenseType === 'maintenance') {
//         query.expenseType = 'maintenance';
//       } else {
//         query.expenseType = expenseType;
//       }
//     }

//     // 2. Approval Status Filter (most important fix)
//     const finalStatus = status || approvalStatus;
//     if (finalStatus) {
//       if (finalStatus.toLowerCase() === 'Approved') {
//         // Show both types of approved status
//         query.approvalStatus = { $in: ['approved_by_admin', 'approved_by_finance'] };
//       } else {
//         // direct match: pending, rejected, resubmitted, etc.
//         query.approvalStatus = finalStatus;
//       }
//     }

//     // 3. Date Range Filter
//     if (startDate || endDate) {
//       query.expenseDate = {};
//       if (startDate) query.expenseDate.$gte = new Date(startDate);
//       if (endDate) query.expenseDate.$lte = new Date(endDate);
//     }

//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     // Fetch expenses
//     const expenses = await Expense.find(query)
//       .populate('journey', 'startTime endTime distance')
//       .populate('delivery', 'trackingNumber orderId')
//       .sort({ expenseDate: -1 })
//       .skip(skip)
//       .limit(parseInt(limit));

//     // Separate formatting
//     const fuelExpenses = [];
//     const vehicleExpenses = [];

//     expenses.forEach(exp => {
//       const base = {
//         _id: exp._id,
//         expenseType: exp.expenseType,
//         date: exp.expenseDate,
//         vehicle: exp.vehicle,
//         status: exp.approvalStatus,
//         meterReading: exp.meterReading?.current || null,
//         totalAmount: exp.totalAmount || 0, // using virtual
//       };

//       if (exp.expenseType === 'fuel') {
//         fuelExpenses.push({
//           ...base,
//           amount: exp.fuelDetails?.totalFuelCost || 0,
//           quantity: exp.fuelDetails?.quantity || 0,
//           stationName: exp.fuelDetails?.stationName || '',
//           fuelType: exp.fuelDetails?.fuelType || '',
//           mileage: exp.mileageData?.averageMileage || null,
//         });
//       } else {
//         // All other types go to vehicle/maintenance tab
//         vehicleExpenses.push({
//           ...base,
//           amount: exp.vehicleExpenseDetails?.expenseAmount || 0,
//           notes: exp.vehicleExpenseDetails?.additionalNotes || exp.description || '',
//           category: exp.expenseType,
//         });
//       }
//     });

//     // Total count for pagination (with all current filters applied)
//     const total = await Expense.countDocuments(query);

//     // Optional: Current tab counts (pending/approved/rejected)
//     const currentTabCounts = {
//       pending: await Expense.countDocuments({ ...query, approvalStatus: 'pending' }),
//       approved: await Expense.countDocuments({
//         ...query,
//         approvalStatus: { $in: ['approved_by_admin', 'approved_by_finance'] }
//       }),
//       rejected: await Expense.countDocuments({ ...query, approvalStatus: 'rejected' }),
//       resubmitted: await Expense.countDocuments({ ...query, approvalStatus: 'resubmitted' })
//     };

//     res.status(200).json({
//       success: true,
//       data: {
//         fuelExpenses,
//         vehicleExpenses,

//         // Combined for 'all' tab (sorted by date)
//         expenses: expenseType === 'all'
//           ? [...fuelExpenses, ...vehicleExpenses].sort((a, b) => new Date(b.date) - new Date(a.date))
//           : expenseType === 'fuel' ? fuelExpenses : vehicleExpenses,

//         pagination: {
//           total,
//           page: parseInt(page),
//           pages: Math.ceil(total / parseInt(limit)),
//           limit: parseInt(limit)
//         },

//         currentTabCounts,          // NEW: shows counts for current filter

//         activeFilter: expenseType,
//         activeStatus: finalStatus || 'all'
//       }
//     });

//   } catch (error) {
//     console.error('Get my expenses error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error',
//       error: error.message
//     });
//   }
// };

// GET EXPENSE BY ID - Detailed view matching detail screens

// exports.getMyExpenses = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 20,
//       expenseType = 'all',          // 'all', 'fuel', 'maintenance', 'vehicle'
//       status,                       // common name used in frontend/postman
//       approvalStatus,               // optional - for backward compatibility
//       startDate,
//       endDate
//     } = req.query;

//     const driver = await Driver.findById(req.user._id);
//     if (!driver) {
//       return res.status(404).json({ success: false, message: 'Driver not found' });
//     }

//     const query = { driver: driver._id };

//     // 1. Expense Type Filter (Tabs)
//     if (expenseType && expenseType !== 'all') {
//       if (expenseType === 'vehicle') {
//         query.expenseType = { $in: ['vehicle', 'repair', 'toll', 'parking', 'washing', 'other', 'general', 'insurance'] };
//       } else if (expenseType === 'maintenance') {
//         query.expenseType = 'maintenance';
//       } else {
//         query.expenseType = expenseType;
//       }
//     }

//     // 2. Approval Status Filter (most important fix)
//     const finalStatus = status || approvalStatus;
//     if (finalStatus) {
//       if (finalStatus.toLowerCase() === 'Approved') {
//         // Show both types of approved status
//         query.approvalStatus = { $in: ['approved_by_admin', 'approved_by_finance'] };
//       } else {
//         // direct match: pending, rejected, resubmitted, etc.
//         query.approvalStatus = finalStatus;
//       }
//     }

//     // 3. Date Range Filter
//     if (startDate || endDate) {
//       query.expenseDate = {};
//       if (startDate) query.expenseDate.$gte = new Date(startDate);
//       if (endDate) query.expenseDate.$lte = new Date(endDate);
//     }

//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     // Fetch expenses
//     const expenses = await Expense.find(query)
//       .populate('journey', 'startTime endTime distance')
//       .populate('delivery', 'trackingNumber orderId')
//       .sort({ expenseDate: -1 })
//       .skip(skip)
//       .limit(parseInt(limit));

//     // Separate formatting
//     const Fuel = [];
//     const Vehicle = [];

//     expenses.forEach(exp => {
//       const base = {
//         _id: exp._id,
//         expenseType: exp.expenseType,
//         date: exp.expenseDate,
//         vehicle: exp.vehicle,
//         status: exp.approvalStatus,
//         meterReading: exp.meterReading?.current || null,
//         totalAmount: exp.totalAmount || 0, // using virtual
//       };

//       if (exp.expenseType === 'fuel') {
//         Fuel.push({
//           ...base,
//           amount: exp.fuelDetails?.totalFuelCost || 0,
//           quantity: exp.fuelDetails?.quantity || 0,
//           stationName: exp.fuelDetails?.stationName || '',
//           fuelType: exp.fuelDetails?.fuelType || '',
//           mileage: exp.mileageData?.averageMileage || null,
//         });
//       } else {
//         // All other types go to vehicle/maintenance tab
//         Vehicle.push({
//           ...base,
//           amount: exp.vehicleExpenseDetails?.expenseAmount || 0,
//           notes: exp.vehicleExpenseDetails?.additionalNotes || exp.description || '',
//           category: exp.expenseType,
//         });
//       }
//     });

//     // Total count for pagination (with all current filters applied)
//     const total = await Expense.countDocuments(query);

//     // Optional: Current tab counts (pending/approved/rejected)
//     const currentTabCounts = {
//       pending: await Expense.countDocuments({ ...query, approvalStatus: 'pending' }),
//       approved: await Expense.countDocuments({
//         ...query,
//         approvalStatus: { $in: ['approved_by_admin', 'approved_by_finance'] }
//       }),
//       rejected: await Expense.countDocuments({ ...query, approvalStatus: 'rejected' }),
//       resubmitted: await Expense.countDocuments({ ...query, approvalStatus: 'resubmitted' })
//     };

//     res.status(200).json({
//       success: true,
//       data: {
//         Fuel,
//         Vehicle,

//         // Combined for 'all' tab (sorted by date)
//         expenses: expenseType === 'all'
//           ? [...Fuel, ...Vehicle].sort((a, b) => new Date(b.date) - new Date(a.date))
//           : expenseType === 'fuel' ? Fuel : Vehicle,

//         pagination: {
//           total,
//           page: parseInt(page),
//           pages: Math.ceil(total / parseInt(limit)),
//           limit: parseInt(limit)
//         },

//         currentTabCounts,          // NEW: shows counts for current filter

//         activeFilter: expenseType,
//         activeStatus: finalStatus || 'all'
//       }
//     });

//   } catch (error) {
//     console.error('Get my expenses error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error',
//       error: error.message
//     });
//   }
// };

exports.getMyExpenses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      expenseType = 'all',          // 'all', 'fuel', 'maintenance', 'vehicle'
      status,                       // common name used in frontend/postman
      approvalStatus,               // optional - for backward compatibility
      startDate,
      endDate
    } = req.query;

    const driver = await Driver.findById(req.user._id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const query = { driver: driver._id };

    // 1. Expense Type Filter (Tabs)
    if (expenseType && expenseType !== 'all') {
      if (expenseType === 'vehicle') {
        query.expenseType = { $in: ['vehicle', 'repair', 'toll', 'parking', 'washing', 'other', 'general', 'insurance'] };
      } else if (expenseType === 'maintenance') {
        query.expenseType = 'maintenance';
      } else {
        query.expenseType = expenseType;
      }
    }

    // 2. Approval Status Filter (most important fix)
    const finalStatus = status || approvalStatus;
    if (finalStatus) {
      if (finalStatus.toLowerCase() === 'Approved') {
        // Show both types of approved status
        query.approvalStatus = { $in: ['approved_by_admin', 'approved_by_finance'] };
      } else {
        // direct match: pending, rejected, resubmitted, etc.
        query.approvalStatus = finalStatus;
      }
    }

    // 3. Date Range Filter
    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(startDate);
      if (endDate) query.expenseDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch expenses
    const expenses = await Expense.find(query)
      .populate('journey', 'startTime endTime distance')
      .populate('delivery', 'trackingNumber orderId')
      .sort({ expenseDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Separate formatting
    const Fuel = [];
    const Vehicle = [];

    expenses.forEach(exp => {
      const capitalizedType = exp.expenseType.charAt(0).toUpperCase() + exp.expenseType.slice(1);
      const base = {
        _id: exp._id,
        expenseType: capitalizedType,
        date: exp.expenseDate,
        vehicle: exp.vehicle,
        status: exp.approvalStatus,
        meterReading: exp.meterReading?.current || null,
        totalAmount: exp.totalAmount || 0, // using virtual
      };

      if (exp.expenseType === 'fuel') {
        Fuel.push({
          ...base,
          amount: exp.fuelDetails?.totalFuelCost || 0,
          quantity: exp.fuelDetails?.quantity || 0,
          stationName: exp.fuelDetails?.stationName || '',
          fuelType: exp.fuelDetails?.fuelType || '',
          mileage: exp.mileageData?.averageMileage || null,
        });
      } else {
        // All other types go to vehicle/maintenance tab
        Vehicle.push({
          ...base,
          amount: exp.vehicleExpenseDetails?.expenseAmount || 0,
          notes: exp.vehicleExpenseDetails?.additionalNotes || exp.description || '',
          category: exp.expenseType,
        });
      }
    });

    // Total count for pagination (with all current filters applied)
    const total = await Expense.countDocuments(query);

    // Optional: Current tab counts (pending/approved/rejected)
    const currentTabCounts = {
      pending: await Expense.countDocuments({ ...query, approvalStatus: 'pending' }),
      approved: await Expense.countDocuments({
        ...query,
        approvalStatus: { $in: ['approved_by_admin', 'approved_by_finance'] }
      }),
      rejected: await Expense.countDocuments({ ...query, approvalStatus: 'rejected' }),
      resubmitted: await Expense.countDocuments({ ...query, approvalStatus: 'resubmitted' })
    };

    res.status(200).json({
      success: true,
      data: {
        Fuel,
        Vehicle,

        // Combined for 'all' tab (sorted by date)
        expenses: expenseType === 'all'
          ? [...Fuel, ...Vehicle].sort((a, b) => new Date(b.date) - new Date(a.date))
          : expenseType === 'fuel' ? Fuel : Vehicle,

        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit)
        },

        currentTabCounts,          // NEW: shows counts for current filter

        activeFilter: expenseType,
        activeStatus: finalStatus || 'all'
      }
    });

  } catch (error) {
    console.error('Get my expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


exports.getExpenseById = async (req, res) => {
  try {
    const { expenseId } = req.params;

    const driver = await Driver.findById(req.user._id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    const expense = await Expense.findOne({
      _id: expenseId,
      driver: driver._id
    })
      .populate('driver', 'name email phone vehicleNumber')
      .populate('journey', 'startTime endTime distance status')
      .populate('delivery', 'trackingNumber orderId status')
      .populate('approvalWorkflow.adminApproval.approvedBy', 'name')
      .populate('approvalWorkflow.financeApproval.approvedBy', 'name');

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Format response exactly as shown in detail screens
    const response = {
      _id: expense._id,
      expenseType: expense.expenseType,
      date: expense.expenseDate,
      status: expense.approvalStatus,

      // Vehicle info
      vehicle: expense.vehicle,
      driver: {
        name: expense.driver.name,
        phone: expense.driver.phone,
        vehicleNumber: expense.driver.vehicleNumber
      },

      // Conditional fields based on expense type
      ...(expense.expenseType === 'fuel' ? {
        // Fuel expense specific fields
        fuelQuantity: expense.fuelDetails.quantity,
        pricePerLitre: expense.fuelDetails.pricePerLitre,
        totalFuelCost: expense.fuelDetails.totalFuelCost,
        fuelType: expense.fuelDetails.fuelType,
        stationName: expense.fuelDetails.stationName,
        stationAddress: expense.fuelDetails.stationAddress,
        mileage: expense.mileageData.averageMileage,
        distanceCovered: expense.mileageData.distanceCovered,
      } : {
        // Vehicle expense specific fields
        expenseAmount: expense.vehicleExpenseDetails?.expenseAmount,
        additionalNotes: expense.vehicleExpenseDetails?.additionalNotes,
      }),

      // Meter reading (common for both)
      currentMeterReading: expense.meterReading.current,
      previousMeterReading: expense.meterReading.previous,
      meterReadingDifference: expense.meterReading.difference,

      // Files
      receipts: expense.receipts,
      browseUploadFiles: expense.browseUploadFiles,
      paymentReceiptPhoto: expense.paymentReceiptPhoto,

      // Approval details
      approvalWorkflow: expense.approvalWorkflow,
      rejectionReason: expense.rejectionReason,

      // Additional info
      description: expense.description,
      remarks: expense.remarks,
      category: expense.category,

      // References
      journey: expense.journey,
      delivery: expense.delivery,

      // Timestamps
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt
    };

    res.status(200).json({
      success: true,
      data: { expense: response }
    });

  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expense',
      error: error.message
    });
  }
};

// ==================== MILEAGE & ANALYTICS ====================

// CALCULATE MY MILEAGE 
exports.calculateMyMileage = async (req, res) => {
  try {
    const { vehicleNumber, startDate, endDate } = req.query;

    const driver = await Driver.findById(req.user._id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    const query = {
      driver: driver._id,
      expenseType: 'fuel'
    };

    if (vehicleNumber) query['vehicle.vehicleNumber'] = vehicleNumber;

    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(startDate);
      if (endDate) query.expenseDate.$lte = new Date(endDate);
    }

    const fuelExpenses = await Expense.find(query).sort({ expenseDate: 1 });

    if (fuelExpenses.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 refueling records required for mileage calculation'
      });
    }

    let totalDistance = 0;
    let totalFuel = 0;
    const mileageHistory = [];

    for (let i = 1; i < fuelExpenses.length; i++) {
      const current = fuelExpenses[i];
      const previous = fuelExpenses[i - 1];

      const distance = current.meterReading.current - previous.meterReading.current;
      const fuel = current.fuelDetails.quantity;

      if (distance > 0 && fuel > 0) {
        const mileage = (distance / fuel).toFixed(2);
        totalDistance += distance;
        totalFuel += fuel;

        mileageHistory.push({
          date: current.expenseDate,
          distance,
          fuel,
          mileage: parseFloat(mileage),
          meterReading: current.meterReading.current,
          stationName: current.fuelDetails.stationName
        });
      }
    }

    const averageMileage = totalFuel > 0 ? (totalDistance / totalFuel).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      data: {
        vehicleNumber: vehicleNumber || driver.vehicleNumber,
        totalDistance,
        totalFuel,
        averageMileage: parseFloat(averageMileage),
        unit: 'km/l',
        recordsCount: mileageHistory.length,
        mileageHistory
      }
    });

  } catch (error) {
    console.error('Calculate mileage error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate mileage',
      error: error.message
    });
  }
};

// GET MY EXPENSE SUMMARY
exports.getMyExpenseSummary = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    const driver = await Driver.findById(req.user._id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    const now = new Date();
    let startDate;

    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    const matchStage = {
      driver: driver._id,
      expenseDate: { $gte: startDate }
    };

    const summary = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalExpenses: {
            $sum: {
              $cond: [
                { $eq: ['$expenseType', 'fuel'] },
                '$fuelDetails.totalFuelCost',
                '$vehicleExpenseDetails.expenseAmount'
              ]
            }
          },
          totalRecords: { $sum: 1 },
          avgExpense: {
            $avg: {
              $cond: [
                { $eq: ['$expenseType', 'fuel'] },
                '$fuelDetails.totalFuelCost',
                '$vehicleExpenseDetails.expenseAmount'
              ]
            }
          },
          totalFuel: { $sum: '$fuelDetails.quantity' },
          totalDistance: { $sum: '$mileageData.distanceCovered' },
          avgMileage: { $avg: '$mileageData.averageMileage' }
        }
      }
    ]);

    const byType = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$expenseType',
          total: {
            $sum: {
              $cond: [
                { $eq: ['$expenseType', 'fuel'] },
                '$fuelDetails.totalFuelCost',
                '$vehicleExpenseDetails.expenseAmount'
              ]
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    const approvalStatus = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$approvalStatus',
          count: { $sum: 1 },
          totalAmount: {
            $sum: {
              $cond: [
                { $eq: ['$expenseType', 'fuel'] },
                '$fuelDetails.totalFuelCost',
                '$vehicleExpenseDetails.expenseAmount'
              ]
            }
          }
        }
      }
    ]);

    const dailyBreakdown = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$expenseDate' } },
          totalExpense: {
            $sum: {
              $cond: [
                { $eq: ['$expenseType', 'fuel'] },
                '$fuelDetails.totalFuelCost',
                '$vehicleExpenseDetails.expenseAmount'
              ]
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        period,
        summary: summary[0] || {},
        byExpenseType: byType,
        approvalStatus,
        dailyBreakdown
      }
    });

  } catch (error) {
    console.error('Get expense summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expense summary',
      error: error.message
    });
  }
};

// ==================== UPDATE & DELETE ====================

// UPDATE EXPENSE (Only if pending or rejected)
exports.updateExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const updates = req.body;

    const driver = await Driver.findById(req.user._id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    const expense = await Expense.findOne({
      _id: expenseId,
      driver: driver._id
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    if (!['pending', 'rejected'].includes(expense.approvalStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update expense that is already approved'
      });
    }

    let isResubmitted = false;
    let shouldRecalculateMileage = false;

    // === COMMON FIELDS (for all expense types) ===
    if (updates.description !== undefined) expense.description = updates.description;
    if (updates.category !== undefined) expense.category = updates.category;
    if (updates.remarks !== undefined) expense.remarks = updates.remarks;

    // === FUEL EXPENSE SPECIFIC ===
    if (expense.expenseType === 'fuel') {
      let shouldRecalculateTotal = false;

      if (updates.fuelQuantity !== undefined) {
        expense.fuelDetails.quantity = parseFloat(updates.fuelQuantity);
        shouldRecalculateTotal = true;
      }

      // Accept both naming conventions
      if (updates.pricePerLitre !== undefined || updates.pricePerUnit !== undefined) {
        expense.fuelDetails.pricePerLitre = parseFloat(updates.pricePerLitre || updates.pricePerUnit);
        shouldRecalculateTotal = true;
      }

      if (updates.fuelType !== undefined) expense.fuelDetails.fuelType = updates.fuelType;
      if (updates.stationName !== undefined) expense.fuelDetails.stationName = updates.stationName;
      if (updates.stationAddress !== undefined) expense.fuelDetails.stationAddress = updates.stationAddress;

      if (updates.stationLatitude !== undefined || updates.stationLongitude !== undefined) {
        expense.fuelDetails.stationLocation = expense.fuelDetails.stationLocation || {};
        if (updates.stationLatitude !== undefined) {
          expense.fuelDetails.stationLocation.coordinates.latitude = parseFloat(updates.stationLatitude);
        }
        if (updates.stationLongitude !== undefined) {
          expense.fuelDetails.stationLocation.coordinates.longitude = parseFloat(updates.stationLongitude);
        }
      }

      // Current meter reading update
      if (updates.currentMeterReading !== undefined) {
        expense.meterReading.current = parseFloat(updates.currentMeterReading);
        shouldRecalculateMileage = true;
      }

      // === TOTAL FUEL COST LOGIC ===
      // If driver sends exact total from receipt → use it directly
      if (updates.totalFuelCost !== undefined || updates.totalAmount !== undefined) {
        expense.fuelDetails.totalAmount = parseFloat(updates.totalFuelCost || updates.totalAmount);
      }
      // Otherwise, recalculate from quantity × price
      else if (shouldRecalculateTotal) {
        expense.fuelDetails.totalAmount = parseFloat(
          (expense.fuelDetails.quantity * expense.fuelDetails.pricePerLitre).toFixed(2)
        );
      }
    }

    // === VEHICLE EXPENSE SPECIFIC (maintenance, repair, toll, etc.) ===
    else {
      if (updates.expenseAmount !== undefined) {
        // Adjust based on your schema field name
        if (expense.vehicleExpenseDetails) {
          expense.vehicleExpenseDetails.expenseAmount = parseFloat(updates.expenseAmount);
        } else {
          // Fallback if you store amount elsewhere
          expense.fuelDetails = expense.fuelDetails || {};
          expense.fuelDetails.totalAmount = parseFloat(updates.expenseAmount);
        }
      }

      if (updates.additionalNotes !== undefined) {
        if (expense.vehicleExpenseDetails) {
          expense.vehicleExpenseDetails.additionalNotes = updates.additionalNotes;
        } else {
          expense.description = updates.additionalNotes;
        }
      }

      if (updates.currentMeterReading !== undefined) {
        expense.meterReading.current = parseFloat(updates.currentMeterReading);
      }
    }

    // === RECALCULATE MILEAGE IF METER READING CHANGED ===
    if (shouldRecalculateMileage) {
      const lastExpense = await Expense.findOne({
        driver: driver._id,
        'vehicle.vehicleNumber': expense.vehicle.vehicleNumber,
        expenseType: 'fuel',
        _id: { $ne: expense._id }
      }).sort({ 'meterReading.current': -1 });

      const previousReading = lastExpense ? lastExpense.meterReading.current : 0;
      expense.meterReading.previous = previousReading;
      expense.meterReading.difference = expense.meterReading.current - previousReading;

      if (expense.expenseType === 'fuel' && expense.meterReading.difference > 0 && expense.fuelDetails.quantity > 0) {
        expense.mileageData.distanceCovered = expense.meterReading.difference;
        expense.mileageData.fuelConsumed = expense.fuelDetails.quantity;
        expense.mileageData.averageMileage = parseFloat(
          (expense.meterReading.difference / expense.fuelDetails.quantity).toFixed(2)
        );
      }
    }

    // === HANDLE RESUBMISSION AFTER REJECTION ===
    if (expense.approvalStatus === 'rejected') {
      expense.approvalStatus = 'pending';
      expense.rejectionReason = null;
      expense.rejectedBy = null;
      expense.rejectedAt = null;
      expense.resubmittedAt = new Date();
      expense.resubmittedCount = (expense.resubmittedCount || 0) + 1;
      isResubmitted = true;
    }

    await expense.save();

    // Populate for clean response
    await expense.populate('driver', 'name phone vehicleNumber');

    return res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      note: isResubmitted
        ? 'Your expense has been resubmitted for approval'
        : 'Expense details updated',
      data: { expense }
    });

  } catch (error) {
    console.error('Update expense error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update expense',
      error: error.message || 'Internal server error'
    });
  }
};

//  DELETE EXPENSE (DRIVER - Only if pending) 
exports.deleteExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;

    // Get driver
    const driver = await Driver.findById(req.user._id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    const expense = await Expense.findOne({
      _id: expenseId,
      driver: driver._id
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Only allow deletion if status is pending
    if (expense.approvalStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete expense that is already in approval process or approved'
      });
    }

    await Expense.deleteOne({ _id: expenseId });

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully'
    });

  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete expense',
      error: error.message
    });
  }
};
