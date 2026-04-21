const express = require('express');
const router = express.Router();
const categoryController = require('../../controllers/admin/categoryController');
const { protectAdmin, isAdmin, checkPermission } = require('../../middleware/authMiddleware');

// All category routes require 'categories' permission
router.use(protectAdmin, isAdmin, checkPermission('categories', 'read'));

// List all categories + manage page
router.get('/', categoryController.getAllCategories);

// Create new category
router.post('/create', checkPermission('categories', 'create'), categoryController.createCategory);

// Update category
router.post('/:categoryId/update', checkPermission('categories', 'update'), categoryController.updateCategory);

// Delete category
router.post('/:categoryId/delete', checkPermission('categories', 'delete'), categoryController.deleteCategory);

module.exports = router;