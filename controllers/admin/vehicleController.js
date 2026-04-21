// const Vehicle = require('../../models/Vehicle'); 
// const Driver = require('../../models/Driver');
// const { successResponse, errorResponse } = require('../../utils/responseHelper');

// //  CREATE VEHICLE 
// exports.createVehicle = async (req, res) => {
//   try {
//     const {
//       vehicleNumber,
//       registrationNumber,
//       vehicleType,
//       manufacturer,
//       model,
//       year,
//       color,
//       registrationDate,
//       registrationExpiryDate,
//       insuranceProvider,
//       insurancePolicyNumber,
//       insuranceExpiryDate,
//       insuranceAmount,
//       currentMeterReading,
//       fuelType,
//       seatingCapacity,
//       loadCapacity,
//       serviceIntervalKm,
//       serviceIntervalDays,
//       purchaseDate,
//       purchasePrice,
//       notes
//     } = req.body;

//     // Check if vehicle already exists
//     const existingVehicle = await Vehicle.findOne({
//       $or: [
//         { vehicleNumber: vehicleNumber.toUpperCase() },
//         { registrationNumber: registrationNumber.toUpperCase() },
//         { insurancePolicyNumber }
//       ]
//     });

//     if (existingVehicle) {
//       if (existingVehicle.vehicleNumber === vehicleNumber.toUpperCase()) {
//         return errorResponse(res, 'Vehicle number already exists', 400);
//       }
//       if (existingVehicle.registrationNumber === registrationNumber.toUpperCase()) {
//         return errorResponse(res, 'Registration number already exists', 400);
//       }
//       if (existingVehicle.insurancePolicyNumber === insurancePolicyNumber) {
//         return errorResponse(res, 'Insurance policy number already exists', 400);
//       }
//     }

//     // Create vehicle
//     const vehicle = await Vehicle.create({
//       vehicleNumber: vehicleNumber.toUpperCase(),
//       registrationNumber: registrationNumber.toUpperCase(),
//       vehicleType,
//       manufacturer,
//       model,
//       year,
//       color,
//       registrationDate,
//       registrationExpiryDate,
//       insuranceProvider,
//       insurancePolicyNumber,
//       insuranceExpiryDate,
//       insuranceAmount,
//       currentMeterReading: currentMeterReading || 0,
//       fuelType,
//       seatingCapacity,
//       loadCapacity,
//       serviceIntervalKm: serviceIntervalKm || 5000,
//       serviceIntervalDays: serviceIntervalDays || 180,
//       purchaseDate,
//       purchasePrice,
//       currentValue: purchasePrice,
//       notes,
//       status: 'available'
//     });

//     return successResponse(res, 'Vehicle created successfully', {
//       vehicle
//     }, 201);

//   } catch (error) {
//     console.error('Create Vehicle Error:', error);
//     if (error.name === 'ValidationError') {
//       const messages = Object.values(error.errors).map(err => err.message);
//       return errorResponse(res, messages.join(', '), 400);
//     }
//     return errorResponse(res, 'Failed to create vehicle', 500);
//   }
// };

// // ======================== GET ALL VEHICLES ========================

// exports.getAllVehicles = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 20,
//       status,
//       vehicleType,
//       search,
//       assignedTo,
//       serviceDue,
//       insuranceExpiring,
//       sortBy = 'createdAt',
//       sortOrder = 'desc'
//     } = req.query;

//     const query = {};

//     // Filters
//     if (status) query.status = status;
//     if (vehicleType) query.vehicleType = vehicleType;
//     if (assignedTo) query.assignedTo = assignedTo;

//     // Search
//     if (search) {
//       query.$or = [
//         { vehicleNumber: { $regex: search, $options: 'i' } },
//         { registrationNumber: { $regex: search, $options: 'i' } },
//         { manufacturer: { $regex: search, $options: 'i' } },
//         { model: { $regex: search, $options: 'i' } }
//       ];
//     }

//     // Service due filter
//     if (serviceDue === 'true') {
//       query.$or = [
//         { nextServiceDate: { $lte: new Date() } },
//         {
//           $expr: {
//             $gte: ['$currentMeterReading', '$nextServiceReading']
//           }
//         }
//       ];
//     }

