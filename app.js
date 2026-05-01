// // // const express = require('express');
// // // require('dotenv').config();
// // // const cors = require('cors');
// // // const path = require('path');
// // // const morgan = require('morgan');
// // // const socketIO = require("socket.io");
// // // const http = require("http");
// // // const cookieParser = require("cookie-parser");

// // // // Import configurations
// // // const connectDB = require('./config/db');

// // // // Import routes
// // // const authRoutes = require('./routes/authRoutes');
// // // const driverRoutes = require('./routes/driverRoutes');
// // // const profileRoutes = require('./routes/profileRoutes');
// // // const adminRoutes = require('./routes/admin/adminRoutes');
// // // const deliveryRoutes = require("./routes/deliveryRoutes");
// // // const trackingRoutes = require("./routes/trackingRoutes");
// // // const journeyRoutes = require("./routes/journeyRoutes");
// // // const routeRoutes = require("./routes/routeRoutes");
// // // const feedbackRoutes = require("./routes/feedbackRoutes");
// // // const orderRoutes = require("./routes/admin/orderRoutes");
// // // const vehicleRoutes = require("./routes/admin/vehicleRoutes");
// // // const regionRoutes = require("./routes/admin/regionRoutes");
// // // const driverManagementRoutes = require("./routes/admin/driverManagementRoutes");
// // // const customerRoutes = require("./routes/admin/customerRoutes");
// // // const remarkAdminRoutes = require("./routes/admin/remarkAdminRoutes");
// // // const remarkRoutes = require("./routes/remarkRoutes");
// // // const maintenanceRoutes = require("./routes/maintenanceRoutes");
// // // const maintenanceAdminRoutes = require("./routes/admin/maintenanceAdminRoutes");
// // // const expenseAdminRoutes = require("./routes/admin/expenseAdminRoutes");
// // // const expenseRoutes = require("./routes/expenseRoutes");
// // // const deliveryAdminRoutes = require("./routes/admin/deliveryAdminRoutes.");
// // // const AdminTrackingRoutes = require("./routes/admin/AdminTrackingRoutes");

// // // // Import Models (for notification)
// // // const MaintenanceSchedule = require('./models/MaintenanceSchedule');

// // // // Middleware
// // // const errorHandler = require('./middleware/errorHandler');

// // // // Initialize app & server
// // // const app = express();
// // // const server = http.createServer(app);

// // // const io = socketIO(server, {
// // //   cors: {
// // //     origin: process.env.FRONTEND_URL || "http://localhost:3000",
// // //     methods: ["GET", "POST"],
// // //     credentials: true
// // //   }
// // // });

// // // // Make io globally accessible
// // //   = io;

// // // // Connect DB
// // // connectDB();

// // // // Middleware
// // // app.use(cors({
// // //   origin: process.env.FRONTEND_URL || 'http://localhost:3000',
// // //   credentials: true
// // // }));
// // // app.use(express.json());
// // // app.use(cookieParser());
// // // app.use(express.urlencoded({ extended: true }));
// // // app.use(morgan('dev'));

// // // // Static files
// // // app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
// // // app.use(express.static(path.join(__dirname, 'public')));

// // // // View engine
// // // app.set('view engine', 'ejs');
// // // app.set('views', [path.join(__dirname, 'views'), path.join(__dirname, 'admin/views')]);

// // // // SOCKET.IO LOGIC — SAB KUCH YAHAN HI (app.js mein)

// // // io.on("connection", (socket) => {
// // //   console.log("New client connected:", socket.id);

// // //   // Admin join karega admin-room
// // //   socket.on("join-admin-room", () => {
// // //     socket.join("admin-room");
// // //     console.log("Admin joined admin-room:", socket.id);
// // //   });

// // //   // Driver delivery tracking (existing)
// // //   socket.on("join-delivery", (deliveryId) => {
// // //     socket.join(`delivery-${deliveryId}`);
// // //   });

// // //   socket.on("leave-delivery", (deliveryId) => {
// // //     socket.leave(`delivery-${deliveryId}`);
// // //   });

// // //   socket.on("driver-location-update", async (data) => {
// // //     const { deliveryId, latitude, longitude, speed, heading } = data;
// // //     io.to(`delivery-${deliveryId}`).emit('location-update', {
// // //       deliveryId,
// // //       location: { latitude, longitude },
// // //       speed,
// // //       heading,
// // //       timestamp: new Date()
// // //     });
// // //   });

// // //   // NAYA: Driver ne service complete mark kiya → Admin ko batao!
// // //   socket.on("driver-completed-service", async ({ scheduleId, driverName, vehicleNumber }) => {
// // //     try {
// // //       const maintenance = await MaintenanceSchedule.findById(scheduleId)
// // //         .populate('vehicle');

// // //       if (maintenance) {
// // //         io.to("admin-room").emit('new-service-request', {
// // //           type: 'service_completion_request',
// // //           message: `${vehicleNumber || 'Vehicle'} - Driver "${driverName}" ne service complete mark kiya!`,
// // //           scheduleId,
// // //           vehicleNumber: vehicleNumber || maintenance.vehicle?.vehicleNumber,
// // //           driverName,
// // //           requestedAt: new Date(),
// // //           status: maintenance.status
// // //         });
// // //         console.log("Notification sent to admin:", vehicleNumber);
// // //       }
// // //     } catch (err) {
// // //       console.error("Socket notification error:", err);
// // //     }
// // //   });

// // //   socket.on('disconnect', () => {
// // //     console.log('Client disconnected:', socket.id);
// // //   });
// // // });

// // // // API ROUTES

// // // app.use('/api/auth', authRoutes);
// // // app.use('/api/driver', driverRoutes);
// // // app.use('/api/profile', profileRoutes);
// // // app.use("/api/deliveries", deliveryRoutes);
// // // app.use("/api/tracking", trackingRoutes);
// // // app.use("/api/feedback", feedbackRoutes);
// // // app.use("/api/journey", journeyRoutes);
// // // app.use("/api/routes", routeRoutes);
// // // app.use("/api/remark", remarkRoutes);
// // // app.use("/api/maintenance", maintenanceRoutes);
// // // app.use("/api/expenses", expenseRoutes);

// // // // Admin Routes
// // // app.use('/admin', adminRoutes);
// // // app.use("/admin/order", orderRoutes);
// // // app.use("/admin/vehicles", vehicleRoutes);
// // // app.use("/admin/regions", regionRoutes);
// // // app.use("/admin/driver", driverManagementRoutes);
// // // app.use("/admin/customers", customerRoutes);
// // // app.use("/admin/deliveries", deliveryAdminRoutes);
// // // app.use("/admin/remarks", remarkAdminRoutes);
// // // app.use("/admin/maintenance", maintenanceAdminRoutes);
// // // app.use("/admin/expenses", expenseAdminRoutes);
// // // app.use("/admin/tracking", AdminTrackingRoutes);

// // // // Root & Health
// // // app.get('/', (req, res) => {
// // //   res.json({ success: true, message: 'API is LIVE!', version: '1.0.0' });
// // // });

// // // app.get('/health', (req, res) => {
// // //   res.json({ success: true, message: 'Server Healthy', time: new Date() });
// // // });

// // // // 404
// // // app.use((req, res) => {
// // //   res.status(404).json({ success: false, message: 'Route not found' });
// // // });

// // // // Error Handler
// // // app.use(errorHandler);

// // // // Start Server
// // // const PORT = process.env.PORT || 8000;

