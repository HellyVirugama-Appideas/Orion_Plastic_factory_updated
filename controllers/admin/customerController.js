// const mongoose = require("mongoose")
// const Customer = require('../../models/Customer');
// const Region = require('../../models/Region');
// const Delivery = require("../../models/Delivery")
// const { successResponse, errorResponse } = require('../../utils/responseHelper');
// const csv = require('csv-parser');
// const { Parser } = require('json2csv');
// const fs = require('fs');
// const path = require('path');

// //  CREATE CUSTOMER 
// // exports.createCustomer = async (req, res) => {
// //   try {
// //     const {
// //       customerType,
// //       name,
// //       companyName,
// //       email,
// //       phone,
// //       alternatePhone,
// //       gstNumber,
// //       panNumber,
// //       locations,
// //       billingAddress,
// //       paymentTerms,
// //       creditLimit,
// //       preferences,
// //       tags,
// //       category,
// //       notes
// //     } = req.body;

// //     // Check if customer already exists
// //     const existingCustomer = await Customer.findOne({
// //       $or: [
// //         { email: email.toLowerCase() },
// //         { phone }
// //       ]
// //     });

// //     if (existingCustomer) {
// //       if (existingCustomer.email === email.toLowerCase()) {
// //         return errorResponse(res, 'Email already exists', 400);
// //       }
// //       if (existingCustomer.phone === phone) {
// //         return errorResponse(res, 'Phone number already exists', 400);
// //       }
// //     }

// //     // Auto-assign regions based on zipcodes
// //     if (locations && locations.length > 0) {
// //       for (let location of locations) {
// //         if (location.zipcode && location.regionAutoAssigned !== false) {
// //           const region = await Region.findByZipcode(location.zipcode);
// //           if (region) {
// //             location.regionId = region._id;
// //             location.regionAutoAssigned = true;
// //           }
// //         }
// //       }
// //     }

// //     // Create customer
// //     const customer = await Customer.create({
// //       customerType,
// //       name,
// //       companyName,
// //       email: email.toLowerCase(),
// //       phone,
// //       alternatePhone,
// //       gstNumber: gstNumber?.toUpperCase(),
// //       panNumber: panNumber?.toUpperCase(),
// //       locations: locations || [],
// //       billingAddress,
// //       paymentTerms: paymentTerms || 'cod',
// //       creditLimit: creditLimit || 0,
// //       preferences: preferences || {},
// //       tags: tags || [],
// //       category: category || 'regular',
// //       notes,
// //       createdBy: req.user._id
// //     });

// //     return successResponse(res, 'Customer created successfully', {
// //       customer
// //     }, 201);

// //   } catch (error) {
// //     console.error('Create Customer Error:', error);
// //     if (error.name === 'ValidationError') {
// //       const messages = Object.values(error.errors).map(err => err.message);
// //       return errorResponse(res, messages.join(', '), 400);
// //     }
// //     if (error.code === 11000) {
// //       return errorResponse(res, 'Duplicate customer details', 400);
// //     }
// //     return errorResponse(res, 'Failed to create customer', 500);
// //   }
// // };

// // CREATE CUSTOMER (Admin Only) - With Document Uploads
// exports.createCustomer = async (req, res) => {
//   try {
//     console.log('[CREATE-CUSTOMER] Body:', req.body);
//     console.log('[CREATE-CUSTOMER] Files:', req.files ? Object.keys(req.files) : 'No files');

//     const {
//       customerType = 'individual',
//       name,
//       companyName,
//       email,
//       phone,
//       alternatePhone,
//       gstNumber,
//       panNumber,
//       paymentTerms = 'cod',
//       creditLimit = 0,
//       category = 'regular',
//       status = 'active',
//       addressLine1,
//       addressLine2,
//       city,
//       state,
//       zipcode,
//       locationName,
//       contactPersonName,
//       contactPersonPhone,
//       contactPersonEmail,
//       specialInstructions
//     } = req.body;

//     // Validation - Required fields
//     if (!name || !email || !phone || !addressLine1 || !city || !state || !zipcode) {
//       req.flash('error', 'Name, email, phone, and billing address are required');
//       return res.redirect('/admin/customers/create');
//     }

//     // Phone validation (10 digits)
//     const cleanPhone = phone.replace(/\D/g, '');
//     if (cleanPhone.length !== 10) {
//       req.flash('error', 'Phone number must be exactly 10 digits');
//       return res.redirect('/admin/customers/create');
//     }

//     // Zipcode validation (6 digits)
//     if (!/^\d{6}$/.test(zipcode)) {
//       req.flash('error', 'Zipcode must be exactly 6 digits');
//       return res.redirect('/admin/customers/create');
//     }

//     // Email validation
//     const emailRegex = /^\S+@\S+\.\S+$/;
//     if (!emailRegex.test(email)) {
//       req.flash('error', 'Valid email is required');
//       return res.redirect('/admin/customers/create');
//     }

//     // ========== BUILD LOCATION (Primary Location) ==========
//     let locations = [];
//     if (locationName || addressLine1 || city || state || zipcode) {
//       locations.push({
//         locationName: locationName?.trim() || `${name}'s Location`,
//         addressLine1: addressLine1?.trim(),
//         addressLine2: addressLine2?.trim() || '',
//         city: city?.trim(),
//         state: state?.trim(),
//         zipcode: zipcode?.trim(),
//         country: 'India',
//         isPrimary: true,
//         isActive: true
//       });
//     }

//     // ========== CONTACT PERSON ==========
//     const contactPerson = {};
//     if (contactPersonName || contactPersonPhone || contactPersonEmail) {
//       contactPerson.name = contactPersonName?.trim();
//       contactPerson.phone = contactPersonPhone?.replace(/\D/g, '');
//       contactPerson.email = contactPersonEmail;
//       contactPerson.designation = 'Primary Contact';
//     }

//     // ========== DOCUMENTS HANDLING (Same as Driver) ==========
//     const documents = [];
//     const baseUrl = process.env.NODE_ENV === 'production'
//       ? 'https://yourdomain.com'
//       : 'http://localhost:5001';
//     const documentBasePath = '/uploads/documents/';

//     const documentMapping = {
//       gstCertificate: 'gst_certificate',
//       panCard: 'pan_card',
//       shopLicense: 'shop_license',
//       otherDoc: 'other_document'
//     };

//     const addDocument = (fieldName, docType) => {
//       if (req.files?.[fieldName]?.[0]) {
//         const file = req.files[fieldName][0];
//         const relativePath = documentBasePath + file.filename;

