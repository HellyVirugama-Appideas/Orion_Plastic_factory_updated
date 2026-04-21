const Delivery = require('../../models/Delivery');
const Driver = require('../../models/Driver');
const Expense = require('../../models/Expense');
const Vehicle = require('../../models/Vehicle');
const MaintenanceSchedule = require('../../models/MaintenanceSchedule');
const ReportConfig = require('../../models/Reportconfig');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// ==================== REPORTS CONTROLLER ====================

// Daily/Weekly/Monthly Delivery Reports
exports.getDeliveryReport = async (req, res) => {
  try {
    const { startDate, endDate, period = 'daily', driverId, status } = req.query;

    const query = {};
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (driverId) query.driverId = driverId;
    if (status) query.status = status;

    const deliveries = await Delivery.find(query)
      .populate('driverId', 'userId vehicleNumber')
      .populate({
        path: 'driverId',
        populate: { path: 'userId', select: 'name' }
      })
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 });

    // Group by period
    const grouped = this.groupByPeriod(deliveries, period);

    // Calculate statistics
    const stats = {
      total: deliveries.length,
      completed: deliveries.filter(d => d.status === 'delivered').length,
      pending: deliveries.filter(d => d.status === 'pending').length,
      cancelled: deliveries.filter(d => d.status === 'cancelled').length,
      inTransit: deliveries.filter(d => d.status === 'in_transit').length,
      completionRate: 0,
      avgDeliveryTime: 0
    };

    stats.completionRate = stats.total > 0 
      ? ((stats.completed / stats.total) * 100).toFixed(2)
      : 0;

    // Calculate average delivery time
    const completedDeliveries = deliveries.filter(d => 
      d.status === 'delivered' && d.actualDeliveryTime
    );
    
    if (completedDeliveries.length > 0) {
      const totalTime = completedDeliveries.reduce((sum, d) => {
        const time = (new Date(d.actualDeliveryTime) - new Date(d.createdAt)) / (1000 * 60);
        return sum + time;
      }, 0);
      stats.avgDeliveryTime = Math.round(totalTime / completedDeliveries.length);
    }

    return res.status(200).json({
      success: true,
      data: {
        deliveries,
        grouped,
        stats,
        period
      }
    });

  } catch (error) {
    console.error('Get Delivery Report Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate delivery report'
    });
  }
};

// Customer-based Reports
exports.getCustomerReport = async (req, res) => {
  try {
    const { startDate, endDate, customerId } = req.query;

    const query = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (customerId) query.customerId = customerId;

    const deliveries = await Delivery.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$customerId',
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          totalValue: { $sum: '$packageDetails.value' },
          avgDeliveryTime: { $avg: '$deliveryDuration' }
        }
      },
      { $sort: { totalOrders: -1 } }
    ]);

    // Populate customer details
    for (let report of deliveries) {
      const Customer = require('../../models/Customer');
      const customer = await Customer.findById(report._id).populate('userId', 'name email phone');
      report.customer = customer;
    }

    return res.status(200).json({
      success: true,
      data: { customerReports: deliveries }
    });

  } catch (error) {
    console.error('Get Customer Report Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate customer report'
    });
  }
};

// Vehicle-based Reports
exports.getVehicleReport = async (req, res) => {
  try {
    const { startDate, endDate, vehicleNumber } = req.query;

    const driverQuery = {};
    if (vehicleNumber) driverQuery.vehicleNumber = vehicleNumber;

    const drivers = await Driver.find(driverQuery);
    const driverIds = drivers.map(d => d._id);

    const deliveryQuery = { driverId: { $in: driverIds } };
    if (startDate && endDate) {
      deliveryQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const deliveries = await Delivery.find(deliveryQuery);
    const expenses = await Expense.find({
      driverId: { $in: driverIds },
      ...(startDate && endDate ? {
        expenseDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      } : {})
    });

    // Group by vehicle
    const vehicleStats = {};

    for (let driver of drivers) {
      const vehicleDeliveries = deliveries.filter(d => 
        d.driverId.toString() === driver._id.toString()
      );
      const vehicleExpenses = expenses.filter(e => 
        e.driverId.toString() === driver._id.toString()
      );

      vehicleStats[driver.vehicleNumber] = {
        vehicleNumber: driver.vehicleNumber,
        vehicleType: driver.vehicleType,
        totalDeliveries: vehicleDeliveries.length,
        completedDeliveries: vehicleDeliveries.filter(d => d.status === 'delivered').length,
        totalDistance: vehicleDeliveries.reduce((sum, d) => sum + (d.actualDistance || 0), 0),
        totalFuelExpense: vehicleExpenses.reduce((sum, e) => 
          sum + (e.fuelDetails?.totalAmount || 0), 0
        ),
        totalFuelQuantity: vehicleExpenses.reduce((sum, e) => 
          sum + (e.fuelDetails?.quantity || 0), 0
        ),
        avgMileage: 0
      };

      // Calculate average mileage
      const totalDistance = vehicleStats[driver.vehicleNumber].totalDistance;
      const totalFuel = vehicleStats[driver.vehicleNumber].totalFuelQuantity;
      if (totalFuel > 0) {
        vehicleStats[driver.vehicleNumber].avgMileage = (totalDistance / totalFuel).toFixed(2);
      }
    }

    return res.status(200).json({
      success: true,
      data: { vehicleReports: Object.values(vehicleStats) }
    });

  } catch (error) {
    console.error('Get Vehicle Report Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate vehicle report'
    });
  }
};

