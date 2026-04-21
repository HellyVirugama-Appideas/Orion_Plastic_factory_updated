const createError = require('http-errors');
const faqModel = require('../../models/faqModel');
const pageModel = require('../../models/pageModel');
const contactModel = require('../../models/contactModel');

// Terms & Conditions (sirf English)
exports.termCondition = async (req, res, next) => {
    try {
        const page = await pageModel
            .findOne({ key: 'term' })
            .select('title content -_id');  

        if (!page) {
            return next(createError(404, 'Terms & Conditions not found'));
        }

        res.json({
            success: true,
            message: 'Terms & Conditions fetched successfully',
            data: page
        });
    } catch (error) {
        next(error);
    }
};

exports.privacyPolicy = async (req, res, next) => {
    try {
        const page = await pageModel
            .findOne({ key: 'privacy' })
            .select('title content -_id');

        if (!page) {
            return next(createError(404, 'Privacy Policy not found'));
        }

        res.json({
            success: true,
            message: 'Privacy Policy fetched successfully',
            data: page
        });
    } catch (error) {
        next(error);
    }
};

exports.faq = async (req, res, next) => {
    try {
        const contact = await contactModel
            .findOne()
            .select('email -_id');

        // All FAQs
        const faqs = await faqModel
            .find()
            .select('question answer -_id')
            .sort({ order: 1, createdAt: -1 }); 

        if (!contact) {
            return next(createError(404, 'Contact information not found'));
        }

        res.json({
            success: true,
            message: 'FAQs fetched successfully',
            data: {
                email: contact.email,
                faqs: faqs
            }
        });
    } catch (error) {
        next(error);
    }
};