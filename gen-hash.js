const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('Senha123!', 10));
