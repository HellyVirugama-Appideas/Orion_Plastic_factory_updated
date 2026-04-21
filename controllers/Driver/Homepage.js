const Vehicle = require('../../models/Vehicle');
const Driver = require('../../models/Driver');

// exports.getVehicle = async (req, res) => {
//   try {
//     const driverId = req.user.id || req.user._id;

//     const driver = await Driver.findById(driverId).select("name mobile vehicleNumber");

//     if (!driver) {
//       return res.status(404).json({
//         success: false,
//         message: "Driver not found",
//       });
//     }

//     // Fetch admin-assigned vehicle – relaxed filters
//     const assignedVehicle = await Vehicle.findOne({
//       assignedTo: driverId,  
//     })
//       .select('vehicleNumber registrationNumber model vehicleType status assignedAt')
//       .populate('assignedTo', 'name phone');

//     if (!assignedVehicle) {
//       return res.status(200).json({
//         success: true,
//         message: "No vehicle currently assigned by admin",
//         data: {
//           driverId: driver._id,
//           name: driver.name,
//           mobile: driver.mobile,
//           vehicleNumber: null,
//         }
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Assigned vehicle found",
//       data: {
//         driverId: driver._id,
//         name: driver.name,
//         mobile: driver.mobile,
//         vehicleNumber: assignedVehicle.vehicleNumber,
//         model : assignedVehicle.model,
//         registrationNumber: assignedVehicle.registrationNumber,
//         vehicleType: assignedVehicle.vehicleType,
//         status: assignedVehicle.status,
//         assignedAt: assignedVehicle.assignedAt
//       }
//     });

//   } catch (error) {
//     console.error('Get Vehicle Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: error.message || "Server error",
//     });
//   }
// };


exports.getVehicle = async (req, res) => {
  try {
    const driverId = req.user.id || req.user._id;

    // Driver ka basic info + uska khud ka vehicleNumber
    const driver = await Driver.findById(driverId).select("name mobile vehicleNumber");

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    let vehicleData = null;
    let source = "none"; // debugging ke liye optional

    // Pehle check karo admin ne kuch assign kiya hai ya nahi
    const assignedVehicle = await Vehicle.findOne({
      assignedTo: driverId,
    })
      .select('vehicleNumber model vehicleType status assignedAt')
      .populate('assignedTo', 'name phone');

    if (assignedVehicle) {
      // Admin ne assign kiya hai → priority yahi
      vehicleData = {
        vehicleNumber: assignedVehicle.vehicleNumber,
        model: assignedVehicle.model,
        vehicleType: assignedVehicle.vehicleType,
        status: assignedVehicle.status,
        assignedAt: assignedVehicle.assignedAt,
      };
      source = "admin-assigned";
    } 
    // Admin ne assign nahi kiya, lekin driver ne khud ka vehicle number daala hai
    else if (driver.vehicleNumber) {
      // Driver ke model mein saved vehicle number se Vehicle document dhoondho
      const selfVehicle = await Vehicle.findOne({
        vehicleNumber: driver.vehicleNumber,
      }).select('vehicleNumber model vehicleType status');

      if (selfVehicle) {
        vehicleData = {
          vehicleNumber: selfVehicle.vehicleNumber,
          model: selfVehicle.model,
          vehicleType: selfVehicle.vehicleType || null,
          status: selfVehicle.status || "active",
        };
        source = "driver-self-registered";
      } else {
        // vehicleNumber to driver ke paas hai, lekin Vehicle collection mein nahi mila
        vehicleData = {
          vehicleNumber: driver.vehicleNumber,
          model: null,
          vehicleType: null,
          status: "pending-verification", // ya jo bhi suitable ho
        };
        source = "driver-entered-but-not-found";
      }
    }

    // Final response
    return res.status(200).json({
      success: true,
      message: vehicleData 
        ? "Vehicle information found" 
        : "No vehicle assigned or registered",
      data: {
        driverId: driver._id,
        name: driver.name,
        mobile: driver.mobile,
        vehicle: vehicleData || {
          vehicleNumber: null,
          model: null,
          vehicleType: null,
          status: null,
        },
        // optional: source  // debugging ke liye frontend mein dikhana chahte ho to rakh sakte ho
      }
    });

  } catch (error) {
    console.error('Get Vehicle Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};
