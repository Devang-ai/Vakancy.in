const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { sendEmployerEnquiryConfirmationEmail, sendInternalEnquiryAlertEmail } = require('../services/emailService');

// Submit Public / Guest Contact or Executive Service Enquiry
const submitContactEnquiry = async (req, res) => {
  try {
    const {
      name, email, phone, company, company_name, subject, category,
      message, openings, openings_count, location, source: bodySource, enquiry_source, source_type,
      website, bot_trap, _hp // Honeypot anti-spam fields
    } = req.body;

    // Honeypot spam check - bots fill hidden inputs
    if (website || bot_trap || _hp) {
      return res.status(400).json({ success: false, message: 'Invalid submission detected.' });
    }

    const explicitSource = enquiry_source || bodySource || source_type;
    const finalCompanyName = company_name || company;

    // 1. Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 100) {
      return res.status(400).json({ success: false, message: 'Name must be between 2 and 100 characters.' });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (phone && typeof phone === 'string' && phone.trim()) {
      const cleanPhone = phone.trim();
      if (cleanPhone.length > 30) {
        return res.status(400).json({ success: false, message: 'Phone number cannot exceed 30 characters.' });
      }
    }

    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return res.status(400).json({ success: false, message: 'Subject is required.' });
    }
    const cleanSubject = subject.trim();
    if (cleanSubject.length < 2 || cleanSubject.length > 200) {
      return res.status(400).json({ success: false, message: 'Subject must be between 2 and 200 characters.' });
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }
    const cleanMessage = message.trim();
    if (cleanMessage.length < 10) {
      return res.status(400).json({ success: false, message: 'Message must be at least 10 characters long.' });
    }
    if (cleanMessage.length > 3000) {
      return res.status(400).json({ success: false, message: 'Message cannot exceed 3000 characters.' });
    }

    // Determine enquiry source
    const isExecutive = explicitSource === 'EXECUTIVE_SERVICE' ||
      category === 'EXECUTIVE_SEARCH' ||
      category === 'Executive Search';

    const source = isExecutive ? 'EXECUTIVE_SERVICE' : 'CONTACT_US';
    const enquiryType = isExecutive ? 'Executive Search' : (category || 'General Inquiry');
    const parsedOpenings = parseInt(openings_count || openings, 10) || null;

    // 2. Anti-duplicate submission protection (within last 3 minutes)
    const existingRecent = await db.query(`
      SELECT id, created_at FROM EMPLOYER_ENQUIRY 
      WHERE contact_email = ? AND subject = ? 
        AND created_at >= NOW() - INTERVAL 3 MINUTE
      LIMIT 1
    `, [cleanEmail, cleanSubject]);

    if (existingRecent && existingRecent.length > 0) {
      return res.status(429).json({
        success: false,
        message: 'A similar enquiry has already been submitted recently. Our recruitment team is currently reviewing it.',
        reference: `REQ-EXISTING`
      });
    }

    const id = uuidv4();
    const ticketRef = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;

    // Check if caller can be linked to an existing employer
    let linkedEmployerId = null;
    if (req.user && (req.user.employer_id || req.user.employerId)) {
      linkedEmployerId = req.user.employer_id || req.user.employerId;
    } else {
      const existingEmployers = await db.query(
        'SELECT id FROM EMPLOYERS WHERE LOWER(official_email) = ? OR LOWER(contact_email) = ? LIMIT 1',
        [cleanEmail, cleanEmail]
      );
      if (existingEmployers && existingEmployers.length > 0) {
        linkedEmployerId = existingEmployers[0].id;
      }
    }

    // 3. Persist cleanly in EMPLOYER_ENQUIRY
    await db.query(`
      INSERT INTO EMPLOYER_ENQUIRY (
        id, employer_id, job_id, application_id, enquiry_type,
        contact_name, contact_email, contact_phone, company_name,
        subject, openings_count, location, message, source, status
      ) VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW')
    `, [
      id,
      linkedEmployerId,
      enquiryType,
      cleanName,
      cleanEmail,
      phone ? phone.trim() : null,
      finalCompanyName ? finalCompanyName.trim() : null,
      cleanSubject,
      parsedOpenings,
      location ? location.trim() : null,
      cleanMessage,
      source
    ]);

    // 4. Log enquiry intake in RECRUITMENT_ACTIVITY (if logged in staff)
    if (req.user?.id) {
      try {
        await db.query(`
          INSERT INTO RECRUITMENT_ACTIVITY (
            id, performed_by, action_type, entity_type, entity_id,
            related_enquiry_id, description, created_at
          ) VALUES (?, ?, 'CREATE_ENQUIRY', 'ENQUIRY', ?, ?, ?, NOW())
        `, [
          uuidv4(),
          req.user.id,
          id,
          id,
          `New ${enquiryType} logged: "${cleanSubject}" from ${finalCompanyName || cleanName} (${cleanEmail})`
        ]);
      } catch (logErr) {
        console.warn('Could not log enquiry activity:', logErr.message);
      }
    }

    // 5. Notify Platform Admins and Directors in NOTIFICATION table
    try {
      const adminUsers = await db.query(
        "SELECT id FROM USERS WHERE role IN ('director', 'main_admin', 'admin') OR is_main_admin = 1"
      );
      for (const admin of adminUsers) {
        await db.query(`
          INSERT INTO NOTIFICATION (id, user_id, type, title, message, reference_type, reference_id, is_read)
          VALUES (?, ?, 'contact_enquiry', ?, ?, 'EMPLOYER_ENQUIRY', ?, 0)
        `, [
          uuidv4(),
          admin.id,
          `New Contact Enquiry: ${cleanSubject}`,
          `New message from ${cleanName} (${cleanEmail}): "${cleanSubject}"`,
          id
        ]);
      }
    } catch (notifErr) {
      console.warn('Could not create admin notification for enquiry:', notifErr.message);
    }

    // 6. Send transactional confirmation emails asynchronously
    const submittedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    Promise.allSettled([
      sendEmployerEnquiryConfirmationEmail(cleanEmail, { enquiryRef: ticketRef, jobTitle: cleanSubject, enquiryType, message: cleanMessage, submittedAt }),
      sendInternalEnquiryAlertEmail({ enquiryRef: ticketRef, employerName: finalCompanyName || cleanName, employerEmail: cleanEmail, jobTitle: cleanSubject, enquiryType, message: cleanMessage, submittedAt })
    ]).catch(e => console.warn('Enquiry email error:', e.message));

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
        subject: cleanSubject,
        name: cleanName,
        email: cleanEmail,
        company: finalCompanyName ? finalCompanyName.trim() : null,
        status: 'NEW'
      }
    });
  } catch (error) {
    console.error('submitContactEnquiry error:', error);
    // Never expose raw database errors or stack traces to visitors
    res.status(500).json({
      success: false,
      message: 'Failed to submit enquiry. Please verify your details and try again.'
    });
  }
};

module.exports = {
  submitContactEnquiry
};
