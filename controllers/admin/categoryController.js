const Category = require('../../models/Category');

// Get all categories (for list page + dropdowns)
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true })
            .sort({ displayOrder: 1, name: 1 })
            .lean();

        res.render('categories', {
            title: 'Manage Categories',
            categories,
            messages: req.flash(),
            admin: req.user,
            url: req.originalUrl
        });
    } catch (error) {
        console.error('Get Categories Error:', error);
        req.flash('error', 'Failed to load categories');
        res.redirect('/admin/dashboard');
    }
};

// Create new category
exports.createCategory = async (req, res) => {
    try {
        const { name, description, icon, displayOrder } = req.body;

        if (!name) {
            req.flash('error', 'Category name is required');
            return res.redirect('/admin/categories');
        }

        const existing = await Category.findOne({ name: name.trim() });
        if (existing) {
            req.flash('error', 'Category name already exists');
            return res.redirect('/admin/categories');
        }

        await Category.create({
            name: name.trim(),
            description: description?.trim() || '',
            icon: icon?.trim() || 'category',
            displayOrder: parseInt(displayOrder) || 0
        });

        req.flash('success', 'Category created successfully');
        res.redirect('/admin/categories');
    } catch (error) {
        console.error('Create Category Error:', error);
        req.flash('error', error.message || 'Failed to create category');
        res.redirect('/admin/categories');
    }
};

// Update category
exports.updateCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { name, description, icon, displayOrder, isActive } = req.body;

        const category = await Category.findById(categoryId);
        if (!category) {
            req.flash('error', 'Category not found');
            return res.redirect('/admin/categories');
        }

        // Check unique name (exclude current)
        if (name && name.trim() !== category.name) {
            const existing = await Category.findOne({ name: name.trim() });
            if (existing) {
                req.flash('error', 'Category name already exists');
                return res.redirect('/admin/categories');
            }
        }

        category.name = name?.trim() || category.name;
        category.description = description?.trim() || category.description;
        category.icon = icon?.trim() || category.icon;
        category.displayOrder = parseInt(displayOrder) || category.displayOrder;
        category.isActive = isActive === 'on' || isActive === true;

        await category.save();

        req.flash('success', 'Category updated successfully');
        res.redirect('/admin/categories');
    } catch (error) {
        console.error('Update Category Error:', error);
        req.flash('error', error.message || 'Failed to update category');
        res.redirect('/admin/categories');
    }
};

// Delete category (only if not used in orders)
exports.deleteCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;

        const category = await Category.findById(categoryId);
        if (!category) {
            req.flash('error', 'Category not found');
            return res.redirect('/admin/categories');
        }

        // Optional: Check if category is used in any order
        const Order = require('../../models/Order');
        const usedCount = await Order.countDocuments({ 'items.category': category.name });
        if (usedCount > 0) {
            req.flash('error', `Cannot delete: Category is used in ${usedCount} orders`);
            return res.redirect('/admin/categories');
        }

        await Category.findByIdAndDelete(categoryId);

        req.flash('success', 'Category deleted successfully');
        res.redirect('/admin/categories');
    } catch (error) {
        console.error('Delete Category Error:', error);
        req.flash('error', 'Failed to delete category');
        res.redirect('/admin/categories');
    }
};