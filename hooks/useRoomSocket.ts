"use client";

import { useEffect, useRef } from "react";
import io from "socket.io-client";

export interface PlayerStartData {
  time: number;
  startAt: number;
}

export interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}

export interface Reaction {
  emoji: string;
  user: string;
  roomId?: string;
}

export interface RoomSocketCallbacks {
  onPlayerStart: (data: PlayerStartData) => void;
  onChatMessage?: (msg: Message) => void;
  onReaction?: (data: Reaction) => void;
  onUserJoined?: (data: { username: string; roomId: string }) => void;
  onUserLeft?: (data: { username: string; roomId: string }) => void;
  onPlayerUpdate?: (data: any) => void;
  onStreamEnded?: () => void; 
}

export function useRoomSocket(
  roomId: string,
  isHost: boolean,
  callbacks: RoomSocketCallbacks
) {
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const socket = io("https://backend-streamhive.onrender.com");
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Conectado:", socket.id);
      socket.emit("join-room", roomId);
      if (!isHost) {
        console.log("[Socket] Solicitando sincronização para o novo participante");
        socket.emit("request:sync", { roomId });
      }
    });

    socket.on("player:sync", (data: PlayerStartData) => {
      console.log("[Socket] Evento player:sync recebido:", data);
      callbacks.onPlayerStart(data);
    });

    socket.on("player:start", (data: PlayerStartData) => {
      console.log("[Socket] Evento player:start recebido:", data);
      callbacks.onPlayerStart(data);
    });

    if (callbacks.onPlayerUpdate) {
      socket.on("player:update", (data: any) => {
        console.log("[Socket] Evento player:update recebido:", data);
        callbacks.onPlayerUpdate!(data);
      });
    }

    if (callbacks.onChatMessage) {
      socket.on("chat:new-message", (msg: Message) => {
        console.log("[Socket] Nova mensagem:", msg);
        callbacks.onChatMessage!(msg);
      });
    }

    if (callbacks.onReaction) {
      socket.on("reaction:sent", (data: Reaction) => {
        console.log("[Socket] Reação recebida:", data);
        callbacks.onReaction!(data);
      });
    }

    if (callbacks.onUserJoined) {
      socket.on("user:joined", (data: { username: string; roomId: string }) => {
        console.log("[Socket] Usuário entrou:", data);
        callbacks.onUserJoined!(data);
      });
    }

    if (callbacks.onUserLeft) {
      socket.on("user:left", (data: { username: string; roomId: string }) => {
        console.log("[Socket] Usuário saiu:", data);
        callbacks.onUserLeft!(data);
      });
    }

    if (callbacks.onStreamEnded) {
      socket.on("stream:ended", () => {
        console.log("[Socket] Evento stream:ended recebido");
        if (callbacks.onStreamEnded) {
          callbacks.onStreamEnded();
        }
      });
    }

    return () => {
      console.log("[Socket] Desconectando...");
      socket.disconnect();
    };
  }, [roomId]);

  const startPlayback = (currentTime: number) => {
    if (isHost && socketRef.current) {
      const startDelay = 300;
      socketRef.current.emit("player:play", {
        roomId,
        data: {
          time: currentTime,
          startAt: Date.now() + startDelay,
        },
      });

      callbacks.onPlayerStart({
        time: currentTime,
        startAt: Date.now() + startDelay,
      });
    }
  };

  const endStream = () => {
    if (isHost && socketRef.current) {
      socketRef.current.emit("stream:ended", { roomId });
    }
  };

  return { startPlayback, endStream, socket: socketRef.current };
}