//     // Insurance expiring within 30 days
//     if (insuranceExpiring === 'true') {
//       const thirtyDaysFromNow = new Date();
//       thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
//       query.insuranceExpiryDate = {
//         $gte: new Date(),
//         $lte: thirtyDaysFromNow
//       };
//     }

//     const skip = (parseInt(page) - 1) * parseInt(limit);
//     const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

//     const [vehicles, total] = await Promise.all([
//       Vehicle.find(query)
//         .populate('assignedTo', 'name email phone')
//         .sort(sortOptions)
//         .skip(skip)
//         .limit(parseInt(limit)),
//       Vehicle.countDocuments(query)
//     ]);

//     return successResponse(res, 'Vehicles retrieved successfully', {
//       vehicles,
//       pagination: {
//         total,
//         page: parseInt(page),
//         pages: Math.ceil(total / parseInt(limit))
//       }
//     });

//   } catch (error) {
//     console.error('Get All Vehicles Error:', error);
//     return errorResponse(res, 'Failed to retrieve vehicles', 500);
//   }
// };  

// // ======================== GET VEHICLE BY ID ========================

// exports.getVehicleById = async (req, res) => {
//   try {
//     const { vehicleId } = req.params;

//     const vehicle = await Vehicle.findById(vehicleId)
//       .populate('assignedTo', 'name email phone licenseNumber')
//       .populate('assignedBy', 'name email')
//       .populate('maintenanceRecords.createdBy', 'name email');

//     if (!vehicle) {
//       return errorResponse(res, 'Vehicle not found', 404);
//     }

//     return successResponse(res, 'Vehicle retrieved successfully', {
//       vehicle,
//       isServiceDue: vehicle.isServiceDue,
//       insuranceExpiryWarning: vehicle.insuranceExpiryWarning
//     });

//   } catch (error) {
//     console.error('Get Vehicle By ID Error:', error);
//     return errorResponse(res, 'Failed to retrieve vehicle', 500);
//   }
// };

// // ======================== UPDATE VEHICLE ========================

// exports.updateVehicle = async (req, res) => {
//   try {
//     const { vehicleId } = req.params;
//     const updates = req.body;

//     // Remove fields that shouldn't be updated directly
//     delete updates.maintenanceRecords;
//     delete updates.assignedTo;
//     delete updates.currentMeterReading;

//     const vehicle = await Vehicle.findByIdAndUpdate(
//       vehicleId,
//       updates,
//       { new: true, runValidators: true }
//     );

//     if (!vehicle) {
//       return errorResponse(res, 'Vehicle not found', 404);
//     }

//     return successResponse(res, 'Vehicle updated successfully', {
//       vehicle
//     });

//   } catch (error) {
//     console.error('Update Vehicle Error:', error);
//     if (error.name === 'ValidationError') {
//       const messages = Object.values(error.errors).map(err => err.message);
//       return errorResponse(res, messages.join(', '), 400);
//     }
//     return errorResponse(res, 'Failed to update vehicle', 500);
//   }
// };

// // DELETE VEHICLE soft delete
// // exports.deleteVehicle = async (req, res) => {
// //   try {
// //     const { vehicleId } = req.params;

// //     const vehicle = await Vehicle.findById(vehicleId);

// //     if (!vehicle) {
// //       return errorResponse(res, 'Vehicle not found', 404);
// //     }

// //     // Check if vehicle is assigned
// //     if (vehicle.assignedTo) {
// //       return errorResponse(res, 'Cannot delete vehicle that is assigned to a driver. Unassign first.', 400);
// //     }

// //     // Soft delete - change status
// //     vehicle.status = 'retired';
// //     vehicle.isActive = false;
// //     await vehicle.save();

// //     return successResponse(res, 'Vehicle deleted successfully', {
// //       vehicleId: vehicle._id
// //     });

// //   } catch (error) {
// //     console.error('Delete Vehicle Error:', error);
// //     return errorResponse(res, 'Failed to delete vehicle', 500);
// //   }
// // };

// exports.deleteVehicle = async (req, res) => {
//   try {
//     const { vehicleId } = req.params;

