// const Region = require('../../models/Region');
// const Customer = require('../../models/Customer');
// const { successResponse, errorResponse } = require('../../utils/responseHelper');

// //  CREATE REGION 
// exports.createRegion = async (req, res) => {
//   try {
//     const {
//       regionCode,
//       regionName,
//       description,
//       state,
//       cities,
//       zipcodes,
//       manager,
//       settings,
//       contactInfo,
//       notes
//     } = req.body;

//     // Check if region code already exists
//     const existingRegion = await Region.findOne({
//       regionCode: regionCode.toUpperCase()
//     });

//     if (existingRegion) {
//       return errorResponse(res, 'Region code already exists', 400);
//     }

//     // Create region
//     const region = await Region.create({
//       regionCode: regionCode.toUpperCase(),
//       regionName,
//       description,
//       state,
//       cities: cities || [],
//       zipcodes: zipcodes || [],
//       manager,
//       settings: settings || {},
//       contactInfo: contactInfo || {},
//       notes
//     });

//     // Auto-assign customers in this region based on zipcodes
//     if (zipcodes && zipcodes.length > 0) {
//       const zipcodesToAssign = zipcodes.map(z => z.zipcode);

//       await Customer.updateMany(
//         {
//           'locations.zipcode': { $in: zipcodesToAssign },
//           'locations.regionAutoAssigned': true
//         },
//         {
//           $set: { 'locations.$[elem].regionId': region._id }
//         },
//         {
//           arrayFilters: [{ 'elem.zipcode': { $in: zipcodesToAssign } }]
//         }
//       );
//     }

//     return successResponse(res, 'Region created successfully', {
//       region
//     }, 201);

//   } catch (error) {
//     console.error('Create Region Error:', error);
//     if (error.name === 'ValidationError') {
//       const messages = Object.values(error.errors).map(err => err.message);
//       return errorResponse(res, messages.join(', '), 400);
//     }
//     return errorResponse(res, 'Failed to create region', 500);
//   }
// };

// //  GET ALL REGIONS 

// exports.getAllRegions = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 20,
//       state,
//       isActive,
//       search,
//       sortBy = 'regionName',
//       sortOrder = 'asc'
//     } = req.query;

//     const query = {};

//     // Filters
//     if (state) query.state = state;
//     if (isActive !== undefined) query.isActive = isActive === 'true';

//     // Search
//     if (search) {
//       query.$or = [
//         { regionCode: { $regex: search, $options: 'i' } },
//         { regionName: { $regex: search, $options: 'i' } },
//         { state: { $regex: search, $options: 'i' } }
//       ];
//     }

//     const skip = (parseInt(page) - 1) * parseInt(limit);
//     const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

//     const [regions, total] = await Promise.all([
//       Region.find(query)
//         .populate('manager', 'name email phone')
//         .sort(sortOptions)
//         .skip(skip)
//         .limit(parseInt(limit)),
//       Region.countDocuments(query)
//     ]);

//     return successResponse(res, 'Regions retrieved successfully', {
//       regions,
//       pagination: {
//         total,
//         page: parseInt(page),
//         pages: Math.ceil(total / parseInt(limit))
//       }
//     });

//   } catch (error) {
//     console.error('Get All Regions Error:', error);
//     return errorResponse(res, 'Failed to retrieve regions', 500);
//   }
// };

// //  GET REGION BY ID 

// exports.getRegionById = async (req, res) => {
//   try {
//     const { regionId } = req.params;

//     const region = await Region.findById(regionId)
//       .populate('manager', 'name email phone');

//     if (!region) {
//       return errorResponse(res, 'Region not found', 404);
//     }

//     // Get customer count for this region
//     const customerCount = await Customer.countDocuments({
//       'locations.regionId': region._id
//     });

//     return successResponse(res, 'Region retrieved successfully', {
//       region,
//       customerCount
//     });

//   } catch (error) {
//     console.error('Get Region By ID Error:', error);
//     return errorResponse(res, 'Failed to retrieve region', 500);
//   }
// };

// //  UPDATE REGION 

// exports.updateRegion = async (req, res) => {
//   try {
//     const { regionId } = req.params;
//     const updates = req.body;

//     // Remove fields that shouldn't be updated directly
//     delete updates.regionCode;
//     delete updates.stats;

//     const region = await Region.findByIdAndUpdate(
//       regionId,
//       updates,
//       { new: true, runValidators: true }
//     );

