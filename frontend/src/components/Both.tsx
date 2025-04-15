import React, { useState, useEffect, useRef, useContext, use } from "react";
import Use from "../Use";

const Both: React.FC = () => {
  const { socket } = useContext(Use);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [isSender, setIsSender] = useState(false);
  const peer = useRef<RTCPeerConnection>(new RTCPeerConnection(
    {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:64.227.129.105:3478",
          username: "sunil",
          credential: "yourpassword123",
        } 
      ],
    }

  ));
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const file = useRef<File | null>(null);
  const iceQueue = useRef<RTCIceCandidateInit[]>([]); 
  const reciveSizeRef = useRef<number>(0); 
  const reciveArry = useRef<ArrayBuffer[]>([]);

  const reciveFile = useRef<HTMLAnchorElement[]>([]);
console.log(peerId)

  const fileDetails = useRef<{
    name: string;
    size: number;
    type: string;
    lastModified: number;
  } | null>(null);

  const selectedFile = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!socket) return;

    peer.current.ondatachannel = (event) => {
      const receiveChannel = event.channel;

      receiveChannel.onmessage = (event) => {
        
        reciveSizeRef.current =
          reciveSizeRef.current + event.data.byteLength;
        console.log("reciveSizeRef", reciveSizeRef.current);
        reciveArry.current.push(event.data);

        if (reciveSizeRef.current == fileDetails.current?.size) {
          const received = new Blob(reciveArry.current);
          const download = URL.createObjectURL(received);

          const anchor = document.createElement("a");
          anchor.href = download;
          anchor.download = fileDetails.current?.name;
          anchor.textContent = fileDetails.current?.name;
          document.querySelector("#containerRef")?.appendChild(anchor);
          reciveSizeRef.current = 0; // Reset the size for the next file
          reciveArry.current = []; // Reset the array for the next file
        }
      };

      receiveChannel.onopen = () => {
        if (receiveChannel) {
          const readyState = receiveChannel.readyState;
          console.log(`Receive channel state is: ${readyState}`);
        }
      };

      receiveChannel.onclose = () => {
        console.log("Receive channel closed");
      };
    };
    socket.onmessage = async (event: MessageEvent) => {
      const message = JSON.parse(event.data);

      if (message.type === "ready") {

        console.log("Peer is ready to connect:", message.peerId);
        setPeerId(message.peerId);



      } else if (message.type === "offer") {
        peer.current.onicecandidate = (event) => {
          if (event.candidate) {
            socket.send(
              JSON.stringify({
                type: "ice-candidate",
                candidate: event.candidate,
                to: message.to,
              })
            );
          }
        };



        await peer.current.setRemoteDescription(message.offer);

        const answer = await peer.current.createAnswer();
        await peer.current.setLocalDescription(answer);

        console.log("Sending answer to", message.to);
        socket.send(JSON.stringify({ type: "answer", answer, to: message.to }));
      } else if (message.type === "answer") {
        console.log("Received answer from", message.to);
        await peer.current.setRemoteDescription(message.answer);

        // Process any queued ICE candidates
        iceQueue.current.forEach(async (candidate) => {
          await peer.current.addIceCandidate(new RTCIceCandidate(candidate));
        });
        iceQueue.current = [];
      } else if (message.type === "ice-candidate") {
        console.log("Received ICE candidate from" , message.to);

        if (peer.current.remoteDescription) {
          // console.log("add ice candidate to peer");
          await peer.current.addIceCandidate(message.candidate);
        } else {
          // console.log("add to queue");
          iceQueue.current.push(message.candidate);
        }
      } else if (message.type === "file-details") {
        fileDetails.current = message.details;
        console.log("File details:", fileDetails.current);
      }
    };
  }, [socket]);



  const setupDataChannel = () => {
    if (!dataChannel.current) return;

    dataChannel.current.onopen = () => {
      console.log("Data channel is open!");
    };
    dataChannel.current.onmessage = (event) => {
      console.log("Received:", event.data);
    };
    dataChannel.current.onclose = () => {
      console.log("Data channel closed");
    };
    dataChannel.current.onerror = (error) => {
      console.error("Data channel error:", error);
    };
  };



  const selectFile = async (selectedFile: File) => {
    console.log(peerId)
    if (!peerId) {
      console.error("No peer available to send file.");
      return;
    }

    file.current = selectedFile;
    socket.send(
      JSON.stringify({
        type: "file-details",
        details: {
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type,
          lastModified: selectedFile.lastModified,
        },
        to: peerId,
      })
    );

    if (isSender) {
      console.log("Already a sender, no need to set up again.");
      return;
    }

    setIsSender(true);
    dataChannel.current = peer.current.createDataChannel("fileTransfer");
    dataChannel.current.binaryType = "arraybuffer";

    setupDataChannel();

    peer.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.send(
          JSON.stringify({
            type: "ice-candidate",
            candidate: event.candidate,
            to: peerId, 
          })
        );
      }
    };

    // Create and send offer
    try {
      const offer = await peer.current.createOffer();
      await peer.current.setLocalDescription(offer);
      socket.send(JSON.stringify({ type: "offer", offer, to: peerId }));
      console.log("Sending offer to", peerId);
    } catch (er) {
      console.log("Failed to create session description: ", er);
    }
  };

  const sendFileHandle = async () => {  //!send file
    if (!file.current || !dataChannel.current) return;
    console.log(
      `File is ${[
        file.current.name,
        file.current.size,
        file.current.type,
        file.current.lastModified,
      ].join(" ")}`
    );
    const chunkSize = 16 * 1024;
    dataChannel.current.bufferedAmountLowThreshold=64*1024

    const reader = new FileReader();
    let offset = 0;
    reader.onabort = (event) => console.log("File reading aborted:", event);
    reader.onerror = (er) => console.error("Error reading file:", er);

    reader.onload = async(e) => {
      if (e.target?.result && dataChannel.current?.readyState === "open") {
  
        if (dataChannel.current.bufferedAmount > dataChannel.current.bufferedAmountLowThreshold) {
                await new Promise<void>((res) => {
                  const handler = () => {
                    dataChannel.current?.removeEventListener("bufferedamountlow", handler);
                    res();
                  };
                  dataChannel.current?.addEventListener("bufferedamountlow", handler);
                });
              }

        dataChannel.current.send(e.target.result); // Indicate file transfer is complete
        console.log("Sent chunk:", offset, e.target.result.byteLength);
        offset += e.target.result.byteLength;

        if (offset < file.current.size) {
          readSlice(offset);
        } else {
          
          selectedFile.current!.value = "";
          file.current = null; 
          console.log("File transfer complete!");
          if (dataChannel.current) {
            dataChannel.current.close();
            dataChannel.current = null;
            setIsSender(false);
          }
        }
      }
    };//end onload


    const readSlice = (o: number) => {
      const slice = file.current?.slice(offset, o + chunkSize);
      reader.readAsArrayBuffer(slice);
    };
    readSlice(0);
  };
 
  // const sendFileHandle = async () => {
  //   if (!file.current || !dataChannel.current) return;
  
  //   const dc = dataChannel.current;
  //   const chunkSize = 16 * 1024; 
  //   const fileBlob = file.current;
  //   let offset = 0;
  
  //   dc.bufferedAmountLowThreshold = 64 * 1024;
  
  //   const readSlice = (blob: Blob): Promise<ArrayBuffer> => {
  //     return new Promise((resolve, reject) => {
  //       const reader = new FileReader();

  //       reader.onload = () => resolve(reader.result as ArrayBuffer);
  //       reader.onerror = reject;
  //       reader.readAsArrayBuffer(blob);
  //     });
  //   };
  
  //   while (offset < fileBlob.size) {
  //     const slice = fileBlob.slice(offset, offset + chunkSize);
  //     const chunk = await readSlice(slice);
  
  //     if (dc.bufferedAmount > dc.bufferedAmountLowThreshold) {
  //       await new Promise<void>((res) => {
  //         const handler = () => {
  //           dc.removeEventListener("bufferedamountlow", handler);
  //           res();
  //         };
  //         dc.addEventListener("bufferedamountlow", handler);
  //       });
  //     }
  
  //     try {
  //       dc.send(chunk);
  //     } catch (err) {
  //       console.error("Send failed:", err);
  //       break;
  //     }
  
  //     offset += chunkSize;
  //   }
  
  //   console.log("✅ File sent successfully!");
  //   selectedFile.current!.value = "";
  //   file.current = null;
  
  //   if (dc) {
  //     dc.close();
  //     dataChannel.current = null;
  //     setIsSender(false);
  //   }
  // };
  

  return (
    <div className="p-4 bg-gray-100 rounded-lg shadow-md max-w-md mx-auto">
      <h2 className="text-lg font-bold mb-2">WebRTC File Sharing</h2>

      <input
        ref={selectedFile}
        type="file"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) selectFile(selected);
        }}        className="border p-2 rounded w-full"
      />
      <button
        onClick={sendFileHandle}
        disabled={!file.current}
        className="mt-2 bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {file.current ? "Send" : "No file selected"}
      </button>
      {reciveFile.current.map((item, index) => {
        return (
          <div key={index}>
            <a href={item.href} download={item.download}>
              {item.textContent}
            </a>
          </div>
        );
      })}
      {/* <a ref={Click}>wait</a> */}

      <div
        style={{ display: "flex", flexDirection: "column" }}
        id="containerRef"
      ></div>
    </div>
  );
};

export default Both;
