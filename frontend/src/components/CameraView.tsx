import { useState, useRef, useEffect } from 'react';
import type { Medication } from '../lib/medicationStore';
// A simple Camera/Scan Icon
const ScanIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
    <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.152-.177.465-.067.87-.327 1.11-.71l.821-1.317a3.093 3.093 0 012.332-1.39zM12 18a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
  </svg>
);


// Define the expected structure of the JSON response from your LLM
interface ScannedMedication {
  name: string;
  dosage: string;
  schedule: string[];
}

interface CameraViewProps {
  onPrescriptionScanned: (scannedMeds: Medication[]) => void;
}

export default function CameraView({ onPrescriptionScanned }: CameraViewProps) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Function to start the camera stream
  const startCamera = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' } // Prioritize the rear camera
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing the camera:", error);
        alert("Could not access the camera. Please check permissions.");
      }
    }
  };

  // Function to stop the camera stream
  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      videoRef.current!.srcObject = null;
    }
  };
  
  // Effect to manage starting/stopping the camera when the modal opens/closes
  useEffect(() => {
    if (isCameraOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    // Cleanup function to ensure camera stops if component unmounts
    return () => stopCamera();
  }, [isCameraOpen]);


  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match the video feed
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    context?.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get the image data as a Base64 string
    const imageData = canvas.toDataURL('image/jpeg');

    try {
      // **This is where you send the image to your backend API**
      // Get the API URL from the environment variable
      const apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl) {
          throw new Error("API URL is not configured. Make sure VITE_API_URL is set in your .env file.");
      }
      
      // Use the live API endpoint
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });

      if (!response.ok) {
        throw new Error('Failed to process prescription.');
      }

      const data: { medications: ScannedMedication[] } = await response.json();
      
      // Convert the scanned data into the Medication format for our app
      const newMedications: Medication[] = data.medications.map(med => ({
        id: new Date().getTime() + Math.floor(10000 + Math.random() * 90000), // Create a unique enough ID
        name: med.name,
        dosage: med.dosage,
        schedule: med.schedule,
      }));
      
      onPrescriptionScanned(newMedications);

    } catch (error) {
      console.error("Error sending image for processing:", error);
      alert("There was an error scanning the prescription. Please try again.");
    } finally {
      setIsProcessing(false);
      setIsCameraOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsCameraOpen(true)}
        className="flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition"
        aria-label="Scan new prescription"
      >
        <ScanIcon />
      </button>

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          
          {isProcessing && (
            <div className="absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center text-white">
                <p className="text-xl">Processing Prescription...</p>
                <p className="mt-2">This may take a moment.</p>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-4 bg-black bg-opacity-50 flex justify-center items-center space-x-8">
             <button onClick={() => setIsCameraOpen(false)} className="text-white text-sm">Cancel</button>
             <button
                onClick={handleCapture}
                disabled={isProcessing}
                className="w-20 h-20 bg-white rounded-full border-4 border-gray-400 focus:outline-none disabled:opacity-50"
                aria-label="Capture photo"
             />
             <div className="w-12"></div> {/* Spacer */}
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </>
  );
}