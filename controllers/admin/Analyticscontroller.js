const Delivery = require('../../models/Delivery');
const Driver = require('../../models/Driver');
const Expense = require('../../models/Expense');
const TrackingLog = require('../../models/TrackingLog');

// ==================== ANALYTICS CONTROLLER ====================

// Fuel Consumption vs Distance
exports.getFuelAnalytics = async (req, res) => {
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

    const expenses = await Expense.find(query).populate('driverId', 'vehicleNumber vehicleType');

    // Calculate analytics
    const analytics = {
      totalFuelConsumed: 0,
      totalDistance: 0,
      totalCost: 0,
      avgMileage: 0,
      byVehicleType: {},
      trend: [],
      efficiency: {
        best: null,
        worst: null,
        average: 0
      }
    };

    // Group by vehicle type
    expenses.forEach(expense => {
      const vehicleType = expense.driverId?.vehicleType || 'unknown';
      const fuelConsumed = expense.fuelDetails?.quantity || 0;
      const distance = expense.mileageData?.distanceCovered || 0;
      const cost = expense.fuelDetails?.totalAmount || 0;

      analytics.totalFuelConsumed += fuelConsumed;
      analytics.totalDistance += distance;
      analytics.totalCost += cost;

      if (!analytics.byVehicleType[vehicleType]) {
        analytics.byVehicleType[vehicleType] = {
          totalFuel: 0,
          totalDistance: 0,
          totalCost: 0,
          avgMileage: 0,
          count: 0
        };
      }

      analytics.byVehicleType[vehicleType].totalFuel += fuelConsumed;
      analytics.byVehicleType[vehicleType].totalDistance += distance;
      analytics.byVehicleType[vehicleType].totalCost += cost;
      analytics.byVehicleType[vehicleType].count += 1;
    });

    // Calculate average mileage
    if (analytics.totalFuelConsumed > 0) {
      analytics.avgMileage = (analytics.totalDistance / analytics.totalFuelConsumed).toFixed(2);
    }

    // Calculate mileage by vehicle type
    Object.keys(analytics.byVehicleType).forEach(type => {
      const data = analytics.byVehicleType[type];
      if (data.totalFuel > 0) {
        data.avgMileage = (data.totalDistance / data.totalFuel).toFixed(2);
      }
    });

    // Find best and worst efficiency
    const efficiencies = expenses
      .filter(e => e.mileageData?.averageMileage > 0)
      .map(e => ({
        driverId: e.driverId._id,
        vehicleNumber: e.driverId.vehicleNumber,
        mileage: e.mileageData.averageMileage
      }))
      .sort((a, b) => b.mileage - a.mileage);

    if (efficiencies.length > 0) {
      analytics.efficiency.best = efficiencies[0];
      analytics.efficiency.worst = efficiencies[efficiencies.length - 1];
      analytics.efficiency.average = (
        efficiencies.reduce((sum, e) => sum + e.mileage, 0) / efficiencies.length
      ).toFixed(2);
    }

    // Calculate monthly trend
    const monthlyData = {};
    expenses.forEach(expense => {
      const month = new Date(expense.expenseDate).toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          fuel: 0,
          distance: 0,
          cost: 0,
          mileage: 0
        };
      }
      monthlyData[month].fuel += expense.fuelDetails?.quantity || 0;
      monthlyData[month].distance += expense.mileageData?.distanceCovered || 0;
      monthlyData[month].cost += expense.fuelDetails?.totalAmount || 0;
    });

    // Calculate mileage for each month
    Object.values(monthlyData).forEach(data => {
      if (data.fuel > 0) {
        data.mileage = (data.distance / data.fuel).toFixed(2);
      }
    });

    analytics.trend = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    return res.status(200).json({
      success: true,
      data: { analytics }
    });

  } catch (error) {
    console.error('Get Fuel Analytics Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get fuel analytics'
    });
  }
};

