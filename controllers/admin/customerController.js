const mongoose = require("mongoose")
const Customer = require('../../models/Customer');
const Region = require('../../models/Region');
const Delivery = require("../../models/Delivery")
const { successResponse, errorResponse } = require('../../utils/responseHelper');
const csv = require('csv-parser');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');

// GET - Render Create Form (EJS)
exports.getCreateCustomer = async (req, res) => {
  try {
    console.log('[CREATE FORM] Loading create customer form');

    // Fetch all active regions
    const regions = await Region.find({ isActive: true })
      .select('regionName regionCode state')
      .sort({ regionName: 1 })
      .lean();

    res.render('create-customer', {
      title: 'Create New Customer',
      url: req.originalUrl,
      regions,
      errors: req.flash('error'),
      success: req.flash('success')
    });
  } catch (error) {
    console.error('[GET-CREATE-CUSTOMER] ERROR:', error);
    req.flash('error', 'Failed to load form');
    res.redirect('/admin/customers');
  }
};

exports.createCustomer = async (req, res) => {
  try {
    console.log('[CREATE-CUSTOMER] Body:', req.body);

    const {
      customerType = 'individual',
      name,
      companyName,
      email,
      phone,
      alternatePhone,
      gstNumber,
      panNumber,
      paymentTerms = 'cod',
      creditLimit = 0,
      category = 'regular',
      status = 'active',
      addressLine1,
      addressLine2,
      city,
      state,
      zipcode,
      locationName,
      contactPersonName,
      contactPersonPhone,
      contactPersonEmail,
      specialInstructions,
      googleMapLink,
      region
    } = req.body;

    // ✅ Zipcode validation (UAE: 4 digit)
    if (zipcode && !/^[A-Za-z0-9]{4}$/.test(zipcode)) {
      req.flash('error', 'Zipcode must be exactly 4 alphanumeric characters');
      return res.redirect('/admin/customers/create-customer');
    }

    // ✅ UAE Phone Validation
    const phoneRegex = /^\+971\s?(50|52|54|55|56|58)[0-9]{7}$/;

    if (!phoneRegex.test(phone)) {
      req.flash('error', 'Invalid UAE phone number');
      return res.redirect('/admin/customers/create-customer');
    }

    if (alternatePhone && !phoneRegex.test(alternatePhone)) {
      req.flash('error', 'Invalid alternate phone number');
      return res.redirect('/admin/customers/create-customer');
    }

    if (contactPersonPhone && !phoneRegex.test(contactPersonPhone)) {
      req.flash('error', 'Invalid contact person phone');
      return res.redirect('/admin/customers/create-customer');
    }

    // ========== REGION ==========
    let assignedRegion = null;
    let regionAutoAssigned = false;

    if (!region) {
      const foundRegion = await Region.findOne({
        zipcodes: zipcode,
        isActive: true
      }).select('_id');

      if (foundRegion) {
        assignedRegion = foundRegion._id;
        regionAutoAssigned = true;
      }
    } else {
      assignedRegion = region;
    }

    // ========== LOCATION ==========
    const locations = [{
      locationName: locationName || `${name}'s Location`,
      addressLine1,
      addressLine2: addressLine2 || '',
      city,
      state,
      zipcode,
      country: 'UAE',
      regionId: assignedRegion,
      regionAutoAssigned,
      googleMapLink: googleMapLink || null,
      isPrimary: true,
      isActive: true
    }];

    // ========== CONTACT PERSON ==========
    const contactPerson = {
      name: contactPersonName || '',
      phone: contactPersonPhone || '',
      email: contactPersonEmail || '',
      designation: 'Primary Contact'
    };

    // ========== DOCUMENTS ==========
    const documents = [];
    const basePath = '/uploads/documents/';

    const addDoc = (field, type) => {
      if (req.files?.[field]?.[0]) {
        documents.push({
          documentType: type,
          fileUrl: basePath + req.files[field][0].filename,
          uploadedAt: new Date()
        });
      }
    };

    addDoc('gstCertificate', 'gst_certificate');
    addDoc('panCard', 'pan_card');
    addDoc('shopLicense', 'shop_license');
    addDoc('otherDoc', 'other_document');

    // ========== 🔥 CUSTOMER ID GENERATION ==========
    let saved = false;
    let newCustomer;

    while (!saved) {
      try {
        const lastCustomer = await Customer.findOne().sort({ createdAt: -1 });

        let newId = 1;
        if (lastCustomer?.customerId) {
          const lastNumber = parseInt(lastCustomer.customerId.replace('CUST', ''));
          newId = lastNumber + 1;
        }

        const customerId = `CUST${String(newId).padStart(6, '0')}`;

        newCustomer = new Customer({
          customerId,
          customerType,
          name: name.trim(),
          companyName: companyName || null,
          email: email.toLowerCase().trim(),
          phone,
          alternatePhone: alternatePhone || null,
          gstNumber: gstNumber || null,
          panNumber: panNumber || null,
          locations,
          billingAddress: {
            addressLine1,
            addressLine2: addressLine2 || '',
            city,
            zipcode,
            country: 'UAE'
          },
          paymentTerms,
          creditLimit: parseFloat(creditLimit) || 0,
          category,
          status,
          documents,
          contactPerson,
          isActive: status === 'active'
        });

        await newCustomer.save();
        saved = true;

      } catch (err) {
        if (err.code === 11000) {
          console.log('Retrying customerId...');
        } else {
          throw err;
        }
      }
    }

    console.log('[CREATE-CUSTOMER] Created:', newCustomer.customerId);

    req.flash('success', `Customer ${newCustomer.customerId} created successfully`);
    res.redirect(`/admin/customers/view/${newCustomer.customerId}`);

  } catch (error) {
    console.error('[CREATE-CUSTOMER] ERROR:', error);

    let msg = 'Failed to create customer';

    if (error.code === 11000) {
      msg = 'Duplicate field already exists';
    } else if (error.message) {
      msg = error.message;
    }

    req.flash('error', msg);
    res.redirect('/admin/customers/create-customer');
  }
};