// // // server.listen(PORT, () => {
// // //   console.log(`Server running on PORT ${PORT}`);
// // //   console.log(`Real-time Socket.IO Active`);
// // //   console.log(`Admin Room: admin-room`);
// // //   console.log(`Driver Service Notification Active`);
// // // });

// // // module.exports = app;

// // ///////////////////////////////////////////////////////////////////2////

// // const express = require('express');
// // require('dotenv').config();
// // const cors = require('cors');
// // const path = require('path');
// // const morgan = require('morgan');
// // const socketIO = require('socket.io');  
// // const http = require("http");
// // const cookieParser = require("cookie-parser");
// // const session = require('express-session');
// // const compression = require('compression');
// // const helmet = require('helmet');
// // const flash = require('connect-flash');

// // // Import configurations
// // const connectDB = require('./config/db');

// // // Import Models (for notifications)
// // const MaintenanceSchedule = require('./models/MaintenanceSchedule');
// // const Driver = require('./models/Driver');

// // // ==================== EXISTING ROUTES ====================
// // const authRoutes = require('./routes/authRoutes');
// // const driverRoutes = require('./routes/Driver/driverRoutes');
// // const profileRoutes = require('./routes/Driver/profileRoutes');
// // const adminRoutes = require('./routes/admin/adminRoutes');
// // const deliveryRoutes = require("./routes/Driver/deliveryRoutes");
// // const trackingRoutes = require("./routes/Driver/trackingRoutes");
// // const journeyRoutes = require("./routes/Driver/journeyRoutes");
// // const routeRoutes = require("./routes/routeRoutes");
// // const feedbackRoutes = require("./routes/feedbackRoutes");
// // const orderRoutes = require("./routes/admin/orderRoutes");
// // const vehicleRoutes = require("./routes/admin/vehicleRoutes");
// // const regionRoutes = require("./routes/admin/regionRoutes");
// // const driverManagementRoutes = require("./routes/admin/driverManagementRoutes");
// // const customerRoutes = require("./routes/admin/customerRoutes");
// // const remarkAdminRoutes = require("./routes/admin/remarkAdminRoutes");
// // const remarkRoutes = require("./routes/remarkRoutes");
// // const maintenanceRoutes = require("./routes/Driver/maintenanceRoutes");
// // const maintenanceAdminRoutes = require("./routes/admin/maintenanceAdminRoutes");
// // const expenseAdminRoutes = require("./routes/admin/expenseAdminRoutes");
// // const expenseRoutes = require("./routes/Driver/expenseRoutes");
// // const deliveryAdminRoutes = require("./routes/admin/deliveryAdminRoutes.");
// // const AdminTrackingRoutes = require("./routes/admin/AdminTrackingRoutes");

// // const communicationRoutes = require('./routes/admin/Communicationroutes');
// // const driverChatRoutes = require("./routes/Driver/driverChatRoutes")
// // const onboardingRoutes = require("./routes/admin/onboardingRoutes")
// // const Homepage = require("./routes/Driver/Homepage")
// // const cmsRoutes = require("./routes/admin/cmsRoutes")
// // const category = require("./routes/admin/category")

// // const driverApprovalRoutes= require("./routes/admin/driverApprovalRoutes")
// // const methodOverride = require('method-override');


// // // Middleware
// // const errorHandler = require('./middleware/errorHandler');

// // // ==================== INITIALIZE APP & SERVER ====================
// // const app = express();
// // const server = http.createServer(app);

// // const io = socketIO(server, {
// //   cors: {
// //     origin: process.env.FRONTEND_URL || "http://localhost:3000",
// //     methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
// //     credentials: true
// //   },
// //   pingTimeout: 60000,
// //   pingInterval: 25000
// // });

// // // Make io globally accessible
// // global.io = io;

// // // Connect DB
// // connectDB();

// // // ==================== MIDDLEWARE ====================
// // app.use(helmet({
// //   contentSecurityPolicy: false
// // }));
// // app.use(compression());
// // app.use(cors({
// //   origin: process.env.FRONTEND_URL || 'http://localhost:3000',
// //   credentials: true
// // }));
// // app.use(express.json());
// // app.use(express.urlencoded({ extended: true }));
// // app.use(cookieParser());
// // app.use(morgan('dev'));

// // app.use(methodOverride('_method'));

// // // Session for admin panel
// // app.use(session({
// //   secret: process.env.SESSION_SECRET || 'your-secret-key-here',
// //   resave: false,
// //   saveUninitialized: false,
// //   cookie: {
// //     secure: process.env.NODE_ENV === 'production',
// //     maxAge: 24 * 60 * 60 * 1000 // 24 hours
// //   }
// // }));

// // // Express Messages middleware
// // app.use(flash());
// // app.use((req, res, next) => {
// //     res.locals.messages = req.flash();
// //     res.locals.dateOptions = {
// //         hour: "2-digit",
// //         minute: "2-digit",
// //         hour12: true,
// //     };
// //     res.locals.dateLocale = "en-US";
// //     next();
// // });

// // // Static files
// // app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
// // app.use(express.static(path.join(__dirname, 'public')));

// // // View engine
// // app.set('view engine', 'ejs');
// // app.set('views', [ 
// //   path.join(__dirname, 'views')
// // ]);

// // // ==================== SOCKET.IO REAL-TIME FEATURES ====================

// // const activeDrivers = new Map(); // Store active driver connections
// // const driverLocations = new Map(); // Store latest driver locations

// // io.on("connection", (socket) => {
// //   console.log("🔌 New client connected:", socket.id);

// //   // ==================== ADMIN ROOM ====================
// //   socket.on("join-admin-room", () => {
// //     socket.join("admin-room");
// //     console.log("👔 Admin joined admin-room:", socket.id);

// //     // Send current active drivers to admin
// //     const activeDriversList = Array.from(activeDrivers.values()).map(driver => {
// //       const location = driverLocations.get(driver.driverId);
// //       return { ...driver, location: location || null };
// //     });
// //     socket.emit('admin:drivers:list', activeDriversList);
// //   });

// //   // ==================== LIVE TRACKING (Uber-style) ====================

// //   // Driver connects and starts sending location
// //   socket.on('driver:connect', async (data) => {
// //     const { driverId, driverName, vehicleNumber } = data;

// //     activeDrivers.set(driverId, {
// //       socketId: socket.id,
// //       driverId,
// //       driverName,
// //       vehicleNumber,
// //       connectedAt: new Date()
// //     });

// //     socket.join(`driver-${driverId}`);
// //     console.log(`🚗 Driver connected: ${driverName} (${vehicleNumber})`);

// //     // Notify admin panel
// //     io.to('admin-room').emit('driver:online', {
// //       driverId,
// //       driverName,
// //       vehicleNumber,
// //       status: 'online'
// //     });
// //   });

// //   // Driver sends location update (automatic every 5 seconds)
// //   // socket.on('driver:location', async (data) => {
// //   //   const { driverId, deliveryId, latitude, longitude, speed, heading, accuracy, timestamp } = data;

// //   //   // Store latest location
// //   //   driverLocations.set(driverId, {
// //   //     latitude,
// //   //     longitude,
// //   //     speed,
// //   //     heading,
// //   //     accuracy,
// //   //     timestamp: timestamp || new Date(),
// //   //     deliveryId
// //   //   });

