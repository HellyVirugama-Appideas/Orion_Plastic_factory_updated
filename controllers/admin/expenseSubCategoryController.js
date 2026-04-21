const ExpenseSubCategory = require('../../models/ExpenseSubCategory');

// 1. Get all active sub-categories (driver ke liye dropdown)
exports.getAllSubCategories = async (req, res) => {
  try {
    const subCategories = await ExpenseSubCategory.find({ isActive: true })
      .sort({ order: 1, displayName: 1 })
      .select('name displayName description icon');

    res.status(200).json({
      success: true,
      count: subCategories.length,
      data: subCategories
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. Admin: Create new sub-category
exports.createSubCategory = async (req, res) => {
  try {
    const { name, displayName, description, icon, order = 999 } = req.body;

    if (!name || !displayName) {
      return res.status(400).json({ success: false, message: 'name and displayName required' });
    }

    const existing = await ExpenseSubCategory.findOne({ name: name.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'This name already exists' });
    }

    const subCat = await ExpenseSubCategory.create({
      name: name.toLowerCase().trim(),
      displayName: displayName.trim(),
      description,
      icon,
      order,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: subCat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 3. Admin: Update sub-category
exports.updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const subCat = await ExpenseSubCategory.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

    if (!subCat) return res.status(404).json({ success: false, message: 'Not found' });

    res.status(200).json({ success: true, data: subCat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4. Admin: Deactivate (soft delete)
exports.deactivateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const subCat = await ExpenseSubCategory.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!subCat) return res.status(404).json({ success: false, message: 'Not found' });

    res.status(200).json({ success: true, message: 'Deactivated', data: subCat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};