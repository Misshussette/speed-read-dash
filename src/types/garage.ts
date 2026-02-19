// Garage module types — enrichment layer, never modifies telemetry

export interface Car {
  id: string;
  brand: string;
  model: string;
  scale: string | null;
  motor: string | null;
  weight: number | null;
  notes: string | null;
  createdAt: number;
}

/** Describes a single parameter field available in a setup */
export interface ParameterDefinition {
  key: string;
  label: string;
  unit: string | null;
  type: 'text' | 'number' | 'select';
  min: number | null;
  max: number | null;
  options: string[];    // for type='select'
  category: string;     // e.g. 'chassis', 'drivetrain', 'electronics'
}

/** All supported parameter sections for structured display */
export const SETUP_SECTIONS = [
  'chassis',
  'drivetrain',
  'motor',
  'running_gear',
  'guide',
  'electrical',
  'body',
  'geometry',
  'track_conditions',
] as const;

export type SetupSection = typeof SETUP_SECTIONS[number];

/** Predefined Slot Car Advanced Template — organized by section */
export const SLOT_CAR_TEMPLATE: ParameterDefinition[] = [
  // ── Chassis ──
  { key: 'chassis_type', label: 'Chassis Type', unit: null, type: 'text', min: null, max: null, options: [], category: 'chassis' },
  { key: 'ride_height_front', label: 'Front Ride Height', unit: 'mm', type: 'number', min: 0, max: 20, options: [], category: 'chassis' },
  { key: 'ride_height_rear', label: 'Rear Ride Height', unit: 'mm', type: 'number', min: 0, max: 20, options: [], category: 'chassis' },
  { key: 'chassis_flex', label: 'Chassis Flex', unit: null, type: 'select', min: null, max: null, options: ['Rigid', 'Medium', 'Soft'], category: 'chassis' },
  { key: 'ballast_weight', label: 'Ballast Weight', unit: 'g', type: 'number', min: 0, max: 100, options: [], category: 'chassis' },
  { key: 'ballast_position', label: 'Ballast Position', unit: null, type: 'text', min: null, max: null, options: [], category: 'chassis' },

  // ── Drivetrain ──
  { key: 'gear_ratio', label: 'Gear Ratio', unit: null, type: 'text', min: null, max: null, options: [], category: 'drivetrain' },
  { key: 'pinion', label: 'Pinion', unit: 'teeth', type: 'number', min: 5, max: 30, options: [], category: 'drivetrain' },
  { key: 'crown', label: 'Crown', unit: 'teeth', type: 'number', min: 20, max: 40, options: [], category: 'drivetrain' },
  { key: 'axle_type', label: 'Axle Type', unit: null, type: 'text', min: null, max: null, options: [], category: 'drivetrain' },
  { key: 'differential', label: 'Differential', unit: null, type: 'select', min: null, max: null, options: ['None', 'Locked', 'Open', 'Limited Slip'], category: 'drivetrain' },

  // ── Motor ──
  { key: 'motor_brand', label: 'Motor Brand', unit: null, type: 'text', min: null, max: null, options: [], category: 'motor' },
  { key: 'motor_model', label: 'Motor Model', unit: null, type: 'text', min: null, max: null, options: [], category: 'motor' },
  { key: 'motor_rpm', label: 'Motor RPM', unit: 'rpm', type: 'number', min: 0, max: 50000, options: [], category: 'motor' },
  { key: 'motor_magnet', label: 'Motor Magnet', unit: null, type: 'text', min: null, max: null, options: [], category: 'motor' },

  // ── Running Gear ──
  { key: 'front_tires', label: 'Front Tires', unit: null, type: 'text', min: null, max: null, options: [], category: 'running_gear' },
  { key: 'rear_tires', label: 'Rear Tires', unit: null, type: 'text', min: null, max: null, options: [], category: 'running_gear' },
  { key: 'front_wheels', label: 'Front Wheels', unit: null, type: 'text', min: null, max: null, options: [], category: 'running_gear' },
  { key: 'rear_wheels', label: 'Rear Wheels', unit: null, type: 'text', min: null, max: null, options: [], category: 'running_gear' },
  { key: 'front_axle', label: 'Front Axle', unit: null, type: 'text', min: null, max: null, options: [], category: 'running_gear' },
  { key: 'rear_axle', label: 'Rear Axle', unit: null, type: 'text', min: null, max: null, options: [], category: 'running_gear' },

  // ── Guide ──
  { key: 'guide_type', label: 'Guide Type', unit: null, type: 'text', min: null, max: null, options: [], category: 'guide' },
  { key: 'guide_spring', label: 'Guide Spring', unit: null, type: 'select', min: null, max: null, options: ['Soft', 'Medium', 'Hard'], category: 'guide' },
  { key: 'guide_flag', label: 'Guide Flag', unit: null, type: 'text', min: null, max: null, options: [], category: 'guide' },

  // ── Electrical ──
  { key: 'controller_profile', label: 'Controller Profile', unit: null, type: 'text', min: null, max: null, options: [], category: 'electrical' },
  { key: 'magnet', label: 'Traction Magnet', unit: null, type: 'text', min: null, max: null, options: [], category: 'electrical' },
  { key: 'magnet_position', label: 'Magnet Position', unit: null, type: 'text', min: null, max: null, options: [], category: 'electrical' },
  { key: 'brake_setting', label: 'Brake Setting', unit: null, type: 'select', min: null, max: null, options: ['Off', 'Low', 'Medium', 'High'], category: 'electrical' },
  { key: 'braids', label: 'Braids', unit: null, type: 'text', min: null, max: null, options: [], category: 'electrical' },

  // ── Body ──
  { key: 'body_type', label: 'Body Type', unit: null, type: 'text', min: null, max: null, options: [], category: 'body' },
  { key: 'body_weight', label: 'Body Weight', unit: 'g', type: 'number', min: 0, max: 200, options: [], category: 'body' },
  { key: 'body_paint', label: 'Paint / Livery', unit: null, type: 'text', min: null, max: null, options: [], category: 'body' },

  // ── Geometry ──
  { key: 'wheelbase', label: 'Wheelbase', unit: 'mm', type: 'number', min: 50, max: 200, options: [], category: 'geometry' },
  { key: 'front_track', label: 'Front Track', unit: 'mm', type: 'number', min: 30, max: 100, options: [], category: 'geometry' },
  { key: 'rear_track', label: 'Rear Track', unit: 'mm', type: 'number', min: 30, max: 100, options: [], category: 'geometry' },
  { key: 'front_ground_clearance', label: 'Front Ground Clearance', unit: 'mm', type: 'number', min: 0, max: 10, options: [], category: 'geometry' },
  { key: 'rear_ground_clearance', label: 'Rear Ground Clearance', unit: 'mm', type: 'number', min: 0, max: 10, options: [], category: 'geometry' },
  { key: 'pod_height', label: 'Pod Height', unit: 'mm', type: 'number', min: 0, max: 30, options: [], category: 'geometry' },
  { key: 'front_wheel_diameter_prepared', label: 'Front Wheel Ø (prepared)', unit: 'mm', type: 'number', min: 10, max: 30, options: [], category: 'geometry' },
  { key: 'rear_wheel_diameter_prepared', label: 'Rear Wheel Ø (prepared)', unit: 'mm', type: 'number', min: 10, max: 30, options: [], category: 'geometry' },

  // ── Track Conditions ──
  { key: 'track_surface', label: 'Track Surface', unit: null, type: 'select', min: null, max: null, options: ['Plastic', 'Wood', 'Routed'], category: 'track_conditions' },
  { key: 'track_grip', label: 'Track Grip', unit: null, type: 'select', min: null, max: null, options: ['Low', 'Medium', 'High'], category: 'track_conditions' },
  { key: 'temperature', label: 'Temperature', unit: '°C', type: 'number', min: -10, max: 50, options: [], category: 'track_conditions' },
  { key: 'tire_treatment', label: 'Tire Treatment', unit: null, type: 'text', min: null, max: null, options: [], category: 'track_conditions' },
];

/** Legacy flat template — kept for backward compatibility */
export const PARAMETER_TEMPLATES: ParameterDefinition[] = SLOT_CAR_TEMPLATE;

export interface Setup {
  id: string;
  car_id: string;
  label: string | null;
  notes: string | null;
  tags: string[];
  parameters: Record<string, string | number>;  // key from ParameterDefinition -> value
  custom_fields: Record<string, string>;         // user-defined free-form fields
  images: string[];                               // storage URLs for media attachments
  createdAt: number;
}

/** Controller configuration — user-defined input device */
export interface Controller {
  id: string;
  name: string;
  type: string;
  custom_parameters: Record<string, string>;
  notes: string | null;
  createdAt: number;
}

/** A real-world equipment combination used on track */
export interface Configuration {
  id: string;
  name: string;
  vehicle_id: string;
  setup_id: string | null;
  controller_id: string | null;
  notes: string | null;
  createdAt: number;
}

/** Links a session to garage equipment — editable after import */
export interface SessionGarageLink {
  session_id: string; // matches SessionMeta.id
  car_id: string | null;
  setup_id: string | null;
  configuration_id: string | null;
}
