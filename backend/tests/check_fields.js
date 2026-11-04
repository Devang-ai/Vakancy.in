const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/employer/EmployerCompanyProfilePage.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('id="field-') || l.includes('id=\'field-')) {
    console.log(i + 1, l.trim());
  }
});