// //   //   // Broadcast to admin panel in real-time
// //   //   io.to('admin-room').emit('driver:location:update', {
// //   //     driverId,
// //   //     deliveryId,
// //   //     location: { latitude, longitude },
// //   //     speed,
// //   //     heading,
// //   //     accuracy,
// //   //     timestamp: timestamp || new Date()
// //   //   });

// //   //   // Broadcast to specific delivery tracking room (for customers)
// //   //   if (deliveryId) {
// //   //     io.to(`delivery-${deliveryId}`).emit('delivery:location:update', {
// //   //       deliveryId,
// //   //       location: { latitude, longitude },
// //   //       speed,
// //   //       timestamp: timestamp || new Date()
// //   //     });
// //   //   }
// //   // });

// //   socket.on('driver:location', async (data) => {
// //   try {
// //     const { driverId, deliveryId, latitude, longitude, speed, heading, accuracy, timestamp } = data;

// //     if (!driverId || !latitude || !longitude) {
// //       console.warn('Invalid location data received:', data);
// //       return;
// //     }

// //     // Update driver's current location in database
// //     const driver = await Driver.findById(driverId);
// //     if (driver) {
// //       await driver.updateLocation({
// //         latitude,
// //         longitude,
// //         speed: speed || 0,
// //         heading: heading || 0,
// //         accuracy: accuracy || 0,
// //         deliveryId: deliveryId || null
// //       });
// //     }

// //     // Store latest location in memory map (for quick access)
// //     driverLocations.set(driverId, {
// //       latitude,
// //       longitude,
// //       speed,
// //       heading,
// //       accuracy,
// //       timestamp: timestamp || new Date(),
// //       deliveryId
// //     });

// //     // Broadcast to admin panel in real-time
// //     io.to('admin-room').emit('driver:location:update', {
// //       driverId,
// //       deliveryId,
// //       location: { latitude, longitude },
// //       speed,
// //       heading,
// //       accuracy,
// //       timestamp: timestamp || new Date()
// //     });

// //     // Broadcast to specific delivery tracking room (for customers)
// //     if (deliveryId) {
// //       io.to(`delivery-${deliveryId}`).emit('delivery:location:update', {
// //         deliveryId,
// //         location: { latitude, longitude },
// //         speed,
// //         timestamp: timestamp || new Date()
// //       });
// //     }

// //     console.log(`📍 Location updated for driver ${driverId}: ${latitude}, ${longitude}`);

// //   } catch (error) {
// //     console.error('Error handling driver location update:', error);
// //   }
// // });

// //   // ==================== DELIVERY TRACKING (Existing) ====================
// //   socket.on("join-delivery", (deliveryId) => {
// //     socket.join(`delivery-${deliveryId}`);
// //     console.log(`📦 Client joined delivery: ${deliveryId}`);
// //   });

// //   socket.on("leave-delivery", (deliveryId) => {
// //     socket.leave(`delivery-${deliveryId}`);
// //     console.log(`📦 Client left delivery: ${deliveryId}`);
// //   });

// //   socket.on("driver-location-update", async (data) => {
// //     const { deliveryId, latitude, longitude, speed, heading } = data;
// //     io.to(`delivery-${deliveryId}`).emit('location-update', {
// //       deliveryId,
// //       location: { latitude, longitude },
// //       speed,
// //       heading,
// //       timestamp: new Date()
// //     });
// //   });

// //   // When driver completes delivery, clear their location
// //   socket.on('delivery:completed', async (data) => {
// //     try {
// //       const { driverId, deliveryId } = data;
  
// //       const driver = await Driver.findById(driverId);
// //       if (driver) {
// //         await driver.clearLocation();
// //         driver.isAvailable = true;
// //         await driver.save();
// //       }
  
// //       // Remove from active tracking
// //       driverLocations.delete(driverId);
  
// //       // Notify admin
// //       io.to('admin-room').emit('driver:delivery:completed', {
// //         driverId,
// //         deliveryId,
// //         timestamp: new Date()
// //       });
  
// //     } catch (error) {
// //       console.error('Error handling delivery completion:', error);
// //     }
// //   });

// //   // ==================== LIVE CHAT SYSTEM ====================

// //   // User joins chat
// //   socket.on('chat:join', (data) => {
// //     const { userId } = data;
// //     socket.join(`user-${userId}`);
// //     console.log(`💬 User joined chat: ${userId}`);
// //   });

// //   // User joins specific conversation
// //   socket.on('chat:join-conversation', (data) => {
// //     const { conversationId } = data;
// //     socket.join(`conversation-${conversationId}`);
// //     console.log(`💬 User joined conversation: ${conversationId}`);
// //   });

// //   // Send message
// //   socket.on('chat:send', async (data) => {
// //     try {
// //       const { conversationId, senderId, receiverId, content, messageType, mediaUrl } = data;

// //       // Save message to database
// //       const message = await ChatMessage.create({
// //         conversationId,
// //         senderId,
// //         senderType: data.senderType,
// //         receiverId,
// //         receiverType: data.receiverType,
// //         messageType: messageType || 'text',
// //         content,
// //         mediaUrl,
// //         isDelivered: true,
// //         deliveredAt: new Date()
// //       }); 

// //       // Populate sender details
// //       await message.populate('senderId', 'name profileImage');

// //       // Emit to receiver
// //       io.to(`user-${receiverId}`).emit('chat:new-message', {
// //         conversationId,
// //         message
// //       });

// //       // Emit to conversation room
// //       io.to(`conversation-${conversationId}`).emit('chat:new-message', {
// //         conversationId,
// //         message
// //       });

// //       console.log(`💬 Message sent in conversation: ${conversationId}`);
// //     } catch (error) {
// //       console.error('Chat send error:', error);
// //       socket.emit('chat:error', { message: error.message });
// //     }
// //   });

// //   // Typing indicator
// //   socket.on('chat:typing', (data) => {
// //     const { conversationId, userId, isTyping } = data;
// //     socket.to(`conversation-${conversationId}`).emit('chat:typing', {
// //       userId,
// //       isTyping
// //     });
// //   });

// //   // Mark messages as read
// //   socket.on('chat:read', async (data) => {
// //     try {
// //       const { conversationId, userId } = data;

// //       await ChatMessage.updateMany(
// //         {
// //           conversationId,
// //           receiverId: userId,
// //           isRead: false
// //         },
// //         {
// //           isRead: true,
// //           readAt: new Date()
// //         }
// //       );

// //       io.to(`conversation-${conversationId}`).emit('chat:messages-read', {
// //         conversationId,
// //         readBy: userId,
// //         readAt: new Date()
// //       });
// //     } catch (error) {
// //       console.error('Chat read error:', error);
// //     }
// //   });

// //   global.io.to('admin-room').emit('chat:message-deleted', {
// //   conversationId,
// //   messageId: message._id,
// //   deletedForEveryone  
// // });

// //   // ==================== NOTIFICATIONS ====================

// //   // Client subscribes to notifications
// //   socket.on('notifications:subscribe', (data) => {
// //     const { userId, userType } = data;
// //     socket.join(`notifications-${userId}`);
// //     console.log(`🔔 User subscribed to notifications: ${userId}`);
// //   });

// //   // ==================== MAINTENANCE NOTIFICATIONS ====================

// //   // Driver completed service
// //   socket.on("driver-completed-service", async ({ scheduleId, driverName, vehicleNumber }) => {
// //     try {
// //       const maintenance = await MaintenanceSchedule.findById(scheduleId)
// //         .populate('vehicle');