//     const vehicle = await Vehicle.findByIdAndUpdate(
//       vehicleId,
//       {
//         $set: {
//           status: 'retired',
//           isActive: false,
//           retiredAt: new Date(),
//           retiredBy: req.user._id
//         }
//       },
//       { new: true }
//     );

//     if (!vehicle) {
//       return errorResponse(res, 'Vehicle not found', 404);
//     }

//     if (vehicle.assignedTo) {
//       return errorResponse(res, 'Cannot delete assigned vehicle. Unassign first.', 400);
//     }

//     return successResponse(res, 'Vehicle retired successfully', {
//       vehicle: {
//         id: vehicle._id,
//         vehicleNumber: vehicle.vehicleNumber,
//         status: vehicle.status,
//         isActive: vehicle.isActive,
//         retiredAt: vehicle.retiredAt
//       }
//     });

//   } catch (error) {
//     console.error('Delete Vehicle Error:', error);
//     return errorResponse(res, 'Failed to retire vehicle', 500);
//   }
// };

// exports.updateMeterReading = async (req, res) => {
//   try {
//     const { vehicleId } = req.params;
//     const { meterReading, notes } = req.body;

//     if (!meterReading || meterReading < 0) {
//       return errorResponse(res, 'Valid meter reading is required', 400);
//     }

//     const vehicle = await Vehicle.findById(vehicleId);

//     if (!vehicle) {
//       return errorResponse(res, 'Vehicle not found', 404);
//     }

//     if (meterReading < vehicle.currentMeterReading) {
//       return errorResponse(res, 'New meter reading cannot be less than current reading', 400);
//     }

//     vehicle.updateMeterReading(meterReading);
//     await vehicle.save();

//     return successResponse(res, 'Meter reading updated successfully', {
//       vehicle: {
//         id: vehicle._id,
//         vehicleNumber: vehicle.vehicleNumber,
//         currentMeterReading: vehicle.currentMeterReading,
//         lastMeterUpdate: vehicle.lastMeterUpdate,
//         nextServiceReading: vehicle.nextServiceReading,
//         isServiceDue: vehicle.isServiceDue
//       }
//     });

//   } catch (error) {
//     console.error('Update Meter Reading Error:', error);
//     return errorResponse(res, error.message || 'Failed to update meter reading', 500);
//   }
// };

// // ======================== assign vehicle to driver ========================


// exports.assignVehicleToDriver = async (req, res) => {
//   try {
//     const { vehicleId } = req.params;
//     const { driverId } = req.body;

//     if (!driverId) {
//       return errorResponse(res, 'driverId is required', 400);
//     }

//     const vehicle = await Vehicle.findById(vehicleId);
//     const driver = await Driver.findById(driverId);

//     if (!vehicle) return errorResponse(res, 'Vehicle not found', 404);
//     if (!driver) return errorResponse(res, 'Driver not found', 404);

//     // Vehicle already assigned?
//     if (vehicle.assignedTo) {
//       return errorResponse(res, `Vehicle already assigned to ${vehicle.assignedTo.name || 'another driver'}`, 400);
//     }

//     // Driver already has vehicle?
//     if (driver.vehicle) {
//       return errorResponse(res, 'Driver already has a vehicle assigned', 400);
//     }


//     vehicle.assignedTo = driver._id;
//     vehicle.assignedBy = req.user._id;
//     vehicle.assignedAt = new Date();
//     vehicle.status = 'assigned';

//     driver.vehicle = vehicle._id;

//     await Promise.all([vehicle.save(), driver.save()]);

//     await vehicle.populate('assignedTo', 'name phone');

//     return successResponse(res, 'Vehicle assigned to driver successfully!', {
//       vehicle: {
//         _id: vehicle._id,
//         vehicleNumber: vehicle.vehicleNumber,
//         status: vehicle.status,
//         assignedTo: vehicle.assignedTo.name
//       },
//       driver: {
//         _id: driver._id,
//         name: driver.name,
//         phone: driver.phone,
//         assignedVehicle: vehicle.vehicleNumber
//       }
//     });

//   } catch (error) {
//     console.error('Assign Vehicle Error:', error);
//     return errorResponse(res, 'Failed to assign vehicle', 500);
//   }
// };

// exports.unassignVehicleFromDriver = async (req, res) => {
//   try {
//     const { vehicleId } = req.params;

