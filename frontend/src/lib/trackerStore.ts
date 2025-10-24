export interface TrackedMedication {
  id: string;
  name: string;
  dosage: string;
  takenAt: string; // ISO string for the date and time
}

const TRACKED_MEDICATIONS_STORAGE_KEY = 'trackedMedications';

const isToday = (isoString: string) => {
    const date = new Date(isoString);
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
};

export const getTrackedMedications = (): TrackedMedication[] => {
  const data = localStorage.getItem(TRACKED_MEDICATIONS_STORAGE_KEY);
  if (!data) {
    return [];
  }
  const allTracked = JSON.parse(data) as TrackedMedication[];
  const todayTracked = allTracked.filter(med => isToday(med.takenAt));

  // If the stored data had old entries, we update the storage with only today's entries.
  if (allTracked.length !== todayTracked.length) {
      saveTrackedMedications(todayTracked);
  }

  return todayTracked;
};

export const saveTrackedMedications = (trackedMedications: TrackedMedication[]): void => {
  localStorage.setItem(TRACKED_MEDICATIONS_STORAGE_KEY, JSON.stringify(trackedMedications));
};
