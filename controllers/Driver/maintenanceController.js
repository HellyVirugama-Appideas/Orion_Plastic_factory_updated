// const MaintenanceSchedule = require('../models/MaintenanceSchedule');
// const Vehicle = require('../models/Vehicle');
// const Expense = require('../models/Expense');

// //  MAINTENANCE SCHEDULING 

// // Schedule Maintenance
// exports.scheduleMaintenance = async (req, res) => {
//   try {
//     const {
//       vehicleId,
//       maintenanceType,
//       scheduleType,
//       intervalKm,
//       intervalMonths,
//       description,
//       estimatedCost,
//       serviceProvider,
//       priority,
//       notes
//     } = req.body;

//     const adminId = req.user.id;

//     // Validate vehicle
//     const vehicle = await Vehicle.findById(vehicleId);
//     if (!vehicle) {
//       return res.status(404).json({
//         success: false,
//         message: 'Vehicle not found'
//       });
//     }

//     // Get current meter reading
//     const currentKm = vehicle.currentMeterReading || 0;

//     // Get last service for this type
//     const lastMaintenance = await MaintenanceSchedule.findOne({
//       vehicle: vehicleId,
//       maintenanceType,
//       status: 'completed'
//     }).sort({ completedAt: -1 });

//     const lastServiceKm = lastMaintenance ? lastMaintenance.distanceSchedule.nextServiceKm : currentKm;
//     const lastServiceDate = lastMaintenance ? lastMaintenance.completedAt : new Date();

//     // Create maintenance schedule
//     const maintenance = new MaintenanceSchedule({
//       vehicle: vehicleId,
//       maintenanceType,
//       scheduleType: scheduleType || 'distance_based',
//       distanceSchedule: {
//         intervalKm: intervalKm || 10000,
//         lastServiceKm,
//         currentKm
//       },
//       timeSchedule: { 
//         intervalMonths,
//         lastServiceDate
//       },
//       serviceDetails: {
//         description,
//         estimatedCost,
//         serviceProvider
//       },
//       priority: priority || 'medium',
//       notes,
//       createdBy: adminId,
//       isRecurring: true
//     });

//     await maintenance.save();

//     res.status(201).json({
//       success: true,
//       message: 'Maintenance scheduled successfully',
//       data: {
//         maintenance: await maintenance.populate('vehicle', 'vehicleNumber registrationNumber vehicleType')
//       }
//     });

//   } catch (error) {
//     console.error('Schedule maintenance error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to schedule maintenance',
//       error: error.message
//     });
//   }
// };

// // Get All Maintenance Schedules
// exports.getAllMaintenanceSchedules = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 20,
//       vehicleId,
//       status,
//       maintenanceType,
//       priority,
//       sortBy = 'nextServiceDate',
//       sortOrder = 'asc'
//     } = req.query;

//     const query = {};

//     if (vehicleId) query.vehicle = vehicleId;
//     if (status) query.status = status;
//     if (maintenanceType) query.maintenanceType = maintenanceType;
//     if (priority) query.priority = priority;

//     const skip = (parseInt(page) - 1) * parseInt(limit);
//     const sort = {};

//     if (sortBy === 'nextServiceDate') {
//       sort['timeSchedule.nextServiceDate'] = sortOrder === 'desc' ? -1 : 1;
//     } else if (sortBy === 'nextServiceKm') {
//       sort['distanceSchedule.nextServiceKm'] = sortOrder === 'desc' ? -1 : 1;
//     } else {
//       sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
//     }

//     const schedules = await MaintenanceSchedule.find(query)
//       .populate('vehicle', 'vehicleNumber registrationNumber vehicleType currentMeterReading')
//       .populate('createdBy', 'name email')
//       .sort(sort)
//       .skip(skip)
//       .limit(parseInt(limit));

//     const total = await MaintenanceSchedule.countDocuments(query);

//     res.status(200).json({
//       success: true,
//       data: {
//         schedules,
//         pagination: {
//           total,
//           page: parseInt(page),
//           pages: Math.ceil(total / parseInt(limit)),
//           limit: parseInt(limit)
//         }
//       }
//     });