//     if (!region) {
//       return errorResponse(res, 'Region not found', 404);
//     }

//     return successResponse(res, 'Region updated successfully', {
//       region
//     });

//   } catch (error) {
//     console.error('Update Region Error:', error);
//     if (error.name === 'ValidationError') {
//       const messages = Object.values(error.errors).map(err => err.message);
//       return errorResponse(res, messages.join(', '), 400);
//     }
//     return errorResponse(res, 'Failed to update region', 500);
//   }
// };

// //  DELETE REGION 
// // exports.deleteRegion = async (req, res) => {
// //   try {
// //     const { regionId } = req.params;

// //     const region = await Region.findById(regionId);

// //     if (!region) {
// //       return errorResponse(res, 'Region not found', 404);
// //     }

// //     // Check if any customers are assigned to this region
// //     const customerCount = await Customer.countDocuments({
// //       'locations.regionId': region._id
// //     });

// //     if (customerCount > 0) {
// //       return errorResponse(res, `Cannot delete region. ${customerCount} customer(s) are assigned to this region.`, 400);
// //     }

// //     // Soft delete
// //     region.isActive = false;
// //     await region.save();

// //     return successResponse(res, 'Region deleted successfully', {
// //       regionId: region._id
// //     });

// //   } catch (error) {
// //     console.error('Delete Region Error:', error);
// //     return errorResponse(res, 'Failed to delete region', 500);
// //   }
// // };
// exports.deleteRegion = async (req, res) => {
//   try {
//     const { regionId } = req.params;

//     const region = await Region.findById(regionId);
//     if (!region) return errorResponse(res, 'Region not found', 404);

//     const assignedCustomers = await Customer.countDocuments({
//       'locations.regionId': region._id
//     });

//     if (assignedCustomers > 0) {
//       return errorResponse(
//         res,
//         `Cannot delete "${region.regionName}". ${assignedCustomers} customers are assigned. Remove assignment first.`,
//         400
//       );
//     }

//     await Region.findByIdAndDelete(regionId);

//     return successResponse(res, 'Region permanently deleted!', {
//       deletedRegion: {
//         id: region._id,
//         name: region.regionName,
//         code: region.regionCode
//       },
//       deletedAt: new Date()
//     });

//   } catch (error) {
//     console.error('Delete Region Error:', error);
//     return errorResponse(res, 'Failed to delete region', 500);
//   }
// };

// //  ADD ZIPCODE 
// exports.addZipcode = async (req, res) => {
//   try {
//     const { regionId } = req.params;
//     const { zipcode, area, city } = req.body;

//     if (!zipcode) {
//       return errorResponse(res, 'Zipcode is required', 400);
//     }

//     const region = await Region.findById(regionId);

//     if (!region) {
//       return errorResponse(res, 'Region not found', 404);
//     }

//     // Check if zipcode already exists in any region
//     const existingRegion = await Region.findOne({
//       'zipcodes.zipcode': zipcode
//     });

//     if (existingRegion) {
//       return errorResponse(res, `Zipcode already exists in region: ${existingRegion.regionName}`, 400);
//     }

//     region.addZipcode({ zipcode, area, city });
//     await region.save();

//     // Auto-assign customers with this zipcode
//     await Customer.updateMany(
//       {
//         'locations.zipcode': zipcode,
//         'locations.regionAutoAssigned': true
//       },
//       {
//         $set: { 'locations.$[elem].regionId': region._id }
//       },
//       {
//         arrayFilters: [{ 'elem.zipcode': zipcode }]
//       }
//     );

//     return successResponse(res, 'Zipcode added successfully', {
//       region: {
//         id: region._id,
//         regionName: region.regionName,
//         zipcodes: region.zipcodes
//       }
//     });

//   } catch (error) {
//     console.error('Add Zipcode Error:', error);
//     return errorResponse(res, error.message || 'Failed to add zipcode', 500);
//   }
// };

// //  REMOVE ZIPCODE 
// exports.removeZipcode = async (req, res) => {
//   try {
//     const { regionId, zipcode } = req.params;

//     const region = await Region.findOneAndUpdate(
//       { _id: regionId },
//       { 
//         $pull: { 
//           zipcodes: { zipcode: zipcode }   
//         }
//       },
//       { new: true }
//     );

//     if (!region) {
//       return errorResponse(res, 'Region not found', 404);
//     }

//     const wasRemoved = !region.zipcodes.some(z => z.zipcode === zipcode);

