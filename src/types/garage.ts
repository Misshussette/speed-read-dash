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

export interface Setup {
  id: string;
  car_id: string;
  tires: string | null;
  gear_ratio: string | null;
  ride_height: string | null;
  magnet: string | null;
  controller_profile: string | null;
  custom_fields: Record<string, string>;
  createdAt: number;
}

/** Links a session to garage equipment — editable after import */
export interface SessionGarageLink {
  session_id: string; // matches SessionMeta.id
  car_id: string | null;
  setup_id: string | null;
}