//   } catch (error) {
//     console.error('Get maintenance schedules error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch maintenance schedules',
//       error: error.message
//     });
//   }
// };

// // Get Due Maintenance
// exports.getDueMaintenance = async (req, res) => {
//   try {
//     const { vehicleId } = req.query;

//     const dueMaintenance = await MaintenanceSchedule.getDueMaintenance(vehicleId);

//     res.status(200).json({
//       success: true,
//       data: {
//         dueMaintenance,
//         total: dueMaintenance.length
//       }
//     });

//   } catch (error) {
//     console.error('Get due maintenance error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch due maintenance',
//       error: error.message
//     });
//   }
// };

// // Get Upcoming Maintenance
// exports.getUpcomingMaintenance = async (req, res) => {
//   try {
//     const { vehicleId, daysAhead = 30 } = req.query;

//     const upcomingMaintenance = await MaintenanceSchedule.getUpcomingMaintenance(
//       vehicleId, 
//       parseInt(daysAhead)
//     );

//     res.status(200).json({
//       success: true,
//       data: {
//         upcomingMaintenance,
//         total: upcomingMaintenance.length,
//         daysAhead: parseInt(daysAhead)
//       }
//     });

//   } catch (error) {
//     console.error('Get upcoming maintenance error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch upcoming maintenance',
//       error: error.message
//     });
//   }
// };

// //  RECORD SERVICE DETAILS 

// // Record Service Details
// exports.recordServiceDetails = async (req, res) => {
//   try {
//     const { scheduleId } = req.params;
//     const {
//       actualCost,
//       laborCost,
//       partsCost,
//       additionalCost,
//       parts,
//       serviceProvider,
//       serviceLocation,
//       duration,
//       notes,
//       adminComments
//     } = req.body;

//     const userId = req.user.id;

//     const maintenance = await MaintenanceSchedule.findById(scheduleId);
//     if (!maintenance) {
//       return res.status(404).json({
//         success: false,
//         message: 'Maintenance schedule not found'
//       });
//     }

//     // Update service details
//     maintenance.serviceDetails.actualCost = actualCost;
//     maintenance.serviceDetails.serviceProvider = serviceProvider || maintenance.serviceDetails.serviceProvider;
//     maintenance.serviceDetails.serviceLocation = serviceLocation;
//     maintenance.serviceDetails.duration = duration;
//     if (parts) {
//       maintenance.serviceDetails.parts = parts;
//     }

//     // Update cost breakdown
//     maintenance.costBreakdown = {
//       laborCost: laborCost || 0,
//       partsCost: partsCost || 0,
//       additionalCost: additionalCost || 0
//     };

//     // Update status
//     maintenance.status = 'completed';
//     maintenance.completedAt = Date.now();
//     maintenance.completedBy = userId;
//     maintenance.notes = notes || maintenance.notes;
//     maintenance.adminComments = adminComments;

//     // Update vehicle's last service date
//     const vehicle = await Vehicle.findById(maintenance.vehicle);
//     if (vehicle) {
//       vehicle.lastServiceDate = Date.now();
//       maintenance.distanceSchedule.currentKm = vehicle.currentMeterReading;
//       await vehicle.save();
//     }

//     await maintenance.save();

//     // Create expense record for the service
//     const serviceExpense = new Expense({
//       expenseType: 'maintenance',
//       driver: vehicle.assignedDriver,
//       vehicle: maintenance.vehicle,
//       fuelDetails: {
//         totalAmount: actualCost
//       },
//       description: `${maintenance.maintenanceType} - ${maintenance.serviceDetails.description}`,
//       category: 'scheduled',
//       approvalStatus: 'approved_by_finance',
//       paymentStatus: 'paid'
//     });
//     await serviceExpense.save();

//     // Link expense to maintenance
//     maintenance.serviceHistoryId = serviceExpense._id;
//     await maintenance.save();