//         documents.push({
//           documentType: docType,
//           fileUrl: relativePath,
//           uploadedAt: new Date()
//         });

//         console.log(`[CREATE-CUSTOMER] Added ${docType}:`, relativePath);
//       }
//     };

//     addDocument('gstCertificate', 'gst_certificate');
//     addDocument('panCard', 'pan_card');
//     addDocument('shopLicense', 'shop_license');
//     addDocument('otherDoc', 'other_document');

//     // Console log full URLs
//     const consoleDetails = {};
//     documents.forEach(doc => {
//       consoleDetails[doc.documentType] = `${baseUrl}${doc.fileUrl}`;
//     });
//     if (documents.length > 0) {
//       console.log('[CREATE-CUSTOMER] Fixed Document URLs:', consoleDetails);
//     }

//     // ========== CREATE CUSTOMER ==========
//     const newCustomer = new Customer({
//       customerType,
//       name: name.trim(),
//       companyName: companyName?.trim() || null,
//       email: email.toLowerCase().trim(),
//       phone: cleanPhone,
//       alternatePhone: alternatePhone?.replace(/\D/g, '') || null,
//       gstNumber: gstNumber?.trim() || null,
//       panNumber: panNumber?.trim() || null,
//       locations,
//       billingAddress: {
//         addressLine1: addressLine1?.trim(),
//         addressLine2: addressLine2?.trim() || '',
//         city: city?.trim(),
//         state: state?.trim(),
//         zipcode: zipcode?.trim(),
//         country: 'India'
//       },
//       paymentTerms,
//       creditLimit: parseFloat(creditLimit) || 0,
//       category,
//       status,
//       documents,
//       preferences: {
//         feedbackNotification: true,
//         smsNotification: true,
//         emailNotification: true,
//         specialInstructions: specialInstructions?.trim() || ''
//       },
//       contactPerson,
//       isActive: status === 'active'
//     });

//     await newCustomer.save();

//     console.log('[CREATE-CUSTOMER] Successfully created:', newCustomer.customerId);
//     req.flash('success', `Customer ${newCustomer.customerId} created successfully!`);
//     res.redirect(`/admin/customers/view/${newCustomer.customerId}`);

//   } catch (error) {
//     console.error('[CREATE-CUSTOMER] ERROR:', error);

//     let errorMsg = 'Failed to create customer';

//     if (error.code === 11000) {
//       const field = Object.keys(error.keyPattern || {})[0];
//       errorMsg = `Duplicate ${field} already exists`;
//     } else if (error.name === 'ValidationError') {
//       errorMsg = Object.values(error.errors).map(err => err.message).join(', ');
//     } else if (error.message) {
//       errorMsg = error.message;
//     }

//     req.flash('error', errorMsg);
//     res.redirect('/admin/customers/create');
//   }
// };

// // Get Create Customer Form (EJS)
// exports.getCreateCustomer = async (req, res) => {
//   try {
//     res.render('create-customer', {
//       title: 'Create New Customer',
//       url: req.originalUrl,
//       errors: req.flash('error'),
//       success: req.flash('success')
//     });
//   } catch (error) {
//     console.error('[GET-CREATE-CUSTOMER] ERROR:', error);
//     req.flash('error', 'Failed to load form');
//     res.redirect('/admin/customers');
//   }
// };

// //  GET ALL CUSTOMERS 
// exports.getAllCustomers = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 20,
//       status,
//       customerType,
//       category,
//       search,
//       regionId,
//       zipcode,
//       sortBy = 'createdAt',
//       sortOrder = 'desc'
//     } = req.query;

//     const query = {};

//     // Filters
//     if (status) query.status = status;
//     if (customerType) query.customerType = customerType;
//     if (category) query.category = category;
//     if (regionId) query['locations.regionId'] = regionId;
//     if (zipcode) query['locations.zipcode'] = zipcode;

//     // Search
//     if (search) {
//       query.$or = [
//         { name: { $regex: search, $options: 'i' } },
//         { email: { $regex: search, $options: 'i' } },
//         { phone: { $regex: search, $options: 'i' } },
//         { customerId: { $regex: search, $options: 'i' } },
//         { companyName: { $regex: search, $options: 'i' } }
//       ];
//     }

//     const skip = (parseInt(page) - 1) * parseInt(limit);
//     const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

//     const [customers, total] = await Promise.all([
//       Customer.find(query)
//         .populate('locations.regionId', 'regionName regionCode')
//         .populate('accountManager', 'name email')
//         .populate('createdBy', 'name email')
//         .sort(sortOptions)
//         .skip(skip)
//         .limit(parseInt(limit)),
//       Customer.countDocuments(query)
//     ]);

//     res.render('customers', {
//       title: 'Customers Management',
//       customers,
//       url: req.originalUrl,
//       pagination: {
//         page: parseInt(page),
//         pages: Math.ceil(total / parseInt(limit)),
//         total
//       },
//       filters: req.query,
//       messages: {
//         success: req.flash('success'),
//         error: req.flash('error')
//       }
//     });

//   } catch (error) {
//     console.error('Get All Customers Error:', error);
//     req.flash('error', 'Failed to retrieve customers');
//     res.redirect('/admin/customers');
//   }
// };

// // exports.viewCustomer = async (req, res) => {
// //   try {
// //     const customerId = req.params.customerId || req.params.id;
// //     console.log('[CUSTOMER-DETAILS] Requested ID:', customerId);

// //     if (!mongoose.Types.ObjectId.isValid(customerId)) {
// //       return res.redirect('/admin/customers?error=Invalid customer ID');
// //     }

// //     // Fetch customer with important fields
// //     const customer = await Customer.findById(customerId)
// //       .select('-__v') // remove unnecessary fields
// //       .lean();

// //     if (!customer) {
// //       return res.redirect('/admin/customers?error=Customer not found');
// //     }

// //     // Base URL for documents (same as driver)
// //     const baseUrl = process.env.IMAGE_URL || 'http://localhost:5001/uploads/documents';

// //     // Normalize customer documents (same logic as driver)
// //     if (customer.documents && Array.isArray(customer.documents)) {
// //       const docs = customer.documents;

// //       customer.gstCertificate = docs.find(d => d.documentType === 'gst_certificate')?.fileUrl
// //         ? `${baseUrl}/${docs.find(d => d.documentType === 'gst_certificate').fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}`
// //         : null;

// //       customer.panCard = docs.find(d => d.documentType === 'pan_card')?.fileUrl
// //         ? `${baseUrl}/${docs.find(d => d.documentType === 'pan_card').fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}`
// //         : null;