// Vehicle Maintenance Reports
exports.getMaintenanceReport = async (req, res) => {
  try {
    const { startDate, endDate, vehicleNumber } = req.query;

    const query = {};
    if (startDate && endDate) {
      query.scheduledDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (vehicleNumber) query.vehicleNumber = vehicleNumber;

    const maintenanceRecords = await MaintenanceSchedule.find(query)
      .sort({ scheduledDate: -1 });

    // Calculate total maintenance cost per vehicle
    const costByVehicle = {};
    maintenanceRecords.forEach(record => {
      if (!costByVehicle[record.vehicleNumber]) {
        costByVehicle[record.vehicleNumber] = {
          vehicleNumber: record.vehicleNumber,
          totalCost: 0,
          totalServices: 0,
          lastService: null
        };
      }
      costByVehicle[record.vehicleNumber].totalCost += record.estimatedCost || 0;
      costByVehicle[record.vehicleNumber].totalServices += 1;
      
      if (!costByVehicle[record.vehicleNumber].lastService || 
          new Date(record.scheduledDate) > new Date(costByVehicle[record.vehicleNumber].lastService)) {
        costByVehicle[record.vehicleNumber].lastService = record.scheduledDate;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        maintenanceRecords,
        costByVehicle: Object.values(costByVehicle),
        totalCost: Object.values(costByVehicle).reduce((sum, v) => sum + v.totalCost, 0)
      }
    });

  } catch (error) {
    console.error('Get Maintenance Report Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate maintenance report'
    });
  }
};

// Fuel Expense Reports
exports.getFuelExpenseReport = async (req, res) => {
  try {
    const { startDate, endDate, driverId } = req.query;

    const query = { expenseType: 'fuel' };
    if (startDate && endDate) {
      query.expenseDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (driverId) query.driverId = driverId;

    const expenses = await Expense.find(query)
      .populate('driverId', 'vehicleNumber userId')
      .populate({
        path: 'driverId',
        populate: { path: 'userId', select: 'name' }
      })
      .sort({ expenseDate: -1 });

    // Calculate statistics
    const stats = {
      totalExpenses: expenses.reduce((sum, e) => sum + e.fuelDetails.totalAmount, 0),
      totalFuelQuantity: expenses.reduce((sum, e) => sum + e.fuelDetails.quantity, 0),
      totalDistance: expenses.reduce((sum, e) => 
        sum + (e.mileageData?.distanceCovered || 0), 0
      ),
      avgMileage: 0,
      totalRecords: expenses.length
    };

    if (stats.totalFuelQuantity > 0) {
      stats.avgMileage = (stats.totalDistance / stats.totalFuelQuantity).toFixed(2);
    }

    // Group by driver
    const byDriver = {};
    expenses.forEach(expense => {
      const driverId = expense.driverId._id.toString();
      if (!byDriver[driverId]) {
        byDriver[driverId] = {
          driver: expense.driverId,
          totalExpense: 0,
          totalFuel: 0,
          totalDistance: 0,
          avgMileage: 0
        };
      }
      byDriver[driverId].totalExpense += expense.fuelDetails.totalAmount;
      byDriver[driverId].totalFuel += expense.fuelDetails.quantity;
      byDriver[driverId].totalDistance += expense.mileageData?.distanceCovered || 0;
      
      if (byDriver[driverId].totalFuel > 0) {
        byDriver[driverId].avgMileage = 
          (byDriver[driverId].totalDistance / byDriver[driverId].totalFuel).toFixed(2);
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        expenses,
        stats,
        byDriver: Object.values(byDriver)
      }
    });

  } catch (error) {
    console.error('Get Fuel Expense Report Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate fuel expense report'
    });
  }
};

