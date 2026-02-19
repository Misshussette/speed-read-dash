import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Car, Setup, Controller, SessionGarageLink } from '@/types/garage';
import {
  getAllCars, saveCar as saveCarDB, deleteCar as deleteCarDB,
  getAllSetups, saveSetup as saveSetupDB, deleteSetup as deleteSetupDB,
  getAllSessionLinks, saveSessionLink as saveLinkDB,
  getAllControllers, saveController as saveControllerDB, deleteController as deleteControllerDB,
} from '@/lib/garage-store';

interface GarageState {
  cars: Car[];
  setups: Setup[];
  controllers: Controller[];
  sessionLinks: SessionGarageLink[];

  addCar: (car: Omit<Car, 'id' | 'createdAt'>) => Promise<Car>;
  updateCar: (car: Car) => Promise<void>;
  removeCar: (id: string) => Promise<void>;

  addSetup: (setup: Omit<Setup, 'id' | 'createdAt'>) => Promise<Setup>;
  updateSetup: (setup: Setup) => Promise<void>;
  removeSetup: (id: string) => Promise<void>;
  duplicateSetup: (id: string) => Promise<Setup | null>;

  addController: (data: Omit<Controller, 'id' | 'createdAt'>) => Promise<Controller>;
  updateController: (controller: Controller) => Promise<void>;
  removeController: (id: string) => Promise<void>;

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
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [sessionLinks, setSessionLinks] = useState<SessionGarageLink[]>([]);

  useEffect(() => {
    Promise.all([getAllCars(), getAllSetups(), getAllSessionLinks(), getAllControllers()]).then(
      ([c, s, l, ctrl]) => { setCars(c); setSetups(s); setSessionLinks(l); setControllers(ctrl); }
    );
  }, []);

  // ── Cars ──
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

  // ── Setups ──
  const addSetup = useCallback(async (data: Omit<Setup, 'id' | 'createdAt'>) => {
    const setup: Setup = {
      ...data, id: crypto.randomUUID(), createdAt: Date.now(),
      tags: data.tags || [], parameters: data.parameters || {},
      custom_fields: data.custom_fields || {},
      label: data.label || null, notes: data.notes || null,
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

  const duplicateSetup = useCallback(async (id: string) => {
    const original = setups.find(s => s.id === id);
    if (!original) return null;
    const copy: Setup = {
      ...original,
      id: crypto.randomUUID(),
      label: (original.label || '') + ' (copy)',
      createdAt: Date.now(),
    };
    await saveSetupDB(copy);
    setSetups(prev => [...prev, copy]);
    return copy;
  }, [setups]);

  // ── Controllers ──
  const addController = useCallback(async (data: Omit<Controller, 'id' | 'createdAt'>) => {
    const ctrl: Controller = { ...data, id: crypto.randomUUID(), createdAt: Date.now() };
    await saveControllerDB(ctrl);
    setControllers(prev => [...prev, ctrl]);
    return ctrl;
  }, []);

  const updateController = useCallback(async (controller: Controller) => {
    await saveControllerDB(controller);
    setControllers(prev => prev.map(c => c.id === controller.id ? controller : c));
  }, []);

  const removeController = useCallback(async (id: string) => {
    await deleteControllerDB(id);
    setControllers(prev => prev.filter(c => c.id !== id));
  }, []);

  // ── Helpers ──
  const getSetupsForCarFn = useCallback((carId: string) => setups.filter(s => s.car_id === carId), [setups]);
  const linkSessionToGarage = useCallback(async (sessionId: string, carId: string | null, setupId: string | null) => {
    const link: SessionGarageLink = { session_id: sessionId, car_id: carId, setup_id: setupId };
    await saveLinkDB(link);
    setSessionLinks(prev => {
      const idx = prev.findIndex(l => l.session_id === sessionId);
      if (idx >= 0) { const next = [...prev]; next[idx] = link; return next; }
      return [...prev, link];
    });
  }, []);
  const getSessionLinkFn = useCallback((sessionId: string) => sessionLinks.find(l => l.session_id === sessionId), [sessionLinks]);
  const getCarById = useCallback((id: string) => cars.find(c => c.id === id), [cars]);
  const getSetupById = useCallback((id: string) => setups.find(s => s.id === id), [setups]);

  return (
    <GarageContext.Provider value={{
      cars, setups, controllers, sessionLinks,
      addCar, updateCar, removeCar,
      addSetup, updateSetup, removeSetup, duplicateSetup,
      addController, updateController, removeController,
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
