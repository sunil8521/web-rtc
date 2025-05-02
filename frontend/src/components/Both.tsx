import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useAtomValue } from "jotai";
import { socketAtom } from "../socket";
import { getUserId, clearUserId } from "../utils/generator";

import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom"; // important for redirect

const Both: React.FC = () => {
  const socket = useAtomValue(socketAtom);
  const { ROOMID } = useParams<{ ROOMID: string }>();

  const [peerId, setPeerId] = useState<string | null>(null);
  const [isSender, setIsSender] = useState(false);

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadComplete, setUploadComplete] = useState<boolean>(false);

  // const peer = useRef<RTCPeerConnection>(
  //   new RTCPeerConnection({
  //     iceServers: [
  //       { urls: "stun:stun.l.google.com:19302" },
  //       {
  //         urls: "turn:64.227.129.105:3478",
  //         username: "sunil",
  //         credential: "yourpassword123",
  //       },
  //     ],
  //   })
  // );
  const peer = useRef<RTCPeerConnection | null>(null);


  const dataChannel = useRef<RTCDataChannel | null>(null);
  const file = useRef<File | null>(null);
  const iceQueue = useRef<RTCIceCandidateInit[]>([]);
  const reciveSizeRef = useRef<number>(0);
  const reciveArry = useRef<ArrayBuffer[]>([]);
  const [showFile, setShowFile] = useState<File | null>(null);
  const [reciveFile, setReciveFile] = useState<
    {
      href: string;
      name: string;
    }[]
  >([]);
  const fileDetails = useRef<{
    name: string;
    size: number;
    type: string;
    lastModified: number;
  } | null>(null);
  const navigate = useNavigate();

  const selectedFile = useRef<HTMLInputElement | null>(null);

  const myId = getUserId();
  console.log("myId", myId);


  useEffect(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:64.227.129.105:3478",
          username: "sunil",
          credential: "yourpassword123",
        },
      ],
    });
    peer.current = pc;

    // send every ice candidate
    // pc.onicecandidate = (evt) => {
    //   if (evt.candidate && peerId) {
    //     socket.send(
    //       JSON.stringify({
    //         type: "ice-candidate",
    //         candidate: evt.candidate,
    //         to: peerId,
    //         roomId: ROOMID,
    //       })
    //     );
    //   }
    // };

    // cleanup: close pc + datachannel
    return () => {
      pc.close();
      dataChannel.current?.close();
      dataChannel.current = null;
      peer.current = null;
    };
  }, []);

  useEffect(() => {
    if (!socket || !ROOMID) return;

    const payload = {
      type: "add-me",
      roomId: ROOMID,
      userId: myId,
    };

    const trySendJoin = () => {
      try {
        socket.send(JSON.stringify(payload));
        socket.onmessage = async (event: MessageEvent) => {
          const message = JSON.parse(event.data);
          if (message.type === "join-error") {
            toast.error(message.errorMessage);
            navigate("/");
            return;
          }
        };
      } catch (err) {
        console.error("Failed to send join-room:", err);
      }
    };

    // If already open, send immediately…
    if (socket.readyState === WebSocket.OPEN) {
      trySendJoin();
    } else {
      // …otherwise wait for the "open" event
      const onOpen = () => {
        trySendJoin();
        socket.removeEventListener("open", onOpen);
      };
      socket.addEventListener("open", onOpen);
    }

    // you can still return your old cleanup:
    return () => {
      socket.send(
        JSON.stringify({
          type: "leave-room",
          roomId: ROOMID,
          userId: myId,
        })
      );
      clearUserId();
//       peer.current.close();
// peer.current.onicecandidate = null;

    };
  }, [socket, ROOMID, myId, navigate]);

  useEffect(() => {
    if (!socket) return;
    if (!peer.current) return;
// peer.current.onClose

    peer.current.ondatachannel = (event) => {
      const receiveChannel = event.channel;

      receiveChannel.binaryType = "arraybuffer";

      receiveChannel.onmessage = async(event) => {

        let buf: ArrayBuffer;
        if (event.data instanceof Blob) {
          buf = await event.data.arrayBuffer();
        } else {
          buf = event.data;
        }



        reciveSizeRef.current = reciveSizeRef.current + buf.byteLength;
        console.log("reciveSizeRef", reciveSizeRef.current);



        reciveArry.current.push(buf);

        if (reciveSizeRef.current == fileDetails.current?.size) {
          const received = new Blob(reciveArry.current);
          const download = URL.createObjectURL(received);

          // const anchor = document.createElement("a");
          // anchor.href = download;
          // anchor.download = fileDetails.current?.name;
          // anchor.textContent = fileDetails.current?.name;
          // document.querySelector("#containerRef")?.appendChild(anchor);

          setReciveFile((e) => [
            ...e,
            { href: download, name: fileDetails.current?.name as string },
          ]);

          reciveSizeRef.current = 0;
          reciveArry.current = [];
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
                roomId: ROOMID,
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
        socket.send(
          JSON.stringify({
            roomId: ROOMID,
            type: "answer",
            answer,
            to: message.to,
          })
        );
      } else if (message.type === "answer") {
        console.log("Received answer from", message.to);
        await peer.current.setRemoteDescription(message.answer);

        // Process any queued ICE candidates
        iceQueue.current.forEach(async (candidate) => {
          await peer.current.addIceCandidate(new RTCIceCandidate(candidate));
        });
        iceQueue.current = [];
      } else if (message.type === "ice-candidate") {
        console.log("Received ICE candidate from", message.to);

        if (peer.current.remoteDescription) {
          // console.log("add ice candidate to peer");
          await peer.current.addIceCandidate(message.candidate);
        } else {
          // console.log("add to queue");
          iceQueue.current.push(message.candidate);
        }
      } else if (message.type === "file-details") {
        fileDetails.current = message.details;
        // console.log("File details:", fileDetails.current);
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
    if (!peerId) {
      toast.error("There is no other peer to send");

      return;
    }
    file.current = selectedFile;
    socket!.send(
      JSON.stringify({
        type: "file-details",
        roomId: ROOMID,
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
        socket!.send(
          JSON.stringify({
            roomId: ROOMID,
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
      socket!.send(
        JSON.stringify({ roomId: ROOMID, type: "offer", offer, to: peerId })
      );
      console.log("Sending offer to", peerId);
    } catch (er) {
      console.log("Failed to create session description: ", er);
    }
  };

  const sendFileHandle = async () => {
    //!send file
    if (!file.current || !dataChannel.current) return;

    setIsUploading(true);
    setUploadProgress(0);
    console.log(
      `File is ${[
        file.current.name,
        file.current.size,
        file.current.type,
        file.current.lastModified,
      ].join(" ")}`
    );
    const chunkSize = 16 * 1024;
    dataChannel.current.bufferedAmountLowThreshold = 64 * 1024;

    const reader = new FileReader();
    let offset = 0;
    reader.onabort = (event) => console.log("File reading aborted:", event);
    reader.onerror = (er) => console.error("Error reading file:", er);

    reader.onload = async (e) => {
      if (e.target?.result && dataChannel.current?.readyState === "open") {
        if (
          dataChannel.current.bufferedAmount >
          dataChannel.current.bufferedAmountLowThreshold
        ) {
          await new Promise<void>((res) => {
            const handler = () => {
              dataChannel.current?.removeEventListener(
                "bufferedamountlow",
                handler
              );
              res();
            };
            dataChannel.current?.addEventListener("bufferedamountlow", handler);
          });
        }
        dataChannel.current.send(e.target.result); // Indicate file transfer is complete
        console.log("Sent chunk:", e.target.result.byteLength);
        offset += e.target.result.byteLength;
        setUploadProgress(Math.floor((offset / file.current.size) * 100));
        if (offset < file.current.size) {
          readSlice(offset);
        } else {
          selectedFile.current!.value = "";
          file.current = null;
          setShowFile(null);
          console.log("File transfer complete!🚀");
          if (dataChannel.current) {
            // peer.current.onicecandidate = null;
            dataChannel.current.close();
            dataChannel.current = null;
            setIsSender(false);
            setIsUploading(false);
            setUploadComplete(true);
          }
        }
      }
    }; //end onload

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
    <div className="min-h-screen flex items-center justify-center bg-[#111111] p-4 font-sans">
      <div className="absolute top-4 left-4 space-y-1">
        <p className="text-sm text-gray-400">Room ID:</p>
        <p className="text-lg font-bold text-gray-200 break-all">{ROOMID}</p>
        <p className="text-xs text-gray-500">
          Copy and share this <strong>ID</strong> with your peer to start file
          transfer.
        </p>
      </div>

      <div className="w-full max-w-md bg-[#161616] rounded-xl p-8 space-y-8">
        <h1 className="text-[#f2f2f2] text-xl font-light tracking-wide text-center">
          File Transfer
        </h1>

        <div
          onClick={() => selectedFile.current?.click()}
          className={`
            relative h-40 flex flex-col items-center justify-center rounded-lg transition-all duration-300
            ${
              file.current
                ? "bg-[#1e1e1e] border-[#2a2a2a] border"
                : "bg-gradient-to-b from-[#1a1a1a] to-[#161616] border-dashed border-[#2a2a2a] border-2"
            }
            cursor-pointer hover:bg-[#1a1a1a]
          `}
        >
          <input
            type="file"
            ref={selectedFile}
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) {
                selectFile(selected);
                setShowFile(selected);
                setUploadProgress(0);
                setUploadComplete(false);
              }
            }}
            className="hidden"
          />

          {showFile ? (
            <div className="text-center px-4">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#2a2a2a] flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#f2f2f2]"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <p className="text-[#f2f2f2] font-medium text-sm  max-w-[90%] mx-auto">
                {showFile.name}
              </p>
              <p className="text-[#888888] text-xs mt-1">
                {(showFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div className="text-center px-4">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#2a2a2a] flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#888888]"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </div>

              <p className="text-[#f2f2f2] font-medium text-sm">
                Select a file
              </p>
              <p className="text-[#888888] text-xs mt-1">
                Click to browse your files
              </p>
            </div>
          )}
        </div>

        {(isUploading || uploadComplete) && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[#888888] text-xs">Progress</span>
              <span className="text-[#f2f2f2] text-xs font-medium">
                {uploadProgress}%
              </span>
            </div>
            <div className="h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ease-out ${
                  uploadComplete ? "bg-[#4ade80]" : "bg-[#3b82f6]"
                }`}
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={sendFileHandle}
            disabled={!showFile}
            className="flex-1 bg-[#3b82f6] text-white py-3 rounded-lg text-sm font-medium transition-all 
                disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2563eb] focus:outline-none
                focus:ring-2 focus:ring-[#3b82f6] focus:ring-opacity-50"
          >
            {isUploading ? "Sending..." : "Send File"}
          </button>
        </div>

        <div
          id="containerRef"
          className="w-full max-w-md mx-auto mt-6 p-4 rounded-2xl shadow-lg bg-white dark:bg-zinc-900"
        >
          {/* Heading */}
          <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-4">
            Received Files
          </h2>

          {reciveFile.map((item, index) => {
            return (
              <div
                key={index}
                className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl my-3"
              >
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate w-3/4">
                  {item.name}
                </span>

                <a
                  className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:underline"
                  href={item.href}
                  download={item.name}
                >
                  download
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Both;