// GET ALL CUSTOMERS 
// GET ALL CUSTOMERS 
exports.getAllCustomers = async (req, res) => {
  try {
    const {
      page = 1,
      limit,                    // default hata diya
      status,
      customerType,
      category,
      search,
      regionId,
      zipcode,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Filters
    if (status) query.status = status;
    if (customerType) query.customerType = customerType;
    if (category) query.category = category;
    if (regionId) query['locations.regionId'] = regionId;
    if (zipcode) query['locations.zipcode'] = zipcode;

    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Agar limit diya gaya hai to pagination apply karo, warna saara data lao
    let customersQuery = Customer.find(query)
      .populate('locations.regionId', 'regionName regionCode')
      .populate('accountManager', 'name email')
      .populate('createdBy', 'name email')
      .sort(sortOptions);

    let total;
    let pagination = null;

    if (limit) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      customersQuery = customersQuery.skip(skip).limit(parseInt(limit));
      
      total = await Customer.countDocuments(query);
      pagination = {
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      };
    }

    const [customers, count] = await Promise.all([
      customersQuery,
      limit ? Promise.resolve(total) : Customer.countDocuments(query)
    ]);

    // Agar limit nahi diya to total count bhi set kar do
    if (!pagination) {
      total = count;
      pagination = {
        page: 1,
        pages: 1,
        total
      };
    }

    res.render('customers', {
      title: 'Customers Management',
      customers,
      url: req.originalUrl,
      pagination,
      filters: req.query,
      messages: req.flash()
    });

  } catch (error) {
    console.error('Get All Customers Error:', error);
    req.flash('error', 'Failed to retrieve customers');
    res.redirect('/admin/customers');
  }
};

// VIEW CUSTOMER
exports.viewCustomer = async (req, res) => {
  try {
    const customerId = req.params.customerId || req.params.id;
    console.log('[CUSTOMER-DETAILS] Requested ID:', customerId);

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      req.flash('error', 'Invalid customer ID');
      return res.redirect('/admin/customers');
    }

    const customer = await Customer.findById(customerId)
      .populate('locations.regionId', 'regionName regionCode state')
      .select('-__v')
      .lean();

    if (!customer) {
      req.flash('error', 'Customer not found');
      return res.redirect('/admin/customers');
    }

    const baseUrl = process.env.IMAGE_URL || 'http://localhost:5001';

    // Fix document URLs
    if (customer.documents?.length) {
      const docs = customer.documents;
      customer.gstCertificate = docs.find(d => d.documentType === 'gst_certificate')?.fileUrl
        ? `${baseUrl}/${docs.find(d => d.documentType === 'gst_certificate').fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}`
        : null;

      customer.panCard = docs.find(d => d.documentType === 'pan_card')?.fileUrl
        ? `${baseUrl}/${docs.find(d => d.documentType === 'pan_card').fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}`
        : null;

      customer.shopLicense = docs.find(d => d.documentType === 'shop_license')?.fileUrl
        ? `${baseUrl}/${docs.find(d => d.documentType === 'shop_license').fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}`
        : null;

      customer.otherDoc = docs.find(d => d.documentType === 'other_document')?.fileUrl
        ? `${baseUrl}/${docs.find(d => d.documentType === 'other_document').fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}`
        : null;

      console.log('[CUSTOMER-DETAILS] Fixed Document URLs:', {
        gstCertificate: customer.gstCertificate,
        panCard: customer.panCard,
        shopLicense: customer.shopLicense,
        otherDoc: customer.otherDoc
      });
    }

    const primaryLocation = customer.locations?.find(loc => loc.isPrimary) ||
      customer.locations?.[0] || {};

    const recentDeliveries = await Delivery.find({ customerId: customer._id })
      .populate('orderId')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const stats = {
      totalOrders: await Delivery.countDocuments({ customerId: customer._id }),
      completed: await Delivery.countDocuments({ customerId: customer._id, status: 'delivered' }),
      pending: await Delivery.countDocuments({ customerId: customer._id, status: { $in: ['pending', 'processing'] } }),
      totalSpent: customer.stats?.totalSpent || 0,
      lastOrderDate: customer.stats?.lastOrderDate
        ? new Date(customer.stats.lastOrderDate).toLocaleDateString()
        : 'Never'
    };

    res.render('customer_view', {
      title: `Customer - ${customer.name || customer.companyName || 'Details'}`,
      user: req.admin,
      customer,
      primaryLocation,
      recentDeliveries,
      stats,
      url: req.originalUrl,
      baseUrl
    });

  } catch (error) {
    console.error('[CUSTOMER-DETAILS] CRITICAL ERROR:', error);
    req.flash('error', 'Failed to load customer details');
    res.redirect('/admin/customers');
  }
};

