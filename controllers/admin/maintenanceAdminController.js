const MaintenanceSchedule = require('../../models/MaintenanceSchedule');
const Vehicle = require('../../models/Vehicle');
const Expense = require('../../models/Expense');

// exports.scheduleMaintenance = async (req, res) => {
//   try {
//     const {
//       vehicleId, maintenanceType, scheduleType, intervalKm, intervalMonths,
//       description, estimatedCost, serviceProvider, priority, notes
//     } = req.body;
//     const adminId = req.admin._id;

//     const vehicle = await Vehicle.findById(vehicleId);
//     if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

//     const currentKm = vehicle.currentMeterReading || 0;
//     const lastMaintenance = await MaintenanceSchedule.findOne({
//       vehicle: vehicleId, maintenanceType, status: 'completed'
//     }).sort({ completedAt: -1 });

//     const lastServiceKm = lastMaintenance ? lastMaintenance.distanceSchedule.nextServiceKm : currentKm;
//     const lastServiceDate = lastMaintenance ? lastMaintenance.completedAt : new Date();

//     const maintenance = new MaintenanceSchedule({
//       vehicle: vehicleId,
//       maintenanceType,
//       scheduleType: scheduleType || 'distance_based',
//       distanceSchedule: { intervalKm: intervalKm || 10000, lastServiceKm, currentKm },
//       timeSchedule: { intervalMonths, lastServiceDate },
//       serviceDetails: { description, estimatedCost, serviceProvider },
//       priority: priority || 'medium',
//       notes,
//       createdBy: adminId,
//       isRecurring: true
//     });

//     await maintenance.save();

//     res.status(201).json({
//       success: true,
//       message: 'Maintenance scheduled successfully',
//       data: { maintenance: await maintenance.populate('vehicle', 'vehicleNumber registrationNumber vehicleType') }
//     });

//   } catch (error) {
//     console.error('Schedule maintenance error:', error);
//     res.status(500).json({ success: false, message: 'Failed to schedule maintenance', error: error.message });
//   }
// };

exports.scheduleMaintenance = async (req, res) => {
  try {
    const {
      vehicleId,
      maintenanceType,
      scheduleType,
      intervalKm,
      intervalMonths,
      description,
      estimatedCost,
      serviceProvider,
      priority,
      notes,
      lastServiceDate: inputLastServiceDate  
    } = req.body;

    const adminId = req.admin._id;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    const currentKm = vehicle.currentMeterReading || 0;

    const lastMaintenance = await MaintenanceSchedule.findOne({
      vehicle: vehicleId,
      maintenanceType,
      status: 'completed'
    }).sort({ completedAt: -1 });

    const lastServiceKm = lastMaintenance 
      ? lastMaintenance.distanceSchedule.nextServiceKm 
      : currentKm;

    let finalLastServiceDate;

    if (inputLastServiceDate) {
      finalLastServiceDate = new Date(inputLastServiceDate);
    } else if (lastMaintenance && lastMaintenance.completedAt) {
      finalLastServiceDate = lastMaintenance.completedAt;
    } else {
      finalLastServiceDate = new Date();
    }

    let nextServiceDate = null;
    if (intervalMonths) {
      nextServiceDate = new Date(finalLastServiceDate);
      nextServiceDate.setMonth(nextServiceDate.getMonth() + intervalMonths);
    }

    const maintenance = new MaintenanceSchedule({
      vehicle: vehicleId,
      maintenanceType,
      scheduleType: scheduleType || 'distance_based',
      distanceSchedule: {
        intervalKm: intervalKm || 10000,
        lastServiceKm,
        currentKm,
        nextServiceKm: lastServiceKm + (intervalKm || 10000)
      },
      timeSchedule: {
        intervalMonths: intervalMonths || null,
        lastServiceDate: finalLastServiceDate,     
        nextServiceDate: nextServiceDate          
      },
      serviceDetails: {
        description,
        estimatedCost,
        serviceProvider
      },
      priority: priority || 'medium',
      notes,
      createdBy: adminId,
      isRecurring: true
    });

    await maintenance.save();

    res.status(201).json({
      success: true,
      message: 'Maintenance scheduled successfully',
      data: {
        maintenance: await maintenance.populate('vehicle', 'vehicleNumber vehicleType')
      }
    });

  } catch (error) {
    console.error('Schedule maintenance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule maintenance',
      error: error.message
    });
  }
};

