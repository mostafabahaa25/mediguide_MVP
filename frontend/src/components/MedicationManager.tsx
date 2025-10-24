import { useState, useEffect } from 'react';
import { getMedications, saveMedications} from '../lib/medicationStore';
import type { Medication } from '../lib/medicationStore';

import CameraView from './CameraView.js';

// A simple Plus icon component, now smaller for the header
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
  </svg>
);


export default function MedicationManager() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [schedule, setSchedule] = useState<string[]>(['']);

  // Load medications from local storage on initial render
  useEffect(() => {
    setMedications(getMedications());
  }, []);

  const handleAddTime = () => {
    setSchedule([...schedule, '']);
  };

  const handleRemoveTime = (index: number) => {
    const newSchedule = schedule.filter((_, i) => i !== index);
    setSchedule(newSchedule);
  };

  const handleTimeChange = (index: number, value: string) => {
    const newSchedule = [...schedule];
    newSchedule[index] = value;
    setSchedule(newSchedule);
  };

  const resetForm = () => {
    setName('');
    setDosage('');
    setSchedule(['']);
    setEditingMedication(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (med: Medication) => {
    setEditingMedication(med);
    setName(med.name);
    setDosage(med.dosage);
    setSchedule(med.schedule);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this medication?')) {
      const updatedMedications = medications.filter(med => med.id !== id);
      setMedications(updatedMedications);
      saveMedications(updatedMedications);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dosage || schedule.some(time => !time)) return;

    const updatedSchedule = schedule.filter(time => time);

    let updatedMedications;

    if (editingMedication) {
      updatedMedications = medications.map(med =>
        med.id === editingMedication.id
          ? { ...med, name, dosage, schedule: updatedSchedule }
          : med
      );
    } else {
      const newMedication: Medication = {
        id: new Date().getTime()+ Math.floor(10000 + Math.random() * 90000) , // Simple unique ID
        name,
        dosage,
        schedule: updatedSchedule,
      };
      updatedMedications = [...medications, newMedication];
    }
    
    setMedications(updatedMedications);
    saveMedications(updatedMedications);

    setIsModalOpen(false);
    resetForm();
  };
  
  // Handles the data returned from the camera scan
  const handlePrescriptionScanned = (scannedMeds: Medication[]) => {
    if (scannedMeds.length === 0) {
      alert("No medications were found on the prescription.");
      return;
    }

    // Filter out any medications that might already be in the list to avoid duplicates
    const newMedsToAdd = scannedMeds.filter(
      scannedMed => !medications.some(existingMed => existingMed.name.toLowerCase() === scannedMed.name.toLowerCase())
    );

    if(newMedsToAdd.length === 0) {
      alert("All medications from the scan are already in your list.");
      return;
    }
    
    const updatedMedications = [...medications, ...newMedsToAdd];
    setMedications(updatedMedications);
    saveMedications(updatedMedications);

    alert(`Successfully added ${newMedsToAdd.length} new medication(s) to your list!`);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Your Medications</h1>
        {/* Add Medication Manually Button */}
        <div className="flex justify-between items-center mb-4 w-fit space-x-4">
            <button
              onClick={handleOpenAddModal}
              className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition"
              aria-label="Add new medication manually"
            >
              <PlusIcon />
            </button>
            <CameraView onPrescriptionScanned={handlePrescriptionScanned} />
        </div>

      </div>
      
      {/* List of Medications */}
      <div className="space-y-2 mb-24">
        {medications.length > 0 ? (
          medications.map(med => (
            <div key={med.id} className="p-3 bg-gray-100 rounded-lg shadow-sm flex justify-between items-center">
              <div>
                <p className="font-semibold text-gray-800">{med.name} - {med.dosage}</p>
                <p className="text-sm text-gray-600">
                  Take at: {med.schedule.join(', ')}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => handleOpenEditModal(med)} className="px-3 py-1 text-sm text-blue-600 bg-blue-100 rounded hover:bg-blue-200">Edit</button>
                <button onClick={() => handleDelete(med.id)} className="px-3 py-1 text-sm text-red-600 bg-red-100 rounded hover:bg-red-200">Delete</button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 px-4 border-2 border-dashed rounded-lg">
            <p className="text-gray-500">No medications added yet.</p>
            <p className="text-sm text-gray-400 mt-2">Click the + icon to add one manually or the scan icon to use your camera.</p>
          </div>
        )}
      </div>


      {/* Modal for the Manual Add/Edit Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">{editingMedication ? 'Edit Medication' : 'Add New Medication'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Medication Name</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="dosage" className="block text-sm font-medium text-gray-700">Dosage (e.g., 10mg)</label>
                <input
                  type="text"
                  id="dosage"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Schedule</label>
                {schedule.map((time, index) => (
                  <div key={index} className="flex items-center mt-2">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => handleTimeChange(index, e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    {schedule.length > 1 && (
                       <button type="button" onClick={() => handleRemoveTime(index)} className="ml-2 text-red-500 font-bold p-1 rounded-full hover:bg-red-100">X</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={handleAddTime} className="mt-2 text-sm text-blue-600 hover:underline">
                  + Add another time
                </button>
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
                  {editingMedication ? 'Save Changes' : 'Save Medication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}