// GET CUSTOMER BY ID 
exports.getCustomerById = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await Customer.findById(customerId)
      .populate('locations.regionId', 'regionName regionCode state')
      .populate('accountManager', 'name email phone')
      .populate('createdBy', 'name email');

    if (!customer) {
      return errorResponse(res, 'Customer not found', 404);
    }

    return successResponse(res, 'Customer retrieved successfully', {
      customer
    });

  } catch (error) {
    console.error('Get Customer By ID Error:', error);
    return errorResponse(res, 'Failed to retrieve customer', 500);
  }
};

// GET - Render Edit Form
exports.getEditCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      req.flash('error', 'Invalid customer ID');
      return res.redirect('/admin/customers');
    }

    const customer = await Customer.findById(customerId)
      .populate('locations.regionId', 'regionName regionCode state')
      .lean();

    if (!customer) {
      req.flash('error', 'Customer not found');
      return res.redirect('/admin/customers');
    }

    // Fetch all active regions for dropdown
    const regions = await Region.find({ isActive: true })
      .select('regionName regionCode state')
      .sort({ regionName: 1 })
      .lean();

    res.render('customer_edit', {
      title: `Edit Customer - ${customer.customerId}`,
      customer,
      regions,
      url: req.originalUrl,
      errors: req.flash('error'),
      success: req.flash('success')
    });

  } catch (error) {
    console.error('[GET-EDIT-CUSTOMER] ERROR:', error);
    req.flash('error', 'Failed to load edit form');
    res.redirect('/admin/customers');
  }
};