//     if (!wasRemoved) {
//       return errorResponse(res, 'Zipcode not found in this region', 404);
//     }

//     await Customer.updateMany(
//       { 'locations.zipcode': zipcode },
//       { 
//         $set: { 
//           'locations.$[elem].regionId': null,
//           'locations.$[elem].regionAutoAssigned': false 
//         }
//       },
//       { 
//         arrayFilters: [{ 'elem.zipcode': zipcode }] 
//       }
//     );

//     return successResponse(res, 'Zipcode removed successfully!', {
//       region: {
//         id: region._id,
//         regionName: region.regionName,
//         remainingZipcodes: region.zipcodes.length,
//         removedZipcode: zipcode
//       }
//     });

//   } catch (error) {
//     console.error('Remove Zipcode Error:', error);
//     return errorResponse(res, 'Failed to remove zipcode', 500);
//   }
// };

// //  FIND REGION BY ZIPCODE 
// exports.findRegionByZipcode = async (req, res) => {
//   try {
//     const { zipcode } = req.params;

//     const region = await Region.findByZipcode(zipcode);

//     if (!region) {
//       return errorResponse(res, 'No region found for this zipcode', 404);
//     }

//     return successResponse(res, 'Region found successfully', {
//       region,
//       zipcode
//     });

//   } catch (error) {
//     console.error('Find Region By Zipcode Error:', error);
//     return errorResponse(res, 'Failed to find region', 500);
//   }
// };

// //  GET REGION STATISTICS 
// exports.getRegionStatistics = async (req, res) => {
//   try {
//     const [
//       totalRegions,
//       activeRegions,
//       totalZipcodes,
//       regionCustomerCounts
//     ] = await Promise.all([
//       Region.countDocuments(),
//       Region.countDocuments({ isActive: true }),
//       Region.aggregate([
//         { $unwind: '$zipcodes' },
//         { $group: { _id: null, count: { $sum: 1 } } }
//       ]),
//       Region.aggregate([
//         {
//           $lookup: {
//             from: 'customers',
//             localField: '_id',
//             foreignField: 'locations.regionId',
//             as: 'customers'
//           }
//         },
//         {
//           $project: {
//             regionName: 1,
//             regionCode: 1,
//             customerCount: { $size: '$customers' }
//           }
//         },
//         { $sort: { customerCount: -1 } }
//       ])
//     ]);

//     return successResponse(res, 'Region statistics retrieved successfully', {
//       totalRegions,
//       activeRegions,
//       totalZipcodes: totalZipcodes[0]?.count || 0,
//       regionCustomerCounts
//     });

//   } catch (error) {
//     console.error('Get Region Statistics Error:', error);
//     return errorResponse(res, 'Failed to retrieve region statistics', 500);
//   }
// };

// module.exports = exports;

const Region = require('../../models/Region');
const Customer = require('../../models/Customer');
const { successResponse, errorResponse } = require('../../utils/responseHelper');

// GET - List all regions
// exports.getAllRegions = async (req, res) => {
//   try {
//     const regions = await Region.find()
//       .populate('manager', 'name email phone')
//       .sort({ regionName: 1 });

//     res.render('regions_list', {
//       title: 'Region Management',
//       regions,
//       messages: req.flash(),
//       url: req.originalUrl,
//       admin: req.admin
//     });

//   } catch (error) {
//     console.error('Get Regions Error:', error);
//     req.flash('error', 'Failed to load regions');
//     res.redirect('/admin/regions');
//   }
// }

// GET - List all regions with customer count
exports.getAllRegions = async (req, res) => {
  try {
    const regions = await Region.find()
      .populate('manager', 'name email phone')
      .sort({ regionName: 1 })
      .lean();

    // Add customer count for each region
    for (const region of regions) {
      region.customerCount = await Customer.countDocuments({
        'locations.regionId': region._id
      });
    }

    res.render('regions_list', {
      title: 'Region Management',
      regions,           // now each region has .customerCount
      messages: req.flash(),
      url: req.originalUrl,
      admin: req.admin
    });

  } catch (error) {
    console.error('Get Regions Error:', error);
    req.flash('error', 'Failed to load regions');
    res.redirect('/admin/regions');
  }
};




// GET - Create form
exports.getCreateRegion = async (req, res) => {
  try {
    res.render('region_create', {
      title: 'Create Region',
      messages: req.flash(),
      url: req.originalUrl,
      admin: req.admin
    });
  } catch (error) {
    console.error('Get Create Region Error:', error);
    req.flash('error', 'Failed to load create form');
    res.redirect('/admin/regions');
  }
};

