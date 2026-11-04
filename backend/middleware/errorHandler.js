const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const multerStatus = err.name === 'MulterError'
    ? (err.code === 'LIMIT_FILE_SIZE' ? 413 : 400)
    : null;
  const explicitStatus = Number(multerStatus || err.status || err.statusCode);
  const statusCode = explicitStatus >= 400 && explicitStatus < 600
    ? explicitStatus
    : (res.statusCode >= 400 ? res.statusCode : 500);
  const isProduction = process.env.NODE_ENV === 'production';
  const safeClientError = statusCode >= 400 && statusCode < 500;
  if (safeClientError) {
    console.warn('Request rejected:', err.code || statusCode, err.message);
  } else {
    console.error('Unhandled Error:', err.stack || err.message);
  }
  const payload = {
    success: false,
    code: err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_FAILED'),
    message: isProduction && !safeClientError
      ? 'An unexpected server error occurred.'
      : (err.message || 'Internal Server Error')
  };

  if (!isProduction && err.stack) payload.stack = err.stack;
  res.status(statusCode).json(payload);
};

module.exports = errorHandler;