// UPDATE CUSTOMER 
exports.updateCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    console.log('[UPDATE-CUSTOMER] ID:', customerId);
    console.log('[UPDATE-CUSTOMER] Body:', req.body);
    console.log('[UPDATE-CUSTOMER] Files:', req.files ? Object.keys(req.files) : 'No files');

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      req.flash('error', 'Invalid customer ID');
      return res.redirect(`/admin/customers/${customerId}/edit`);
    }

    const updates = { ...req.body };

    // Protected fields
    delete updates.customerId;
    delete updates.stats;
    delete updates.createdBy;
    delete updates.createdAt;

    // Clean phone numbers
    if (updates.phone) {
      updates.phone = updates.phone.replace(/\D/g, '');
      if (updates.phone.length !== 10) {
        req.flash('error', 'Phone number must be exactly 10 digits');
        return res.redirect(`/admin/customers/${customerId}/edit`);
      }
    }

    if (updates.alternatePhone) {
      updates.alternatePhone = updates.alternatePhone.replace(/\D/g, '');
    }

    // ========== AUTO-ASSIGN REGION IF ZIPCODE CHANGED ==========
    const currentCustomer = await Customer.findById(customerId).select('locations documents');

    if (updates.zipcode && currentCustomer.locations?.length > 0) {
      const primaryLocation = currentCustomer.locations.find(loc => loc.isPrimary) || currentCustomer.locations[0];

      // Check if zipcode changed
      if (primaryLocation.zipcode !== updates.zipcode) {
        console.log('[UPDATE-CUSTOMER] Zipcode changed from', primaryLocation.zipcode, 'to', updates.zipcode);

        // Auto-assign new region based on new zipcode (only if no manual region selected)
        if (!updates.region || updates.region === '') {
          const foundRegion = await Region.findOne({
            zipcodes: updates.zipcode,
            isActive: true
          }).select('_id regionName regionCode');

          if (foundRegion) {
            console.log('[UPDATE-CUSTOMER] Auto-assigned new region:', foundRegion.regionName);

            // Update primary location's region
            const locationUpdates = {
              ...primaryLocation.toObject(),
              zipcode: updates.zipcode,
              regionId: foundRegion._id,
              regionAutoAssigned: true
            };

            if (updates.city) locationUpdates.city = updates.city;
            if (updates.state) locationUpdates.state = updates.state;
            if (updates.addressLine1) locationUpdates.addressLine1 = updates.addressLine1;
            if (updates.addressLine2 !== undefined) locationUpdates.addressLine2 = updates.addressLine2;

            updates.locations = currentCustomer.locations.map(loc =>
              loc.isPrimary ? locationUpdates : loc
            );
          } else {
            console.log('[UPDATE-CUSTOMER] No region found for new zipcode:', updates.zipcode);
          }
        } else {
          // Manual region selected
          console.log('[UPDATE-CUSTOMER] Manual region selected:', updates.region);

          const locationUpdates = {
            ...primaryLocation.toObject(),
            zipcode: updates.zipcode,
            regionId: updates.region,
            regionAutoAssigned: false
          };

          if (updates.city) locationUpdates.city = updates.city;
          if (updates.state) locationUpdates.state = updates.state;
          if (updates.addressLine1) locationUpdates.addressLine1 = updates.addressLine1;
          if (updates.addressLine2 !== undefined) locationUpdates.addressLine2 = updates.addressLine2;

          updates.locations = currentCustomer.locations.map(loc =>
            loc.isPrimary ? locationUpdates : loc
          );
        }
      }
    }

    // Remove region from top-level updates (it's handled in locations)
    delete updates.region;
    delete updates.zipcode;
    delete updates.city;
    delete updates.state;
    delete updates.addressLine1;
    delete updates.addressLine2;

    // Documents handling
    if (req.files && Object.keys(req.files).length > 0) {
      console.log('[UPDATE-CUSTOMER] Processing files:', Object.keys(req.files));

      let documents = currentCustomer?.documents || [];
      documents = documents.filter(doc => doc && doc.documentType);

      const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://yourdomain.com'
        : 'http://localhost:5001';
      const documentBasePath = '/uploads/documents/';

      const documentMapping = {
        gstCertificate: 'gst_certificate',
        panCard: 'pan_card',
        shopLicense: 'shop_license',
        otherDoc: 'other_document'
      };

      const consoleDetails = {};

      for (const [fieldName, docType] of Object.entries(documentMapping)) {
        if (req.files[fieldName]?.[0]) {
          const file = req.files[fieldName][0];
          const relativePath = documentBasePath + file.filename;

          const existingIndex = documents.findIndex(d => d.documentType === docType);

          if (existingIndex >= 0) {
            documents[existingIndex] = {
              documentType: docType,
              fileUrl: relativePath,
              uploadedAt: new Date()
            };
          } else {
            documents.push({
              documentType: docType,
              fileUrl: relativePath,
              uploadedAt: new Date()
            });
          }

          consoleDetails[docType] = `${baseUrl}${relativePath}`;
          console.log(`[UPDATE-CUSTOMER] ${existingIndex >= 0 ? 'Updated' : 'Added'} ${docType}: ${file.filename}`);
        }
      }

      if (Object.keys(consoleDetails).length > 0) {
        console.log('[UPDATE-CUSTOMER] Fixed Document URLs:', consoleDetails);
      }

      updates.documents = documents;
    }

    // Update customer
    const updatedCustomer = await Customer.findByIdAndUpdate(
      customerId,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedCustomer) {
      req.flash('error', 'Customer not found');
      return res.redirect(`/admin/customers/${customerId}/edit`);
    }

    console.log('[UPDATE-CUSTOMER] Successfully updated:', updatedCustomer.customerId);
    req.flash('success', `Customer ${updatedCustomer.customerId} updated successfully!`);
    res.redirect(`/admin/customers/view/${customerId}`);

  } catch (error) {
    console.error('[UPDATE-CUSTOMER] ERROR:', error);

    let errorMsg = 'Failed to update customer';

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      errorMsg = `Duplicate ${field}: This value already exists`;
    } else if (error.name === 'ValidationError') {
      errorMsg = Object.values(error.errors).map(err => err.message).join(', ');
    } else if (error.message) {
      errorMsg = error.message;
    }

    req.flash('error', errorMsg);
    res.redirect(`/admin/customers/${req.params.customerId}/edit`);
  }
};

// DELETE CUSTOMER 
exports.deleteCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      req.flash('error', 'Invalid customer ID');
      return res.redirect('/admin/customers');
    }

    const customer = await Customer.findByIdAndDelete(customerId);

    if (!customer) {
      req.flash('error', 'Customer not found');
      return res.redirect('/admin/customers');
    }

    // Delete uploaded document files
    if (customer.documents && customer.documents.length > 0) {
      customer.documents.forEach(doc => {
        if (doc.fileUrl) {
          const filePath = path.join(__dirname, '../../public', doc.fileUrl);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              console.log(`[DELETE-CUSTOMER] Deleted file: ${doc.fileUrl}`);
            } catch (err) {
              console.error(`[DELETE-CUSTOMER] Failed to delete file: ${doc.fileUrl}`, err);
            }
          }
        }
      });
    }

    console.log(`[DELETE-CUSTOMER] Permanently deleted: ${customer.customerId}`);
    req.flash('green', `Customer ${customer.customerId} deleted successfully`);
    // res.redirect('/admin/customers');
    return req.session.save(() => res.redirect('/admin/customers'));

  } catch (error) {
    console.error('[DELETE-CUSTOMER] ERROR:', error);
    req.flash('error', 'Failed to delete customer');
    res.redirect('/admin/customers');
  }
};