//     const vehicle = await Vehicle.findById(vehicleId).populate('assignedTo');

//     if (!vehicle) return errorResponse(res, 'Vehicle not found', 404);
//     if (!vehicle.assignedTo) return errorResponse(res, 'Vehicle not assigned', 400);

//     const driver = await Driver.findById(vehicle.assignedTo._id);

//     // Unassign
//     vehicle.assignedTo = null;
//     vehicle.assignedBy = null;
//     vehicle.assignedAt = null;
//     vehicle.status = 'available';

//     if (driver) {
//       driver.vehicle = null;
//       await driver.save();
//     }

//     await vehicle.save();

//     return successResponse(res, 'Vehicle unassigned successfully', {
//       vehicle: {
//         _id: vehicle._id,
//         vehicleNumber: vehicle.vehicleNumber,
//         status: 'available'
//       }
//     });

//   } catch (error) {
//     console.error('Unassign Error:', error);
//     return errorResponse(res, 'Failed to unassign', 500);
//   }
// };

// // GET DRIVERS WITHOUT VEHICLE 
// exports.getDriversWithoutVehicle = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;

//     const query = {
//       $or: [
//         { vehicleNumber: null },
//         { vehicleNumber: '' },
//         { vehicleType: null }
//       ],
//       isActive: true
//     };

//     const [drivers, total] = await Promise.all([
//       Driver.find(query)
//         .select('name email phone licenseNumber profileStatus createdAt')
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit),
//       Driver.countDocuments(query)
//     ]);

//     return successResponse(res, 'Drivers without vehicle retrieved successfully', {
//       drivers,
//       pagination: {
//         total,
//         page,
//         pages: Math.ceil(total / limit)
//       }
//     });

//   } catch (error) {
//     console.error('Get Drivers Without Vehicle Error:', error);
//     return errorResponse(res, 'Failed to retrieve drivers', 500);
//   }
// };


// //  UPDATE VEHICLE STATUS 
// exports.updateVehicleStatus = async (req, res) => {
//   try {
//     const { vehicleId } = req.params;
//     const { status, notes } = req.body;

//     const validStatuses = ['available', 'assigned', 'in_service', 'out_of_service', 'retired'];

//     if (!validStatuses.includes(status)) {
//       return errorResponse(res, 'Invalid status', 400);
//     }

//     const vehicle = await Vehicle.findById(vehicleId);

//     if (!vehicle) {
//       return errorResponse(res, 'Vehicle not found', 404);
//     }

//     vehicle.status = status;
//     if (notes) vehicle.notes = notes;
//     await vehicle.save();

//     return successResponse(res, 'Vehicle status updated successfully', {
//       vehicle: {
//         id: vehicle._id,
//         vehicleNumber: vehicle.vehicleNumber,
//         status: vehicle.status
//       }
//     });

//   } catch (error) {
//     console.error('Update Vehicle Status Error:', error);
//     return errorResponse(res, 'Failed to update vehicle status', 500);
//   }
// };

// // GET VEHICLE STATISTICS
// exports.getVehicleStatistics = async (req, res) => {
//   try {
//     const [
//       totalVehicles,
//       availableVehicles,
//       assignedVehicles,
//       inServiceVehicles,
//       serviceDueVehicles,
//       insuranceExpiringVehicles,
//       vehiclesByType
//     ] = await Promise.all([
//       Vehicle.countDocuments({ isActive: true }),
//       Vehicle.countDocuments({ status: 'available', isActive: true }),
//       Vehicle.countDocuments({ status: 'assigned', isActive: true }),
//       Vehicle.countDocuments({ status: 'in_service', isActive: true }),
//       Vehicle.countDocuments({
//         isActive: true,
//         $or: [
//           { nextServiceDate: { $lte: new Date() } },
//           { $expr: { $gte: ['$currentMeterReading', '$nextServiceReading'] } }
//         ]
//       }),
//       Vehicle.countDocuments({
//         isActive: true,
//         insuranceExpiryDate: {
//           $gte: new Date(),
//           $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
//         }
//       }),
//       Vehicle.aggregate([
//         { $match: { isActive: true } },
//         { $group: { _id: '$vehicleType', count: { $sum: 1 } } }
//       ])
//     ]);

