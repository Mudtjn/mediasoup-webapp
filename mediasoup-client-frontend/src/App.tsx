import * as mediasoupClient from "mediasoup-client";
import { Producer, Transport } from "mediasoup-client/lib/types";
import { memo, useEffect, useRef, useState } from "react";

function App() {
  const socketRef = useRef<WebSocket>(null);
  const videoRef = useRef(null);
  const consumerVideoRef = useRef(null); 
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

  const loadDevice = async () => {
    try {
      const resp = JSON.stringify({ type: "getRouterRtpCapabilities" });
      socketRef.current.send(resp);
    } catch (error) {
      console.error("ERROR INITIALISING");
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
      const msg = {
        type: "connectConsumerTransport", 
        transportId: consumerTransport.current?.id, 
        dtlsParameters
      }
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
    const {producerId, consumerId, kind, rtpParameters} = event.data; 
    // const codecOption = {}; 
    const consumer = await consumerTransport.current?.consume({
      id: consumerId,
      producerId: producerId, 
      kind: kind, 
      rtpParameters: rtpParameters
    }); 

    const stream = new MediaStream(); 
    if(consumer) await stream.addTrack(consumer?.track);
    console.log(consumer?.track); 
    consumerVideoRef.current.srcObject = stream;
    console.log(consumerVideoRef.current.srcObject);   
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
          callback(resp.data.data.id);
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
          videoRef.current.srcObject = stream;
          console.log("published!!!!");
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
      <video ref={consumerVideoRef} autoPlay playsInline></video>
      <button onClick={startStreaming}>Start Streaming</button>
      <button onClick={subscribeToStream}>Subscribe</button>
      {/* <button onClick={stopStreaming}>Stop Streaming</button> */}
    </div>
  );
}

export default App;
