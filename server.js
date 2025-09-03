const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware
app.use(cors()); // Enable CORS for frontend access
app.use(express.json());

// MongoDB Connection
// mongoose.connect('mongodb://localhost:27017/bcp_db', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
//   .then(() => console.log('Connected to MongoDB'))
//   .catch(err => console.error('MongoDB connection error:', err));
mongoose.connect('mongodb+srv://psvelcode_db_user:Psvel%40mongo@cluster0.jghej5r.mongodb.net/bcp_db?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// BCP Schema
const bcpSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['draft', 'completed'], required: true },
  lastModified: Date,
  completedAt: Date,
  businessUnit: String,
  subBusinessUnit: String,
  service: {
    name: { type: String, required: true },
    description: String,
  },
  processes: [{
    name: { type: String, required: true },
    sites: [String],
    owners: {
      primaryRoster: {
        name: String,
        email: String,
      },
      backupRoster: {
        name: String,
        email: String,
      },
      primary: {
        name: String,
        email: String,
      },
      backup: {
        name: String,
        email: String,
      },
    },
  }],
  criticality: {
    unit: { type: String, required: true },
    value: { type: Number, required: true, min: 1 },
  },
  headcount: { type: Number, min: 0 },
  dependencies: [{
    type: { type: String, required: true },
    name: { type: String, required: true },
  }],
  notifications: [{
    name: { type: String, required: true },
    email: { type: String, required: true },
  }],
  risks: String,
  skippedSteps: [Number],
});

const BCP = mongoose.model('BCP', bcpSchema);

// POST Endpoint (Save Draft, Generate Response Card, or Edit)
app.post('/api/bcp', async (req, res) => {
  try {
    const bcpData = req.body;
    if (!bcpData.status) bcpData.status = 'draft'; // Default to draft if not specified
    bcpData.lastModified = new Date(); // Always update lastModified

    let result;
    if (bcpData._id) {
      // Edit existing plan
      const existingPlan = await BCP.findById(bcpData._id);
      if (!existingPlan) {
        return res.status(404).json({ message: 'Plan not found' });
      }
      if (bcpData.status === 'completed' && !existingPlan.completedAt) {
        bcpData.completedAt = new Date();
      } else if (bcpData.status === 'draft') {
        bcpData.completedAt = undefined;
      }
      result = await BCP.findByIdAndUpdate(bcpData._id, bcpData, { new: true, runValidators: true });
      res.status(200).json({ message: 'Plan updated', id: result._id });
    } else {
      // Create new plan
      if (bcpData.status === 'completed') bcpData.completedAt = new Date();
      result = await BCP.create(bcpData);
      res.status(201).json({ message: 'Data saved', id: result._id });
    }
  } catch (error) {
    console.error('Error saving/updating data:', error);
    res.status(500).json({ message: 'Error saving/updating data', error: error.message });
  }
});

// GET Endpoint (Retrieve All Plans)
app.get('/api/bcp', async (req, res) => {
  try {
    const plans = await BCP.find();
    res.status(200).json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ message: 'Error fetching plans', error: error.message });
  }
});

// DELETE Endpoint (Delete a Plan)
app.delete('/api/bcp/:id', async (req, res) => {
  try {
    const result = await BCP.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    res.status(200).json({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ message: 'Error deleting plan', error: error.message });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});