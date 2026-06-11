import { create } from 'zustand';

export interface PickedLocation {
  address: string;
  lat: number;
  lng: number;
}

interface LocationPickerStore {
  result: PickedLocation | null;
  setResult: (loc: PickedLocation) => void;
  clear: () => void;
}

export const useLocationPickerStore = create<LocationPickerStore>((set) => ({
  result: null,
  setResult: (loc) => set({ result: loc }),
  clear: () => set({ result: null }),
}));
