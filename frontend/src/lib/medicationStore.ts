// Define the structure of a single medication object
export interface Medication {
  id: string;
  name: string;
  dosage: string;
  schedule: string[];
}

/**
 * Retrieves the list of medications from localStorage.
 * @returns {Medication[]} An array of medications, or an empty array if none are found.
 */
export const getMedications = (): Medication[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  const medicationsJson = window.localStorage.getItem('medications');
  return medicationsJson ? JSON.parse(medicationsJson) : [];
};

/**
 * Saves the entire list of medications to localStorage.
 * @param {Medication[]} medications - The array of medications to save.
 */
export const saveMedications = (medications: Medication[]): void => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('medications', JSON.stringify(medications));
  }
};