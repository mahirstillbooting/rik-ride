import { Schema, model, Document, Types } from 'mongoose';

export interface IVehicleDriver extends Document {
  vehicleId: Types.ObjectId;
  driverId: Types.ObjectId;
  assignedAt: Date;
  unassignedAt?: Date;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleDriverSchema = new Schema<IVehicleDriver>(
  {
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedAt: { type: Date, default: Date.now },
    unassignedAt: { type: Date },
    isCurrent: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
  }
);

VehicleDriverSchema.index({ vehicleId: 1, isCurrent: 1 });

export const VehicleDriver = model<IVehicleDriver>('VehicleDriver', VehicleDriverSchema);
