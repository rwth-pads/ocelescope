// store/useStore.js
import { create } from "zustand";

type TotemStore = {
  tau: number;
  setTau: (newTau: number) => void;
};

const useTotemStore = create<TotemStore>()((set) => ({
  tau: 0.9,
  setTau: (newTau: number) => set(() => ({ tau: newTau })),
}));

export default useTotemStore;