// //       customer.shopLicense = docs.find(d => d.documentType === 'shop_license')?.fileUrl
// //         ? `${baseUrl}/${docs.find(d => d.documentType === 'shop_license').fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}`
// //         : null;

// //       customer.otherDoc = docs.find(d => d.documentType === 'other_document')?.fileUrl
// //         ? `${baseUrl}/${docs.find(d => d.documentType === 'other_document').fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}`
// //         : null;

// //       console.log('[CUSTOMER-DETAILS] Fixed Document URLs:', {
// //         gstCertificate: customer.gstCertificate,
// //         panCard: customer.panCard,
// //         shopLicense: customer.shopLicense,
// //         otherDoc: customer.otherDoc
// //       });
// //     }

// //     // Get primary location
// //     const primaryLocation = customer.locations?.find(loc => loc.isPrimary) || customer.locations?.[0] || {};

// //     // Recent deliveries (last 10)
// //     const recentDeliveries = await Delivery.find({ customerId: customer._id })
// //       .populate('orderId')
// //       .sort({ createdAt: -1 })
// //       .limit(10)
// //       .lean();

// //     // Basic stats
// //     const stats = {
// //       totalOrders: await Delivery.countDocuments({ customerId: customer._id }),
// //       completed: await Delivery.countDocuments({ customerId: customer._id, status: 'delivered' }),
// //       pending: await Delivery.countDocuments({ customerId: customer._id, status: { $in: ['pending', 'processing'] } }),
// //       totalSpent: customer.stats?.totalSpent || 0,
// //       lastOrderDate: customer.stats?.lastOrderDate ? new Date(customer.stats.lastOrderDate).toLocaleDateString() : 'Never'
// //     };

// //     res.render('customer_view', {
// //       title: `Customer - ${customer.name || customer.companyName || 'Details'}`,
// //       user: req.admin,
// //       customer,
// //       primaryLocation,
// //       recentDeliveries,
// //       stats,
// //       url: req.originalUrl,
// //     });

// //   } catch (error) {
// //     console.error('[CUSTOMER-DETAILS] CRITICAL ERROR:', error);
// //     res.redirect('/admin/customers?error=Failed to load customer details');
// //   }
// // };


// exports.viewCustomer = async (req, res) => {
//   try {
//     const customerId = req.params.customerId || req.params.id;
//     console.log('[CUSTOMER-DETAILS] Requested ID:', customerId);

//     if (!mongoose.Types.ObjectId.isValid(customerId)) {
//       req.flash('error', 'Invalid customer ID');
//       return res.redirect('/admin/customers');
//     }

//     const customer = await Customer.findById(customerId)
//       .select('-__v')
//       .lean();

//     if (!customer) {
//       req.flash('error', 'Customer not found');
//       return res.redirect('/admin/customers');
//     }

//     const baseUrl = process.env.IMAGE_URL || 'http://localhost:5001';

//     // Fix document URLs (same as driver)
//     if (customer.documents?.length) {
//       const docs = customer.documents;
//       customer.gstCertificate = docs.find(d => d.documentType === 'gst_certificate')?.fileUrl
//         ? `${baseUrl}/${docs.find(d => d.documentType === 'gst_certificate').fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}`
//         : null;

//       customer.panCard = docs.find(d => d.documentType === 'pan_card')?.fileUrl
//         ? `${baseUrl}/${docs.find(d => d.documentType === 'pan_card').fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}`
//         : null;

//       customer.shopLicense = docs.find(d => d.documentType === 'shop_license')?.fileUrl
//         ? `${baseUrl}/${docs.find(d => d.documentType === 'shop_license').fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}`
//         : null;

//       customer.otherDoc = docs.find(d => d.documentType === 'other_document')?.fileUrl
//         ? `${baseUrl}/${docs.find(d => d.documentType === 'other_document').fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}`
//         : null;

//       console.log('[CUSTOMER-DETAILS] Fixed Document URLs:', {
//         gstCertificate: customer.gstCertificate,
//         panCard: customer.panCard,
//         shopLicense: customer.shopLicense,
//         otherDoc: customer.otherDoc
//       });
//     }

//     const primaryLocation = customer.locations?.find(loc => loc.isPrimary) ||
//                            customer.locations?.[0] || {};

//     const recentDeliveries = await Delivery.find({ customerId: customer._id })
//       .populate('orderId')
//       .sort({ createdAt: -1 })
//       .limit(10)
//       .lean();

//     const stats = {
//       totalOrders: await Delivery.countDocuments({ customerId: customer._id }),
//       completed: await Delivery.countDocuments({ customerId: customer._id, status: 'delivered' }),
//       pending: await Delivery.countDocuments({ customerId: customer._id, status: { $in: ['pending', 'processing'] } }),
//       totalSpent: customer.stats?.totalSpent || 0,
//       lastOrderDate: customer.stats?.lastOrderDate 
//         ? new Date(customer.stats.lastOrderDate).toLocaleDateString() 
//         : 'Never'
//     };

//     res.render('customer_view', {
//       title: `Customer - ${customer.name || customer.companyName || 'Details'}`,
//       user: req.admin,
//       customer,
//       primaryLocation,
//       recentDeliveries,
//       stats,
//       url: req.originalUrl,
//       baseUrl
//     });

//   } catch (error) {
//     console.error('[CUSTOMER-DETAILS] CRITICAL ERROR:', error);
//     req.flash('error', 'Failed to load customer details');
//     res.redirect('/admin/customers');
//   }
// };


// //  GET CUSTOMER BY ID 
// exports.getCustomerById = async (req, res) => {
//   try {
//     const { customerId } = req.params;

//     const customer = await Customer.findById(customerId)
//       .populate('locations.regionId', 'regionName regionCode state')
//       .populate('accountManager', 'name email phone')
//       .populate('createdBy', 'name email');

//     if (!customer) {
//       return errorResponse(res, 'Customer not found', 404);
//     }

//     return successResponse(res, 'Customer retrieved successfully', {
//       customer
//     });

//   } catch (error) {
//     console.error('Get Customer By ID Error:', error);
//     return errorResponse(res, 'Failed to retrieve customer', 500);
//   }
// };

// //  UPDATE CUSTOMER 
// exports.updateCustomer = async (req, res) => {
//   try {
//     const { customerId } = req.params;
//     console.log('[UPDATE-CUSTOMER] ID:', customerId);
//     console.log('[UPDATE-CUSTOMER] Body:', req.body);
//     console.log('[UPDATE-CUSTOMER] Files:', req.files ? Object.keys(req.files) : 'No files');

