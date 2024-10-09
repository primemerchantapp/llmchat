import { useChatContext } from "@/lib/context";
import { formatTickerTime } from "@/lib/utils/utils";
import {
  AudioVisualizer,
  Button,
  Dialog,
  DialogContent,
  Flex,
  LinearSpinner,
  Tooltip,
  Type,
} from "@/ui";
import { Check, Circle, X } from "lucide-react";
import { FC, useEffect, useState } from "react";
import axios from "axios";

export type TAudioRecorder = {
  sendMessage: (message: string) => void;
};

export const AudioRecorder: FC<TAudioRecorder> = ({ sendMessage }) => {
  const { store } = useChatContext();
  const session = store((state) => state.session);
  const editor = store((state) => state.editor);

  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [text, setText] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalElement(document.body);
  }, []);

  // AssemblyAI WebSocket URL for real-time transcription
  const ASSEMBLYAI_REALTIME_URL = 'wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000';
  const API_KEY = '7cdbbc6426df4774af5ce404c6b8948a'; // Already integrated AssemblyAI API key

  const startVoiceRecording = async () => {
    setRecording(true);
    const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setStream(mediaStream);

    const mediaRecorder = new MediaRecorder(mediaStream);
    const audioChunks: Blob[] = [];

    const socket = new WebSocket(ASSEMBLYAI_REALTIME_URL, ['authorization', API_KEY]);

    socket.onopen = () => {
      console.log("WebSocket connection established for real-time transcription.");
    };

    socket.onmessage = (message) => {
      const response = JSON.parse(message.data);
      if (response.text) {
        if (response.message_type === "PartialTranscript") {
          console.log("Partial:", response.text);
        } else if (response.message_type === "FinalTranscript") {
          setText(response.text); // Set the final transcript
          console.log("Final:", response.text);
        }
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed.");
    };

    mediaRecorder.addEventListener("dataavailable", (event) => {
      audioChunks.push(event.data);
    });

    mediaRecorder.start();

    mediaRecorder.addEventListener("stop", async () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
      const audioArrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = new Uint8Array(audioArrayBuffer);

      if (socket.readyState === WebSocket.OPEN) {
        socket.send(audioBuffer);
      }
    });

    setTimeout(() => {
      mediaRecorder.stop();
      setRecording(false);
    }, 60000); // Automatically stop after 1 minute
  };

  useEffect(() => {
    if (text && session) {
      editor?.commands.clearContent();
      editor?.commands.setContent(text);
      sendMessage(text);
    }
  }, [text]);

  return (
    <Flex>
      <Tooltip content="Record">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => {
            startVoiceRecording();
          }}
        >
          <Circle size={16} strokeWidth="2" />
        </Button>
      </Tooltip>
      {transcribing && (
        <Flex
          items="center"
          justify="center"
          gap="sm"
          className="absolute inset-0 z-[50] h-full w-full bg-white/50 backdrop-blur-sm dark:bg-zinc-800/50"
        >
          <LinearSpinner /> <Type textColor="secondary">Transcribing ...</Type>
        </Flex>
      )}

      <Dialog
        open={recording}
        onOpenChange={() => {
          setRecording(false);
        }}
      >
        <DialogContent ariaTitle="Record Voice" className="!max-w-[400px]">
          <Flex direction="col" items="center" justify="center">
            <Flex items="center" direction="col" gap="sm" justify="between">
              <Flex direction="row" gap="sm" items="center" className="p-6">
                <Flex
                  gap="xs"
                  items="center"
                  className="rounded-full bg-zinc-100 px-4 py-2 dark:bg-zinc-700"
                >
                  <Type size="base" weight="medium" className="flex-shrink-0">
                    {formatTickerTime(elapsedTime)}
                  </Type>
                  <Type
                    textColor="tertiary"
                    size="base"
                    weight="medium"
                    className="flex-shrink-0"
                  >
                    / 1:00
                  </Type>
                </Flex>
              </Flex>

              <AudioVisualizer stream={stream} />

              <Flex gap="sm" className="w-full p-6" justify="center">
                <Button
                  variant="secondary"
                  rounded="full"
                  size="lg"
                  onClick={() => {
                    setRecording(false);
                  }}
                  className="group"
                >
                  <X size={16} strokeWidth="2" />
                  Cancel
                </Button>
                <Button
                  rounded="full"
                  size="lg"
                  onClick={() => {
                    setRecording(false);
                  }}
                  className="group"
                >
                  <Check size={16} strokeWidth="2" />
                  Done
                </Button>
              </Flex>
            </Flex>
          </Flex>
        </DialogContent>
      </Dialog>
    </Flex>
  );
};