// Delivery Punctuality Metrics
exports.getPunctualityMetrics = async (req, res) => {
  try {
    const { startDate, endDate, driverId } = req.query;

    const query = { status: 'delivered' };
    if (startDate && endDate) {
      query.actualDeliveryTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (driverId) query.driverId = driverId;

    const deliveries = await Delivery.find(query).populate('driverId', 'userId vehicleNumber');

    // Calculate metrics
    const metrics = {
      total: deliveries.length,
      onTime: 0,
      delayed: 0,
      early: 0,
      punctualityRate: 0,
      avgDelayMinutes: 0,
      avgEarlyMinutes: 0,
      byDriver: {},
      delayReasons: {},
      timeSlotAnalysis: {
        morning: { total: 0, onTime: 0 },    // 6am - 12pm
        afternoon: { total: 0, onTime: 0 },  // 12pm - 6pm
        evening: { total: 0, onTime: 0 }     // 6pm - 12am
      }
    };

    let totalDelayMinutes = 0;
    let totalEarlyMinutes = 0;

    deliveries.forEach(delivery => {
      const scheduled = new Date(delivery.scheduledDeliveryTime);
      const actual = new Date(delivery.actualDeliveryTime);
      const diffMinutes = (actual - scheduled) / (1000 * 60);

      // Time slot analysis
      const hour = scheduled.getHours();
      let slot;
      if (hour >= 6 && hour < 12) slot = 'morning';
      else if (hour >= 12 && hour < 18) slot = 'afternoon';
      else slot = 'evening';

      metrics.timeSlotAnalysis[slot].total++;

      if (diffMinutes <= 0) {
        metrics.onTime++;
        metrics.timeSlotAnalysis[slot].onTime++;
        if (diffMinutes < 0) {
          metrics.early++;
          totalEarlyMinutes += Math.abs(diffMinutes);
        }
      } else {
        metrics.delayed++;
        totalDelayMinutes += diffMinutes;

        // Track delay reasons
        const reason = delivery.delayReason || 'unknown';
        metrics.delayReasons[reason] = (metrics.delayReasons[reason] || 0) + 1;
      }

      // By driver
      const driverId = delivery.driverId?._id.toString();
      if (driverId) {
        if (!metrics.byDriver[driverId]) {
          metrics.byDriver[driverId] = {
            driver: delivery.driverId,
            total: 0,
            onTime: 0,
            delayed: 0,
            punctualityRate: 0
          };
        }
        metrics.byDriver[driverId].total++;
        if (diffMinutes <= 0) {
          metrics.byDriver[driverId].onTime++;
        } else {
          metrics.byDriver[driverId].delayed++;
        }
      }
    });

    // Calculate rates
    if (metrics.total > 0) {
      metrics.punctualityRate = ((metrics.onTime / metrics.total) * 100).toFixed(2);
    }

    if (metrics.delayed > 0) {
      metrics.avgDelayMinutes = Math.round(totalDelayMinutes / metrics.delayed);
    }

    if (metrics.early > 0) {
      metrics.avgEarlyMinutes = Math.round(totalEarlyMinutes / metrics.early);
    }

    // Calculate punctuality rate by driver
    Object.values(metrics.byDriver).forEach(driver => {
      if (driver.total > 0) {
        driver.punctualityRate = ((driver.onTime / driver.total) * 100).toFixed(2);
      }
    });

    // Calculate time slot punctuality rates
    Object.keys(metrics.timeSlotAnalysis).forEach(slot => {
      const data = metrics.timeSlotAnalysis[slot];
      data.punctualityRate = data.total > 0 
        ? ((data.onTime / data.total) * 100).toFixed(2)
        : 0;
    });

    return res.status(200).json({
      success: true,
      data: { metrics }
    });

  } catch (error) {
    console.error('Get Punctuality Metrics Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get punctuality metrics'
    });
  }
};

// Driver Performance Scoring
exports.getDriverPerformanceScore = async (req, res) => {
  try {
    const { driverId, startDate, endDate } = req.query;

    const query = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (driverId) query.driverId = driverId;

    const deliveries = await Delivery.find(query);
    const expenses = await Expense.find({
      driverId: query.driverId,
      expenseDate: query.createdAt
    });

    // Calculate performance score (0-100)
    const scoring = {
      completionRate: { weight: 0.25, score: 0 },
      punctualityRate: { weight: 0.25, score: 0 },
      customerRating: { weight: 0.20, score: 0 },
      fuelEfficiency: { weight: 0.15, score: 0 },
      acceptanceRate: { weight: 0.15, score: 0 },
      totalScore: 0
    };

    // 1. Completion Rate
    const completed = deliveries.filter(d => d.status === 'delivered').length;
    scoring.completionRate.score = deliveries.length > 0
      ? (completed / deliveries.length) * 100
      : 0;

    // 2. Punctuality Rate
    const onTime = deliveries.filter(d => 
      d.status === 'delivered' && 
      new Date(d.actualDeliveryTime) <= new Date(d.scheduledDeliveryTime)
    ).length;
    scoring.punctualityRate.score = completed > 0
      ? (onTime / completed) * 100
      : 0;

    // 3. Customer Rating (1-5 stars to 0-100)
    const rated = deliveries.filter(d => d.rating);
    const avgRating = rated.length > 0
      ? rated.reduce((sum, d) => sum + d.rating, 0) / rated.length
      : 0;
    scoring.customerRating.score = avgRating * 20; // Convert 5 to 100

    // 4. Fuel Efficiency (compare to average)
    const avgMileage = expenses.length > 0
      ? expenses.reduce((sum, e) => sum + (e.mileageData?.averageMileage || 0), 0) / expenses.length
      : 0;
    const vehicleTypeAvg = 12; // TODO: Get from database
    scoring.fuelEfficiency.score = vehicleTypeAvg > 0
      ? Math.min(100, (avgMileage / vehicleTypeAvg) * 100)
      : 0;

    // 5. Acceptance Rate
    const assigned = deliveries.length;
    const accepted = deliveries.filter(d => d.status !== 'cancelled' || d.cancelledBy !== 'driver').length;
    scoring.acceptanceRate.score = assigned > 0
      ? (accepted / assigned) * 100
      : 0;

    // Calculate total score
    scoring.totalScore = Object.values(scoring).reduce((sum, metric) => {
      if (metric.weight) {
        return sum + (metric.score * metric.weight);
      }
      return sum;
    }, 0);

    // Performance level
    let level;
    if (scoring.totalScore >= 90) level = 'Excellent';
    else if (scoring.totalScore >= 75) level = 'Good';
    else if (scoring.totalScore >= 60) level = 'Average';
    else level = 'Needs Improvement';

    return res.status(200).json({
      success: true,
      data: {
        scoring,
        level,
        totalDeliveries: deliveries.length,
        period: { startDate, endDate }
      }
    });

  } catch (error) {
    console.error('Get Driver Performance Score Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate performance score'
    });
  }
};