exports.recordServiceDetails = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const {
      actualCost, laborCost, partsCost, additionalCost, parts,
      serviceProvider, serviceLocation, duration, notes, adminComments
    } = req.body;

    const adminId = req.admin._id;

    const maintenance = await MaintenanceSchedule.findById(scheduleId)
      .populate('vehicle');

    if (!maintenance) {
      return res.status(404).json({ success: false, message: 'Maintenance schedule not found' });
    }

    // Update service details
    maintenance.serviceDetails.actualCost = actualCost || 0;
    maintenance.serviceDetails.serviceProvider = serviceProvider || maintenance.serviceDetails.serviceProvider;
    maintenance.serviceDetails.serviceLocation = serviceLocation;
    maintenance.serviceDetails.duration = duration;
    if (parts && Array.isArray(parts)) {
      maintenance.serviceDetails.parts = parts;
    }

    maintenance.costBreakdown = {
      laborCost: Number(laborCost) || 0,
      partsCost: Number(partsCost) || 0,
      additionalCost: Number(additionalCost) || 0,
      totalCost: (Number(laborCost) || 0) + (Number(partsCost) || 0) + (Number(additionalCost) || 0)
    };

    maintenance.status = 'completed';
    maintenance.completedAt = new Date();
    maintenance.completedBy = adminId;
    maintenance.notes = notes || maintenance.notes;
    maintenance.adminComments = adminComments || '';

    const vehicle = maintenance.vehicle;

    if (vehicle) {
      vehicle.lastServiceDate = new Date();
      maintenance.distanceSchedule.currentKm = vehicle.currentMeterReading || 0;
      await vehicle.save();
    }

    await maintenance.save();

    // EXPENSE CREATE — DRIVER NULL BHI CHALEGA
    const serviceExpense = new Expense({
      expenseType: 'maintenance',
      driver: null, // ← SAFE: Driver nahi hai to null daal do
      vehicle: {
        _id: vehicle?._id,
        vehicleNumber: vehicle?.vehicleNumber || 'UNKNOWN',
      },
      meterReading: {
        current: vehicle?.currentMeterReading || 0,
        previous: vehicle?.previousMeterReading || 0
      },
      fuelDetails: { totalAmount: actualCost || 0 },
      description: `${maintenance.maintenanceType.replace(/_/g, ' ').toUpperCase()} - Service`,
      category: 'scheduled',
      approvalStatus: 'approved_by_finance',
      paymentStatus: 'paid',
      recordedBy: adminId
    });

    await serviceExpense.save();

    maintenance.serviceHistoryId = serviceExpense._id;
    await maintenance.save();

    if (maintenance.isRecurring && !maintenance.nextScheduleCreated) {
      await MaintenanceSchedule.createNextSchedule(scheduleId);
    }

    return res.status(200).json({
      success: true,
      message: 'Service recorded successfully!',
      data: { maintenance }
    });

  } catch (error) {
    console.error('Record service error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record service',
      error: error.message
    });
  }
};

