function resolveStatus(err) {
  const status = Number(err.statusCode || err.status);

  if (!Number.isInteger(status) || status < 400 || status > 599) {
    return 500;
  }

  return status;
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }

  const status = resolveStatus(err);
  const isProduction = process.env.NODE_ENV === 'production';
  const message =
    status >= 500 && isProduction
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(status);

  if (req.accepts('html')) {
    res.type('html').send(message);
    return;
  }

  res.json({ error: message });
}

module.exports = errorHandler;
