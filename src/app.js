const path = require('path');
const express = require('express');

const sessionMiddleware = require('./config/session');
const { csrfProtection } = require('./middleware/csrfProtection');
const routes = require('./routes');
const notFoundHandler = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(sessionMiddleware);

app.use(csrfProtection);

app.use(routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