//     return successResponse(res, 'Vehicle statistics retrieved successfully', {
//       totalVehicles,
//       availableVehicles,
//       assignedVehicles,
//       inServiceVehicles,
//       serviceDueVehicles,
//       insuranceExpiringVehicles,
//       vehiclesByType
//     });

//   } catch (error) {
//     console.error('Get Vehicle Statistics Error:', error);
//     return errorResponse(res, 'Failed to retrieve vehicle statistics', 500);
//   }
// };

// module.exports = exports;


const Vehicle = require('../../models/Vehicle');
const Driver = require('../../models/Driver');
const mongoose = require('mongoose');
const { successResponse, errorResponse } = require("../../utils/responseHelper")
const {logDriverActivity} = require("../../utils/activityLogger")

// GET - List all vehicles (EJS render)
exports.getAllVehicles = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      vehicleType,
      search,
      assignedTo
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (vehicleType) query.vehicleType = vehicleType;
    if (assignedTo) query.assignedTo = assignedTo;

    if (search) {
      query.$or = [
        { vehicleNumber: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { createdAt: -1 };

    const vehicles = await Vehicle.find(query)
      .populate('assignedTo', 'name email phone')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Vehicle.countDocuments(query);

    // Fetch drivers who are NOT assigned any vehicle (for assign dropdown)
    const unassignedDrivers = await Driver.find({
      $or: [
        { vehicle: null },
        { vehicle: { $exists: false } }
      ],
      profileStatus: 'approved',
      isActive: true
    }).select('name email phone').sort({ name: 1 });

    res.render('vehicles_list', {
      title: 'Vehicle Management',
      vehicles,
      drivers: unassignedDrivers,  // ← ADD THIS LINE (pass drivers to EJS)
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      },
      filters: req.query,
      url: req.originalUrl,
      messages: req.flash(),
      admin: req.admin
    });

  } catch (error) {
    console.error('Get All Vehicles Error:', error);
    req.flash('error', 'Failed to load vehicles');
    res.redirect('/admin/vehicles');
  }
};

// GET - Create form
exports.getCreateVehicle = async (req, res) => {
  try {
    const drivers = await Driver.find({ vehicle: null, profileStatus: 'approved' })
      .select('name email phone');

    res.render('vehicle_create', {
      title: 'Add New Vehicle',
      drivers,
      messages: req.flash(),
      url: req.originalUrl,
      admin: req.admin
    });

  } catch (error) {
    console.error('Get Create Vehicle Error:', error);
    req.flash('error', 'Failed to load form');
    res.redirect('/admin/vehicles');
  }
};

// // POST - Create vehicle
// exports.createVehicle = async (req, res) => {
//   try {
//     const data = req.body;

//     if (!data.vehicleNumber || !data.registrationNumber) {
//       req.flash('error', 'Vehicle & Registration Number required');
//       return res.redirect('/admin/vehicles/create');
//     }

//     const vehicle = await Vehicle.create({
//       ...data,
//       vehicleNumber: data.vehicleNumber.toUpperCase(),
//       registrationNumber: data.registrationNumber.toUpperCase(),
//       status: 'available',
//       createdBy: req.admin._id
//     });

//     req.flash('success', 'Vehicle created successfully!');
//     res.redirect('/admin/vehicles');

//   } catch (error) {
//     console.error('Create Vehicle Error:', error);
//     req.flash('error', error.message || 'Failed to create vehicle');
//     res.redirect('/admin/vehicles/create');
//   }
// };

// exports.createVehicle = async (req, res) => {
//   try {
//     const data = req.body;

//     // Required fields validation (client-side + server-side)
//     const requiredFields = [
//       'vehicleNumber', 'registrationNumber', 'vehicleType', 'manufacturer',
//       'model', 'year', 'color', 'registrationDate', 'registrationExpiryDate',
//       'insuranceProvider', 'insurancePolicyNumber', 'insuranceExpiryDate', 'insuranceAmount'
//     ];

//     for (const field of requiredFields) {
//       if (!data[field]) {
//         req.flash('error', `${field.replace(/([A-Z])/g, ' $1').trim()} is required`);
//         return res.redirect('/admin/vehicles/create');
//       }
//     }

