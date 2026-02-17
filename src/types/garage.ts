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

/** Predefined parameter templates for common slot-car disciplines */
export const PARAMETER_TEMPLATES: ParameterDefinition[] = [
  { key: 'tires', label: 'Tires', unit: null, type: 'text', min: null, max: null, options: [], category: 'chassis' },
  { key: 'gear_ratio', label: 'Gear Ratio', unit: null, type: 'text', min: null, max: null, options: [], category: 'drivetrain' },
  { key: 'ride_height', label: 'Ride Height', unit: 'mm', type: 'number', min: 0, max: 20, options: [], category: 'chassis' },
  { key: 'magnet', label: 'Magnet', unit: null, type: 'text', min: null, max: null, options: [], category: 'chassis' },
  { key: 'controller_profile', label: 'Controller Profile', unit: null, type: 'text', min: null, max: null, options: [], category: 'electronics' },
  { key: 'motor_brand', label: 'Motor Brand', unit: null, type: 'text', min: null, max: null, options: [], category: 'drivetrain' },
  { key: 'pinion', label: 'Pinion', unit: 'teeth', type: 'number', min: 5, max: 30, options: [], category: 'drivetrain' },
  { key: 'crown', label: 'Crown', unit: 'teeth', type: 'number', min: 20, max: 40, options: [], category: 'drivetrain' },
  { key: 'front_axle', label: 'Front Axle', unit: null, type: 'text', min: null, max: null, options: [], category: 'chassis' },
  { key: 'rear_axle', label: 'Rear Axle', unit: null, type: 'text', min: null, max: null, options: [], category: 'chassis' },
  { key: 'body_weight', label: 'Body Weight', unit: 'g', type: 'number', min: 0, max: 200, options: [], category: 'chassis' },
  { key: 'brake_setting', label: 'Brake Setting', unit: null, type: 'select', min: null, max: null, options: ['Off', 'Low', 'Medium', 'High'], category: 'electronics' },
];

export interface Setup {
  id: string;
  car_id: string;
  label: string | null;
  notes: string | null;
  tags: string[];
  parameters: Record<string, string | number>;  // key from ParameterDefinition -> value
  custom_fields: Record<string, string>;         // user-defined free-form fields
  createdAt: number;
}

/** Links a session to garage equipment — editable after import */
export interface SessionGarageLink {
  session_id: string; // matches SessionMeta.id
  car_id: string | null;
  setup_id: string | null;
}