//     // Create next recurring schedule if applicable
//     if (maintenance.isRecurring && !maintenance.nextScheduleCreated) {
//       await MaintenanceSchedule.createNextSchedule(scheduleId);
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Service details recorded successfully',
//       data: {
//         maintenance: await maintenance.populate(['vehicle', 'completedBy']),
//         expenseCreated: true
//       }
//     });

//   } catch (error) {
//     console.error('Record service details error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to record service details',
//       error: error.message
//     });
//   }
// };

// // Upload Service Documents
// exports.uploadServiceDocuments = async (req, res) => {
//   try {
//     const { scheduleId } = req.params;
//     const files = req.files; // Using multer

//     const maintenance = await MaintenanceSchedule.findById(scheduleId);
//     if (!maintenance) {
//       return res.status(404).json({
//         success: false,
//         message: 'Maintenance schedule not found'
//       });
//     }

//     const documents = [];

//     // Process different document types
//     const documentTypes = ['invoice', 'receipt', 'before_photo', 'after_photo', 'report', 'warranty'];

//     documentTypes.forEach(type => {
//       if (files[type]) {
//         files[type].forEach(file => {
//           documents.push({
//             type,
//             url: `/uploads/maintenance/${file.filename}`,
//             filename: file.filename
//           });
//         });
//       }
//     });

//     maintenance.documents.push(...documents);
//     await maintenance.save();

//     res.status(200).json({
//       success: true,
//       message: 'Service documents uploaded successfully',
//       data: {
//         maintenance: await maintenance.populate('vehicle'),
//         uploadedDocuments: documents
//       }
//     });

//   } catch (error) {
//     console.error('Upload service documents error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to upload service documents',
//       error: error.message
//     });
//   }
// };

// //  CALCULATE NEXT SERVICE DATE 

// // Calculate Next Service Date (based on 10k km intervals)
// exports.calculateNextServiceDate = async (req, res) => {
//   try {
//     const { vehicleId, maintenanceType } = req.query;

//     if (!vehicleId) {
//       return res.status(400).json({
//         success: false,
//         message: 'Vehicle ID is required'
//       });
//     }

//     const vehicle = await Vehicle.findById(vehicleId);
//     if (!vehicle) {
//       return res.status(404).json({
//         success: false,
//         message: 'Vehicle not found'
//       });
//     }

//     // Get last maintenance record
//     const query = { vehicle: vehicleId, status: 'completed' };
//     if (maintenanceType) {
//       query.maintenanceType = maintenanceType;
//     }

//     const lastMaintenance = await MaintenanceSchedule.findOne(query)
//       .sort({ completedAt: -1 });

//     const currentKm = vehicle.currentMeterReading || 0;
//     const intervalKm = 10000; // Default 10k km

//     let nextServiceKm, remainingKm, nextServiceDate;

//     if (lastMaintenance) {
//       nextServiceKm = lastMaintenance.distanceSchedule.nextServiceKm + intervalKm;
//       remainingKm = nextServiceKm - currentKm;

//       // Estimate next service date based on average km per day
//       if (lastMaintenance.completedAt) {
//         const daysSinceLastService = (Date.now() - lastMaintenance.completedAt) / (1000 * 60 * 60 * 24);
//         const kmCovered = currentKm - lastMaintenance.distanceSchedule.lastServiceKm;
//         const avgKmPerDay = kmCovered / daysSinceLastService;

//         if (avgKmPerDay > 0) {
//           const daysToNextService = remainingKm / avgKmPerDay;
//           nextServiceDate = new Date(Date.now() + (daysToNextService * 24 * 60 * 60 * 1000));
//         }
//       }
//     } else {
//       nextServiceKm = currentKm + intervalKm;
//       remainingKm = intervalKm;
//     }

//     res.status(200).json({
//       success: true,
//       data: {
//         vehicleId,
//         maintenanceType: maintenanceType || 'all',
//         currentKm,
//         nextServiceKm,
//         remainingKm,
//         estimatedNextServiceDate: nextServiceDate,
//         lastService: lastMaintenance ? {
//           date: lastMaintenance.completedAt,
//           km: lastMaintenance.distanceSchedule.lastServiceKm,
//           type: lastMaintenance.maintenanceType
//         } : null
//       }
//     });