//     if (!mongoose.Types.ObjectId.isValid(customerId)) {
//       req.flash('error', 'Invalid customer ID');
//       return res.redirect(`/admin/customers/${customerId}/edit`);
//     }

//     const updates = { ...req.body };

//     // Protected fields - never allow update
//     delete updates.customerId;
//     delete updates.stats;
//     delete updates.createdBy;
//     delete updates.createdAt;

//     // Clean phone numbers
//     if (updates.phone) {
//       updates.phone = updates.phone.replace(/\D/g, '');
//       if (updates.phone.length !== 10) {
//         req.flash('error', 'Phone number must be exactly 10 digits');
//         return res.redirect(`/admin/customers/${customerId}/edit`);
//       }
//     }

//     if (updates.alternatePhone) {
//       updates.alternatePhone = updates.alternatePhone.replace(/\D/g, '');
//     }

//     // Documents handling (same as create)
//     if (req.files && Object.keys(req.files).length > 0) {
//       console.log('[UPDATE-CUSTOMER] Processing files:', Object.keys(req.files));

//       const currentCustomer = await Customer.findById(customerId).select('documents');
//       let documents = currentCustomer?.documents || [];

//       // Clean invalid docs
//       documents = documents.filter(doc => doc && doc.documentType);

//       const baseUrl = process.env.NODE_ENV === 'production'
//         ? 'https://yourdomain.com'
//         : 'http://localhost:5001';
//       const documentBasePath = '/uploads/documents/';

//       const documentMapping = {
//         gstCertificate: 'gst_certificate',
//         panCard: 'pan_card',
//         shopLicense: 'shop_license',
//         otherDoc: 'other_document'
//       };

//       const consoleDetails = {};

//       for (const [fieldName, docType] of Object.entries(documentMapping)) {
//         if (req.files[fieldName]?.[0]) {
//           const file = req.files[fieldName][0];
//           const relativePath = documentBasePath + file.filename;

//           const existingIndex = documents.findIndex(d => d.documentType === docType);

//           if (existingIndex >= 0) {
//             // Update existing
//             documents[existingIndex] = {
//               documentType: docType,
//               fileUrl: relativePath,
//               uploadedAt: new Date()
//             };
//           } else {
//             // Add new
//             documents.push({
//               documentType: docType,
//               fileUrl: relativePath,
//               uploadedAt: new Date()
//             });
//           }

//           consoleDetails[docType] = `${baseUrl}${relativePath}`;
//           console.log(`[UPDATE-CUSTOMER] ${existingIndex >= 0 ? 'Updated' : 'Added'} ${docType}: ${file.filename}`);
//         }
//       }

//       if (Object.keys(consoleDetails).length > 0) {
//         console.log('[UPDATE-CUSTOMER] Fixed Document URLs:', consoleDetails);
//       }

//       updates.documents = documents;
//     }

//     // Update customer
//     const updatedCustomer = await Customer.findByIdAndUpdate(
//       customerId,
//       { $set: updates },
//       { new: true, runValidators: true }
//     ).lean();

//     if (!updatedCustomer) {
//       req.flash('error', 'Customer not found');
//       return res.redirect(`/admin/customers/${customerId}/edit`);
//     }

//     console.log('[UPDATE-CUSTOMER] Successfully updated:', updatedCustomer.customerId);
//     req.flash('success', `Customer ${updatedCustomer.customerId} updated successfully!`);
//     res.redirect(`/admin/customers/view/${customerId}`);

//   } catch (error) {
//     console.error('[UPDATE-CUSTOMER] ERROR:', error);

//     let errorMsg = 'Failed to update customer';

//     if (error.code === 11000) {
//       const field = Object.keys(error.keyPattern || {})[0];
//       errorMsg = `Duplicate ${field}: This value already exists`;
//     } else if (error.name === 'ValidationError') {
//       errorMsg = Object.values(error.errors).map(err => err.message).join(', ');
//     } else if (error.message) {
//       errorMsg = error.message;
//     }

//     req.flash('error', errorMsg);
//     res.redirect(`/admin/customers/${req.params.customerId}/edit`);
//   }
// };

// // GET - Render Edit Form
// exports.getEditCustomer = async (req, res) => {
//   try {
//     const { customerId } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(customerId)) {
//       req.flash('error', 'Invalid customer ID');
//       return res.redirect('/admin/customers');
//     }

//     const customer = await Customer.findById(customerId).lean();

//     if (!customer) {
//       req.flash('error', 'Customer not found');
//       return res.redirect('/admin/customers');
//     }

//     res.render('customer_edit', {
//       title: `Edit Customer - ${customer.customerId}`,
//       customer,
//       url: req.originalUrl,
//       errors: req.flash('error'),
//       success: req.flash('success')
//     });

//   } catch (error) {
//     console.error('[GET-EDIT-CUSTOMER] ERROR:', error);
//     req.flash('error', 'Failed to load edit form');
//     res.redirect('/admin/customers');
//   }
// };

// //  DELETE CUSTOMER 
// exports.deleteCustomer = async (req, res) => {
//   try {
//     const { customerId } = req.params;

//     // Validate ObjectId
//     if (!mongoose.Types.ObjectId.isValid(customerId)) {
//       req.flash('error', 'Invalid customer ID');
//       return res.redirect('/admin/customers');
//     }

//     // Find and permanently delete the customer
//     const customer = await Customer.findByIdAndDelete(customerId);

//     if (!customer) {
//       req.flash('error', 'Customer not found');
//       return res.redirect('/admin/customers');
//     }

//     // Optional: Prevent deletion if customer has active deliveries
//     // Uncomment if you want to block delete on active orders
//     /*
//     const activeDeliveries = await Delivery.countDocuments({
//       customerId: customer._id,
//       status: { $nin: ['delivered', 'cancelled', 'failed'] }
//     });

//     if (activeDeliveries > 0) {
//       req.flash('error', 'Cannot delete customer with active deliveries. Complete or cancel them first.');
//       // Re-insert customer since we already deleted it (edge case)
//       await new Customer(customer).save();
//       return res.redirect('/admin/customers');
//     }
//     */

//     // Optional: Delete uploaded document files from disk (same as driver)
//     if (customer.documents && customer.documents.length > 0) {
//       customer.documents.forEach(doc => {
//         if (doc.fileUrl) {
//           const filePath = path.join(__dirname, '../../public', doc.fileUrl);
//           if (fs.existsSync(filePath)) {
//             try {
//               fs.unlinkSync(filePath);
//               console.log(`[DELETE-CUSTOMER] Deleted file: ${doc.fileUrl}`);
//             } catch (err) {
//               console.error(`[DELETE-CUSTOMER] Failed to delete file: ${doc.fileUrl}`, err);
//             }
//           }
//         }
//       });
//     }