// //       if (maintenance) {
// //         io.to("admin-room").emit('new-service-request', {
// //           type: 'service_completion_request',
// //           message: `${vehicleNumber || 'Vehicle'} - Driver "${driverName}" completed service!`,
// //           scheduleId,
// //           vehicleNumber: vehicleNumber || maintenance.vehicle?.vehicleNumber,
// //           driverName,
// //           requestedAt: new Date(),
// //           status: maintenance.status
// //         });
// //         console.log("🔔 Maintenance notification sent to admin:", vehicleNumber);
// //       }
// //     } catch (err) {
// //       console.error("Socket maintenance notification error:", err);
// //     }
// //   });

// //   // ==================== DISCONNECT ====================
// //   socket.on('disconnect', () => {
// //     console.log('🔌 Client disconnected:', socket.id);

// //     // Remove driver from active list
// //     for (const [driverId, driver] of activeDrivers.entries()) {
// //       if (driver.socketId === socket.id) {
// //         activeDrivers.delete(driverId);
// //         driverLocations.delete(driverId);

// //         // Notify admin
// //         io.to('admin-room').emit('driver:offline', {
// //           driverId,
// //           driverName: driver.driverName,
// //           status: 'offline'
// //         });

// //         console.log(`🚗 Driver disconnected: ${driver.driverName}`);
// //         break;
// //       }
// //     }
// //   });
// // });

// // // ==================== API ROUTES (EXISTING) ====================

// // app.use('/api/auth', authRoutes);
// // app.use('/api/driver', driverRoutes);
// // app.use('/api/profile', profileRoutes);
// // app.use("/api/deliveries", deliveryRoutes);
// // app.use("/api/tracking", trackingRoutes);
// // app.use("/api/feedback", feedbackRoutes);
// // app.use("/api/journey", journeyRoutes);
// // app.use("/api/routes", routeRoutes);  
// // app.use("/api/remark", remarkRoutes);
// // app.use("/api/maintenance", maintenanceRoutes);
// // app.use("/api/expenses", expenseRoutes);    
// // app.use("/api/chat", driverChatRoutes)
// // app.use("/api/home",Homepage)
// // app.use("/api/cms", require("./routes/Driver/cmsRoutes"))

// // // Admin Routes (Existing)
// // app.use('/admin', adminRoutes);
// // app.use("/admin/orders", orderRoutes); 
// // app.use("/admin/categories", category)
// // app.use("/admin/vehicles", vehicleRoutes);
// // app.use("/admin/regions", regionRoutes); 
// // app.use("/admin/drivers", driverManagementRoutes);  
// // app.use("/admin/customers", customerRoutes);
// // app.use("/admin/deliveries", deliveryAdminRoutes);
// // app.use("/admin/remarks", remarkAdminRoutes);
// // app.use("/admin/maintenance", maintenanceAdminRoutes);
// // app.use("/admin/expenses", expenseAdminRoutes);
// // app.use("/admin/tracking", AdminTrackingRoutes);
// // app.use("/admin/onboarding", onboardingRoutes)
// // app.use('/admin/drivers',driverApprovalRoutes)
// // app.use("/admin/chat",communicationRoutes)
// // app.use("/admin/cms",cmsRoutes)

// // // app.all('/admin/*', (req, res) => res.status(404).render('404'));


// // // Chat, Notifications, Reports, Analytics
// // // app.use('/api/admin', communicationRoutes);

// // // app.get('/', (req, res) => {
// // //   res.json({ 
// // //     success: true, 
// // //     message: 'Orion Delivery Tracking API v3.0', 
// // //     version: '3.0.0',
// // //     features: [
// // //       'Live Tracking (Uber-style)',
// // //       'Live Chat (WebSocket)',
// // //       'Multi-channel Notifications',
// // //       'Reports & Analytics',
// // //       'Admin Panel'
// // //     ],
// // //     endpoints: {
// // //       auth: '/api/auth',
// // //       driver: '/api/driver',
// // //       admin: '/admin',
// // //       tracking: '/api/tracking',
// // //       chat: '/api/admin/chat',
// // //       reports: '/api/admin/reports',
// // //       analytics: '/api/admin/analytics',
// // //       adminPanel: '/admin/panel/tracking'
// // //     }
// // //   });
// // // });

// // app.get('/health', (req, res) => {
// //   res.json({
// //     success: true,
// //     message: 'Server Healthy',
// //     activeDrivers: activeDrivers.size,
// //     timestamp: new Date(),
// //     uptime: process.uptime()
// //   });
// // });

// // // ==================== 404 HANDLER ====================
// // app.use((req, res) => {
// //   res.status(404).json({
// //     success: false,
// //     message: 'Route not found',
// //     path: req.path
// //   });
// // });

// // // ==================== ERROR HANDLER ====================
// // app.use(errorHandler);

// // // ==================== START SERVER ====================
// // const PORT = process.env.PORT || 8000;

// // server.listen(PORT, () => {
// //   console.log('╔════════════════════════════════════════════════════════╗');
// //   console.log(`║  🚀 Server running on PORT ${PORT}                      ║`);
// //   console.log(`║  📡 Socket.IO enabled for real-time features          ║`);
// //   console.log(`║  🗺️  Live Tracking: Uber-style (5-sec updates)        ║`);
// //   console.log(`║  💬 Live Chat: WebSocket enabled                      ║`);
// //   console.log(`║  🔔 Notifications: Multi-channel (FCM/SMS/WhatsApp)   ║`);
// //   console.log(`║  📊 Reports & Analytics: Excel/PDF export            ║`);
// //   console.log('╚════════════════════════════════════════════════════════╝');
// //   console.log(`\n🔥 Active Features:`);
// //   console.log(`   ✅ Real-time Driver Tracking (admin-room)`);
// //   console.log(`   ✅ Live Chat System (chat:join, chat:send)`);
// //   console.log(`   ✅ Push Notifications (notifications:subscribe)`);
// //   console.log(`   ✅ Maintenance Alerts (driver-completed-service)`);
// //   console.log(`   ✅ Reports API (10 types)`);
// //   console.log(`   ✅ Analytics API (Fuel, Performance, KPIs)\n`);
// // });

// // module.exports = app;




// const express = require('express');
// require('dotenv').config();
// const cors = require('cors');
// const path = require('path');
// const morgan = require('morgan');
// const socketIO = require('socket.io');  
// const http = require("http");
// const cookieParser = require("cookie-parser");
// const session = require('express-session');
// const compression = require('compression');
// const helmet = require('helmet');
// const flash = require('connect-flash');
// const methodOverride = require('method-override');

// // Import configurations
// const connectDB = require('./config/db');

// // Import Models (for notifications)
// const MaintenanceSchedule = require('./models/MaintenanceSchedule');
// const Driver = require('./models/Driver');