//   } catch (error) {
//     console.error('Calculate next service date error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to calculate next service date',
//       error: error.message
//     });
//   }
// };

// //  MAINTENANCE COST TRACKING 

// // Get Maintenance Cost Summary
// exports.getMaintenanceCostSummary = async (req, res) => {
//   try {
//     const { vehicleId, startDate, endDate, maintenanceType } = req.query;

//     const matchStage = { status: 'completed' };

//     if (vehicleId) matchStage.vehicle = mongoose.Types.ObjectId(vehicleId);
//     if (maintenanceType) matchStage.maintenanceType = maintenanceType;

//     if (startDate || endDate) {
//       matchStage.completedAt = {};
//       if (startDate) matchStage.completedAt.$gte = new Date(startDate);
//       if (endDate) matchStage.completedAt.$lte = new Date(endDate);
//     }

//     const costSummary = await MaintenanceSchedule.aggregate([
//       { $match: matchStage },
//       {
//         $group: {
//           _id: null,
//           totalCost: { $sum: '$costBreakdown.totalCost' },
//           totalLaborCost: { $sum: '$costBreakdown.laborCost' },
//           totalPartsCost: { $sum: '$costBreakdown.partsCost' },
//           totalAdditionalCost: { $sum: '$costBreakdown.additionalCost' },
//           avgCost: { $avg: '$costBreakdown.totalCost' },
//           serviceCount: { $sum: 1 }
//         }
//       }
//     ]);

//     // Cost by maintenance type
//     const costByType = await MaintenanceSchedule.aggregate([
//       { $match: matchStage },
//       {
//         $group: {
//           _id: '$maintenanceType',
//           totalCost: { $sum: '$costBreakdown.totalCost' },
//           count: { $sum: 1 },
//           avgCost: { $avg: '$costBreakdown.totalCost' }
//         }
//       },
//       { $sort: { totalCost: -1 } }
//     ]);

//     // Monthly trend
//     const monthlyTrend = await MaintenanceSchedule.aggregate([
//       { $match: matchStage },
//       {
//         $group: {
//           _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
//           totalCost: { $sum: '$costBreakdown.totalCost' },
//           count: { $sum: 1 }
//         }
//       },
//       { $sort: { _id: 1 } }
//     ]);

//     res.status(200).json({
//       success: true,
//       data: {
//         summary: costSummary[0] || {},
//         costByType,
//         monthlyTrend,
//         filters: { vehicleId, startDate, endDate, maintenanceType }
//       }
//     });

//   } catch (error) {
//     console.error('Get maintenance cost summary error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch maintenance cost summary',
//       error: error.message
//     });
//   }
// };

// //  SERVICE HISTORY 

// // Get Service History
// exports.getServiceHistory = async (req, res) => {
//   try {
//     const { vehicleId } = req.query;

//     if (!vehicleId) {
//       return res.status(400).json({
//         success: false,
//         message: 'Vehicle ID is required'
//       });
//     }

//     const serviceHistory = await MaintenanceSchedule.find({
//       vehicle: vehicleId,
//       status: 'completed'
//     })
//     .populate('completedBy', 'name email')
//     .populate('vehicle', 'vehicleNumber registrationNumber')
//     .sort({ completedAt: -1 });

//     // Calculate statistics
//     const totalCost = serviceHistory.reduce((sum, service) => 
//       sum + (service.costBreakdown.totalCost || 0), 0
//     );

//     const avgCost = serviceHistory.length > 0 ? totalCost / serviceHistory.length : 0;

//     // Group by maintenance type
//     const byType = serviceHistory.reduce((acc, service) => {
//       if (!acc[service.maintenanceType]) {
//         acc[service.maintenanceType] = {
//           count: 0,
//           totalCost: 0,
//           services: []
//         };
//       }
//       acc[service.maintenanceType].count++;
//       acc[service.maintenanceType].totalCost += service.costBreakdown.totalCost || 0;
//       acc[service.maintenanceType].services.push(service);
//       return acc;
//     }, {});