//     console.log(`[DELETE-CUSTOMER] Permanently deleted: ${customer.customerId} (${customer.name || customer.companyName})`);

//     req.flash('success', `Customer ${customer.customerId} - ${customer.name || customer.companyName || 'N/A'} deleted successfully`);
//     res.redirect('/admin/customers');

//   } catch (error) {
//     console.error('[DELETE-CUSTOMER] ERROR:', error);
//     req.flash('error', 'Failed to delete customer. Please try again.');
//     res.redirect('/admin/customers');
//   }
// };

// //  ADD LOCATION 
// exports.addLocation = async (req, res) => {
//   try {
//     const { customerId } = req.params;
//     const locationData = req.body;

//     const customer = await Customer.findById(customerId);

//     if (!customer) {
//       return errorResponse(res, 'Customer not found', 404);
//     }

//     // Auto-assign region if zipcode provided
//     if (locationData.zipcode && locationData.regionAutoAssigned !== false) {
//       const region = await Region.findByZipcode(locationData.zipcode);
//       if (region) {
//         locationData.regionId = region._id;
//         locationData.regionAutoAssigned = true;
//       }
//     }

//     customer.addLocation(locationData);
//     await customer.save();

//     return successResponse(res, 'Location added successfully', {
//       customer: {
//         id: customer._id,
//         name: customer.name,
//         locations: customer.locations
//       }
//     });

//   } catch (error) {
//     console.error('Add Location Error:', error);
//     return errorResponse(res, 'Failed to add location', 500);
//   }
// };

// //  UPDATE LOCATION 
// exports.updateLocation = async (req, res) => {
//   try {
//     const { customerId, locationId } = req.params;
//     const updates = req.body;

//     const customer = await Customer.findById(customerId);

//     if (!customer) {
//       return errorResponse(res, 'Customer not found', 404);
//     }

//     const location = customer.locations.id(locationId);

//     if (!location) {
//       return errorResponse(res, 'Location not found', 404);
//     }

//     // Update location fields
//     Object.keys(updates).forEach(key => {
//       location[key] = updates[key];
//     });

//     // Auto-assign region if zipcode changed
//     if (updates.zipcode && location.regionAutoAssigned !== false) {
//       const region = await Region.findByZipcode(updates.zipcode);
//       if (region) {
//         location.regionId = region._id;
//         location.regionAutoAssigned = true;
//       }
//     }

//     await customer.save();

//     return successResponse(res, 'Location updated successfully', {
//       customer: {
//         id: customer._id,
//         name: customer.name,
//         locations: customer.locations
//       }
//     });

//   } catch (error) {
//     console.error('Update Location Error:', error);
//     return errorResponse(res, 'Failed to update location', 500);
//   }
// };

// //  DELETE LOCATION 
// exports.deleteLocation = async (req, res) => {
//   try {
//     const { customerId, locationId } = req.params;

//     const customer = await Customer.findById(customerId);

//     if (!customer) {
//       return errorResponse(res, 'Customer not found', 404);
//     }

//     const locationIndex = customer.locations.findIndex(
//       loc => loc._id.toString() === locationId
//     );

//     if (locationIndex === -1) {
//       return errorResponse(res, 'Location not found', 404);
//     }

//     if (customer.locations.length === 1) {
//       return errorResponse(res, 'Cannot delete the only location', 400);
//     }

//     const locationToDelete = customer.locations[locationIndex];

//     // Agar primary location delete ho rahi hai
//     if (locationToDelete.isPrimary) {
//       // Koi aur location ko primary bana do
//       const newPrimaryIndex = locationIndex === 0 ? 1 : 0;
//       customer.locations[newPrimaryIndex].isPrimary = true;
//     }

//     // YE SABSE SAFE AUR WORKING TAREEKA HAI
//     customer.locations.splice(locationIndex, 1);
//     // Ya phir: customer.locations.pull(locationId);

//     await customer.save();

//     return successResponse(res, 'Location deleted successfully', {
//       customerId,
//       totalLocationsLeft: customer.locations.length
//     });

//   } catch (error) {
//     console.error('Delete Location Error:', error);
//     return errorResponse(res, 'Failed to delete location', 500);
//   }
// };

// //  OVERRIDE REGION 
// exports.overrideRegion = async (req, res) => {
//   try {
//     const { customerId, locationId } = req.params;
//     const { regionId } = req.body;

//     if (!regionId) {
//       return errorResponse(res, 'Region ID is required', 400);
//     }

//     const customer = await Customer.findById(customerId);
//     const region = await Region.findById(regionId);

//     if (!customer) {
//       return errorResponse(res, 'Customer not found', 404);
//     }

//     if (!region) {
//       return errorResponse(res, 'Region not found', 404);
//     }

//     const location = customer.locations.id(locationId);

//     if (!location) {
//       return errorResponse(res, 'Location not found', 404);
//     }

//     // Override region
//     location.regionId = region._id;
//     location.regionAutoAssigned = false; // Mark as manually assigned

//     await customer.save();

//     return successResponse(res, 'Region overridden successfully', {
//       location: {
//         id: location._id,
//         locationName: location.locationName,
//         zipcode: location.zipcode,
//         regionId: location.regionId,
//         regionAutoAssigned: location.regionAutoAssigned
//       }
//     });

//   } catch (error) {
//     console.error('Override Region Error:', error);
//     return errorResponse(res, 'Failed to override region', 500);
//   }
// };

// //  TOGGLE FEEDBACK NOTIFICATION 
// exports.toggleFeedbackNotification = async (req, res) => {
//   try {
//     const { customerId } = req.params;

//     const customer = await Customer.findById(customerId);

//     if (!customer) {
//       return errorResponse(res, 'Customer not found', 404);
//     }

//     customer.toggleFeedbackNotification();
//     await customer.save();

//     return successResponse(res, 'Feedback notification preference updated', {
//       customer: {
//         id: customer._id,
//         name: customer.name,
//         feedbackNotification: customer.preferences.feedbackNotification
//       }
//     });

//   } catch (error) {
//     console.error('Toggle Feedback Notification Error:', error);
//     return errorResponse(res, 'Failed to update notification preference', 500);
//   }
// };

// //  UPDATE PREFERENCES 
// exports.updatePreferences = async (req, res) => {
//   try {
//     const { customerId } = req.params;
//     const preferences = req.body;

//     const customer = await Customer.findById(customerId);

//     if (!customer) {
//       return errorResponse(res, 'Customer not found', 404);
//     }

