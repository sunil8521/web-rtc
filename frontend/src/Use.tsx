import { useContext, useEffect, useState, ReactNode } from "react";
import { createContext } from "react";


const Use = createContext<WebSocket | null>(null);

export default Use;

export const UseProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  useEffect(() => {
    const ws = new WebSocket(import.meta.env.VITE_WS as string);
    setSocket(ws);

    ws.onopen = () => {
      const id = Math.random().toString(36).substr(2, 9);
      ws.send(JSON.stringify({ type: "join", id }));
    };

    return () => {
      ws.close(); // Cleanup WebSocket on unmount
    };
  }, []);

  return <Use.Provider value={{socket}}>{children}</Use.Provider>;
};
