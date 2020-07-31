const bodyParser = require('body-parser')
const express = require('express');
const session = require('express-session')

const port = 3001;

const app = express();
app.use(express.static('../public'));

app.listen(port, () => console.log(`App listening on port ${port}!`));
