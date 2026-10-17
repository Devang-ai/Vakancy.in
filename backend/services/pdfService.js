const PDFDocument = require('pdfkit');

/**
 * Generates an ATS-friendly, clean single-column PDF resume buffer.
 */
function createResumePdfBuffer(resumeData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 36, bottom: 36, left: 40, right: 40 },
        info: {
          Title: `${resumeData.name || 'Candidate'} - Resume`,
          Author: resumeData.name || 'Candidate',
          Subject: 'ATS-Friendly Professional Resume'
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', (err) => {
        reject(err);
      });

      // Palette: Clean professional charcoal & navy
      const primaryColor = '#0b1c30';
      const secondaryColor = '#00288e';
      const bodyColor = '#222933';
      const mutedColor = '#555e6d';
      const dividerColor = '#cbd5e1';

      const pageWidth = doc.page.width;
      const startX = 40;
      const endX = pageWidth - 40;
      const contentWidth = endX - startX;

      // 1. CANDIDATE NAME (Header)
      doc.fontSize(22)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text(resumeData.name || 'Candidate Name', { align: 'center' });

      // 2. PROFESSIONAL HEADLINE
      if (resumeData.headline) {
        doc.moveDown(0.2);
        doc.fontSize(12)
           .font('Helvetica')
           .fillColor(secondaryColor)
           .text(resumeData.headline, { align: 'center' });
      }

      // 3. CONTACT BAR
      doc.moveDown(0.3);
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(mutedColor);

      const contactItems = [];
      if (resumeData.contact?.location) contactItems.push({ text: resumeData.contact.location });
      if (resumeData.contact?.phone) contactItems.push({ text: resumeData.contact.phone });
      if (resumeData.contact?.email) contactItems.push({ text: resumeData.contact.email, link: `mailto:${resumeData.contact.email}` });
      
      const linkMap = {
        'LinkedIn': resumeData.contact?.links?.find(l => String(l).toLowerCase().includes('linkedin')),
        'Portfolio': resumeData.contact?.links?.find(l => String(l).toLowerCase().includes('portfolio') || String(l).toLowerCase().includes('devang')),
        'GitHub': resumeData.contact?.links?.find(l => String(l).toLowerCase().includes('github'))
      };

      if (linkMap['LinkedIn']) contactItems.push({ text: 'LinkedIn', link: linkMap['LinkedIn'] });
      if (linkMap['Portfolio']) contactItems.push({ text: 'Portfolio', link: linkMap['Portfolio'] });
      if (linkMap['GitHub']) contactItems.push({ text: 'GitHub', link: linkMap['GitHub'] });

      if (contactItems.length > 0) {
        // Just render them centered as plain text to ensure alignment, viewers will auto-link
        const contactText = contactItems.map(i => i.text).join('  |  ');
        doc.text(contactText, { align: 'center' });
      }

      // Divider line
      doc.moveDown(0.4);
      let yLine = doc.y;
      doc.strokeColor(dividerColor)
         .lineWidth(0.75)
         .moveTo(startX, yLine)
         .lineTo(endX, yLine)
         .stroke();
      doc.moveDown(0.4);

      const renderSectionHeading = (title) => {
        doc.moveDown(0.5);
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor(secondaryColor)
           .text(title.toUpperCase());
        
        const yDivider = doc.y + 2;
        doc.strokeColor(dividerColor)
           .lineWidth(0.5)
           .moveTo(startX, yDivider)
           .lineTo(endX, yDivider)
           .stroke();
        
        // Ensure y is advanced properly after drawing
        doc.y = yDivider + 4;
        doc.moveDown(0.2);
      };

      // 4. PROFESSIONAL SUMMARY
      if (resumeData.summary) {
        renderSectionHeading('Professional Summary');
        doc.fontSize(9.5)
           .font('Helvetica')
           .fillColor(bodyColor)
           .text(resumeData.summary, { align: 'justify', lineGap: 2 });
      }

      // 5. WORK EXPERIENCE
      if (Array.isArray(resumeData.experience) && resumeData.experience.length > 0) {
        renderSectionHeading('Work Experience');
        resumeData.experience.forEach((exp) => {
          doc.moveDown(0.3);
          
          const yBefore = doc.y;
          
          // Role & Company line
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .fillColor(primaryColor)
             .text(exp.title || 'Role', { continued: true });
          
          doc.font('Helvetica')
             .fillColor(mutedColor)
             .text(` — ${exp.company || 'Company'}`);

          const yAfter = doc.y;

          if (exp.period) {
            doc.fontSize(9)
               .font('Helvetica')
               .fillColor(mutedColor)
               .text(`(${exp.period})`, startX, yBefore, { align: 'right', width: contentWidth });
          }

          doc.x = startX;
          doc.y = yAfter;

          // Bullet points
          if (Array.isArray(exp.bullets) && exp.bullets.length > 0) {
            doc.moveDown(0.1);
            doc.fontSize(9.5)
               .font('Helvetica')
               .fillColor(bodyColor)
               .list(exp.bullets, {
                 bulletRadius: 1.5,
                 textIndent: 12,
                 bulletIndent: 4,
                 lineGap: 2
               });
          }
        });
      }

      // 6. PROJECTS
      if (Array.isArray(resumeData.projects) && resumeData.projects.length > 0) {
        renderSectionHeading('Projects');
        resumeData.projects.forEach((proj) => {
          doc.moveDown(0.3);
          
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .fillColor(primaryColor)
             .text(proj.name || 'Project Name', { continued: true });

          if (proj.role) {
            doc.font('Helvetica')
               .fillColor(mutedColor)
               .text(` | ${proj.role}`);
          } else {
            doc.text('');
          }

          if (proj.technologies && (Array.isArray(proj.technologies) ? proj.technologies.length > 0 : proj.technologies)) {
            const techs = Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies;
            doc.moveDown(0.1);
            doc.fontSize(9)
               .font('Helvetica-Oblique')
               .fillColor(mutedColor)
               .text(`[Tech: ${techs}]`);
          }

          if (Array.isArray(proj.bullets) && proj.bullets.length > 0) {
            doc.moveDown(0.1);
            doc.fontSize(9.5)
               .font('Helvetica')
               .fillColor(bodyColor)
               .list(proj.bullets, {
                 bulletRadius: 1.5,
                 textIndent: 12,
                 bulletIndent: 4,
                 lineGap: 2
               });
          } else if (proj.description) {
            doc.moveDown(0.1);
            doc.fontSize(9.5)
               .font('Helvetica')
               .fillColor(bodyColor)
               .text(proj.description, { lineGap: 2 });
          }
        });
      }

      // 7. EDUCATION
      if (Array.isArray(resumeData.education) && resumeData.education.length > 0) {
        renderSectionHeading('Education');
        resumeData.education.forEach((edu) => {
          doc.moveDown(0.3);
          
          const yBefore = doc.y;
          
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .fillColor(primaryColor)
             .text(edu.degree || 'Degree', { continued: true });

          doc.font('Helvetica')
             .fillColor(mutedColor)
             .text(` — ${edu.institution || 'Institution'}`);

          const yAfter = doc.y;

          if (edu.year) {
            doc.fontSize(9)
               .font('Helvetica')
               .fillColor(mutedColor)
               .text(`(${edu.year})`, startX, yBefore, { align: 'right', width: contentWidth });
          }
          
          doc.x = startX;
          doc.y = yAfter;

          if (edu.details) {
            doc.moveDown(0.1);
            doc.fontSize(9.5)
               .font('Helvetica')
               .fillColor(bodyColor)
               .text(edu.details, { lineGap: 1.5 });
          }
        });
      }

      // 8. LANGUAGES
      if (Array.isArray(resumeData.languages) && resumeData.languages.length > 0) {
        renderSectionHeading('Languages');
        doc.fontSize(9.5)
           .font('Helvetica')
           .fillColor(bodyColor)
           .text(resumeData.languages.join(', '), { lineGap: 2 });
      }

      // 9. CORE SKILLS (MUST BE LAST)
      if (Array.isArray(resumeData.skills) && resumeData.skills.length > 0) {
        renderSectionHeading('SKILLS');
        doc.fontSize(9.5)
           .font('Helvetica')
           .fillColor(bodyColor)
           .list(resumeData.skills, {
             bulletRadius: 1.5,
             textIndent: 12,
             bulletIndent: 4,
             lineGap: 3
           });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  createResumePdfBuffer
};