//     res.status(200).json({
//       success: true,
//       data: {
//         vehicleId,
//         serviceHistory,
//         statistics: {
//           totalServices: serviceHistory.length,
//           totalCost,
//           avgCost: avgCost.toFixed(2)
//         },
//         byMaintenanceType: byType
//       }
//     });

//   } catch (error) {
//     console.error('Get service history error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch service history',
//       error: error.message
//     });
//   }
// };

// //  UPDATE & DELETE OPERATIONS 

// // Update Maintenance Schedule
// exports.updateMaintenanceSchedule = async (req, res) => {
//   try {
//     const { scheduleId } = req.params;
//     const updates = req.body;

//     const maintenance = await MaintenanceSchedule.findById(scheduleId);
//     if (!maintenance) {
//       return res.status(404).json({
//         success: false,
//         message: 'Maintenance schedule not found'
//       });
//     }

//     // Update allowed fields
//     const allowedUpdates = [
//       'maintenanceType',
//       'scheduleType',
//       'priority',
//       'notes',
//       'adminComments',
//       'serviceDetails',
//       'distanceSchedule',
//       'timeSchedule',
//       'reminders'
//     ];

//     allowedUpdates.forEach(field => {
//       if (updates[field] !== undefined) {
//         if (typeof updates[field] === 'object' && !Array.isArray(updates[field])) {
//           maintenance[field] = { ...maintenance[field], ...updates[field] };
//         } else {
//           maintenance[field] = updates[field];
//         }
//       }
//     });

//     await maintenance.save();

//     res.status(200).json({
//       success: true,
//       message: 'Maintenance schedule updated successfully',
//       data: {
//         maintenance: await maintenance.populate('vehicle')
//       }
//     });

//   } catch (error) {
//     console.error('Update maintenance schedule error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to update maintenance schedule',
//       error: error.message
//     });
//   }
// };

// // Cancel Maintenance Schedule
// exports.cancelMaintenanceSchedule = async (req, res) => {
//   try {
//     const { scheduleId } = req.params;
//     const { reason } = req.body;

//     const maintenance = await MaintenanceSchedule.findById(scheduleId);
//     if (!maintenance) {
//       return res.status(404).json({
//         success: false,
//         message: 'Maintenance schedule not found'
//       });
//     }

//     maintenance.status = 'cancelled';
//     maintenance.adminComments = reason || 'Cancelled by admin';
//     await maintenance.save();

//     res.status(200).json({
//       success: true,
//       message: 'Maintenance schedule cancelled',
//       data: { maintenance }
//     });

//   } catch (error) {
//     console.error('Cancel maintenance schedule error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to cancel maintenance schedule',
//       error: error.message
//     });
//   }
// };

// module.exports = exports;




const MaintenanceSchedule = require('../../models/MaintenanceSchedule');
const Vehicle = require('../../models/Vehicle');