// ADD LOCATION 
exports.addLocation = async (req, res) => {
  try {
    const { customerId } = req.params;
    const locationData = req.body;

    const customer = await Customer.findById(customerId);

    if (!customer) {
      return errorResponse(res, 'Customer not found', 404);
    }

    // Auto-assign region if zipcode provided
    if (locationData.zipcode && locationData.regionAutoAssigned !== false) {
      const region = await Region.findOne({
        zipcodes: locationData.zipcode,
        isActive: true
      });
      if (region) {
        locationData.regionId = region._id;
        locationData.regionAutoAssigned = true;
      }
    }

    customer.addLocation(locationData);
    await customer.save();

    return successResponse(res, 'Location added successfully', {
      customer: {
        id: customer._id,
        name: customer.name,
        locations: customer.locations
      }
    });

  } catch (error) {
    console.error('Add Location Error:', error);
    return errorResponse(res, 'Failed to add location', 500);
  }
};

// UPDATE LOCATION 
exports.updateLocation = async (req, res) => {
  try {
    const { customerId, locationId } = req.params;
    const updates = req.body;

    const customer = await Customer.findById(customerId);

    if (!customer) {
      return errorResponse(res, 'Customer not found', 404);
    }

    const location = customer.locations.id(locationId);

    if (!location) {
      return errorResponse(res, 'Location not found', 404);
    }

    // Update location fields
    Object.keys(updates).forEach(key => {
      location[key] = updates[key];
    });

    // Auto-assign region if zipcode changed
    if (updates.zipcode && location.regionAutoAssigned !== false) {
      const region = await Region.findOne({
        zipcodes: updates.zipcode,
        isActive: true
      });
      if (region) {
        location.regionId = region._id;
        location.regionAutoAssigned = true;
      }
    }

    await customer.save();

    return successResponse(res, 'Location updated successfully', {
      customer: {
        id: customer._id,
        name: customer.name,
        locations: customer.locations
      }
    });

  } catch (error) {
    console.error('Update Location Error:', error);
    return errorResponse(res, 'Failed to update location', 500);
  }
};

// DELETE LOCATION 
exports.deleteLocation = async (req, res) => {
  try {
    const { customerId, locationId } = req.params;

    const customer = await Customer.findById(customerId);

    if (!customer) {
      return errorResponse(res, 'Customer not found', 404);
    }

    const locationIndex = customer.locations.findIndex(
      loc => loc._id.toString() === locationId
    );

    if (locationIndex === -1) {
      return errorResponse(res, 'Location not found', 404);
    }

    if (customer.locations.length === 1) {
      return errorResponse(res, 'Cannot delete the only location', 400);
    }

    const locationToDelete = customer.locations[locationIndex];

    if (locationToDelete.isPrimary) {
      const newPrimaryIndex = locationIndex === 0 ? 1 : 0;
      customer.locations[newPrimaryIndex].isPrimary = true;
    }

    customer.locations.splice(locationIndex, 1);
    await customer.save();

    return successResponse(res, 'Location deleted successfully', {
      customerId,
      totalLocationsLeft: customer.locations.length
    });

  } catch (error) {
    console.error('Delete Location Error:', error);
    return errorResponse(res, 'Failed to delete location', 500);
  }
};

// TOGGLE CUSTOMER STATUS (Active ↔ Inactive)
exports.toggleCustomerStatus = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { status } = req.body;

    console.log('[TOGGLE-STATUS] Received:', { customerId, status });

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID' });
    }

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Update fields
    customer.status = status;
    customer.isActive = status === 'active';

    await customer.save();

    console.log(`[TOGGLE-STATUS] Success: ${customer.customerId} → ${status.toUpperCase()}`);

    return res.json({
      success: true,
      message: `Status updated to ${status.toUpperCase()}`,
      newStatus: status
    });

  } catch (error) {
    console.error('[TOGGLE-STATUS] ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update status: ' + error.message
    });
  }
};

const CSV_TEMPLATE_FIELDS = [
  'name', 'companyName', 'email',
  'countryCode', 'phoneNumber',
  'altCountryCode', 'altPhoneNumber',
  'gstNumber', 'panNumber', 'paymentTerms', 'creditLimit',
  'category', 'status', 'locationName', 'addressLine1', 'addressLine2',
  'city', 'state', 'zipcode', 'contactPersonName',
  'contactPersonCountryCode', 'contactPersonPhoneNumber',
  'contactPersonEmail', 'googleMapLink', 'specialInstructions'
];

