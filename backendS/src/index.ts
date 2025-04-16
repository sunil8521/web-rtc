import { WebSocketServer, WebSocket } from "ws";
const wss = new WebSocketServer({ port: 3000,host:"10.9.6.154" });
type PeerT = Record<string, WebSocket>;
const peers: PeerT = {};

wss.on("connection", (ws: WebSocket) => {
  let userId: undefined | string;

  ws.on("message", (message: string) => {
    const data = JSON.parse(message);
    // console.log(data);
    if (data.type === "join") {
      userId = data.id;
      console.log("User joined with id: ", userId);
      peers[userId!] = ws;

      const peerIds = Object.keys(peers);
      if (peerIds.length === 2) {
        peerIds.forEach((id) => {
          peers[id].send(
            JSON.stringify({
              type: "ready",
              peerId: peerIds.find((p) => p !== id),
            })
          );
        });
      }
    } else if (["offer", "answer", "ice-candidate","file-details"].includes(data.type)) {
      peers[data.to].send(JSON.stringify({ ...data, to: userId })); 
    }
  });

  ws.on("close", () => {
    if (userId) {
      delete peers[userId];
    }
  });
});