// // ==================== EXISTING ROUTES ====================
// const authRoutes = require('./routes/authRoutes');
// const driverRoutes = require('./routes/Driver/driverRoutes');
// const profileRoutes = require('./routes/Driver/profileRoutes');
// const adminRoutes = require('./routes/admin/adminRoutes');
// const deliveryRoutes = require("./routes/Driver/deliveryRoutes");
// const trackingRoutes = require("./routes/Driver/trackingRoutes");
// const journeyRoutes = require("./routes/Driver/journeyRoutes");
// const routeRoutes = require("./routes/routeRoutes");
// const feedbackRoutes = require("./routes/feedbackRoutes");
// const orderRoutes = require("./routes/admin/orderRoutes");
// const vehicleRoutes = require("./routes/admin/vehicleRoutes");
// const regionRoutes = require("./routes/admin/regionRoutes");
// const driverManagementRoutes = require("./routes/admin/driverManagementRoutes");
// const customerRoutes = require("./routes/admin/customerRoutes");
// const remarkAdminRoutes = require("./routes/admin/remarkAdminRoutes");
// const remarkRoutes = require("./routes/remarkRoutes");
// const maintenanceRoutes = require("./routes/Driver/maintenanceRoutes");
// const maintenanceAdminRoutes = require("./routes/admin/maintenanceAdminRoutes");
// const expenseAdminRoutes = require("./routes/admin/expenseAdminRoutes");
// const expenseRoutes = require("./routes/Driver/expenseRoutes");
// const deliveryAdminRoutes = require("./routes/admin/deliveryAdminRoutes.");
// const AdminTrackingRoutes = require("./routes/admin/AdminTrackingRoutes");
// const communicationRoutes = require('./routes/admin/Communicationroutes');
// const driverChatRoutes = require("./routes/Driver/driverChatRoutes")
// const onboardingRoutes = require("./routes/admin/onboardingRoutes")
// const Homepage = require("./routes/Driver/Homepage")
// const cmsRoutes = require("./routes/admin/cmsRoutes")
// const category = require("./routes/admin/category")
// const driverApprovalRoutes = require("./routes/admin/driverApprovalRoutes")

// // Middleware
// const errorHandler = require('./middleware/errorHandler');

// // ==================== INITIALIZE APP & SERVER ====================
// const app = express();
// const server = http.createServer(app);

// const io = socketIO(server, {
//   cors: {
//     origin: process.env.FRONTEND_URL || "http://localhost:8000",
//     methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
//     credentials: true
//   },
//   pingTimeout: 60000,
//   pingInterval: 25000
// });

// // ✅ CRITICAL FIX: Make io accessible in routes
// global.io = io;
// app.set('io', io);  // ← THIS LINE IS ESSENTIAL FOR LIVE TRACKING

// // Connect DB
// connectDB();

// // ==================== MIDDLEWARE ====================
// app.use(helmet({
//   contentSecurityPolicy: false
// }));
// app.use(compression());
// app.use(cors({
//   origin: process.env.FRONTEND_URL || 'http://localhost:8000',
//   credentials: true
// }));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(morgan('dev'));
// app.use(methodOverride('_method'));
// app.use(cookieParser());

// // Session for admin panel
// // app.use(session({
// //   secret: process.env.SESSION_SECRET || 'your-secret-key-here',
// //   resave: false,
// //   saveUninitialized: false,
// //   cookie: {
// //     secure: process.env.NODE_ENV === 'production',
// //     maxAge: 24 * 60 * 60 * 1000 // 24 hours
// //   }
// // }));

// app.use(session({
//   secret: process.env.SESSION_SECRET || 'your-secret-key-here',
//   resave: true,
//   saveUninitialized: true,
//   rolling: true,        // ← Yeh add karo
//   cookie: {
//     secure: false,
//     httpOnly: true,
//     maxAge: 24 * 60 * 60 * 1000,
//     sameSite: 'lax'     // ← Yeh add karo
//   }
// }));

// // Express Messages middleware
// app.use(flash());
// app.use((req, res, next) => {
//   if (req.method === 'GET') {
//         res.locals.messages = req.flash();
//     } else {
//         res.locals.messages = {};
//     }
//   res.locals.dateOptions = {
//         hour: "2-digit",
//         minute: "2-digit",
//         hour12: true,
//     };
//     res.locals.dateLocale = "en-US";
//     next();

//     //    Object.defineProperty(res.locals, 'messages', {
//     //     get: function() {
//     //         return req.flash();
//     //     },
//     //     configurable: true
//     // });
//     // res.locals.dateOptions = {
//     //     hour: "2-digit",
//     //     minute: "2-digit",
//     //     hour12: true,
//     // };
//     // res.locals.dateLocale = "en-US";
//     // next();
// });

// // Static files
// app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
// app.use(express.static(path.join(__dirname, 'public')));

// // View engine
// app.set('view engine', 'ejs');
// app.set('views', [ 
//   path.join(__dirname, 'views')
// ]);

// // ==================== SOCKET.IO REAL-TIME FEATURES ====================

// const activeDrivers = new Map(); // Store active driver connections
// const driverLocations = new Map(); // Store latest driver locations

// // Make activeDrivers accessible globally for socket events
// io.activeDrivers = activeDrivers;

// io.on("connection", (socket) => {
//   console.log("🔌 New client connected:", socket.id);

//   // ==================== ADMIN ROOM ====================
//   socket.on("join-admin-room", () => {
//     socket.join("admin-room");
//     console.log("👔 Admin joined admin-room:", socket.id);

//     // Send current active drivers to admin
//     const activeDriversList = Array.from(activeDrivers.values()).map(driver => {
//       const location = driverLocations.get(driver.driverId);
//       return { ...driver, location: location || null };
//     });
//     socket.emit('admin:drivers:list', activeDriversList);
//   });

//   // ==================== LIVE TRACKING (Uber-style) ====================

//   // Driver connects and starts sending location
//   socket.on('driver:connect', async (data) => {
//     const { driverId, driverName, vehicleNumber } = data;

//     activeDrivers.set(driverId, {
//       socketId: socket.id,
//       driverId,
//       driverName,
//       vehicleNumber,
//       connectedAt: new Date()
//     });

//     socket.join(`driver-${driverId}`);
//     console.log(`🚗 Driver connected: ${driverName} (${vehicleNumber})`);

//     // Notify admin panel
//     io.to('admin-room').emit('driver:online', {
//       driverId,
//       driverName,
//       vehicleNumber,
//       status: 'online'
//     });
//   });

//   // Driver sends location update (automatic every 5-15 seconds)
//   socket.on('driver:location', async (data) => {
//     try {
//       const { driverId, deliveryId, latitude, longitude, speed, heading, accuracy, timestamp } = data;

//       if (!driverId || !latitude || !longitude) {
//         console.warn('⚠️ Invalid location data received:', data);
//         return;
//       }

//       // Update driver's current location in database
//       const driver = await Driver.findById(driverId);
//       if (driver) {
//         await driver.updateLocation({
//           latitude,
//           longitude,
//           speed: speed || 0,
//           heading: heading || 0,
//           accuracy: accuracy || 0,
//           deliveryId: deliveryId || null
//         });
//       }

//       // Store latest location in memory map (for quick access)
//       driverLocations.set(driverId, {
//         latitude,
//         longitude,
//         speed,
//         heading,
//         accuracy,
//         timestamp: timestamp || new Date(),
//         deliveryId
//       });

//       // Broadcast to admin panel in real-time (with driver name for live tracking)
//       const driverName = driver ? (driver.name || 'Driver') : 'Driver';
//       const vehicleNum = driver ? (driver.vehicleNumber || 'N/A') : 'N/A';
//       io.to('admin-room').emit('driver:location:update', {
//         driverId,
//         driverName,
//         vehicleNumber: vehicleNum,
//         deliveryId,
//         location: { latitude, longitude },
//         speed: speed || 0,
//         heading: heading || 0,
//         accuracy: accuracy || 0,
//         timestamp: timestamp || new Date()
//       });

