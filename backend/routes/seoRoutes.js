const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * Escape HTML characters for safe injection into metadata tags
 */
const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * GET /api/seo/job-preview/:id
 * Server-rendered Open Graph HTML page for social crawlers (WhatsApp, Facebook, Twitter, LinkedIn)
 * Automatically redirects human visitors to the frontend SPA route.
 */
router.get('/job-preview/:id', async (req, res) => {
  const { id } = req.params;
  const baseUrl = process.env.FRONTEND_URL || 'https://vakancy.in';
  const targetUrl = `${baseUrl}/jobs/${encodeURIComponent(id)}`;
  const defaultShareImage = `${baseUrl}/assets/brand/vakancy-og-share.png`;

  try {
    let job = null;
    try {
      const [rows] = await db.query(
        'SELECT id, title, company, company_name, description, location, city, state, country, workplaceType, workMode, employmentType, min_salary, max_salary, currency, created_at FROM job WHERE id = ? LIMIT 1',
        [id]
      );
      if (rows && rows.length > 0) {
        job = rows[0];
      }
    } catch (dbErr) {
      console.warn('DB query error in /seo/job-preview/:id:', dbErr.message);
    }

    if (!job) {
      return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Job Opportunity | Vakancy.in</title>
  <meta name="description" content="Explore verified domestic and overseas career opportunities on Vakancy.in.">
  <meta property="og:site_name" content="Vakancy.in">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Job Opportunity | Vakancy.in">
  <meta property="og:description" content="Explore verified domestic and overseas career opportunities on Vakancy.in.">
  <meta property="og:url" content="${escapeHtml(targetUrl)}">
  <meta property="og:image" content="${escapeHtml(defaultShareImage)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta http-equiv="refresh" content="0; url=${escapeHtml(targetUrl)}">
  <script>window.location.replace("${targetUrl}");</script>
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(targetUrl)}">Vakancy.in Job Board</a>...</p>
</body>
</html>`);
    }

    const title = job.title || 'Career Opportunity';
    const company = job.company || job.company_name || 'Vakancy Verified Partner';
    const rawDesc = job.description ? job.description.replace(/\s+/g, ' ').trim() : '';
    const snippet = rawDesc.length > 160 ? `${rawDesc.slice(0, 157)}...` : rawDesc || 'Apply directly on Vakancy.in.';
    const metaTitle = `${title} at ${company} | Vakancy.in`;
    const metaDesc = `Hiring: ${title} at ${company}. ${snippet}`;

    // Schema.org JobPosting structured data
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      'title': title,
      'description': rawDesc || snippet,
      'datePosted': job.created_at || new Date().toISOString(),
      'employmentType': (job.employmentType || 'FULL_TIME').toUpperCase().replace('-', '_'),
      'hiringOrganization': {
        '@type': 'Organization',
        'name': company,
        'sameAs': baseUrl
      },
      'jobLocation': {
        '@type': 'Place',
        'address': {
          '@type': 'PostalAddress',
          'addressLocality': job.location || job.city || 'India',
          'addressCountry': job.country || 'IN'
        }
      }
    };

    if (job.min_salary && job.max_salary) {
      schema.baseSalary = {
        '@type': 'MonetaryAmount',
        'currency': job.currency || 'INR',
        'value': {
          '@type': 'QuantitativeValue',
          'minValue': job.min_salary,
          'maxValue': job.max_salary,
          'unitText': 'YEAR'
        }
      };
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(metaTitle)}</title>
  <meta name="description" content="${escapeHtml(metaDesc)}">
  <link rel="canonical" href="${escapeHtml(targetUrl)}">

  <!-- Open Graph Metadata (WhatsApp, Facebook, LinkedIn) -->
  <meta property="og:site_name" content="Vakancy.in">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${escapeHtml(targetUrl)}">
  <meta property="og:title" content="${escapeHtml(metaTitle)}">
  <meta property="og:description" content="${escapeHtml(metaDesc)}">
  <meta property="og:image" content="${escapeHtml(defaultShareImage)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <!-- Twitter Card Metadata -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(metaTitle)}">
  <meta name="twitter:description" content="${escapeHtml(metaDesc)}">
  <meta name="twitter:image" content="${escapeHtml(defaultShareImage)}">

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
    ${JSON.stringify(schema)}
  </script>

  <!-- Client-side Redirect for human visitors -->
  <meta http-equiv="refresh" content="0; url=${escapeHtml(targetUrl)}">
  <script>
    if (typeof window !== 'undefined') {
      window.location.replace("${targetUrl}");
    }
  </script>
</head>
<body style="font-family: sans-serif; background: #f8f9ff; color: #0f172a; padding: 2rem; text-align: center;">
  <h2>${escapeHtml(title)}</h2>
  <p>${escapeHtml(company)}</p>
  <p>Redirecting to <a href="${escapeHtml(targetUrl)}" style="color: #00288e; font-weight: bold;">application page</a>...</p>
</body>
</html>`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300'); // Cache 5 min
    res.status(200).send(html);
  } catch (err) {
    console.error('Unhandled error in /seo/job-preview/:id:', err);
    res.redirect(302, targetUrl);
  }
});

/**
 * GET /api/seo/sitemap.xml
 * Dynamic XML sitemap of all active jobs for search engines
 */
router.get('/sitemap.xml', async (req, res) => {
  const baseUrl = process.env.FRONTEND_URL || 'https://vakancy.in';

  try {
    let jobs = [];
    try {
      const [rows] = await db.query(
        "SELECT id, updated_at, created_at FROM job WHERE status IN ('published', 'active', 'open') OR status IS NULL ORDER BY created_at DESC LIMIT 500"
      );
      if (rows && rows.length > 0) {
        jobs = rows;
      }
    } catch (e) {
      console.warn('DB error in /seo/sitemap.xml:', e.message);
    }

    const xmlUrls = jobs.map((j) => {
      const date = j.updated_at || j.created_at || new Date();
      const lastmod = new Date(date).toISOString().split('T')[0];
      return `  <url>
    <loc>${baseUrl}/jobs/${j.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/jobs</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
${xmlUrls.join('\n')}
</urlset>`;

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.status(200).send(xml);
  } catch (err) {
    console.error('Error generating dynamic sitemap:', err);
    res.status(500).send('Error generating sitemap');
  }
});

module.exports = router;
