const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

// Submit Public / Guest Contact or Executive Service Enquiry
const submitContactEnquiry = async (req, res) => {
  try {
    const {
      name, email, phone, company, company_name, subject, category,
      message, openings, openings_count, location, source: bodySource, enquiry_source, source_type
    } = req.body;

    const explicitSource = enquiry_source || bodySource || source_type;
    const finalCompanyName = company_name || company;

    // 1. Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Contact name is required.' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: 'Inquiry subject or hiring requirement is required.' });
    }

    // Determine enquiry source
    const isExecutive = explicitSource === 'EXECUTIVE_SERVICE' ||
      category === 'EXECUTIVE_SEARCH' ||
      category === 'Executive Search';

    const source = isExecutive ? 'EXECUTIVE_SERVICE' : 'CONTACT_US';
    const enquiryType = isExecutive ? 'Executive Search' : (category || 'General Inquiry');
    const parsedOpenings = parseInt(openings_count || openings) || null;

    // 2. Anti-duplicate submission protection (within last 3 minutes)
    const existingRecent = await db.query(`
      SELECT id, created_at FROM EMPLOYER_ENQUIRY 
      WHERE contact_email = ? AND subject = ? 
        AND created_at >= NOW() - INTERVAL 3 MINUTE
      LIMIT 1
    `, [cleanEmail, subject.trim()]);

    if (existingRecent && existingRecent.length > 0) {
      return res.status(429).json({
        success: false,
        message: 'A similar enquiry has already been submitted recently. Our recruitment team is currently reviewing it.',
        reference: `REQ-EXISTING`
      });
    }

    const id = uuidv4();
    const ticketRef = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
    const finalMessage = message && message.trim()
      ? message.trim()
      : `${enquiryType} submitted for ${subject.trim()}${finalCompanyName ? ' at ' + finalCompanyName.trim() : ''}.`;

    // 3. Persist cleanly in EMPLOYER_ENQUIRY
    await db.query(`
      INSERT INTO EMPLOYER_ENQUIRY (
        id, employer_id, job_id, application_id, enquiry_type,
        contact_name, contact_email, contact_phone, company_name,
        subject, openings_count, location, message, source, status
      ) VALUES (?, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW')
    `, [
      id,
      enquiryType,
      name.trim(),
      cleanEmail,
      phone ? phone.trim() : null,
      finalCompanyName ? finalCompanyName.trim() : null,
      subject.trim(),
      parsedOpenings,
      location ? location.trim() : null,
      finalMessage,
      source
    ]);

    res.status(201).json({
      success: true,
      message: isExecutive
        ? `Executive search mandate received. Reference #${ticketRef}. An executive director will review and contact you.`
        : `Enquiry received. Ticket #${ticketRef} logged. Our team will contact you shortly.`,
      ticket_id: ticketRef,
      enquiry_id: id,
      reference: ticketRef,
      source,
      enquiry_type: enquiryType,
      enquiry: {
        id,
        reference_number: ticketRef,
        source,
        subject: subject.trim(),
        name: name.trim(),
        email: cleanEmail,
        company: company ? company.trim() : null,
        status: 'NEW'
      }
    });
  } catch (error) {
    console.error('submitContactEnquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit enquiry. Please verify your details and try again.',
      error: error.message
    });
  }
};

module.exports = {
  submitContactEnquiry
};