//       // Broadcast to specific delivery tracking room (for customers)
//       if (deliveryId) {
//         io.to(`delivery-${deliveryId}`).emit('delivery:location:update', {
//           deliveryId,
//           location: { latitude, longitude },
//           speed,
//           timestamp: timestamp || new Date()
//         });
//       }

//       console.log(`📍 Location updated for driver ${driverId}: ${latitude}, ${longitude}`);

//     } catch (error) {
//       console.error('❌ Error handling driver location update:', error);
//     }
//   });

//   // ==================== DELIVERY TRACKING ====================
//   socket.on("join-delivery", (deliveryId) => {
//     socket.join(`delivery-${deliveryId}`);
//     console.log(`📦 Client joined delivery: ${deliveryId}`);
//   });

//   socket.on("leave-delivery", (deliveryId) => {
//     socket.leave(`delivery-${deliveryId}`);
//     console.log(`📦 Client left delivery: ${deliveryId}`);
//   });

//   socket.on("driver-location-update", async (data) => {
//     const { deliveryId, latitude, longitude, speed, heading } = data;
//     io.to(`delivery-${deliveryId}`).emit('location-update', {
//       deliveryId,
//       location: { latitude, longitude },
//       speed,
//       heading,
//       timestamp: new Date()
//     });
//   });

//   // When driver completes delivery, clear their location
//   socket.on('delivery:completed', async (data) => {
//     try {
//       const { driverId, deliveryId } = data;
  
//       const driver = await Driver.findById(driverId);
//       if (driver) {
//         await driver.clearLocation();
//         driver.isAvailable = true;
//         await driver.save();
//       }
  
//       // Remove from active tracking
//       driverLocations.delete(driverId);
  
//       // Notify admin
//       io.to('admin-room').emit('driver:delivery:completed', {
//         driverId,
//         deliveryId,
//         timestamp: new Date()
//       });
  
//     } catch (error) {
//       console.error('❌ Error handling delivery completion:', error);
//     }
//   });

//   // ==================== LIVE CHAT SYSTEM ====================

//   // User joins chat
//   socket.on('chat:join', (data) => {
//     const { userId } = data;
//     socket.join(`user-${userId}`);
//     console.log(`💬 User joined chat: ${userId}`);
//   });

//   // User joins specific conversation
//   socket.on('chat:join-conversation', (data) => {
//     const { conversationId } = data;
//     socket.join(`conversation-${conversationId}`);
//     console.log(`💬 User joined conversation: ${conversationId}`);
//   });

//   // Send message
//   socket.on('chat:send', async (data) => {
//     try {
//       const { conversationId, senderId, receiverId, content, messageType, mediaUrl } = data;

//       // Save message to database
//       const message = await ChatMessage.create({
//         conversationId,
//         senderId,
//         senderType: data.senderType,
//         receiverId,
//         receiverType: data.receiverType,
//         messageType: messageType || 'text',
//         content,
//         mediaUrl,
//         isDelivered: true,
//         deliveredAt: new Date()
//       }); 

//       // Populate sender details
//       await message.populate('senderId', 'name profileImage');

//       // Emit to receiver
//       io.to(`user-${receiverId}`).emit('chat:new-message', {
//         conversationId,
//         message
//       });

//       // Emit to conversation room
//       io.to(`conversation-${conversationId}`).emit('chat:new-message', {
//         conversationId,
//         message
//       });

//       console.log(`💬 Message sent in conversation: ${conversationId}`);
//     } catch (error) {
//       console.error('❌ Chat send error:', error);
//       socket.emit('chat:error', { message: error.message });
//     }
//   });

//   // Typing indicator
//   socket.on('chat:typing', (data) => {
//     const { conversationId, userId, isTyping } = data;
//     socket.to(`conversation-${conversationId}`).emit('chat:typing', {
//       userId,
//       isTyping
//     });
//   });

//   // Mark messages as read
//   socket.on('chat:read', async (data) => {
//     try {
//       const { conversationId, userId } = data;

//       await ChatMessage.updateMany(
//         {
//           conversationId,
//           receiverId: userId,
//           isRead: false
//         },
//         {
//           isRead: true,
//           readAt: new Date()
//         }
//       );

//       io.to(`conversation-${conversationId}`).emit('chat:messages-read', {
//         conversationId,
//         readBy: userId,
//         readAt: new Date()
//       });
//     } catch (error) {
//       console.error('❌ Chat read error:', error);
//     }
//   });

//   // Delete message
//   socket.on('chat:delete-message', async (data) => {
//     try {
//       const { conversationId, messageId, deletedForEveryone } = data;

//       io.to('admin-room').emit('chat:message-deleted', {
//         conversationId,
//         messageId,
//         deletedForEveryone  
//       });
//     } catch (error) {
//       console.error('❌ Chat delete error:', error);
//     }
//   });

//   // ==================== NOTIFICATIONS ====================

//   // Client subscribes to notifications
//   socket.on('notifications:subscribe', (data) => {
//     const { userId, userType } = data;
//     socket.join(`notifications-${userId}`);
//     console.log(`🔔 User subscribed to notifications: ${userId}`);
//   });

//   // ==================== MAINTENANCE NOTIFICATIONS ====================

//   // Driver completed service
//   socket.on("driver-completed-service", async ({ scheduleId, driverName, vehicleNumber }) => {
//     try {
//       const maintenance = await MaintenanceSchedule.findById(scheduleId)
//         .populate('vehicle');

//       if (maintenance) {
//         io.to("admin-room").emit('new-service-request', {
//           type: 'service_completion_request',
//           message: `${vehicleNumber || 'Vehicle'} - Driver "${driverName}" completed service!`,
//           scheduleId,
//           vehicleNumber: vehicleNumber || maintenance.vehicle?.vehicleNumber,
//           driverName,
//           requestedAt: new Date(),
//           status: maintenance.status
//         });
//         console.log("🔔 Maintenance notification sent to admin:", vehicleNumber);
//       }
//     } catch (err) {
//       console.error("❌ Socket maintenance notification error:", err);
//     }
//   });

//   // ==================== DISCONNECT ====================
//   socket.on('disconnect', () => {
//     console.log('🔌 Client disconnected:', socket.id);

//     // Remove driver from active list
//     for (const [driverId, driver] of activeDrivers.entries()) {
//       if (driver.socketId === socket.id) {
//         activeDrivers.delete(driverId);
//         driverLocations.delete(driverId);

//         // Notify admin
//         io.to('admin-room').emit('driver:offline', {
//           driverId,
//           driverName: driver.driverName,
//           status: 'offline'
//         });

//         console.log(`🚗 Driver disconnected: ${driver.driverName}`);
//         break;
//       }
//     }
//   });
// });

// // ==================== API ROUTES ====================

// app.use('/api/auth', authRoutes);
// app.use('/api/driver', driverRoutes);
// app.use('/api/profile', profileRoutes);
// app.use("/api/deliveries", deliveryRoutes);
// app.use("/api/tracking", trackingRoutes);
// app.use("/api/feedback", feedbackRoutes);
// app.use("/api/journey", journeyRoutes);
// app.use("/api/routes", routeRoutes);  
// app.use("/api/remark", remarkRoutes);
// app.use("/api/maintenance", maintenanceRoutes);
// app.use("/api/expenses", expenseRoutes);    
// app.use("/api/chat", driverChatRoutes);
// app.use("/api/home", Homepage);
// app.use("/api/cms", require("./routes/Driver/cmsRoutes"));