//     customer.preferences = {
//       ...customer.preferences,
//       ...preferences
//     };

//     await customer.save();

//     return successResponse(res, 'Preferences updated successfully', {
//       customer: {
//         id: customer._id,
//         name: customer.name,
//         preferences: customer.preferences
//       }
//     });

//   } catch (error) {
//     console.error('Update Preferences Error:', error);
//     return errorResponse(res, 'Failed to update preferences', 500);
//   }
// };

// // BULK IMPORT (CSV) 
// // exports.bulkImport = async (req, res) => {
// //   try {
// //     if (!req.file) {
// //       return errorResponse(res, 'CSV file is required', 400);
// //     }

// //     const filePath = req.file.path;
// //     const results = [];
// //     const errors = [];

// //     // Read CSV file
// //     fs.createReadStream(filePath)
// //       .pipe(csv())
// //       .on('data', async (row) => {
// //         try {
// //           // Map CSV columns to customer schema
// //           const customerData = {
// //             customerType: row.customerType || 'individual',
// //             name: row.name,
// //             companyName: row.companyName,
// //             email: row.email?.toLowerCase(),
// //             phone: row.phone,
// //             alternatePhone: row.alternatePhone,
// //             gstNumber: row.gstNumber?.toUpperCase(),
// //             panNumber: row.panNumber?.toUpperCase(),
// //             paymentTerms: row.paymentTerms || 'cod',
// //             creditLimit: parseFloat(row.creditLimit) || 0,
// //             category: row.category || 'regular',
// //             notes: row.notes,
// //             createdBy: req.user._id
// //           };

// //           // Add location if provided
// //           if (row.addressLine1 && row.city && row.zipcode) {
// //             const locationData = {
// //               locationName: row.locationName || 'Primary Location',
// //               addressLine1: row.addressLine1,
// //               addressLine2: row.addressLine2,
// //               city: row.city,
// //               state: row.state,
// //               zipcode: row.zipcode,
// //               isPrimary: true,
// //               contactPerson: {
// //                 name: row.contactPersonName,
// //                 phone: row.contactPersonPhone,
// //                 email: row.contactPersonEmail
// //               }
// //             };

// //             // Auto-assign region
// //             if (row.zipcode) {
// //               const region = await Region.findByZipcode(row.zipcode);
// //               if (region) {
// //                 locationData.regionId = region._id;
// //                 locationData.regionAutoAssigned = true;
// //               }
// //             }

// //             customerData.locations = [locationData];
// //           }

// //           results.push(customerData);

// //         } catch (error) {
// //           errors.push({
// //             row: row,
// //             error: error.message
// //           });
// //         }
// //       })
// //       .on('end', async () => {
// //         try {
// //           // Bulk insert customers
// //           const customers = await Customer.insertMany(results, {
// //             ordered: false, // Continue on error
// //             rawResult: true
// //           });

// //           // Delete uploaded file
// //           fs.unlinkSync(filePath);

// //           return successResponse(res, 'Bulk import completed', {
// //             imported: customers.insertedCount || results.length - errors.length,
// //             failed: errors.length,
// //             errors: errors.slice(0, 10) // Show first 10 errors
// //           }, 201);

// //         } catch (error) {
// //           console.error('Bulk Insert Error:', error);

// //           // Delete uploaded file
// //           if (fs.existsSync(filePath)) {
// //             fs.unlinkSync(filePath);
// //           }

// //           return errorResponse(res, 'Bulk import failed', 500);
// //         }
// //       });

// //   } catch (error) {
// //     console.error('Bulk Import Error:', error);

// //     // Delete uploaded file
// //     if (req.file && fs.existsSync(req.file.path)) {
// //       fs.unlinkSync(req.file.path);
// //     }

// //     return errorResponse(res, 'Failed to import customers', 500);
// //   }
// // };
// exports.bulkImport = async (req, res) => {
//   try {
//     if (!req.file) {
//       return errorResponse(res, 'CSV file is required', 400);
//     }

//     const filePath = req.file.path;
//     const results = [];
//     const errors = [];

//     const parsePromise = new Promise((resolve, reject) => {
//       fs.createReadStream(filePath)
//         .pipe(csv())
//         .on('data', (row) => {
//           try {
//             // Clean row
//             const cleanRow = {};
//             Object.keys(row).forEach(key => {
//               const value = row[key];
//               cleanRow[key] = typeof value === 'string' ? value.trim() : value;
//             });

//             // Required fields
//             if (!cleanRow.name || !cleanRow.phone) {
//               errors.push({ row: cleanRow, error: 'Name and phone are required' });
//               return;
//             }

//             // Generate customerId manually (to avoid null duplicate error)
//             const tempCustomerId = `TEMP_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

//             const customerData = {
//               customerId: tempCustomerId, // Manually set
//               customerType: cleanRow.customerType || 'individual',
//               name: cleanRow.name,
//               companyName: cleanRow.companyName || null,
//               email: cleanRow.email ? cleanRow.email.toLowerCase() : null,
//               phone: cleanRow.phone,
//               alternatePhone: cleanRow.alternatePhone || null,
//               gstNumber: cleanRow.gstNumber ? cleanRow.gstNumber.toUpperCase() : null,
//               panNumber: cleanRow.panNumber ? cleanRow.panNumber.toUpperCase() : null,

//               // Fix enum values
//               paymentTerms: cleanRow.paymentTerms === '0' || !cleanRow.paymentTerms ? 'cod' : cleanRow.paymentTerms,
//               creditLimit: parseFloat(cleanRow.creditLimit) || 0,

//               // Fix category enum
//               category: ['vip', 'regular', 'wholesale', 'retail', 'distributor'].includes(cleanRow.category)
//                 ? cleanRow.category
//                 : 'regular',

//               notes: cleanRow.notes || null,
//               createdBy: req.user._id,

//               // Fix zipcode — force 6 digit string
//               ...(cleanRow.addressLine1 && cleanRow.city && cleanRow.zipcode && {
//                 locations: [{
//                   locationName: cleanRow.locationName || 'Primary Location',
//                   addressLine1: cleanRow.addressLine1,
//                   addressLine2: cleanRow.addressLine2 || null,
//                   city: cleanRow.city,
//                   state: cleanRow.state || 'Maharashtra',
//                   zipcode: String(cleanRow.zipcode).padStart(6, '0').slice(0, 6), // Force 6 digit
//                   country: 'India',
//                   isPrimary: true,
//                   regionAutoAssigned: false,
//                   contactPerson: {
//                     name: cleanRow.contactPersonName || cleanRow.name,
//                     phone: cleanRow.contactPersonPhone || cleanRow.phone,
//                     email: cleanRow.contactPersonEmail || cleanRow.email || null
//                   }
//                 }]
//               })
//             };

