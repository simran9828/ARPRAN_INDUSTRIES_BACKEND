import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    password_hash: {
      type: String,
      required: [true, 'Password hash is required']
    },
    name: {
      type: String,
      default: 'Client',
      trim: true
    },
    phone: {
      type: String,
      default: '',
      trim: true
    },
    company: {
      type: String,
      default: '',
      trim: true
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'superadmin'],
      default: 'user',
      index: true
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

// Method to return safe JSON without password_hash
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    email: this.email,
    name: this.name,
    phone: this.phone,
    company: this.company,
    role: this.role,
    created_at: this.created_at,
    updated_at: this.updated_at
  };
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