// POST - Create region
// exports.createRegion = async (req, res) => {
//   try {
//     const data = req.body;

//     const region = await Region.create({
//       ...data,
//       regionCode: data.regionCode.toUpperCase(),
//       zipcodes: data.zipcodes || []
//     });

//     req.flash('success', 'Region created successfully!');
//     res.redirect('/admin/regions');

//   } catch (error) {
//     console.error('Create Region Error:', error);
//     req.flash('error', error.message || 'Failed to create region');
//     res.redirect('/admin/regions/create');
//   }
// };

// POST - Create region
exports.createRegion = async (req, res) => {
  try {
    const data = req.body;

    let zipcodes = [];
    if (data.zipcodesJson) {
      try {
        zipcodes = JSON.parse(data.zipcodesJson); // ← Yeh line add kar do
        console.log('[CREATE REGION] Parsed zipcodes:', zipcodes);
      } catch (err) {
        console.error('[CREATE REGION] JSON Parse Error:', err);
        req.flash('error', 'Invalid zipcode format');
        return res.redirect('/admin/regions/create');
      }
    }

    const region = await Region.create({
      ...data,
      regionCode: data.regionCode.toUpperCase(),
      zipcodes: zipcodes // ← Ab array jayega
    });

    req.flash('success', 'Region created successfully!');
    res.redirect('/admin/regions');

  } catch (error) {
    console.error('Create Region Error:', error);
    req.flash('error', error.message || 'Failed to create region');
    res.redirect('/admin/regions/create');
  }
};

exports.getEditRegion = async (req, res) => {
  try {
    const region = await Region.findById(req.params.regionId);
    if (!region) {
      req.flash('error', 'Region not found');
      return res.redirect('/admin/regions');
    }

    res.render('region_edit', {
      title: 'Edit Region',
      region,
      messages: req.flash(),
      url: req.originalUrl,
      admin: req.admin,
    });

  } catch (error) {
    console.error('Edit Region Error:', error);
    req.flash('error', 'Failed to load edit form');
    res.redirect('/admin/regions');
  }
};

// POST - Update region (including zipcodes)
exports.updateRegion = async (req, res) => {
  console.log('================================================================');
  console.log('[UPDATE REGION] POST HIT at:', new Date().toISOString());
  console.log('[UPDATE REGION] Admin:', req.admin?.email, 'Role:', req.admin?.role);
  console.log('[UPDATE REGION] Params ID:', req.params.regionId);
  console.log('[UPDATE REGION] Full body:', JSON.stringify(req.body, null, 2));

  try {
    const updates = req.body;

    delete updates.regionCode;
    delete updates.stats;

    const region = await Region.findByIdAndUpdate(
      req.params.regionId,
      updates,
      { new: true, runValidators: true }
    );

    if (!region) {
      console.log('[UPDATE REGION] Not found');
      req.flash('error', 'Region not found');
      return res.redirect('/admin/regions');
    }

    console.log('[UPDATE REGION] SUCCESS - Updated:', region.regionName);

    req.flash('success', 'Region updated successfully!');
    res.redirect('/admin/regions');

  } catch (error) {
    console.error('[UPDATE REGION] ERROR:', error);
    req.flash('error', error.message || 'Failed to update');
    res.redirect(`/admin/regions/edit/${req.params.regionId}`);
  }
};

// POST - Delete region
exports.deleteRegion = async (req, res) => {
  try {
    const region = await Region.findById(req.params.regionId);
    if (!region) {
      req.flash('error', 'Region not found');
      return res.redirect('/admin/regions');
    }

    const assignedCount = await Customer.countDocuments({
      'locations.regionId': region._id
    });

    if (assignedCount > 0) {
      req.flash('error', `Cannot delete. ${assignedCount} customers assigned.`);
      return res.redirect('/admin/regions');
    }

    await Region.findByIdAndDelete(req.params.regionId);

    req.flash('success', 'Region deleted successfully!');
    res.redirect('/admin/regions');

  } catch (error) {
    console.error('Delete Region Error:', error);
    req.flash('error', 'Failed to delete region');
    res.redirect('/admin/regions');
  }
};

// POST - Add zipcode to region (same page)
// exports.addZipcode = async (req, res) => {
//   try {
//     const { regionId } = req.params;
//     const { zipcode, area, city } = req.body;