// Driver Performance Reports
exports.getDriverPerformanceReport = async (req, res) => {
  try {
    const { startDate, endDate, driverId } = req.query;

    const query = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (driverId) query.driverId = driverId;

    const deliveries = await Delivery.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$driverId',
          totalDeliveries: { $sum: 1 },
          completedDeliveries: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          onTimeDeliveries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'delivered'] },
                    { $lte: ['$actualDeliveryTime', '$scheduledDeliveryTime'] }
                  ]
                },
                1,
                0
              ]
            }
          },
          delayedDeliveries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'delivered'] },
                    { $gt: ['$actualDeliveryTime', '$scheduledDeliveryTime'] }
                  ]
                },
                1,
                0
              ]
            }
          },
          totalDistance: { $sum: '$actualDistance' },
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    // Populate driver details and calculate metrics
    for (let report of deliveries) {
      const driver = await Driver.findById(report._id).populate('userId', 'name phone');
      report.driver = driver;
      
      report.completionRate = report.totalDeliveries > 0
        ? ((report.completedDeliveries / report.totalDeliveries) * 100).toFixed(2)
        : 0;
      
      report.onTimeRate = report.completedDeliveries > 0
        ? ((report.onTimeDeliveries / report.completedDeliveries) * 100).toFixed(2)
        : 0;

      // Calculate performance score (0-100)
      const completionWeight = 0.4;
      const onTimeWeight = 0.4;
      const ratingWeight = 0.2;

      report.performanceScore = (
        (parseFloat(report.completionRate) * completionWeight) +
        (parseFloat(report.onTimeRate) * onTimeWeight) +
        ((report.avgRating || 0) * 20 * ratingWeight)
      ).toFixed(2);
    }

    // Sort by performance score
    deliveries.sort((a, b) => b.performanceScore - a.performanceScore);

    return res.status(200).json({
      success: true,
      data: { driverPerformance: deliveries }
    });

  } catch (error) {
    console.error('Get Driver Performance Report Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate driver performance report'
    });
  }
};

// On-time vs Delayed Deliveries
exports.getOnTimeDelayedReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = { status: 'delivered' };
    if (startDate && endDate) {
      query.actualDeliveryTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const deliveries = await Delivery.find(query);

    const onTime = deliveries.filter(d => 
      new Date(d.actualDeliveryTime) <= new Date(d.scheduledDeliveryTime)
    );

    const delayed = deliveries.filter(d => 
      new Date(d.actualDeliveryTime) > new Date(d.scheduledDeliveryTime)
    );

    // Calculate average delay
    let totalDelay = 0;
    delayed.forEach(d => {
      const delay = (new Date(d.actualDeliveryTime) - new Date(d.scheduledDeliveryTime)) / (1000 * 60);
      totalDelay += delay;
    });

    const stats = {
      total: deliveries.length,
      onTime: onTime.length,
      delayed: delayed.length,
      onTimePercentage: deliveries.length > 0 
        ? ((onTime.length / deliveries.length) * 100).toFixed(2)
        : 0,
      avgDelayMinutes: delayed.length > 0 
        ? Math.round(totalDelay / delayed.length)
        : 0
    };

    return res.status(200).json({
      success: true,
      data: {
        stats,
        onTimeDeliveries: onTime,
        delayedDeliveries: delayed
      }
    });

  } catch (error) {
    console.error('Get OnTime/Delayed Report Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate on-time/delayed report'
    });
  }
};

// Customer Order Distribution by Region
exports.getRegionDistributionReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const deliveries = await Delivery.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$deliveryLocation.region',
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          totalValue: { $sum: '$packageDetails.value' }
        }
      },
      { $sort: { totalOrders: -1 } }
    ]);

    return res.status(200).json({
      success: true,
      data: { regionDistribution: deliveries }
    });

  } catch (error) {
    console.error('Get Region Distribution Report Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate region distribution report'
    });
  }
};

// Export to Excel
exports.exportToExcel = async (req, res) => {
  try {
    const { reportType, ...filters } = req.query;

    // Get report data based on type
    let data;
    switch(reportType) {
      case 'delivery':
        data = await this.getDeliveryReportData(filters);
        break;
      case 'driver_performance':
        data = await this.getDriverPerformanceData(filters);
        break;
      // Add more cases
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // Add headers
    worksheet.columns = data.headers;

    // Add rows
    data.rows.forEach(row => {
      worksheet.addRow(row);
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF667eea' }
    };

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=report_${Date.now()}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export to Excel Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to export to Excel'
    });
  }
};

// Export to PDF
exports.exportToPDF = async (req, res) => {
  try {
    const { reportType, ...filters } = req.query;

    // Create PDF document
    const doc = new PDFDocument();

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=report_${Date.now()}.pdf`
    );

    doc.pipe(res);

    // Add content
    doc.fontSize(20).text('Delivery Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown();

    // Add report data
    // ... (add your report data here)

    doc.end();

  } catch (error) {
    console.error('Export to PDF Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to export to PDF'
    });
  }
};

// Helper: Group by period
exports.groupByPeriod = (data, period) => {
  // Implementation for grouping data by daily/weekly/monthly
  return data;
};

module.exports = exports;