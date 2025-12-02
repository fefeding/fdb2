const { bootstrap } = require('@midwayjs/runtime-bootstrap');
const path = require('path');

const application = bootstrap(path.join(__dirname, 'dist'));
application.run();