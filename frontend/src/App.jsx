import React, { useState } from "react";
import Analyzer from "./components/Analyzer";
import MedicationManager from "./components/MedicationManager";
import Tracker from "./components/Tracker";
import SmoothTab from './components/kokonutui/smooth-tab';

export default function App() {
  return (
    <main className="max-w-lg rounded-xl overflow-hidden mx-auto">
      <SmoothTab className='h-full'
      items={[
        { id: 'analyzer', title: 'Analyzer', cardContent:(<Analyzer />) },
        { id: 'medications', title: 'Medications', cardContent:(<MedicationManager />) },
        { id: 'tracker', title: 'Tracker', cardContent:(<Tracker />) },
      ]} 
      defaultTabId="analyzer" />
    </main>
  );
}