// // Admin Routes
// app.use('/admin', adminRoutes);
// app.use("/admin/orders", orderRoutes); 
// app.use("/admin/categories", category);
// app.use("/admin/vehicles", vehicleRoutes);
// app.use("/admin/regions", regionRoutes); 
// app.use("/admin/drivers", driverManagementRoutes);  
// app.use("/admin/customers", customerRoutes);
// app.use("/admin/deliveries", deliveryAdminRoutes);
// app.use("/admin/remarks", remarkAdminRoutes);
// app.use("/admin/maintenance", maintenanceAdminRoutes);
// app.use("/admin/expenses", expenseAdminRoutes);
// app.use("/admin/tracking", AdminTrackingRoutes);
// app.use("/admin/onboarding", onboardingRoutes);
// app.use('/admin/drivers', driverApprovalRoutes);
// app.use("/admin/chat", communicationRoutes);
// app.use("/admin/cms", cmsRoutes);

// // Health check endpoint
// app.get('/health', (req, res) => {
//   res.json({
//     success: true,
//     message: 'Server Healthy',
//     activeDrivers: activeDrivers.size,
//     timestamp: new Date(),
//     uptime: process.uptime(),
//     socketIO: 'Connected',
//     features: {
//       liveTracking: true,
//       liveChat: true,
//       notifications: true,
//       maintenance: true
//     }
//   });
// });

// // API info endpoint
// app.get('/api', (req, res) => {
//   res.json({ 
//     success: true, 
//     message: 'Orion Delivery Tracking API v3.0', 
//     version: '3.0.0',
//     features: [
//       '🗺️ Live Tracking (Uber-style)',
//       '💬 Live Chat (WebSocket)',
//       '🔔 Multi-channel Notifications',
//       '📊 Reports & Analytics',
//       '👔 Admin Panel'
//     ],
//     endpoints: {
//       auth: '/api/auth',
//       driver: '/api/driver',
//       journey: '/api/journey',
//       admin: '/admin',
//       tracking: '/api/tracking',
//       chat: '/api/chat',
//       health: '/health'
//     }
//   });
// });

// // ==================== 404 HANDLER ====================
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: 'Route not found',
//     path: req.path
//   });
// });

// // ==================== ERROR HANDLER ====================
// app.use(errorHandler);

// // ==================== START SERVER ====================
// const PORT = process.env.PORT || 8000;

// server.listen(PORT, () => {
//   console.log('╔════════════════════════════════════════════════════════╗');
//   console.log(`║  🚀 Server running on PORT ${PORT}                      ║`);
//   console.log(`║  📡 Socket.IO enabled for real-time features          ║`);
//   console.log(`║  🗺️  Live Tracking: ✅ ENABLED (15-sec updates)        ║`);
//   console.log(`║  💬 Live Chat: ✅ ENABLED (WebSocket)                  ║`);
//   console.log(`║  🔔 Notifications: ✅ ENABLED (Multi-channel)          ║`);
//   console.log(`║  📊 Reports & Analytics: ✅ ENABLED                    ║`);
//   console.log('╚════════════════════════════════════════════════════════╝');
//   console.log(`\n🔥 Active Features:`);
//   console.log(`   ✅ Real-time Driver Tracking (admin-room)`);
//   console.log(`   ✅ Live Chat System (chat:join, chat:send)`);
//   console.log(`   ✅ Push Notifications (notifications:subscribe)`);
//   console.log(`   ✅ Maintenance Alerts (driver-completed-service)`);
//   console.log(`   ✅ Socket.IO accessible via: req.app.get('io')`);
//   console.log(`   ✅ Global io accessible via: global.io\n`);
//   console.log(`📍 Admin Dashboard: http://localhost:${PORT}/admin/dashboard`);
//   console.log(`🏥 Health Check: http://localhost:${PORT}/health\n`);
// });

// module.exports = app;


  
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const socketIO = require('socket.io');  
const http = require("http");
const cookieParser = require("cookie-parser");
const session = require('express-session');
const MongoStore = require('connect-mongo');
const compression = require('compression');
const helmet = require('helmet');
const flash = require('connect-flash');
const methodOverride = require('method-override');

// Import configurations
const connectDB = require('./config/db');

// Import Models (for notifications)
const MaintenanceSchedule = require('./models/MaintenanceSchedule');
const Driver = require('./models/Driver');