// GET /admin/customers/csv-template — sample CSV to download
exports.downloadCustomerCsvTemplate = async (req, res) => {
  try {
    // ✅ Country code and phone number are now SEPARATE plain-digit columns.
    // Neither one starts with "+", so Excel never mistakes them for a
    // formula — no more corruption, no more ="..." trick needed.
    const sampleRow = {
      name: 'Ahmed Al Mansoori',
      companyName: 'Al Mansoori Trading LLC',
      email: 'ahmed@example.com',
      countryCode: '971',
      phoneNumber: '501234567',
      altCountryCode: '',
      altPhoneNumber: '',
      gstNumber: '',
      panNumber: '',
      paymentTerms: 'cod',
      creditLimit: '0',
      category: 'regular',
      status: 'active',
      locationName: 'Main Warehouse',
      addressLine1: 'Al Quoz Industrial Area 3',
      addressLine2: 'Street 12',
      city: 'Dubai',
      state: 'Dubai',
      zipcode: 'DXB1',
      contactPersonName: 'Ahmed Al Mansoori',
      contactPersonCountryCode: '971',
      contactPersonPhoneNumber: '501234567',
      contactPersonEmail: 'ahmed@example.com',
      googleMapLink: '',
      specialInstructions: 'PHONE FORMAT: countryCode and phoneNumber (and the alt/contactPerson versions) are digits only — no +, no spaces, no dashes. e.g. countryCode=971, phoneNumber=501234567.',
    };

    const parser = new Parser({ fields: CSV_TEMPLATE_FIELDS });
    const csvOut = parser.parse([sampleRow]);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orion_customers_import_template.csv');
    return res.status(200).send(csvOut);
  } catch (error) {
    console.error('[CUSTOMER-CSV-TEMPLATE] ERROR:', error);
    req.flash('error', 'Failed to generate CSV template');
    return res.redirect('/admin/customers');
  }
};

