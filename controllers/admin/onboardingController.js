const OnboardingScreen = require('../../models/OnboardingScreen');
const fs = require('fs');
const path = require('path');

// Add or Update Splash / Tutorial
exports.addOrUpdateScreen = async (req, res) => {
  try {
    const { type, title, description, buttonText, buttonColor, order } = req.body;
    const file = req.file;

    if (type === 'splash' && !file) {
      return res.status(400).json({ success: false, message: 'Media file required for splash' });
    }

    if (type === 'splash') {
      // Delete old splash
      await OnboardingScreen.deleteMany({ type: 'splash' });
    }

    const screen = new OnboardingScreen({
      type,
      mediaType: file ? (file.mimetype.startsWith('video') ? 'video' : 'image') : null,
      mediaUrl: file ? `/uploads/onboarding/${file.filename}` : null,
      imageUrl: type === 'tutorial' && file ? `/uploads/onboarding/${file.filename}` : null,
      title: title || null,
      description: description || null,
      buttonText: buttonText || 'Next',
      buttonColor: buttonColor || '#8c8c8cff',
      order: order || 0
    });

    await screen.save();

    // res.status(201).json({
    //   success: true,
    //   message: 'Screen added successfully',
    //   data: screen
    // });

    res.redirect("/admin/onboarding")

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get All Screens 
exports.getAllScreens = async (req, res) => {
  try {
    const splash = await OnboardingScreen.findOne({ type: 'splash' });
    const tutorials = await OnboardingScreen.find({ type: 'tutorial', isActive: true })
      .sort({ order: 1 });

    res.json({
      success: true,
      data: { splash, tutorials }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: List All
exports.getAdminScreens = async (req, res) => {
  try {
    const screens = await OnboardingScreen.find().sort({ type: 1, order: 1 });
    res.json({ success: true, data: screens });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update
// exports.updateScreen = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const updates = req.body;
//     if (req.file) {
//       updates.mediaUrl = `/uploads/onboarding/${req.file.filename}`;
//       updates.imageUrl = updates.mediaUrl;
//       updates.mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
//     }

//     const screen = await OnboardingScreen.findByIdAndUpdate(id, updates, { new: true });
//     res.json({ success: true, data: screen });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// Update Screen + DELETE OLD FILE
exports.updateScreen = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existingScreen = await OnboardingScreen.findById(id);
    if (!existingScreen) {
      return res.status(404).json({ success: false, message: 'Screen not found' });
    }

    if (req.file) {
      const oldFilePath = existingScreen.mediaUrl || existingScreen.imageUrl;
      
      if (oldFilePath) {
        const fullPath = path.join(__dirname, '../../public', oldFilePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log('Old file deleted:', oldFilePath);
        }
      }

      updates.mediaUrl = `/uploads/onboarding/${req.file.filename}`;
      updates.imageUrl = updates.mediaUrl;
      updates.mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
    }

    const screen = await OnboardingScreen.findByIdAndUpdate(id, updates, { new: true });

    // res.json({
    //   success: true,
    //   message: 'Screen updated successfully',
    //   data: screen 
    // });

    res.redirect("/admin/onboarding")

  } catch (error) {
    console.error('Update Screen Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete
exports.deleteScreen = async (req, res) => {
  try {
    const screen = await OnboardingScreen.findByIdAndDelete(req.params.id);
    if (screen?.mediaUrl) {
      fs.unlinkSync(path.join(__dirname, '../../public', screen.mediaUrl));
    }
    // res.json({ success: true, message: 'Deleted' });
    res.redirect("/admin/onboarding")
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

