const User = require('./models/User');

async function promoteToAdmin() {
  try {
    // Replace this with the email you registered with!
    const targetEmail = 'mcadelacruz@tip.edu.ph'; 

    const [updatedRows] = await User.update(
      { role: 'admin' },
      { where: { email: targetEmail } }
    );

    if (updatedRows > 0) {
      console.log(`Success! ${targetEmail} is now an admin.`);
    } else {
      console.log(`User with email ${targetEmail} not found.`);
    }
  } catch (error) {
    console.error('Error updating user:', error);
  } finally {
    process.exit();
  }
}

promoteToAdmin();