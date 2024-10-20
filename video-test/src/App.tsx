import React, { useState, useEffect, useRef } from "react";

function CameraComponent() {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    let stream;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
      } catch (error) {
        console.error("Error accessing camera:", error);
      }
    };

    const stopCamera = () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    };

    if (isCameraOn) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isCameraOn]);

  return (
    <div>
      <button onClick={() => setIsCameraOn(!isCameraOn)}>
        {isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
      </button>
      <video ref={videoRef} autoPlay playsInline />
    </div>
  );
}

export default CameraComponent;