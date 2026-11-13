// ============================================================
// constants.ts - الثوابت والتكوينات لأسطول التوصيل بفاس
// ============================================================

import React from 'react';
import { Bike, Car, Truck } from 'lucide-react';
import type {
  DriverVehicleType,
  DriverStatus,
  FezZoneId,
  FastDeliveryApp,
  DriverFormData,
  FastCourierFormData,
  ZoneStyle,
  FastAppCourier,
} from './types';

export const VEHICLE_CONFIG: Record<
  DriverVehicleType,
  { label: string; icon: string; iconComponent: React.ComponentType<{ className?: string }> }
> = {
  moto: { label: 'دراجة نارية', icon: '🏍️', iconComponent: Bike },
  car: { label: 'سيارة', icon: '🚗', iconComponent: Car },
  van: { label: 'فان / شاحنة', icon: '🚐', iconComponent: Truck },
  scooter: { label: 'سكوتر', icon: '🛵', iconComponent: Bike },
  bicycle: { label: 'دراجة هوائية', icon: '🚲', iconComponent: Bike },
};

export const STATUS_CONFIG: Record<
  DriverStatus,
  { label: string; badge: string; dot: string }
> = {
  available: {
    label: 'متاح',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  on_delivery: {
    label: 'في جولة',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  off_duty: {
    label: 'خارج الخدمة',
    badge: 'bg-stone-50 text-stone-600 border-stone-200',
    dot: 'bg-stone-400',
  },
};

export const ZONE_STYLES: Record<FezZoneId, ZoneStyle> = {
  east: {
    border: 'border-purple-200 hover:border-purple-300',
    bg: 'bg-white',
    badge: 'bg-purple-50 text-purple-800 border-purple-200',
    headerBg: 'bg-purple-700',
    accentText: 'text-purple-800',
    tagColor: 'text-purple-600',
  },
  central: {
    border: 'border-amber-200 hover:border-amber-300',
    bg: 'bg-white',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    headerBg: 'bg-amber-600',
    accentText: 'text-amber-800',
    tagColor: 'text-amber-600',
  },
  south: {
    border: 'border-orange-200 hover:border-orange-300',
    bg: 'bg-white',
    badge: 'bg-orange-50 text-orange-800 border-orange-200',
    headerBg: 'bg-orange-600',
    accentText: 'text-orange-800',
    tagColor: 'text-orange-600',
  },
  north: {
    border: 'border-emerald-200 hover:border-emerald-300',
    bg: 'bg-white',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    headerBg: 'bg-emerald-700',
    accentText: 'text-emerald-800',
    tagColor: 'text-emerald-600',
  },
};

export const DEFAULT_DRIVER_FORM: DriverFormData = {
  name: '',
  phone: '',
  vehicleType: 'moto',
  zonePreference: 'all',
  status: 'available',
  commissionPerOrder: 25,
  vehiclePlate: '',
  address: '',
  notes: '',
};

export const DEFAULT_FAST_COURIER_FORM: FastCourierFormData = {
  name: '',
  app: 'indrive',
  appNameCustom: '',
  phone: '',
  vehicleType: 'moto',
  zone: 'all',
  typicalFare: 20,
  notes: '',
};

export const APP_BADGES: Record<FastDeliveryApp, { label: string; style: string }> = {
  indrive: { label: 'inDrive', style: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold' },
  glovo: { label: 'Glovo', style: 'bg-amber-50 text-amber-900 border-amber-200 font-bold' },
  yassir: { label: 'Yassir', style: 'bg-rose-50 text-rose-800 border-rose-200 font-bold' },
  careem: { label: 'Careem', style: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold' },
  other: { label: 'تطبيق', style: 'bg-stone-50 text-stone-700 border-stone-200 font-bold' },
};

export const DEFAULT_FAST_COURIERS: FastAppCourier[] = [
  {
    id: 'fast-courier-glovo-1',
    name: 'سعيد الادريسي',
    app: 'glovo',
    phone: '0665653232',
    vehicleType: 'moto',
    zone: 'north',
    typicalFare: 25,
    notes: 'كابتن غلوفو - تغطية المنطقة الشمالية',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fast-courier-indrive-1',
    name: 'حميد التازي',
    app: 'indrive',
    phone: '0662348300',
    vehicleType: 'moto',
    zone: 'central',
    typicalFare: 25,
    notes: 'كابتن إندرايف - تغطية المنطقة الوسطى والأطلس',
    createdAt: new Date().toISOString(),
  },
];

export const FLEET_ZONES: FezZoneId[] = ['east', 'central', 'south', 'north'];