// ==================== EXISTING ROUTES ====================
const authRoutes = require('./routes/authRoutes');
const driverRoutes = require('./routes/Driver/driverRoutes');
const profileRoutes = require('./routes/Driver/profileRoutes');
const adminRoutes = require('./routes/admin/adminRoutes');
const deliveryRoutes = require("./routes/Driver/deliveryRoutes");
const trackingRoutes = require("./routes/Driver/trackingRoutes");
const journeyRoutes = require("./routes/Driver/journeyRoutes");
const routeRoutes = require("./routes/routeRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const orderRoutes = require("./routes/admin/orderRoutes");
const vehicleRoutes = require("./routes/admin/vehicleRoutes");
const regionRoutes = require("./routes/admin/regionRoutes");
const driverManagementRoutes = require("./routes/admin/driverManagementRoutes");
const customerRoutes = require("./routes/admin/customerRoutes");
const remarkAdminRoutes = require("./routes/admin/remarkAdminRoutes");
const remarkRoutes = require("./routes/remarkRoutes");
const maintenanceRoutes = require("./routes/Driver/maintenanceRoutes");
const maintenanceAdminRoutes = require("./routes/admin/maintenanceAdminRoutes");
const expenseAdminRoutes = require("./routes/admin/expenseAdminRoutes");
const expenseRoutes = require("./routes/Driver/expenseRoutes");
const deliveryAdminRoutes = require("./routes/admin/deliveryAdminRoutes.");
const AdminTrackingRoutes = require("./routes/admin/AdminTrackingRoutes");
const communicationRoutes = require('./routes/admin/Communicationroutes');
const driverChatRoutes = require("./routes/Driver/driverChatRoutes")
const onboardingRoutes = require("./routes/admin/onboardingRoutes")
const Homepage = require("./routes/Driver/Homepage")
const cmsRoutes = require("./routes/admin/cmsRoutes")
const category = require("./routes/admin/category")
const driverApprovalRoutes = require("./routes/admin/driverApprovalRoutes")

// Middleware
const errorHandler = require('./middleware/errorHandler');

// ==================== INITIALIZE APP & SERVER ====================
const app = express();
const server = http.createServer(app);

const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:8000",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

global.io = io;
app.set('io', io);

// Connect DB
connectDB();

// ==================== MIDDLEWARE ====================
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5001',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(methodOverride('_method'));
app.use(cookieParser());

// ==================== SESSION WITH MONGO STORE ====================
// connect-mongo install karo: npm install connect-mongo
app.use(session({
  secret: process.env.SESSION_SECRET || 'orion-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,  // ← Sirf MONGO_URI
    ttl: 24 * 60 * 60,
    autoRemove: 'native',
    touchAfter: 24 * 3600 // ← Yeh add karo
  }),
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

// ==================== FLASH MESSAGES ====================
app.use(flash());
app.use((req, res, next) => {
  res.locals.messages = {}; // ← Empty rakho
  res.locals.dateOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };
  res.locals.dateLocale = "en-US";
  next();
});

app.get('/test-flash', (req, res) => {
  req.flash('green', 'Test message working!');
  return req.session.save(() => res.redirect('/test-flash-result'));
});

app.get('/test-flash-result', (req, res) => {
  const msgs = req.flash(); // ← Direct lo, res.locals se nahi
  console.log('Flash result:', msgs);
  res.json({ messages: msgs });
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', [path.join(__dirname, 'views')]);

// ==================== SOCKET.IO ====================
const activeDrivers = new Map();
const driverLocations = new Map();
io.activeDrivers = activeDrivers;

io.on("connection", (socket) => {
  console.log("🔌 New client connected:", socket.id);

  socket.on("join-admin-room", () => {
    socket.join("admin-room");
    console.log("👔 Admin joined admin-room:", socket.id);
    const activeDriversList = Array.from(activeDrivers.values()).map(driver => {
      const location = driverLocations.get(driver.driverId);
      return { ...driver, location: location || null };
    });
    socket.emit('admin:drivers:list', activeDriversList);
  });

  socket.on('driver:connect', async (data) => {
    const { driverId, driverName, vehicleNumber } = data;
    activeDrivers.set(driverId, {
      socketId: socket.id,
      driverId,
      driverName,
      vehicleNumber,
      connectedAt: new Date()
    });
    socket.join(`driver-${driverId}`);
    console.log(`🚗 Driver connected: ${driverName} (${vehicleNumber})`);
    io.to('admin-room').emit('driver:online', {
      driverId,
      driverName,
      vehicleNumber,
      status: 'online'
    });
  });

  socket.on('driver:location', async (data) => {
    try {
      const { driverId, deliveryId, latitude, longitude, speed, heading, accuracy, timestamp } = data;
      if (!driverId || !latitude || !longitude) {
        console.warn('⚠️ Invalid location data received:', data);
        return;
      }
      const driver = await Driver.findById(driverId);
      if (driver) {
        await driver.updateLocation({
          latitude, longitude,
          speed: speed || 0,
          heading: heading || 0,
          accuracy: accuracy || 0,
          deliveryId: deliveryId || null
        });
      }
      driverLocations.set(driverId, {
        latitude, longitude, speed, heading, accuracy,
        timestamp: timestamp || new Date(),
        deliveryId
      });
      const driverName = driver ? (driver.name || 'Driver') : 'Driver';
      const vehicleNum = driver ? (driver.vehicleNumber || 'N/A') : 'N/A';
      io.to('admin-room').emit('driver:location:update', {
        driverId, driverName,
        vehicleNumber: vehicleNum,
        deliveryId,
        location: { latitude, longitude },
        speed: speed || 0,
        heading: heading || 0,
        accuracy: accuracy || 0,
        timestamp: timestamp || new Date()
      });
      if (deliveryId) {
        io.to(`delivery-${deliveryId}`).emit('delivery:location:update', {
          deliveryId,
          location: { latitude, longitude },
          speed,
          timestamp: timestamp || new Date()
        });
      }
      console.log(`📍 Location updated for driver ${driverId}: ${latitude}, ${longitude}`);
    } catch (error) {
      console.error('❌ Error handling driver location update:', error);
    }
  });

  socket.on("join-delivery", (deliveryId) => {
    socket.join(`delivery-${deliveryId}`);
    console.log(`📦 Client joined delivery: ${deliveryId}`);
  });

  socket.on("leave-delivery", (deliveryId) => {
    socket.leave(`delivery-${deliveryId}`);
  });

  socket.on("driver-location-update", async (data) => {
    const { deliveryId, latitude, longitude, speed, heading } = data;
    io.to(`delivery-${deliveryId}`).emit('location-update', {
      deliveryId,
      location: { latitude, longitude },
      speed, heading,
      timestamp: new Date()
    });
  });

  socket.on('delivery:completed', async (data) => {
    try {
      const { driverId, deliveryId } = data;
      const driver = await Driver.findById(driverId);
      if (driver) {
        await driver.clearLocation();
        driver.isAvailable = true;
        await driver.save();
      }
      driverLocations.delete(driverId);
      io.to('admin-room').emit('driver:delivery:completed', {
        driverId, deliveryId,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('❌ Error handling delivery completion:', error);
    }
  });

  socket.on('chat:join', (data) => {
    socket.join(`user-${data.userId}`);
    console.log(`💬 User joined chat: ${data.userId}`);
  });

  socket.on('chat:join-conversation', (data) => {
    socket.join(`conversation-${data.conversationId}`);
  });

  socket.on('chat:typing', (data) => {
    const { conversationId, userId, isTyping } = data;
    socket.to(`conversation-${conversationId}`).emit('chat:typing', { userId, isTyping });
  });

  socket.on('notifications:subscribe', (data) => {
    socket.join(`notifications-${data.userId}`);
    console.log(`🔔 User subscribed to notifications: ${data.userId}`);
  });

  socket.on("driver-completed-service", async ({ scheduleId, driverName, vehicleNumber }) => {
    try {
      const maintenance = await MaintenanceSchedule.findById(scheduleId).populate('vehicle');
      if (maintenance) {
        io.to("admin-room").emit('new-service-request', {
          type: 'service_completion_request',
          message: `${vehicleNumber || 'Vehicle'} - Driver "${driverName}" completed service!`,
          scheduleId,
          vehicleNumber: vehicleNumber || maintenance.vehicle?.vehicleNumber,
          driverName,
          requestedAt: new Date(),
          status: maintenance.status
        });
      }
    } catch (err) {
      console.error("❌ Socket maintenance notification error:", err);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
    for (const [driverId, driver] of activeDrivers.entries()) {
      if (driver.socketId === socket.id) {
        activeDrivers.delete(driverId);
        driverLocations.delete(driverId);
        io.to('admin-room').emit('driver:offline', {
          driverId,
          driverName: driver.driverName,
          status: 'offline'
        });
        console.log(`🚗 Driver disconnected: ${driver.driverName}`);
        break;
      }
    }
  });
});

// ==================== API ROUTES ====================
app.use('/api/auth', authRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/profile', profileRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/journey", journeyRoutes);
app.use("/api/routes", routeRoutes);  
app.use("/api/remark", remarkRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/expenses", expenseRoutes);    
app.use("/api/chat", driverChatRoutes);
app.use("/api/home", Homepage);
app.use("/api/cms", require("./routes/Driver/cmsRoutes"));

// Admin Routes
app.use('/admin', adminRoutes);
app.use("/admin/orders", orderRoutes); 
app.use("/admin/categories", category);
app.use("/admin/vehicles", vehicleRoutes);
app.use("/admin/regions", regionRoutes); 
app.use("/admin/drivers", driverManagementRoutes);  
app.use("/admin/customers", customerRoutes);
app.use("/admin/deliveries", deliveryAdminRoutes);
app.use("/admin/remarks", remarkAdminRoutes);
app.use("/admin/maintenance", maintenanceAdminRoutes);
app.use("/admin/expenses", expenseAdminRoutes);
app.use("/admin/tracking", AdminTrackingRoutes);
app.use("/admin/onboarding", onboardingRoutes);
app.use('/admin/drivers', driverApprovalRoutes);
app.use("/admin/chat", communicationRoutes);
app.use("/admin/cms", cmsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server Healthy',
    activeDrivers: activeDrivers.size,
    timestamp: new Date(),
    uptime: process.uptime(),
    socketIO: 'Connected'
  });
});

app.get('/api', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Orion Delivery Tracking API v3.0'
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', path: req.path });
});

// Error Handler
app.use(errorHandler);

// ==================== START SERVER ====================
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on PORT ${PORT}`);
});

module.exports = app;