//     const vehicle = await Vehicle.create({
//       ...data,
//       vehicleNumber: data.vehicleNumber.toUpperCase(),
//       registrationNumber: data.registrationNumber.toUpperCase(),
//       status: 'available',
//       createdBy: req.admin._id
//     });

//     req.flash('success', 'Vehicle created successfully!');
//     res.redirect('/admin/vehicles');

//   } catch (error) {
//     console.error('Create Vehicle Error:', error);
//     if (error.name === 'ValidationError') {
//       const messages = Object.values(error.errors).map(err => err.message).join(', ');
//       req.flash('error', messages);
//     } else {
//       req.flash('error', 'Failed to create vehicle');
//     }
//     res.redirect('/admin/vehicles/create');
//   }
// };

exports.createVehicle = async (req, res) => {
  try {
    const data = req.body;

    // Required fields validation
    const requiredFields = [
      'vehicleNumber', 'vehicleType', 'manufacturer',
      'model', 'year', 'color', 'registrationDate', 'registrationExpiryDate',
      'insuranceProvider', 'insurancePolicyNumber', 'insuranceExpiryDate', 'insuranceAmount'
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        req.flash('error', `${field.replace(/([A-Z])/g, ' $1').trim()} is required`);
        return res.redirect('/admin/vehicles/create');
      }
    }

    // Special handling for assignedTo – agar empty string aaya to null kar do
    let assignedTo = data.assignedTo;
    if (assignedTo === "" || assignedTo === undefined || assignedTo === null) {
      assignedTo = null; // ya undefined bhi chalega
    }
    // Optional: Agar assignedTo valid ObjectId nahi hai to bhi null kar do
    else if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
      assignedTo = null;
    }

    // const vehicle = await Vehicle.create({
    //   ...data,
    //   vehicleNumber: data.vehicleNumber.toUpperCase(),
    //   registrationNumber: data.registrationNumber.toUpperCase(),
    //   assignedTo: assignedTo,           // ← Yeh line fix karegi error
    //   status: 'available',
    //   createdBy: req.admin._id
    // });

    const vehicle = await Vehicle.create({
      ...data,
      vehicleNumber: data.vehicleNumber.toUpperCase(),
      assignedTo: assignedTo || null,         // already fixed
      isAvailable: true,                      // ← Yeh line add kar do
      status: 'available',                    // ← Yeh bhi add ya confirm karo
      createdBy: req.admin._id
    });

    req.flash('success', 'Vehicle created successfully!');
    res.redirect('/admin/vehicles');

  } catch (error) {
    console.error('Create Vehicle Error:', error);

    let errorMessage = 'Failed to create vehicle';

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message).join(', ');
      errorMessage = messages;
    } else if (error.name === 'CastError') {
      errorMessage = 'Invalid driver assignment (assignedTo must be valid ID or empty)';
    }

    req.flash('error', errorMessage);
    res.redirect('/admin/vehicles/create');
  }
};

// GET - Edit form
exports.getEditVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.vehicleId);
    if (!vehicle) {
      req.flash('error', 'Vehicle not found');
      return res.redirect('/admin/vehicles');
    }

    const drivers = await Driver.find({
      $or: [{ _id: vehicle.assignedTo }, { vehicle: null }],
      profileStatus: 'approved'
    }).select('name email phone');

    res.render('vehicle_edit', {
      title: 'Edit Vehicle',
      vehicle,
      drivers,
      messages: req.flash(),
      url: req.originalUrl,
      admin: req.admin
    });

  } catch (error) {
    console.error('Edit Vehicle Error:', error);
    req.flash('error', 'Failed to load edit form');
    res.redirect('/admin/vehicles');
  }
};

// POST - Update vehicle
exports.updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.vehicleId,
      req.body,
      { new: true, runValidators: true }
    );

    if (!vehicle) {
      req.flash('error', 'Vehicle not found');
      return res.redirect('/admin/vehicles');
    }

    req.flash('success', 'Vehicle updated successfully!');
    res.redirect('/admin/vehicles');

  } catch (error) {
    console.error('Update Vehicle Error:', error);
    req.flash('error', error.message || 'Failed to update');
    res.redirect(`/admin/vehicles/edit/${req.params.vehicleId}`);
  }
};

