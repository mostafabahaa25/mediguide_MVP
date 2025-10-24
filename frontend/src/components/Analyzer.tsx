import { useState, useEffect, useRef } from 'react';
import Webcam from "react-webcam";
import { getMedications } from '../lib/medicationStore';
import type { Medication } from '../lib/medicationStore';
import { getTrackedMedications, saveTrackedMedications } from '../lib/trackerStore';
import type { TrackedMedication } from '../lib/trackerStore';
import ShimmerText from './kokonutui/shimmer-text';

// Define the expected structure of the analysis response from your API
interface AnalysisResult {
  summary: string;
  recommendations: string[];
  medication_id_found?: number;
}

const Analyzer = () => {
    const webcamRef = useRef(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const longPressTimer = useRef<NodeJS.Timeout>();
    const pointerStart = useRef<{ x: number, y: number } | null>(null); // For swipe detection

    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [lastTap, setLastTap] = useState<number>(0);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [trackedMedications, setTrackedMedications] = useState<TrackedMedication[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [showOverlay, setShowOverlay] = useState(false);

    // Load medications from local storage on initial render
    useEffect(() => {
      setMedications(getMedications());
      setTrackedMedications(getTrackedMedications());
    }, []);

    // Speak the analysis result when it's available
    useEffect(() => {
      if (analysisResult) {
        const textToSpeak = `
          Analysis Summary: ${analysisResult.summary}. 
          Recommendations: ${analysisResult.recommendations.join(", ")}
        `;
        speakText(textToSpeak);
      }
    }, [analysisResult]);

    const speakText = async (text: string) => {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      try {
        const apiUrl = import.meta.env.VITE_SPEAKER_API_URL;
        if (!apiUrl) {
          throw new Error("Speaker API URL is not configured. Make sure VITE_SPEAKER_API_URL is set in your .env file.");
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch audio.');
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.play();

      } catch (error) {
        console.error("Error speaking text:", error);
        alert("There was an error with the text-to-speech service.");
      }
    };


    // Double-tap handler for the camera view
    const handleCameraDoubleTap = async () => {
      if (webcamRef.current) {
        // @ts-ignore
        const image = webcamRef.current.getScreenshot();
        if (!image) return;
        
        setImageSrc(image); // Keep this to pass to the API
        setShowOverlay(true);
        setIsProcessing(true);
        setAnalysisResult(null);
        
        try {
          const apiUrl = import.meta.env.VITE_ANALYZE_API_URL;
          if (!apiUrl) {
              throw new Error("Analyzer API URL is not configured. Make sure VITE_ANALYZE_API_URL is set in your .env file.");
          }
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: image, medications: medications, takenToday: trackedMedications, time: new Date().toLocaleTimeString() }),
          });

          if (!response.ok) {
            throw new Error('Failed to process analysis.');
          }

          const data: AnalysisResult = await response.json();
          setAnalysisResult(data);

        } catch (error) {
          console.error("Error sending image for analysis:", error);
          alert("There was an error analyzing the image. Please try again.");
        } finally {
          setIsProcessing(false);
        }
      }
    };

    // Touch event handler for double-tap on camera
    const handleCameraTouch = () => {
      const now = Date.now();
      if (now - lastTap < 300) {
        handleCameraDoubleTap();
      }
      setLastTap(now);
    };

    // --- New logic for closing the overlay ---

    const closeOverlay = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setShowOverlay(false);
        setAnalysisResult(null);
        setImageSrc(null);
        speakText("جاهز لتصوير الدواء، اضغط مرتين على الشاشة للالتقاط");
    };

    // Gesture handlers for the overlay
    const handlePointerDown = (e: React.PointerEvent) => {
        pointerStart.current = { x: e.clientX, y: e.clientY };
        longPressTimer.current = setTimeout(() => {
            closeOverlay();
            pointerStart.current = null; // Prevent swipe from firing after long press
        }, 800);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!pointerStart.current) return;

        const deltaX = e.clientX - pointerStart.current.x;
        const deltaY = e.clientY - pointerStart.current.y;
        // If moved more than 10px, cancel the long press timer
        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
            if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
            }
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }

        if (!pointerStart.current) return;

        const deltaX = e.clientX - pointerStart.current.x;
        const deltaY = e.clientY - pointerStart.current.y;
        const swipeThreshold = 50; // Min distance for a swipe

        if (Math.abs(deltaX) > swipeThreshold) {
            closeOverlay();
        } else if (Math.abs(deltaY) > swipeThreshold) {
            if (analysisResult && analysisResult.medication_id_found) {
                const medId = analysisResult.medication_id_found;
                const medicationToTrack = medications.find(m => m.id === medId);

                if (medicationToTrack) {
                    const takenAtDate = new Date();
                    const year = takenAtDate.getFullYear();
                    const month = String(takenAtDate.getMonth() + 1).padStart(2, '0');
                    const day = String(takenAtDate.getDate()).padStart(2, '0');
                    const hours = String(takenAtDate.getHours()).padStart(2, '0');
                    const minutes = String(takenAtDate.getMinutes()).padStart(2, '0');
                    const seconds = String(takenAtDate.getSeconds()).padStart(2, '0');
                    const localTakenAtString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

                    const newTrackedMedication: TrackedMedication = {
                        id: medicationToTrack.id,
                        name: medicationToTrack.name,
                        dosage: medicationToTrack.dosage,
                        takenAt: localTakenAtString,
                    };

                    const currentTracked = getTrackedMedications();
                    // Avoid adding duplicates
                    if (!currentTracked.some(m => m.id === newTrackedMedication.id)) {
                        const updatedTrackedList = [...currentTracked, newTrackedMedication];
                        saveTrackedMedications(updatedTrackedList);
                        setTrackedMedications(updatedTrackedList);
                    }
                }
            }
            closeOverlay();
        }
        
        pointerStart.current = null;
    };


  return (
      <div 
        className="fixed inset-0 bg-black"
        onTouchEnd={!showOverlay ? handleCameraTouch : undefined}
        onDoubleClick={!showOverlay ? handleCameraDoubleTap : undefined}
      >
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          className="w-full h-full object-cover"
          videoConstraints={{
            facingMode: "environment"
          }}
          onUserMedia={() => speakText("جاهز لتصوير الدواء، اضغط مرتين على الشاشة للالتقاط")}
        />

        {showOverlay && (
            <div 
                className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                <div className="bg-white bg-opacity-20 backdrop-blur-lg rounded-lg p-5 text-white max-w-md w-full text-center">
                    {isProcessing && (
                        <>
                            <ShimmerText text="Analyzing..." className="font-mono text-2xl" />
                            <p className="text-sm mt-4">Long-press or swipe to cancel</p>
                        </>
                    )}

                    {analysisResult && (
                        <div>
                            <h3 className="text-2xl font-bold mb-4">Analysis Result</h3>
                            <p className="font-semibold text-lg">Summary:</p>
                            <p className="mb-4">{analysisResult.summary}</p>
                            <p className="font-semibold text-lg">Recommendations:</p>
                            <ul className="list-disc list-inside text-left">
                                {analysisResult.recommendations.map((rec, index) => (
                                <li key={index}>{rec}</li>
                                ))}
                            </ul>
                            <p className="text-sm mt-4">Long-press or swipe to close</p>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
  )
}

export default Analyzer;