// POST /admin/customers/import — upload CSV → create/update customers
exports.bulkImportCustomers = async (req, res) => {
  const filePath = req.file?.path;
  try {
    if (!req.file) {
      req.flash('error', 'Please choose a CSV file to import');
      return res.redirect('/admin/customers');
    }

    const rows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    // ✅ Digits only, any length — no + sign, no country restriction.
    const digitsOnlyRegex = /^[0-9]+$/;
    const zipcodeRegex = /^[A-Za-z0-9]{4}$/;
    const validCategories = ['vip', 'regular', 'wholesale', 'retail', 'distributor'];
    const validPaymentTerms = ['cod', 'credit_30', 'credit_45', 'credit_60', 'credit_90', 'credit_120'];
    const validStatuses = ['active', 'inactive', 'blocked', 'suspended'];
    const validCustomerTypes = ['individual', 'business', 'enterprise'];

    // Combines countryCode + number into a stored phone value like "+971501234567".
    // Returns null if the number part is missing/empty (so optional phones stay empty).
    const combinePhone = (countryCode, number) => {
      if (!number) return null;
      const cc = (countryCode || '').trim();
      const num = number.trim();
      return cc ? `+${cc}${num}` : num;
    };

    let created = 0, updated = 0, failed = 0, skipped = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // +2 = header row + 1-indexed
      const raw = rows[i];

      // Skip fully empty rows (trailing blank lines from Excel/Sheets export)
      const hasAnyValue = Object.values(raw).some(
        (v) => typeof v === 'string' && v.trim() !== ''
      );
      if (!hasAnyValue) {
        skipped++;
        continue;
      }

      try {
        const clean = {};
        Object.keys(raw).forEach(k => {
          const key = k.replace(/^\uFEFF/, '').trim();
          clean[key] = typeof raw[k] === 'string'
            ? raw[k].replace(/^\uFEFF/, '').trim()
            : raw[k];
        });

        if (!clean.name) { errors.push({ row: rowNum, error: 'Name is required' }); failed++; continue; }
        if (!clean.email || !/^\S+@\S+\.\S+$/.test(clean.email)) { errors.push({ row: rowNum, error: 'Valid email is required' }); failed++; continue; }

        // ---- Main phone: required ----
        if (!clean.phoneNumber || !digitsOnlyRegex.test(clean.phoneNumber)) {
          errors.push({ row: rowNum, error: `phoneNumber must contain digits only (got: "${clean.phoneNumber}")` }); failed++; continue;
        }
        if (clean.countryCode && !digitsOnlyRegex.test(clean.countryCode)) {
          errors.push({ row: rowNum, error: `countryCode must contain digits only (got: "${clean.countryCode}")` }); failed++; continue;
        }

        // ---- Alternate phone: optional ----
        if (clean.altPhoneNumber && !digitsOnlyRegex.test(clean.altPhoneNumber)) {
          errors.push({ row: rowNum, error: `altPhoneNumber must contain digits only (got: "${clean.altPhoneNumber}")` }); failed++; continue;
        }
        if (clean.altCountryCode && !digitsOnlyRegex.test(clean.altCountryCode)) {
          errors.push({ row: rowNum, error: `altCountryCode must contain digits only (got: "${clean.altCountryCode}")` }); failed++; continue;
        }

        // ---- Contact person phone: optional ----
        if (clean.contactPersonPhoneNumber && !digitsOnlyRegex.test(clean.contactPersonPhoneNumber)) {
          errors.push({ row: rowNum, error: `contactPersonPhoneNumber must contain digits only (got: "${clean.contactPersonPhoneNumber}")` }); failed++; continue;
        }
        if (clean.contactPersonCountryCode && !digitsOnlyRegex.test(clean.contactPersonCountryCode)) {
          errors.push({ row: rowNum, error: `contactPersonCountryCode must contain digits only (got: "${clean.contactPersonCountryCode}")` }); failed++; continue;
        }

        if (clean.zipcode && !zipcodeRegex.test(clean.zipcode)) { errors.push({ row: rowNum, error: `Zipcode must be exactly 4 alphanumeric characters (got: "${clean.zipcode}")` }); failed++; continue; }

        const phone = combinePhone(clean.countryCode, clean.phoneNumber);
        const alternatePhone = combinePhone(clean.altCountryCode, clean.altPhoneNumber);
        const contactPersonPhone = combinePhone(clean.contactPersonCountryCode, clean.contactPersonPhoneNumber) || phone;

        let assignedRegion = null;
        let regionAutoAssigned = false;
        if (clean.zipcode) {
          const foundRegion = await Region.findOne({ 'zipcodes.zipcode': clean.zipcode, isActive: true }).select('_id');
          if (foundRegion) { assignedRegion = foundRegion._id; regionAutoAssigned = true; }
        }

        const contactPerson = {
          name: clean.contactPersonName || clean.name,
          phone: contactPersonPhone,
          email: clean.contactPersonEmail || clean.email,
          designation: 'Primary Contact'
        };

        const locationData = (typeof clean.addressLine1 === 'string' && clean.addressLine1) ? {
          locationName: clean.locationName || `${clean.name}'s Location`,
          addressLine1: clean.addressLine1,
          addressLine2: clean.addressLine2 || '',
          city: clean.city || '',
          state: clean.state || '',
          zipcode: clean.zipcode || '',
          country: 'UAE',
          regionId: assignedRegion,
          regionAutoAssigned,
          googleMapLink: clean.googleMapLink || null,
          contactPerson,
          isPrimary: true,
          isActive: true
        } : null;

        const payload = {};
        if (validCustomerTypes.includes(clean.customerType)) payload.customerType = clean.customerType;
        payload.name = clean.name;
        payload.companyName = clean.companyName || null;
        payload.email = clean.email.toLowerCase();
        payload.phone = phone;
        payload.alternatePhone = alternatePhone || null;
        payload.gstNumber = clean.gstNumber ? clean.gstNumber.toUpperCase() : null;
        payload.panNumber = clean.panNumber ? clean.panNumber.toUpperCase() : null;
        if (validPaymentTerms.includes(clean.paymentTerms)) payload.paymentTerms = clean.paymentTerms;
        if (clean.creditLimit !== undefined && clean.creditLimit !== '') payload.creditLimit = parseFloat(clean.creditLimit) || 0;
        if (validCategories.includes(clean.category)) payload.category = clean.category;
        if (validStatuses.includes(clean.status)) payload.status = clean.status;
        if (clean.notes) payload.notes = clean.notes;
        if (clean.specialInstructions) {
          payload.preferences = { specialInstructions: clean.specialInstructions };
        }

        const customerIdInput = clean.customerId ? clean.customerId.toUpperCase() : null;

        let existingCustomer = null;
        if (customerIdInput) {
          existingCustomer = await Customer.findOne({ customerId: customerIdInput });
        }
        if (!existingCustomer) {
          existingCustomer = await Customer.findOne({
            $or: [{ phone: payload.phone }, { email: payload.email }]
          });
        }

        if (existingCustomer) {
          // ===== UPDATE =====
          if (locationData) {
            const locations = (existingCustomer.locations || [])
              .map(l => (l && l.toObject ? l.toObject() : l))
              .filter(l => l && typeof l === 'object' && !Array.isArray(l));

            const primaryIdx = locations.findIndex(l => l.isPrimary);
            if (primaryIdx >= 0) {
              locations[primaryIdx] = { ...locations[primaryIdx], ...locationData };
            } else {
              locations.push(locationData);
            }
            payload.locations = locations;
          }
          if (payload.status) payload.isActive = payload.status === 'active';

          await Customer.findByIdAndUpdate(existingCustomer._id, { $set: payload }, { runValidators: true });
          updated++;
        } else {
          // ===== CREATE =====
          let saved = false;
          while (!saved) {
            try {
              const lastCustomer = await Customer.findOne().sort({ createdAt: -1 });
              let newId = 1;
              if (lastCustomer?.customerId) {
                const lastNumber = parseInt(lastCustomer.customerId.replace('CUST', '')) || 0;
                newId = lastNumber + 1;
              }
              payload.customerId = `CUST${String(newId).padStart(6, '0')}`;
              payload.customerType = payload.customerType || 'individual';
              payload.paymentTerms = payload.paymentTerms || 'cod';
              payload.category = payload.category || 'regular';
              payload.status = payload.status || 'active';
              payload.isActive = payload.status === 'active';
              payload.locations = locationData ? [locationData] : [];
              payload.billingAddress = locationData ? {
                addressLine1: locationData.addressLine1,
                addressLine2: locationData.addressLine2,
                city: locationData.city,
                zipcode: locationData.zipcode,
                country: 'UAE'
              } : undefined;
              payload.createdBy = req.user._id;

              const newCustomer = new Customer(payload);
              await newCustomer.save();
              saved = true;
            } catch (dupErr) {
              if (dupErr.code === 11000) {
                console.log('[CUSTOMER-CSV-IMPORT] customerId collision, retrying...');
              } else {
                throw dupErr;
              }
            }
          }
          created++;
        }
      } catch (rowErr) {
        failed++;
        console.error(`[CSV-IMPORT] Row ${rowNum} ERROR:`, rowErr.message);
        errors.push({ row: rowNum, error: rowErr.message });
      }
    }

    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);

    const summary = `Import complete: ${created} created, ${updated} updated, ${failed} failed, ${skipped} blank rows skipped (of ${rows.length} rows).`;
    console.log('[CUSTOMER-CSV-IMPORT]', summary);

    if (errors.length) {
      const errorPreview = errors.slice(0, 5).map(e => `Row ${e.row}: ${e.error}`).join(' | ');
      req.flash('error', `${summary} First issue(s): ${errorPreview}`);
    } else {
      req.flash('success', summary);
    }

    return res.redirect('/admin/customers');
  } catch (error) {
    console.error('[CUSTOMER-CSV-IMPORT] ERROR:', error);
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    req.flash('error', 'Import failed: ' + error.message);
    return res.redirect('/admin/customers');
  }
};


