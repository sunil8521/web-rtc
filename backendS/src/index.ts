import { WebSocketServer, WebSocket } from "ws";
const wss = new WebSocketServer({ port: 3000 });

type PeerT = Record<string, string>;

// type peers = {[string]:PeerT};
const rooms: Map<string, PeerT> = new Map();

wss.on("connection", (ws: WebSocket) => {
  let userId: undefined | string;

  ws.on("message", (message: string) => {
    const data = JSON.parse(message);

    if (data.type == "create-room") {
      // userId = data.userId;
      // rooms.set(data.roomId, { [userId!]: ws });
      rooms.set(data.roomId, { });
      ws.send(
        JSON.stringify({
          type: "join-success",
          roomId: data.roomId,
        })
      );
      // console.log(data);
    } else if (data.type == "join-room") {
      // userId = data.userId;

      if (rooms.has(data.roomId)) {
        const room = rooms.get(data.roomId);

        if (room) {
          if ( Object.keys(room).length > 2) {
            ws.send(
              JSON.stringify({
                type: "join-error",
                errorMessage: "Room is full. Cannot join more than 2 users.",
              })
            );
          } else {
            console.log(data);

            // room[userId!] = ws;
            ws.send(
              JSON.stringify({
                type: "join-success",
                roomId: data.roomId,
              })
            );
          }
        }
      } else {
        ws.send(
          JSON.stringify({
            type: "join-error",
            errorMessage: "Room not found.",
          })
        );
      }
    } else if (data.type === "add-me") {
    if(!rooms.has(data.roomId)){
      ws.send(
        JSON.stringify({
          type: "join-error",
          errorMessage: "Room not found.",
        })
      );
    }else{
      const room = rooms.get(data.roomId);

      if (Object.keys(room!).length >= 2) {
        ws.send(
          JSON.stringify({
            type: "join-error",
            errorMessage: "Room is full. Cannot join more than 2 users.",
          })
        );
      }else{
        
      }
    }





      // room![data.userId!] = "ws";
      // console.log(room);
      
     
      

    }else if (data.type === "leave-room") {
      const room = rooms.get(data.roomId);
      
    //  console.log(room)
    }

    if (data.type === "join") {
      userId = data.id;
      // console.log("User joined with id: ", userId);
      // peers[userId!] = ws;

      // const peerIds = Object.keys(peers);
      //   if (peerIds.length === 2) {
      //     peerIds.forEach((id) => {
      //       peers[id].send(
      //         JSON.stringify({
      //           type: "ready",
      //           peerId: peerIds.find((p) => p !== id),
      //         })
      //       );
      //     });
      //   }
      // } else if (["offer", "answer", "ice-candidate","file-details"].includes(data.type)) {
      //   peers[data.to].send(JSON.stringify({ ...data, to: userId }));
    }
  });

  ws.on("close", () => {
    if (userId) {
      // delete peers[userId];
    }
  });
});
