const mongoose = require('mongoose');
const Expense = require('./models/Expense'); // apna Expense model path daalo

async function migrateApprovalStatus() {
  try {
    await mongoose.connect('mongodb+srv://hellytheappideas_db_user:heE9LLxOIlp9u05h@cluster0.t3eqcoo.mongodb.net/?appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to DB');

    const result = await Expense.updateMany(
      {
        approvalStatus: { $in: ['pending', 'approved', 'rejected'] }
      },
      [
        {
          $set: {
            approvalStatus: {
              $switch: {
                branches: [
                  { case: { $eq: ['$approvalStatus', 'pending'] }, then: 'Pending' },
                  { case: { $eq: ['$approvalStatus', 'approved'] }, then: 'Approved' },
                  { case: { $eq: ['$approvalStatus', 'rejected'] }, then: 'Rejected' }
                ],
                default: '$approvalStatus'
              }
            }
          }
        }
      ]
    );

    console.log('Migration done!', result);
    // { matchedCount: 342, modifiedCount: 342 }

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    mongoose.connection.close();
  }
}

migrateApprovalStatus();