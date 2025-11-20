'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WeightUnit } from '@/utils/weightUtils';

interface WeightLabelContextType {
  weightLabel: WeightUnit;
  setWeightLabel: (label: WeightUnit) => void;
  loading: boolean;
  refreshWeightLabel: () => Promise<void>;
}

const WeightLabelContext = createContext<WeightLabelContextType | undefined>(undefined);

export function WeightLabelProvider({ children }: { children: ReactNode }) {
  const [weightLabel, setWeightLabelState] = useState<WeightUnit>('g');
  const [loading, setLoading] = useState(true);

  const fetchWeightLabel = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/weight-label');
      const data = await response.json();
      
      if (data.success && data.weightLabel) {
        setWeightLabelState(data.weightLabel as WeightUnit);
      }
    } catch (error) {
      console.error('Error fetching weight label:', error);
      // Keep default 'g' on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeightLabel();
  }, []);

  const setWeightLabel = (label: WeightUnit) => {
    setWeightLabelState(label);
  };

  const refreshWeightLabel = async () => {
    await fetchWeightLabel();
  };

  return (
    <WeightLabelContext.Provider value={{ weightLabel, setWeightLabel, loading, refreshWeightLabel }}>
      {children}
    </WeightLabelContext.Provider>
  );
}

export function useWeightLabel() {
  const context = useContext(WeightLabelContext);
  if (context === undefined) {
    throw new Error('useWeightLabel must be used within a WeightLabelProvider');
  }
  return context;
}