exports.uploadServiceDocuments = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const files = req.files;

    const maintenance = await MaintenanceSchedule.findById(scheduleId);
    if (!maintenance) return res.status(404).json({ success: false, message: 'Schedule not found' });

    const documents = [];
    const types = ['invoice', 'receipt', 'before_photo', 'after_photo', 'report', 'warranty'];

    types.forEach(type => {
      if (files[type]) {
        files[type].forEach(file => {
          documents.push({ type, url: `/uploads/maintenance/${file.filename}`, filename: file.filename });
        });
      }
    });

    maintenance.documents.push(...documents);
    await maintenance.save();

    res.status(200).json({
      success: true,
      message: 'Documents uploaded',
      data: { uploadedDocuments: documents }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
};

// exports.updateMaintenanceSchedule = async (req, res) => {
//   try {
//     const { scheduleId } = req.params;
//     const updates = req.body;

//     const maintenance = await MaintenanceSchedule.findById(scheduleId);
//     if (!maintenance) return res.status(404).json({ success: false, message: 'Not found' });

//     const allowed = ['maintenanceType', 'priority', 'notes', 'adminComments', 'serviceDetails', 'distanceSchedule', 'timeSchedule'];
//     allowed.forEach(field => {
//       if (updates[field] !== undefined) {
//         if (typeof updates[field] === 'object' && !Array.isArray(updates[field])) {
//           maintenance[field] = { ...maintenance[field], ...updates[field] };
//         } else {
//           maintenance[field] = updates[field];
//         }
//       }
//     });

//     await maintenance.save();

//     res.status(200).json({ success: true, message: 'Updated successfully', data: { maintenance } });

//   } catch (error) {
//     console.error('Update error:', error);
//     res.status(500).json({ success: false, message: 'Update failed' });
//   }
// };

exports.updateMaintenanceSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const updates = req.body;

    const maintenance = await MaintenanceSchedule.findById(scheduleId);
    if (!maintenance) {
      return res.status(404).json({ success: false, message: 'Maintenance schedule not found' });
    }

    const topLevelFields = ['maintenanceType', 'priority', 'notes', 'adminComments', 'status'];
    
    topLevelFields.forEach(field => {
      if (updates[field] !== undefined) {
        maintenance[field] = updates[field];
      }
    });

    if (updates.serviceDetails) {
      maintenance.serviceDetails = {
        ...maintenance.serviceDetails,
        ...updates.serviceDetails
      };
    }

    if (updates.distanceSchedule) {
      maintenance.distanceSchedule = {
        ...maintenance.distanceSchedule,
        ...updates.distanceSchedule
      };
    }

    if (updates.timeSchedule) {
      maintenance.timeSchedule = {
        ...maintenance.timeSchedule,
        ...updates.timeSchedule
      };
    }

    if (updates.estimatedCost !== undefined) {
      maintenance.serviceDetails.estimatedCost = Number(updates.estimatedCost);
    }
    if (updates.description !== undefined) {
      maintenance.serviceDetails.description = updates.description;
    }
    if (updates.serviceProvider !== undefined) {
      maintenance.serviceDetails.serviceProvider = updates.serviceProvider;
    }

    await maintenance.save();

    return res.status(200).json({
      success: true,
      message: 'Maintenance schedule updated successfully!',
      data: { maintenance }
    });

  } catch (error) {
    console.error('Update maintenance error:', error);
    return res.status(500).json({
      success: false,
      message: 'Update failed',
      error: error.message
    });
  }
};

exports.cancelMaintenanceSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { reason } = req.body;

    const maintenance = await MaintenanceSchedule.findById(scheduleId);
    if (!maintenance) return res.status(404).json({ success: false, message: 'Not found' });

    maintenance.status = 'cancelled';
    maintenance.adminComments = reason || 'Cancelled by admin';
    await maintenance.save();

    res.status(200).json({ success: true, message: 'Cancelled successfully' });

  } catch (error) {
    console.error('Cancel error:', error);
    res.status(500).json({ success: false, message: 'Cancel failed' });
  }
};

exports.getMaintenanceCostSummary = async (req, res) => {
  try {
    const { vehicleId, startDate, endDate, maintenanceType } = req.query;
    const match = { status: 'completed' };
    if (vehicleId) match.vehicle = vehicleId;
    if (maintenanceType) match.maintenanceType = maintenanceType;
    if (startDate || endDate) {
      match.completedAt = {};
      if (startDate) match.completedAt.$gte = new Date(startDate);
      if (endDate) match.completedAt.$lte = new Date(endDate);
    }

    const [summary, byType] = await Promise.all([
      MaintenanceSchedule.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalCost: { $sum: '$serviceDetails.actualCost' },
            count: { $sum: 1 }
          }
        }
      ]),
      MaintenanceSchedule.aggregate([
        { $match: match },
        { $group: { _id: '$maintenanceType', total: { $sum: '$serviceDetails.actualCost' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: { summary: summary[0] || {}, costByType: byType }
    });

  } catch (error) {
    console.error('Cost summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to get summary' });
  }
};

