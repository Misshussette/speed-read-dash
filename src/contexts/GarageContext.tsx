import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Car, Setup, SessionGarageLink } from '@/types/garage';
import {
  getAllCars, saveCar as saveCarDB, deleteCar as deleteCarDB,
  getAllSetups, saveSetup as saveSetupDB, deleteSetup as deleteSetupDB,
  getAllSessionLinks, saveSessionLink as saveLinkDB,
} from '@/lib/garage-store';

interface GarageState {
  cars: Car[];
  setups: Setup[];
  sessionLinks: SessionGarageLink[];

  addCar: (car: Omit<Car, 'id' | 'createdAt'>) => Promise<Car>;
  updateCar: (car: Car) => Promise<void>;
  removeCar: (id: string) => Promise<void>;

  addSetup: (setup: Omit<Setup, 'id' | 'createdAt'>) => Promise<Setup>;
  updateSetup: (setup: Setup) => Promise<void>;
  removeSetup: (id: string) => Promise<void>;

  getSetupsForCar: (carId: string) => Setup[];
  linkSessionToGarage: (sessionId: string, carId: string | null, setupId: string | null) => Promise<void>;
  getSessionLink: (sessionId: string) => SessionGarageLink | undefined;
  getCarById: (id: string) => Car | undefined;
  getSetupById: (id: string) => Setup | undefined;
}

const GarageContext = createContext<GarageState | null>(null);

export function GarageProvider({ children }: { children: React.ReactNode }) {
  const [cars, setCars] = useState<Car[]>([]);
  const [setups, setSetups] = useState<Setup[]>([]);
  const [sessionLinks, setSessionLinks] = useState<SessionGarageLink[]>([]);

  useEffect(() => {
    Promise.all([getAllCars(), getAllSetups(), getAllSessionLinks()]).then(
      ([c, s, l]) => { setCars(c); setSetups(s); setSessionLinks(l); }
    );
  }, []);

  const addCar = useCallback(async (data: Omit<Car, 'id' | 'createdAt'>) => {
    const car: Car = { ...data, id: crypto.randomUUID(), createdAt: Date.now() };
    await saveCarDB(car);
    setCars(prev => [...prev, car]);
    return car;
  }, []);

  const updateCar = useCallback(async (car: Car) => {
    await saveCarDB(car);
    setCars(prev => prev.map(c => c.id === car.id ? car : c));
  }, []);

  const removeCar = useCallback(async (id: string) => {
    await deleteCarDB(id);
    setCars(prev => prev.filter(c => c.id !== id));
    setSetups(prev => prev.filter(s => s.car_id !== id));
    setSessionLinks(prev => prev.map(l => l.car_id === id ? { ...l, car_id: null, setup_id: null } : l));
  }, []);

  const addSetup = useCallback(async (data: Omit<Setup, 'id' | 'createdAt'>) => {
    const setup: Setup = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      tags: data.tags || [],
      parameters: data.parameters || {},
      custom_fields: data.custom_fields || {},
      label: data.label || null,
      notes: data.notes || null,
    };
    await saveSetupDB(setup);
    setSetups(prev => [...prev, setup]);
    return setup;
  }, []);

  const updateSetup = useCallback(async (setup: Setup) => {
    await saveSetupDB(setup);
    setSetups(prev => prev.map(s => s.id === setup.id ? setup : s));
  }, []);

  const removeSetup = useCallback(async (id: string) => {
    await deleteSetupDB(id);
    setSetups(prev => prev.filter(s => s.id !== id));
    setSessionLinks(prev => prev.map(l => l.setup_id === id ? { ...l, setup_id: null } : l));
  }, []);

  const getSetupsForCarFn = useCallback((carId: string) => {
    return setups.filter(s => s.car_id === carId);
  }, [setups]);

  const linkSessionToGarage = useCallback(async (sessionId: string, carId: string | null, setupId: string | null) => {
    const link: SessionGarageLink = { session_id: sessionId, car_id: carId, setup_id: setupId };
    await saveLinkDB(link);
    setSessionLinks(prev => {
      const existing = prev.findIndex(l => l.session_id === sessionId);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = link;
        return next;
      }
      return [...prev, link];
    });
  }, []);

  const getSessionLinkFn = useCallback((sessionId: string) => {
    return sessionLinks.find(l => l.session_id === sessionId);
  }, [sessionLinks]);

  const getCarById = useCallback((id: string) => cars.find(c => c.id === id), [cars]);
  const getSetupById = useCallback((id: string) => setups.find(s => s.id === id), [setups]);

  return (
    <GarageContext.Provider value={{
      cars, setups, sessionLinks,
      addCar, updateCar, removeCar,
      addSetup, updateSetup, removeSetup,
      getSetupsForCar: getSetupsForCarFn,
      linkSessionToGarage, getSessionLink: getSessionLinkFn,
      getCarById, getSetupById,
    }}>
      {children}
    </GarageContext.Provider>
  );
}

export function useGarage() {
  const ctx = useContext(GarageContext);
  if (!ctx) throw new Error('useGarage must be used within GarageProvider');
  return ctx;
}