exports.getAllMaintenanceSchedules = async (req, res) => {
  try {
    const { page = 1, limit = 20, vehicleId, status } = req.query;
    const query = {};
    if (vehicleId) query.vehicle = vehicleId;
    if (status) query.status = status;

    const schedules = await MaintenanceSchedule.find(query)
      .populate('vehicle', 'vehicleNumber')
      .sort({ 'timeSchedule.nextServiceDate': 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await MaintenanceSchedule.countDocuments(query);

    res.status(200).json({
      success: true,
      data: { schedules, total, page: parseInt(page), pages: Math.ceil(total / limit) }
    });

  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch' });
  }
};

exports.getDueMaintenance = async (req, res) => {
  try {
    const { vehicleId } = req.query;
    const due = await MaintenanceSchedule.getDueMaintenance(vehicleId);
    res.status(200).json({ success: true, data: { dueMaintenance: due, total: due.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
};

exports.getUpcomingMaintenance = async (req, res) => {
  try {
    const { vehicleId, daysAhead = 30 } = req.query;
    const upcoming = await MaintenanceSchedule.getUpcomingMaintenance(vehicleId, parseInt(daysAhead));
    res.status(200).json({ success: true, data: { upcomingMaintenance: upcoming } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
};

exports.calculateNextServiceDate = async (req, res) => {
  try {
    const { vehicleId } = req.query;
    if (!vehicleId) return res.status(400).json({ success: false, message: 'vehicleId required' });

    const vehicle = await Vehicle.findById(vehicleId);
    const last = await MaintenanceSchedule.findOne({ vehicle: vehicleId, status: 'completed' }).sort({ completedAt: -1 });

    const currentKm = vehicle.currentMeterReading || 0;
    const interval = 10000;
    const nextKm = last ? last.distanceSchedule.nextServiceKm + interval : currentKm + interval;

    res.status(200).json({
      success: true,
      data: { currentKm, nextServiceKm: nextKm, remainingKm: nextKm - currentKm }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Calculation failed' });
  }
};

exports.getServiceHistory = async (req, res) => {
  try {
    const { vehicleId } = req.query;
    if (!vehicleId) return res.status(400).json({ success: false, message: 'vehicleId required' });

    const history = await MaintenanceSchedule.find({ vehicle: vehicleId, status: 'completed' })
      .populate('vehicle completedBy')
      .sort({ completedAt: -1 });

    res.status(200).json({ success: true, data: { serviceHistory: history } });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get history' });
  }
};

exports.completeServiceByDriver = async (req, res) => {
  try {
    const { scheduleId, notes } = req.body;

    if (!req.driver && req.user) {
      req.driver = req.user;
      req.driverId = req.user._id;
    }

    if (!req.driver) {
      return res.status(401).json({
        success: false,
        message: 'Driver not authenticated. Please login again.'
      });
    }

    const driverId = req.driver._id;
    const driverName = req.driver.name || req.driver.phone;

    if (!scheduleId) {
      return res.status(400).json({ success: false, message: 'scheduleId required' });
    }

    const maintenance = await MaintenanceSchedule.findById(scheduleId)
      .populate('vehicle');

    if (!maintenance) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    const vehicle = maintenance.vehicle;
    if (!vehicle) {
      return res.status(400).json({ success: false, message: 'Vehicle not found' });
    }

    if (!vehicle.assignedTo ||
      vehicle.assignedTo.toString() !== driverId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'This is not your vehicle!'
      });
    }

    if (['completed', 'cancelled'].includes(maintenance.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot mark as complete. Status: ${maintenance.status}`
      });
    }

    // Update status
    maintenance.status = 'pending_approval';
    maintenance.driverMarkedComplete = true;
    maintenance.driverCompletedAt = new Date();
    maintenance.driverNotes = notes || 'Service completed by driver';

    // RECEIPT UPLOAD
    const uploadedDocs = [];

    if (req.files) {
      Object.keys(req.files).forEach(field => {
        req.files[field].forEach(file => {
          uploadedDocs.push({
            type: field === 'receipt' ? 'receipt' :
              field === 'invoice' ? 'invoice' :
                field.includes('before') ? 'before_photo' :
                  field.includes('after') ? 'after_photo' : 'other',
            url: `/uploads/maintenance/${file.filename}`,
            filename: file.filename,
            uploadedAt: new Date(),
            uploadedBy: driverId,
            uploadedByType: 'driver'
          });
        });
      });
    }

    if (uploadedDocs.length > 0) {
      maintenance.documents = maintenance.documents || [];
      maintenance.documents.push(...uploadedDocs);
    }

    await maintenance.save();

    // Notification to Admin
    if (global.io) {
      global.io.emit("driver-completed-service", {
        scheduleId: maintenance._id,
        driverName,
        vehicleNumber: vehicle.vehicleNumber,
        receiptUploaded: uploadedDocs.length > 0,
        totalFiles: uploadedDocs.length
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Service completion request sent with receipt!',
      data: {
        scheduleId: maintenance._id,
        status: 'pending_approval',
        uploadedFiles: uploadedDocs.length,
        message: 'Admin will verify your receipt & approve soon'
      }
    });

  } catch (error) {
    console.error('Driver complete service error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit',
      error: error.message
    });
  }
};