// ADMIN: Approve or Reject Driver's Service Completion
exports.approveOrRejectService = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { action, adminComments, actualCost, laborCost, partsCost, additionalCost, parts } = req.body;

    // action must be "approve" or "reject"
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be "approve" or "reject"'
      });
    }

    const maintenance = await MaintenanceSchedule.findById(scheduleId)
      .populate('vehicle');

    if (!maintenance) {
      return res.status(404).json({ success: false, message: 'Maintenance schedule not found' });
    }

    if (maintenance.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        message: `Cannot ${action}. Current status: ${maintenance.status}`
      });
    }

    const adminId = req.admin._id;
    const adminName = req.admin.name || 'Admin';

    if (action === 'approve') {
      maintenance.status = 'completed';
      maintenance.completedAt = new Date();
      maintenance.completedBy = adminId;
      maintenance.adminComments = adminComments || 'Approved by admin';

      if (actualCost !== undefined) {
        maintenance.serviceDetails.actualCost = Number(actualCost);
      }

      if (laborCost || partsCost || additionalCost) {
        maintenance.costBreakdown = {
          laborCost: Number(laborCost) || 0,
          partsCost: Number(partsCost) || 0,
          additionalCost: Number(additionalCost) || 0,
          totalCost: (Number(laborCost) || 0) + (Number(partsCost) || 0) + (Number(additionalCost) || 0)
        };
      }

      if (parts && Array.isArray(parts)) {
        maintenance.serviceDetails.parts = parts;
      }

      if (maintenance.vehicle) {
        maintenance.vehicle.lastServiceDate = new Date();
        await maintenance.vehicle.save();
      }

      const expense = new Expense({
        expenseType: 'maintenance',
        driver: maintenance.documents.find(d => d.uploadedByType === 'driver')?.uploadedBy || null,
        vehicle: {
          _id: maintenance.vehicle?._id,
          vehicleNumber: maintenance.vehicle?.vehicleNumber,
        },
        meterReading: {
          current: maintenance.vehicle?.currentMeterReading || 0,
          previous: maintenance.vehicle?.previousMeterReading || 0
        },
        fuelDetails: { totalAmount: maintenance.serviceDetails.actualCost || 0 },
        description: `${maintenance.maintenanceType.replace(/_/g, ' ')} - Approved Service`,
        category: 'scheduled',
        approvalStatus: 'approved_by_finance',
        paymentStatus: 'paid',
        recordedBy: adminId
      });

      await expense.save();
      maintenance.serviceHistoryId = expense._id;

      if (maintenance.isRecurring && !maintenance.nextScheduleCreated) {
        await MaintenanceSchedule.createNextSchedule(scheduleId);
      }

      if (global.io) {
        global.io.to(`driver_${maintenance.vehicle?.assignedDriver}`).emit('service-approved', {
          scheduleId: maintenance._id,
          vehicleNumber: maintenance.vehicle?.vehicleNumber,
          message: 'Your service has been approved by admin!',
          actualCost: maintenance.serviceDetails.actualCost
        });
      }

      await maintenance.save();

      return res.status(200).json({
        success: true,
        message: 'Service approved successfully!',
        data: { maintenance, expenseId: expense._id }
      });

    } else if (action === 'reject') {
      maintenance.status = 'in_progress';
      maintenance.adminComments = adminComments || 'Rejected by admin. Please re-upload proper bill.';
      maintenance.driverMarkedComplete = false;

      if (global.io) {
        global.io.to(`driver_${maintenance.vehicle?.assignedDriver}`).emit('service-rejected', {
          scheduleId: maintenance._id,
          vehicleNumber: maintenance.vehicle?.vehicleNumber,
          message: 'Your service request was rejected.',
          reason: adminComments || 'Invalid receipt or details'
        });
      }

      await maintenance.save();

      return res.status(200).json({
        success: true,
        message: 'Service rejected. Driver notified.',
        data: { maintenance }
      });
    }

  } catch (error) {
    console.error('Approve/Reject error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process request',
      error: error.message
    });
  }
};
