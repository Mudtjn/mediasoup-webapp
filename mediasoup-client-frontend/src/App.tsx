import * as mediasoupClient from "mediasoup-client";
import { Transport } from "mediasoup-client/lib/types";
import { useEffect, useRef, useState } from "react";

function App() {
  const socketRef = useRef<WebSocket>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const consumerVideoRef = useRef<HTMLVideoElement>(null); 
  const [consumerStream, setConsumerStream] = useState<MediaStream>(); 
  const device = useRef<mediasoupClient.Device>();
  const producerTransport = useRef<Transport>();
  const consumerTransport = useRef<Transport>(); 
  const [, setVideoProducer] = useState();
  // const [audioProducer, setAudioProducer] = useState();
  // const [consumers, setConsumers] = useState([]);
  const [, setVideoConsumer] = useState(); 

  useEffect(() => {
    socketRef.current = new WebSocket("ws://localhost:8080");
    socketRef.current.onopen = () => {
      console.log("SOCKET ESTABLISHED");
      loadDevice();
    };
    socketRef.current.onmessage = (data) => {
      let event;
      try {
        event = JSON.parse(data.data);
      } catch (err) {
        console.log("ERROR PARSING JSON");
      }
      // console.log(data); 
      event = JSON.parse(data.data);
      const type = event.type;
      switch (type) {
        case "routerCapabilities":
          onRouterRtpCapabilities(event);
          break;
        case "producerTransportCreated":
          onProduceTransportCreated(event);
          break;
        case "consumerTransportCreated": 
          onConsumerTransportCreated(event);
          break;
        case "resumed":
          console.log(event.data); 
          break;   
        case 'subsribed':
          onSubscribe(event); 
          break; 
        default:
          break;
      }
    };

    return () => {
      if (socketRef && socketRef.current) socketRef.current.close();
    };
  }, []);

  useEffect(()=> {
    if(consumerVideoRef.current && consumerStream){
      try {
        const videoElement = consumerVideoRef.current;
        videoElement.srcObject = consumerStream;
  
        const playVideo = async () => {
          try {
            await videoElement.play();
            console.log("Consumer video playback started successfully");
          } catch (error) {
            console.error("Error during consumer video playback:", error);
            // setPlaybackError(error.message);
          }
        };
  
        videoElement.onloadedmetadata = () => {
          console.log("Consumer video metadata loaded");
          playVideo();
        };
  
        videoElement.onplay = () => console.log("Consumer video started playing");
        videoElement.onpause = () => console.log("Consumer video paused");
        videoElement.onwaiting = () => console.log("Consumer video is waiting for more data");
        videoElement.onerror = (e) => console.error("Consumer video error:", e);
      } catch(err){
        console.error("ERROR PLAYING MEDIA ", err); 
      }
    } else if(!consumerStream){
      console.log("NO CONSUMER STREAM"); 
    } else if(!consumerVideoRef.current){
      console.log('NO CONSUMER VIDEO REF'); 
    }
  }, [consumerStream])

  const loadDevice = async () => {
    try {
      const resp = JSON.stringify({ type: "getRouterRtpCapabilities" });
      socketRef.current.send(resp);
    } catch (error) {
      // console.error("ERROR INITIALISING");
      console.error(error);
    }
  };

  const onConsumerTransportCreated = async(event) => {
    const transport = await device.current?.createRecvTransport({
      id: event.data.id,
      iceParameters: event.data.iceParameters,
      iceCandidates: event.data.iceCandidates,
      dtlsParameters: event.data.dtlsParameters,
    });
    consumerTransport.current = transport;

    consumerTransport.current?.on('connect', ({dtlsParameters}, callback, errback) => {
      console.log("CONSUMER TRANSPORT ID IS: ", consumerTransport.current?.id)
      console.log(dtlsParameters); 
      const msg = {
        type: "connectConsumerTransport", 
        transportId: consumerTransport.current?.id, 
        dtlsParameters
      }
      console.log(msg); 
      socketRef.current?.send(JSON.stringify(msg)); 
      socketRef.current?.addEventListener(
        "message", 
        async(event) => {
          const {type, data} = JSON.parse(event.data); 
          if(type=='error'){
            console.error(data); 
            return; 
          }
          if(type=='consumerConnected'){
            console.log('consumer connected'); 
            callback(); 
          }
          else {
            return; 
          }
        }
      )
    })
    consumerTransport.current?.on('connectionstatechange', async(state) => {
      switch(state) {
        case "connecting":
          console.log('connecting...'); 
          break;  
        case "connected":
        {
          console.log("connected"); 
          // consumerVideoRef.current?.srcObject = remoteStream; 
          const msg = {
            type: "resume", 
          }
          socketRef.current?.send(JSON.stringify(msg)); 
          break; 
        }
        case "failed": 
          console.error('failed to establish connection...'); 
          break; 
        default:
          break;
      }
    });
    consume(consumerTransport); 
  } 

  const onSubscribe = async(event) => {
    // console.log("ON SUBSRIBE"); 
    // console.log(event.data); 
    const {producerId, id, kind, rtpParameters} = event.data; 
    // const codecOption = {}; 
    const consumer = await consumerTransport.current?.consume({
      id: id,
      producerId: producerId, 
      kind: kind, 
      rtpParameters: rtpParameters
    }); 


    if(consumer){
      // console.log("GETTING CONSUMER STREAM"); 
      const stream = new MediaStream([consumer?.track]); 
      // console.log(stream); 
      // console.log('SETTING STREAM'); 
      // console.log(consumerVideoRef.current);  
      setConsumerStream(stream);
      // console.log(consumerVideoRef.current);   
    }
    // }

    // if(consumerVideoRef.current){
  }

  const consume = async(transport) => {
    const msg = {
      type: 'consume',  
      rtpCapabilities: device.current?.rtpCapabilities
    }
    const message = JSON.stringify(msg); 
    socketRef.current?.send(message); 
  }

  const createSendTransport = async () => {
    const message = {
      type: "createProducerTransport",
      forceTcp: false,
      rtpCapabilities: device.current?.rtpCapabilities,
    };
    const resp = JSON.stringify(message);
    socketRef.current?.send(resp);
  };

  const onRouterRtpCapabilities = async (event) => {
    const device1 = new mediasoupClient.Device();
    const { type, data } = event;
    await device1?.load({ routerRtpCapabilities: data });
    // console.log(device);
    device.current = device1;
    console.log("setDevice called with:", device1);
  };

  const setupEventListeners = async (stream: any) => {
    console.log('setting up event listeners'); 
    producerTransport.current?.on(
      "connect",
      ({ dtlsParameters }, callback, errback) => {
        console.log("connect transport called");
        const message = {
          type: "connectProducerTransport",
          transportId: producerTransport.current?.id, 
          dtlsParameters,
        };
        const resp = JSON.stringify(message);
        socketRef.current.send(resp);
        socketRef.current?.addEventListener(
          "message",
          async (event) => {
            console.log(event); 
            console.log("producer connected");
            callback();
          }
        );
      }
    );

    // begin transport producer
    producerTransport.current?.on("produce",
      ({ kind, rtpParameters }, callback, errback) => {
        console.log("produce called");
        const message = {
          type: "produce",
          transportId: producerTransport.current?.id,
          kind,
          rtpParameters,
        };
        const resp = JSON.stringify(message);
        socketRef.current.send(resp);
        socketRef.current?.addEventListener("message", (resp: any) => {
          const message = JSON.parse(resp.data);
          if(message.type!='produced') return;  
          console.log('------------------------------------------------'); 
          console.log(message);  
          callback(message.data.id);
        });
      }
    );
    // end transport producer

    // connection state change
    producerTransport.current?.on("connectionstatechange", async (state) => {
      switch (state) {
        case "connecting":
          console.log("publishing");
          break;
        case "connected": // videoRef.current.srObject = stream;
        {
          if(videoRef.current){
            videoRef.current.srcObject = stream;
            console.log("published!!!!");
          }
          break;
        }
        case "failed":
          producerTransport.current?.close();
          console.log("failed");
      }
    });
    // connection state change end
  }

  const onProduceTransportCreated = async (event: any) => {
    // console.log("onProduceTransportCreated");
    // console.log(device.current);
    const transport = await device.current?.createSendTransport({
      id: event.data.id,
      iceParameters: event.data.iceParameters,
      iceCandidates: event.data.iceCandidates,
      dtlsParameters: event.data.dtlsParameters,
    });
    producerTransport.current = transport;


    const stream = await getUserMedia(producerTransport);
    await setupEventListeners(stream); 
    const videoTrack = stream?.getVideoTracks()[0];
    console.log(videoTrack); 
    let videoProducer1; 
    try {
      await producerTransport.current?.produce({
        track: videoTrack
      });
    } catch(err) {
      console.error(err); 
    }
    console.log("VIDEO PRODUCER 1 IS");
    console.log(videoProducer1);  
    setVideoProducer(videoProducer1);
    // console.log(videoProducer); 
  };

  const subscribeToStream = async () => {
    const msg = {
      type: "createConsumerTransport", 
      forceTcp: false
    }; 
    const message = JSON.stringify(msg); 
    socketRef.current?.send(message);
  }

  const startStreaming = async () => {
    if (
      !device.current?.canProduce("audio") ||
      !device.current?.canProduce("video")
    ) {
      console.error("device cannot produce audio and video");
    } else {
      console.log("device can produce video");
    }

    if (!producerTransport.current) {
      await createSendTransport();
    }

    // try {
    //   const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

    //   const videoTrack = stream.getVideoTracks()[0];
    //   const audioTrack = stream.getAudioTracks()[0];

    //   const videoProducer = await producerTransport.current?.produce({ track: videoTrack });
    //   const audioProducer = await producerTransport.current?.produce({ track: audioTrack });

    //   setVideoProducer(videoProducer);
    //   setAudioProducer(audioProducer);
    //   console.log('Production started');
    // } catch (err) {
    //   console.error('Failed to start streaming', err);
    // }
  };

  const getUserMedia = async (transport) => {
    if (!device.current?.canProduce("video")) {
      console.error("device cannot produce audio and video");
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      return stream;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const stopStreaming = async () => {
    socketRef.current?.close();
    videoRef.current.srcObject = null;
    producerTransport.current?.close(); 
  };

  const send = (eventName: string, data: any) => {
    const message = data
      ? {
          type: eventName,
          data,
        }
      : {
          type: eventName,
        };
    console.log(message);
    socketRef.current?.send(JSON.stringify(message));
  };

  const onNewProducer = async () => {
    send("createConsumeTransport", null);
  };

  const onCreateConsumerTransport = async (event) => {
    const { type, data } = event;
    const transport = await device.current?.createRecvTransport(data);
  };

  return (
    <div className="App">
      <h1>Mediasoup Streaming</h1>
      <video ref={videoRef} autoPlay muted playsInline></video>
      
      { consumerStream ?
        <div>
          <h1>Hello World</h1>
          <video ref={consumerVideoRef} autoPlay controls playsInline style={{border: '1px solid red', width: '320px', height: '240px'}}></video>
          <h1>Hello</h1>
        </div>
        : <h1>No Video</h1>
      }
      <button onClick={startStreaming}>Start Streaming</button>
      <button onClick={subscribeToStream}>Subscribe</button>
      {/* <button onClick={stopStreaming}>Stop Streaming</button> */}
    </div>
  );
}

export default App;