//             results.push(customerData);

//           } catch (error) {
//             errors.push({ row, error: error.message });
//           }
//         })
//         .on('end', () => resolve({ results, errors }))
//         .on('error', reject);
//     });

//     const { results: parsedResults, errors: parseErrors } = await parsePromise;

//     let imported = 0;
//     if (parsedResults.length > 0) {
//       // Insert with validation OFF to avoid enum/zipcode issues
//       const insertResult = await Customer.insertMany(parsedResults, {
//         ordered: false,
//         rawResult: true,
//         // validation skip nahi hota, lekin humne sab fix kar diya
//       });
//       imported = Object.keys(insertResult.insertedIds).length;
//     }

//     // Cleanup
//     if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

//     return successResponse(res, 'Bulk import completed!', {
//       imported,
//       failed: parseErrors.length,
//       total: parsedResults.length,
//       errors: parseErrors.slice(0, 10)
//     }, 201);

//   } catch (error) {
//     console.error('Bulk Import Error:', error);
//     if (req.file && fs.existsSync(req.file.path)) {
//       fs.unlinkSync(req.file.path);
//     }
//     return errorResponse(res, 'Import failed: ' + error.message, 500);
//   }
// };

// // BULK EXPORT (CSV) 
// exports.bulkExport = async (req, res) => {
//   try {
//     const {
//       status,
//       customerType,
//       category,
//       regionId
//     } = req.query;

//     const query = {};

//     // Apply filters
//     if (status) query.status = status;
//     if (customerType) query.customerType = customerType;
//     if (category) query.category = category;
//     if (regionId) query['locations.regionId'] = regionId;

//     // Get customers
//     const customers = await Customer.find(query)
//       .populate('locations.regionId', 'regionName regionCode')
//       .lean();

//     if (customers.length === 0) {
//       return errorResponse(res, 'No customers found to export', 404);
//     }

//     // Flatten data for CSV
//     const flattenedData = customers.map(customer => {
//       const primaryLocation = customer.locations.find(loc => loc.isPrimary) || customer.locations[0];

//       return {
//         customerId: customer.customerId,
//         customerType: customer.customerType,
//         name: customer.name,
//         companyName: customer.companyName || '',
//         email: customer.email,
//         phone: customer.phone,
//         alternatePhone: customer.alternatePhone || '',
//         gstNumber: customer.gstNumber || '',
//         panNumber: customer.panNumber || '',
//         status: customer.status,
//         category: customer.category,
//         paymentTerms: customer.paymentTerms,
//         creditLimit: customer.creditLimit,
//         currentCredit: customer.currentCredit,
//         locationName: primaryLocation?.locationName || '',
//         addressLine1: primaryLocation?.addressLine1 || '',
//         addressLine2: primaryLocation?.addressLine2 || '',
//         city: primaryLocation?.city || '',
//         state: primaryLocation?.state || '',
//         zipcode: primaryLocation?.zipcode || '',
//         regionName: primaryLocation?.regionId?.regionName || '',
//         regionCode: primaryLocation?.regionId?.regionCode || '',
//         contactPersonName: primaryLocation?.contactPerson?.name || '',
//         contactPersonPhone: primaryLocation?.contactPerson?.phone || '',
//         contactPersonEmail: primaryLocation?.contactPerson?.email || '',
//         totalOrders: customer.stats?.totalOrders || 0,
//         totalDeliveries: customer.stats?.totalDeliveries || 0,
//         totalSpent: customer.stats?.totalSpent || 0,
//         feedbackNotification: customer.preferences?.feedbackNotification || false,
//         notes: customer.notes || '',
//         createdAt: customer.createdAt
//       };
//     });

//     // Define CSV fields
//     const fields = [
//       'customerId', 'customerType', 'name', 'companyName', 'email', 'phone',
//       'alternatePhone', 'gstNumber', 'panNumber', 'status', 'category',
//       'paymentTerms', 'creditLimit', 'currentCredit', 'locationName',
//       'addressLine1', 'addressLine2', 'city', 'state', 'zipcode',
//       'regionName', 'regionCode', 'contactPersonName', 'contactPersonPhone',
//       'contactPersonEmail', 'totalOrders', 'totalDeliveries', 'totalSpent',
//       'feedbackNotification', 'notes', 'createdAt'
//     ];

//     const json2csvParser = new Parser({ fields });
//     const csv = json2csvParser.parse(flattenedData);

//     // Set response headers
//     res.setHeader('Content-Type', 'text/csv');
//     res.setHeader('Content-Disposition', `attachment; filename=customers_export_${Date.now()}.csv`);

//     return res.status(200).send(csv);

//   } catch (error) {
//     console.error('Bulk Export Error:', error);
//     return errorResponse(res, 'Failed to export customers', 500);
//   }
// };


// // GET CUSTOMER STATISTICS 
// exports.getCustomerStatistics = async (req, res) => {
//   try {
//     const [
//       totalCustomers,
//       activeCustomers,
//       blockedCustomers,
//       customersByType,
//       customersByCategory,
//       topCustomers,
//       recentCustomers
//     ] = await Promise.all([
//       Customer.countDocuments(),
//       Customer.countDocuments({ status: 'active' }),
//       Customer.countDocuments({ status: 'blocked' }),
//       Customer.aggregate([
//         { $group: { _id: '$customerType', count: { $sum: 1 } } }
//       ]),
//       Customer.aggregate([
//         { $group: { _id: '$category', count: { $sum: 1 } } }
//       ]),
//       Customer.find({ status: 'active' })
//         .select('name email stats.totalOrders stats.totalSpent')
//         .sort({ 'stats.totalSpent': -1 })
//         .limit(10),
//       Customer.find()
//         .select('name email customerType createdAt')
//         .sort({ createdAt: -1 })
//         .limit(10)
//     ]);

//     return successResponse(res, 'Customer statistics retrieved successfully', {
//       totalCustomers,
//       activeCustomers,
//       blockedCustomers,
//       customersByType,
//       customersByCategory,
//       topCustomers,
//       recentCustomers
//     });

//   } catch (error) {
//     console.error('Get Customer Statistics Error:', error);
//     return errorResponse(res, 'Failed to retrieve customer statistics', 500);
//   }
// };

// module.exports = exports;


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