// POST - Delete vehicle (soft delete)
exports.deleteVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findByIdAndUpdate(
      vehicleId,
      {
        $set: {
          status: 'retired',
          isActive: false,
          retiredAt: new Date(),
          retiredBy: req.user._id
        }
      },
      { new: true }
    );

    if (!vehicle) {
      return errorResponse(res, 'Vehicle not found', 404);
    }

    if (vehicle.assignedTo) {
      return errorResponse(res, 'Cannot delete assigned vehicle. Unassign first.', 400);
    }

    // return successResponse(res, 'Vehicle retired successfully', {
    //   vehicle: {
    //     id: vehicle._id,
    //     vehicleNumber: vehicle.vehicleNumber,
    //     status: vehicle.status,
    //     isActive: vehicle.isActive,
    //     retiredAt: vehicle.retiredAt
    //   }
    // });

    res.redirect("/admin/vehicles")

  } catch (error) {
    console.error('Delete Vehicle Error:', error);
    return errorResponse(res, 'Failed to retire vehicle', 500);
  }
};

// POST - Assign vehicle to driver
exports.assignVehicleToDriver = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { driverId } = req.body;

    const vehicle = await Vehicle.findById(vehicleId);
    const driver = await Driver.findById(driverId);

    if (!vehicle) return errorResponse(res, 'Vehicle not found', 404);
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    // Clear previous assignment if any
    if (vehicle.assignedTo) {
      const oldDriver = await Driver.findById(vehicle.assignedTo);
      if (oldDriver) {
        oldDriver.vehicle = null;
        await oldDriver.save();

        // ← Optional: Log unassignment from old driver
        await logDriverActivity(
          oldDriver._id,
          'VEHICLE_UNASSIGNED_BY_ADMIN',
          {
            vehicleId: vehicle._id,
            vehicleNumber: vehicle.vehicleNumber,
            assignedBy: req.admin?._id || 'system',
            previous: true
          },
          req
        );
      }
    }

    // Assign new
    vehicle.assignedTo = driverId;
    vehicle.assignedBy = req.admin._id; // or req.user._id
    vehicle.assignedAt = new Date();
    vehicle.status = 'assigned';

    driver.vehicle = vehicle._id;

    await vehicle.save();
    await driver.save();

    // ★★★ IMPORTANT: Log the assignment for the new driver ★★★
    await logDriverActivity(
      driver._id,
      'VEHICLE_ASSIGNED',
      {
        vehicleId: vehicle._id,
        vehicleNumber: vehicle.vehicleNumber,
        assignedBy: req.admin._id || 'system',
        assignedAt: vehicle.assignedAt
      },
      req
    );

    req.flash('success', 'Vehicle assigned successfully!');
    res.redirect("/admin/vehicles");

  } catch (error) {
    console.error('Assign Error:', error);
    req.flash('error', 'Failed to assign vehicle');
    res.redirect("/admin/vehicles");
  }
};

// POST - Unassign vehicle
exports.unassignVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      req.flash('error', 'Vehicle not found');
      return res.redirect('/admin/vehicles');
    }

    if (!vehicle.assignedTo) {
      req.flash('error', 'Vehicle not assigned');
      return res.redirect('/admin/vehicles');
    }

    const driver = await Driver.findById(vehicle.assignedTo);
    
    if (driver) {
      driver.vehicle = null;
      await driver.save();

      // ★★★ Log unassignment for the driver ★★★
      await logDriverActivity(
        driver._id,
        'VEHICLE_UNASSIGNED',
        {
          vehicleId: vehicle._id,
          vehicleNumber: vehicle.vehicleNumber,
          unassignedBy: req.admin?._id || 'system',
          previousDriver: true
        },
        req
      );
    }

    vehicle.assignedTo = null;
    vehicle.status = 'available';
    await vehicle.save();

    req.flash('success', 'Vehicle unassigned successfully!');
    res.redirect('/admin/vehicles');

  } catch (error) {
    console.error('Unassign Error:', error);
    req.flash('error', 'Failed to unassign vehicle');
    res.redirect('/admin/vehicles');
  }
};