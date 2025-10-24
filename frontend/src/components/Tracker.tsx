import { useState, useEffect } from 'react';
import { getTrackedMedications, saveTrackedMedications } from '../lib/trackerStore';
import type { TrackedMedication } from '../lib/trackerStore';
import { getMedications } from '../lib/medicationStore';
import type { Medication } from '../lib/medicationStore';

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
  </svg>
);

export default function Tracker() {
  const [trackedMedications, setTrackedMedications] = useState<TrackedMedication[]>([]);
  const [availableMedications, setAvailableMedications] = useState<Medication[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMedicationId, setSelectedMedicationId] = useState<string>('');
  const [takenAtTime, setTakenAtTime] = useState('');

  useEffect(() => {
    setTrackedMedications(getTrackedMedications());
    setAvailableMedications(getMedications());
  }, []);

  const resetForm = () => {
    setSelectedMedicationId('');
    setTakenAtTime('');
  };

  const handleOpenAddModal = () => {
    resetForm();
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setTakenAtTime(`${hours}:${minutes}`);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      const updatedTrackedMedications = trackedMedications.filter(med => med.id !== id);
      setTrackedMedications(updatedTrackedMedications);
      saveTrackedMedications(updatedTrackedMedications);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const intSelectedMedicationId = parseInt(selectedMedicationId);
    if (!intSelectedMedicationId || !takenAtTime) return;

    const medicationInfo = availableMedications.find(m => m.id === intSelectedMedicationId);
    if (!medicationInfo) return;

    const [hours, minutes] = takenAtTime.split(':');
    const takenAtDate = new Date();
    takenAtDate.setHours(parseInt(hours, 10));
    takenAtDate.setMinutes(parseInt(minutes, 10));
    takenAtDate.setSeconds(0);
    takenAtDate.setMilliseconds(0);

    // Create a local time string in YYYY-MM-DDTHH:mm:ss format
    const year = takenAtDate.getFullYear();
    const month = String(takenAtDate.getMonth() + 1).padStart(2, '0');
    const day = String(takenAtDate.getDate()).padStart(2, '0');
    const localHours = String(takenAtDate.getHours()).padStart(2, '0');
    const localMinutes = String(takenAtDate.getMinutes()).padStart(2, '0');
    const localSeconds = String(takenAtDate.getSeconds()).padStart(2, '0');
    const localTakenAtString = `${year}-${month}-${day}T${localHours}:${localMinutes}:${localSeconds}`;

    const newTrackedMedication: TrackedMedication = {
      id: new Date().getTime()+Math.floor(10000 + Math.random() * 90000),
      name: medicationInfo.name,
      dosage: medicationInfo.dosage,
      takenAt: localTakenAtString, // Save local time string
    };

    const updatedTrackedMedications = [...trackedMedications, newTrackedMedication];
    
    setTrackedMedications(updatedTrackedMedications);
    saveTrackedMedications(updatedTrackedMedications);

    setIsModalOpen(false);
    resetForm();
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Today's Medication Tracker</h1>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition"
          aria-label="Add new medication intake"
        >
          <PlusIcon />
        </button>
      </div>
      
      <div className="space-y-2 mb-24">
        {trackedMedications.length > 0 ? (
          trackedMedications.map(med => (
            <div key={med.id} className="p-3 bg-gray-100 rounded-lg shadow-sm flex justify-between items-center">
              <div>
                <p className="font-semibold text-gray-800">{med.name} - {med.dosage}</p>
                <p className="text-sm text-gray-600">
                  Taken at: {new Date(med.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => handleDelete(med.id)} className="px-3 py-1 text-sm text-red-600 bg-red-100 rounded hover:bg-red-200">Delete</button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 px-4 border-2 border-dashed rounded-lg">
            <p className="text-gray-500">No medication intake recorded yet.</p>
            <p className="text-sm text-gray-400 mt-2">Click the + icon to add a record.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Record Medication Intake</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="medication" className="block text-sm font-medium text-gray-700">Medication</label>
                <select
                  id="medication"
                  value={selectedMedicationId}
                  onChange={(e) => setSelectedMedicationId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="" disabled>Select a medication</option>
                  {availableMedications.map(med => (
                    <option key={med.id} value={med.id}>{med.name} ({med.dosage})</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label htmlFor="takenAt" className="block text-sm font-medium text-gray-700">Time Taken</label>
                <input
                  type="time"
                  id="takenAt"
                  value={takenAtTime}
                  onChange={(e) => setTakenAtTime(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