// GET /admin/customers/export — download all (filtered) customers as CSV
exports.bulkExportCustomers = async (req, res) => {
  try {
    const { status, customerType, category, regionId } = req.query;

    const query = {};
    if (status) query.status = status;
    if (customerType) query.customerType = customerType;
    if (category) query.category = category;
    if (regionId) query['locations.regionId'] = regionId;

    const customers = await Customer.find(query)
      .populate('locations.regionId', 'regionName regionCode')
      .lean();

    if (!customers.length) {
      req.flash('error', 'No customers found to export');
      return res.redirect('/admin/customers');
    }

    const flattened = customers.map(c => {
      const primary = (c.locations || []).find(l => l.isPrimary) || (c.locations || [])[0] || {};
      return {
        customerId: c.customerId,
        customerType: c.customerType,
        name: c.name,
        companyName: c.companyName || '',
        email: c.email,
        phone: c.phone,
        alternatePhone: c.alternatePhone || '',
        gstNumber: c.gstNumber || '',
        panNumber: c.panNumber || '',
        paymentTerms: c.paymentTerms,
        creditLimit: c.creditLimit,
        category: c.category,
        status: c.status,
        locationName: primary.locationName || '',
        addressLine1: primary.addressLine1 || '',
        addressLine2: primary.addressLine2 || '',
        city: primary.city || '',
        state: primary.state || '',
        zipcode: primary.zipcode || '',
        regionName: primary.regionId?.regionName || '',
        contactPersonName: primary.contactPerson?.name || '',
        contactPersonPhone: primary.contactPerson?.phone || '',
        contactPersonEmail: primary.contactPerson?.email || '',
        googleMapLink: primary.googleMapLink || '',
        specialInstructions: c.preferences?.specialInstructions || '',
        notes: c.notes || '',
        totalOrders: c.stats?.totalOrders || 0,
        totalDeliveries: c.stats?.totalDeliveries || 0,
        createdAt: c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : ''
      };
    });

    const fields = [
      ...CSV_TEMPLATE_FIELDS.filter(f => f !== 'specialInstructions').concat(['specialInstructions']),
      'regionName', 'totalOrders', 'totalDeliveries', 'createdAt'
    ];
    // De-dupe while preserving order
    const seen = new Set();
    const finalFields = fields.filter(f => (seen.has(f) ? false : seen.add(f)));

    const parser = new Parser({ fields: finalFields });
    const csvOut = parser.parse(flattened);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=orion_customers_export_${Date.now()}.csv`);
    return res.status(200).send(csvOut);
  } catch (error) {
    console.error('[CUSTOMER-CSV-EXPORT] ERROR:', error);
    req.flash('error', 'Failed to export customers: ' + error.message);
    return res.redirect('/admin/customers');
  }
};