// KPI Calculations for Dashboard
exports.getDashboardKPIs = async (req, res) => {
  try {
    const { period = 'today' } = req.query;

    // Calculate date range
    let startDate, endDate;
    const now = new Date();
    
    switch(period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        endDate = new Date();
        break;
      case 'month':
        startDate = new Date(now.setDate(1));
        endDate = new Date();
        break;
    }

    const query = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    // Parallel queries for better performance
    const [
      deliveries,
      drivers,
      expenses,
      trackingLogs
    ] = await Promise.all([
      Delivery.find(query),
      Driver.find({ isAvailable: true }),
      Expense.find({ ...query, expenseDate: query.createdAt }),
      TrackingLog.find(query)
    ]);

    // Calculate KPIs
    const kpis = {
      deliveries: {
        total: deliveries.length,
        completed: deliveries.filter(d => d.status === 'delivered').length,
        inTransit: deliveries.filter(d => d.status === 'in_transit').length,
        pending: deliveries.filter(d => d.status === 'pending').length,
        completionRate: 0,
        avgDeliveryTime: 0
      },
      drivers: {
        total: drivers.length,
        active: drivers.filter(d => d.isAvailable).length,
        onDelivery: 0
      },
      revenue: {
        total: deliveries.reduce((sum, d) => sum + (d.packageDetails?.value || 0), 0),
        cod: deliveries.filter(d => d.paymentMethod === 'cod').reduce((sum, d) => 
          sum + (d.packageDetails?.value || 0), 0
        ),
        prepaid: deliveries.filter(d => d.paymentMethod === 'prepaid').reduce((sum, d) => 
          sum + (d.packageDetails?.value || 0), 0
        )
      },
      expenses: {
        total: expenses.reduce((sum, e) => sum + (e.fuelDetails?.totalAmount || 0), 0),
        fuel: expenses.filter(e => e.expenseType === 'fuel').reduce((sum, e) => 
          sum + (e.fuelDetails?.totalAmount || 0), 0
        )
      },
      efficiency: {
        avgMileage: 0,
        punctualityRate: 0,
        totalDistance: trackingLogs.length > 0 ? calculateTotalDistance(trackingLogs) : 0
      }
    };

    // Calculate completion rate
    if (kpis.deliveries.total > 0) {
      kpis.deliveries.completionRate = 
        ((kpis.deliveries.completed / kpis.deliveries.total) * 100).toFixed(2);
    }

    // Calculate average delivery time
    const completedDeliveries = deliveries.filter(d => 
      d.status === 'delivered' && d.actualDeliveryTime
    );
    if (completedDeliveries.length > 0) {
      const totalTime = completedDeliveries.reduce((sum, d) => {
        const time = (new Date(d.actualDeliveryTime) - new Date(d.createdAt)) / (1000 * 60);
        return sum + time;
      }, 0);
      kpis.deliveries.avgDeliveryTime = Math.round(totalTime / completedDeliveries.length);
    }

    // Calculate average mileage
    if (expenses.length > 0) {
      const totalMileage = expenses.reduce((sum, e) => 
        sum + (e.mileageData?.averageMileage || 0), 0
      );
      kpis.efficiency.avgMileage = (totalMileage / expenses.length).toFixed(2);
    }

    // Calculate punctuality rate
    const onTime = completedDeliveries.filter(d => 
      new Date(d.actualDeliveryTime) <= new Date(d.scheduledDeliveryTime)
    ).length;
    if (completedDeliveries.length > 0) {
      kpis.efficiency.punctualityRate = 
        ((onTime / completedDeliveries.length) * 100).toFixed(2);
    }

    return res.status(200).json({
      success: true,
      data: {
        kpis,
        period,
        dateRange: { startDate, endDate }
      }
    });

  } catch (error) {
    console.error('Get Dashboard KPIs Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate KPIs'
    });
  }
};

// Helper function
function calculateTotalDistance(trackingLogs) {
  let totalDistance = 0;
  for (let i = 1; i < trackingLogs.length; i++) {
    const prev = trackingLogs[i - 1];
    const curr = trackingLogs[i];
    // Calculate distance using Haversine formula
    // ... implementation
  }
  return totalDistance;
}

module.exports = exports;