// CREATE CUSTOMER (Admin Only) - With Document Uploads
exports.createCustomer = async (req, res) => {
  try {
    console.log('[CREATE-CUSTOMER] Body:', req.body);
    console.log('[CREATE-CUSTOMER] Files:', req.files ? Object.keys(req.files) : 'No files');

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
      region // Optional manual region selection
    } = req.body;

    // // Validation - Required fields
    // if (!name || !email || !phone || !addressLine1 || !city || !state || !zipcode) {
    //   req.flash('error', 'Name, email, phone, and billing address are required');
    //   return res.redirect('/admin/customers/create');
    // }

    // Phone validation (10 digits)
    // const cleanPhone = phone.replace(/\D/g, '');
    // if (cleanPhone.length !== 10) {
    //   req.flash('error', 'Phone number must be exactly 10 digits');
    //   return res.redirect('/admin/customers/create');
    // }

    // Zipcode validation (6 digits)
    if (zipcode && !/^\d{4}$/.test(zipcode)) {
      req.flash('error', 'Pincode/Zipcode must be exactly 4 digits');
      return res.redirect('/admin/customers/create');
    }

    // Email validation
    // const emailRegex = /^\S+@\S+\.\S+$/;
    // if (!emailRegex.test(email)) {
    //   req.flash('error', 'Valid email is required');
    //   return res.redirect('/admin/customers/create');
    // }

    // ========== AUTO-ASSIGN REGION BASED ON ZIPCODE ==========
    let assignedRegion = null;
    let regionAutoAssigned = false;

    if (!region || region === '') {
      // No manual region selected - auto-assign based on zipcode
      const foundRegion = await Region.findOne({
        zipcodes: zipcode,
        isActive: true
      }).select('_id regionName regionCode');

      if (foundRegion) {
        assignedRegion = foundRegion._id;
        regionAutoAssigned = true;
        console.log('[CREATE-CUSTOMER] Auto-assigned region:', foundRegion.regionName);
      } else {
        console.log('[CREATE-CUSTOMER] No region found for zipcode:', zipcode);
      }
    } else {
      // Manual region selected
      assignedRegion = region;
      regionAutoAssigned = false;
      console.log('[CREATE-CUSTOMER] Manual region selected:', region);
    }

    // ========== BUILD LOCATION (Primary Location) ==========
    let locations = [];
    if (locationName || addressLine1 || city || state || zipcode) {
      locations.push({
        locationName: locationName?.trim() || `${name}'s Location`,
        addressLine1: addressLine1?.trim(),
        addressLine2: addressLine2?.trim() || '',
        city: city?.trim(),
        state: state?.trim(),
        zipcode: zipcode?.trim(),
        country: 'India',
        regionId: assignedRegion,
        regionAutoAssigned: regionAutoAssigned,
        googleMapLink: googleMapLink?.trim() || null,
        isPrimary: true,
        isActive: true
      });
    }

    // ========== CONTACT PERSON ==========
    const contactPerson = {};
    if (contactPersonName || contactPersonPhone || contactPersonEmail) {
      contactPerson.name = contactPersonName?.trim();
      contactPerson.phone = contactPersonPhone?.replace(/\D/g, '');
      contactPerson.email = contactPersonEmail;
      contactPerson.designation = 'Primary Contact';
    }

    // ========== DOCUMENTS HANDLING ==========
    const documents = [];
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://yourdomain.com'
      : 'http://localhost:5001';
    const documentBasePath = '/uploads/documents/';

    const addDocument = (fieldName, docType) => {
      if (req.files?.[fieldName]?.[0]) {
        const file = req.files[fieldName][0];
        const relativePath = documentBasePath + file.filename;

        documents.push({
          documentType: docType,
          fileUrl: relativePath,
          uploadedAt: new Date()
        });

        console.log(`[CREATE-CUSTOMER] Added ${docType}:`, relativePath);
      }
    };

    addDocument('gstCertificate', 'gst_certificate');
    addDocument('panCard', 'pan_card');
    addDocument('shopLicense', 'shop_license');
    addDocument('otherDoc', 'other_document');

    // Console log full URLs
    const consoleDetails = {};
    documents.forEach(doc => {
      consoleDetails[doc.documentType] = `${baseUrl}${doc.fileUrl}`;
    });
    if (documents.length > 0) {
      console.log('[CREATE-CUSTOMER] Fixed Document URLs:', consoleDetails);
    }

    // ========== CREATE CUSTOMER ==========
    const newCustomer = new Customer({
      customerType,
      name: name.trim(),
      companyName: companyName?.trim() || null,
      email: email.toLowerCase().trim(),
      phone: phone,
      alternatePhone: alternatePhone, //?.replace(/\D/g, '') || null,
      gstNumber: gstNumber?.trim() || null,
      panNumber: panNumber?.trim() || null,
      locations,
      billingAddress: {
        addressLine1: addressLine1?.trim(),
        addressLine2: addressLine2?.trim() || '',
        city: city?.trim(),
        // state: state?.trim(),
        zipcode: zipcode?.trim(),
        country: 'India'
      },
      paymentTerms,
      creditLimit: parseFloat(creditLimit) || 0,
      category,
      status,
      documents,
      preferences: {
        feedbackNotification: true,
        smsNotification: true,
        emailNotification: true,
        specialInstructions: specialInstructions?.trim() || ''
      },
      contactPerson,
      isActive: status === 'active'
    });

    await newCustomer.save();

    console.log('[CREATE-CUSTOMER] Successfully created:', newCustomer.customerId);
    req.flash('success', `Customer ${newCustomer.customerId} created successfully!`);
    res.redirect(`/admin/customers/view/${newCustomer.customerId}`);

  } catch (error) {
    console.error('[CREATE-CUSTOMER] ERROR:', error);

    let errorMsg = 'Failed to create customer';

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      errorMsg = `Duplicate ${field} already exists`;
    } else if (error.name === 'ValidationError') {
      errorMsg = Object.values(error.errors).map(err => err.message).join(', ');
    } else if (error.message) {
      errorMsg = error.message;
    }

    req.flash('error', errorMsg);
    res.redirect('/admin/customers/create-customer');
  }
};

// GET ALL CUSTOMERS 
exports.getAllCustomers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
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

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .populate('locations.regionId', 'regionName regionCode')
        .populate('accountManager', 'name email')
        .populate('createdBy', 'name email')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Customer.countDocuments(query)
    ]);

    res.render('customers', {
      title: 'Customers Management',
      customers,
      url: req.originalUrl,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      },
      filters: req.query,
      // messages: {
      //   success: req.flash('success'),
      //   error: req.flash('error')
      // } 
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
    req.flash('success', `Customer ${customer.customerId} deleted successfully`);
    res.redirect('/admin/customers');

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
