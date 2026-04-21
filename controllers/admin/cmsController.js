const Page = require('../../models/pageModel');
const Contact = require('../../models/contactModel');
const Faq = require('../../models/faqModel');

const getPageByKey = async (key) => {
    let page = await Page.findOne({ key });
    if (!page) {
        page = await Page.create({ key, title: `New ${key} Page`, content: '' });
    }
    return page;
};

exports.getPrivacy = async (req, res) => {
    try {
        const page = await getPageByKey('privacy');
        res.render('privacy', {
            page,
            active: 'privacy',
            title: "Privacy Policy",
            url: req.originalUrl
        });
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/admin');
    }
};

exports.postPrivacy = async (req, res) => {
    try {
        const page = await getPageByKey('privacy');

        page.title = req.body.title?.trim() || page.title;
        page.content = req.body.content || '';

        await page.save();

        req.flash('success', 'Privacy Policy updated successfully');
        res.redirect('/admin/cms/privacy');
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/admin/cms/privacy');
    }
};

exports.getTerms = async (req, res) => {
    try {
        const page = await getPageByKey('term');
        res.render('term', {
            page,
            active: 'terms',
            title: "Terms & Condition",
            url: req.originalUrl
        });
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/admin/dashborad');
    }
};

exports.postTerms = async (req, res) => {
    try {
        const page = await getPageByKey('term');

        page.title = req.body.title?.trim() || page.title;
        page.content = req.body.content || '';

        await page.save();

        req.flash('success', 'Terms & Conditions updated successfully');
        res.redirect('/admin/cms/term');
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/admin/cms/term');
    }
};

// ── FAQ ───────────────────────────────────────────────────────

exports.getAllFaqs = async (req, res) => {
    try {
        const faqs = await Faq.find().sort({ order: 1, createdAt: -1 });
        res.render('faq', {
            faqs,
            active: 'faq',
            title: 'faq',
            url: req.originalUrl
        });
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/admin');
    }
};

exports.getAddFaq = (req, res) => {
    res.render('faq_add', {
        active: 'faq',
        title: "FAQ's Add",
        url: req.originalUrl
    });
};

// POST /admin/cms/faq/add
exports.postAddFaq = async (req, res) => {
    try {
        await Faq.create({
            question: req.body.question?.trim(),
            answer: req.body.answer?.trim(),
        });

        req.flash('success', 'FAQ added successfully');
        res.redirect('/admin/cms/faq');
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/admin/cms/faq/add');
    }
};

exports.getEditFaq = async (req, res) => {
    try {
        const faq = await Faq.findById(req.params.id);
        if (!faq) throw new Error('FAQ not found');

        res.render('faq_edit', {
            faq,
            active: 'faq',
            title: "FAQ's Edit",
            url: req.originalUrl
        });
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/admin/cms/faq');
    }
};

// POST edit example
exports.postEditFaq = async (req, res) => {
    try {
        const faq = await Faq.findById(req.params.id);
        if (!faq) throw new Error('FAQ not found');

        faq.question = req.body.question?.trim() || faq.question;
        faq.answer = req.body.answer?.trim() || faq.answer;

        await faq.save();

        req.flash('success', 'FAQ updated');
        res.redirect('/admin/cms/faq');
    } catch (error) {
        req.flash('error', error.message);
        res.redirect(`/admin/cms/faq/edit/${req.params.id}`);
    }
};

exports.deleteFaq = async (req, res) => {
    try {
        await Faq.findByIdAndDelete(req.params.id);
        req.flash('success', 'FAQ deleted successfully');
        res.redirect('/admin/cms/faq');
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/admin/cms/faq');
    }
};

// ── Contact Us ─────────────────────────────────────────────────

exports.getContact = async (req, res) => {
    try {
        let contact = await Contact.findOne();
        if (!contact) {
            contact = await Contact.create({ email: 'example@domain.com' });
        }
        res.render('contact', {
            contact,
            active: 'contact',
            title: 'contact',
            url: req.originalUrl
        });
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/admin');
    }
};

exports.postContact = async (req, res) => {
    try {
        const contact = await Contact.findOne() || new Contact();

        contact.email = req.body.email?.trim();

        await contact.save();

        req.flash('success', 'Contact information updated successfully');
        res.redirect('/admin/cms/contact');
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/admin/cms/contact');
    }
};