//     console.log('[ADD ZIPCODE] Request body:', req.body);

//     const region = await Region.findById(regionId);
//     if (!region) {
//       req.flash('error', 'Region not found');
//       return res.redirect(`/admin/regions/edit/${regionId}`);
//     }

//     // Check duplicate
//     if (region.zipcodes.some(z => z.zipcode === zipcode)) {
//       req.flash('error', 'Zipcode already exists in this region');
//       return res.redirect(`/admin/regions/edit/${regionId}`);
//     }

//     region.zipcodes.push({ zipcode, area, city });
//     await region.save();

//     console.log('[ADD ZIPCODE] Success - Added:', zipcode);

//     req.flash('success', 'Zipcode added successfully!');
//     res.redirect(`/admin/regions/edit/${regionId}`);

//   } catch (error) {
//     console.error('[ADD ZIPCODE] Error:', error);
//     req.flash('error', 'Failed to add zipcode');
//     res.redirect(`/admin/regions/edit/${regionId}`);
//   }
// };

exports.addZipcode = async (req, res) => {
  try {
    const { regionId } = req.params;
    const { zipcode, area, city } = req.body;

    console.log('[ADD ZIPCODE] Request received for region:', regionId);
    console.log('[ADD ZIPCODE] Zipcode data:', { zipcode, area, city });

    if (!zipcode || !/^\d{6}$/.test(zipcode)) {
      req.flash('error', 'Valid 6-digit zipcode is required');
      return res.redirect(`/admin/regions/edit/${regionId}`);
    }

    const region = await Region.findById(regionId);
    if (!region) {
      req.flash('error', 'Region not found');
      return res.redirect(`/admin/regions/edit/${regionId}`);
    }

    // Check if zipcode already exists
    const existingZip = region.zipcodes.find(z => z.zipcode === zipcode);
    if (existingZip) {
      req.flash('error', `Zipcode ${zipcode} already exists in this region`);
      return res.redirect(`/admin/regions/edit/${regionId}`);
    }

    // Add new zipcode
    region.zipcodes.push({ zipcode, area: area || '', city: city || '' });
    await region.save();

    console.log('[ADD ZIPCODE] Success - Added:', zipcode);
    console.log('[ADD ZIPCODE] Total zipcodes now:', region.zipcodes.length);

    req.flash('success', `Zipcode ${zipcode} added successfully!`);
    res.redirect(`/admin/regions/edit/${regionId}`);

  } catch (error) {
    console.error('[ADD ZIPCODE] Critical Error:', error);
    req.flash('error', 'Failed to add zipcode: ' + error.message);
    res.redirect(`/admin/regions/edit/${req.params.regionId}`);
  }
};

// POST - Remove zipcode from region
exports.removeZipcode = async (req, res) => {
  try {
    const { regionId, zipcode } = req.params;

    const region = await Region.findByIdAndUpdate(
      regionId,
      { $pull: { zipcodes: { zipcode } } },
      { new: true }
    );

    if (!region) {
      req.flash('error', 'Region not found');
      return res.redirect('/admin/regions');
    }

    req.flash('success', 'Zipcode removed successfully!');
    res.redirect(`/admin/regions/edit/${regionId}`);

  } catch (error) {
    console.error('Remove Zipcode Error:', error);
    req.flash('error', 'Failed to remove zipcode');
    res.redirect(`/admin/regions/edit/${regionId}`);
  }
};

// GET - View single region (detailed page)
exports.viewRegion = async (req, res) => {
  try {
    const { regionId } = req.params;

    const region = await Region.findById(regionId)
      .populate('manager', 'name email phone')
      .lean(); // lean() for faster query & plain JS object

    if (!region) {
      req.flash('error', 'Region not found');
      return res.redirect('/admin/regions');
    }

    // Get real customer count assigned to this region
    const customerCount = await Customer.countDocuments({
      'locations.regionId': region._id
    });

    // Optional: Get recent customers (last 5) for preview
    const recentCustomers = await Customer.find({
      'locations.regionId': region._id
    })
      .select('companyName name phone locations.$')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.render('region_view', {
      title: `View Region: ${region.regionName}`,
      region,
      customerCount,
      recentCustomers,
      messages: req.flash(),
      url: req.originalUrl,
      admin: req.admin
    });

  } catch (error) {
    console.error('View Region Error:', error);
    req.flash('error', 'Failed to load region details');
    res.redirect('/admin/regions');
  }
};
