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

// ====================== ROUTES ======================
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
const driverChatRoutes = require("./routes/Driver/driverChatRoutes");
const onboardingRoutes = require("./routes/admin/onboardingRoutes");
const Homepage = require("./routes/Driver/Homepage");
const cmsRoutes = require("./routes/admin/cmsRoutes");
const category = require("./routes/admin/category");
const driverApprovalRoutes = require("./routes/admin/driverApprovalRoutes");

const errorHandler = require('./middleware/errorHandler');

// ====================== INIT APP ======================
const app = express();
const server = http.createServer(app);

const io = socketIO(server, {
  cors: {
    origin: "*",  // Production mein specific URL do
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ["websocket", "polling"],
});

// io globally available karo
global.io = io;
app.set('io', io);

// ====================== SOCKET HANDLERS ======================
// ✅ Yahan setup karo — sab kuch socketHandlers.js mein hai
const setupSocketHandlers = require('./utils/sockethandler');
const { activeDrivers, driverLocations } = setupSocketHandlers(io);

// Expose on io for controllers to use
io.activeDrivers = activeDrivers;
io.driverLocations = driverLocations;

// ====================== DB ======================
connectDB();

// ====================== MIDDLEWARE ======================
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(methodOverride('_method'));
app.use(cookieParser());

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'orion-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    ttl: 24 * 60 * 60,
    autoRemove: 'native',
    touchAfter: 24 * 3600
  }),
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

// Flash
app.use(flash());
app.use((req, res, next) => {
  res.locals.messages = {};
  res.locals.dateOptions = { hour: "2-digit", minute: "2-digit", hour12: true };
  res.locals.dateLocale = "en-US";
  next();
});

// Static & Views
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', [path.join(__dirname, 'views')]);

// ====================== API ROUTES ======================
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

// ====================== HELPER ROUTES ======================
// Test flash
app.get('/test-flash', (req, res) => {
  req.flash('green', 'Test message working!');
  return req.session.save(() => res.redirect('/test-flash-result'));
});
app.get('/test-flash-result', (req, res) => {
  res.json({ messages: req.flash() });
});

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
  res.json({ success: true, message: 'Orion Delivery Tracking API v3.0' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', path: req.path });
});

app.use(errorHandler);

// ====================== START ======================
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on PORT ${PORT}`);
  console.log(`🔌 Socket.IO ready`);
});

module.exports = app;