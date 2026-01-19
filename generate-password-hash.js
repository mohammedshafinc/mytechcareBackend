const bcrypt = require('bcryptjs');  // Changed from 'bcrypt' to 'bcryptjs'

const password = 'Mytech*2005';

// Generate hash with salt rounds (10 is standard)
bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    return;
  }
  console.log('\n========================================');
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('========================================\n');
  
  // Verify the hash
  bcrypt.compare(password, hash, (err, result) => {
    if (err) {
      console.error('Error verifying hash:', err);
      return;
    }
    console.log('Verification test:', result ? '✓ Match' : '✗ No match');
  });
});