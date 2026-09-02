const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/voiceshield' });

client.connect()
  .then(() => client.query("UPDATE users SET role = 'investigator';"))
  .then(() => {
    console.log('Successfully upgraded all users to investigator role!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
