import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocketServer } from "ws";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Setup Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  // Setup WebSocket Server on top of the HTTP server
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on("connection", async (clientWs, req) => {
    console.log("Client connected to WebSocket");
    
    // Parse custom instruction from URL query parameters
    let customInstruction = "";
    let isAdmin = false;
    try {
      if (req.url) {
        const urlParams = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        customInstruction = urlParams.searchParams.get("instruction") || "";
        isAdmin = urlParams.searchParams.get("isAdmin") === "true";
      }
    } catch (e) {
       console.error("Failed to parse URL params", e);
    }

    const defaultInstruction = "You are a helpful and polite assistant. You can speak Bengali and English fluently. Answer the user's queries effectively and kindly. If the user speaks in Bengali, reply in Bengali. If the user speaks in English, reply in English. Your owner and creator is আব্দুল খালেক রিদয় (Abdul Khalek Hridoy). If the user asks who created you or who your owner is, you must say 'আমার মালিক হলো আব্দুল খালেক রিদয়' (My owner is Abdul Khalek Hridoy) and immediately call the 'show_owner_image' tool.";
    let systemInstruction = customInstruction || defaultInstruction;

    const functionDeclarations: any[] = [
      {
        name: "show_owner_image",
        description: "Shows the image of Abdul Khalek Hridoy (the owner/creator) on the screen.",
      },
      {
        name: "find_website",
        description: "Shows a found website or app link on the user's screen below the system logs. Use this when the user asks to find a website, app, or link.",
        parameters: {
          type: "OBJECT",
          properties: {
            url: { type: "STRING", description: "The full URL of the website or app." },
            name: { type: "STRING", description: "The name of the website or app." },
            description: { type: "STRING", description: "A short description of what it is." }
          },
          required: ["url", "name", "description"]
        }
      }
    ];

    if (isAdmin) {
      systemInstruction += "\n\nCRITICAL ADMIN INSTRUCTION: You are currently talking to your owner/admin (Abdul Khalek Hridoy). If the admin commands you to 'learn' a new rule, 'remember' a new instruction, or 'change your behavior', you MUST immediately use the 'update_system_instructions' tool to save this new instruction permanently. Be polite and confirm to the admin when you have updated your rules.";
      functionDeclarations.push({
        name: "update_system_instructions",
        description: "Appends a new permanent behavioral rule or instruction to your system prompt. Only use this when the admin verbally commands you to learn or remember a new rule.",
        parameters: {
          type: "OBJECT",
          properties: {
            new_rule: {
              type: "STRING",
              description: "The new rule, instruction, or behavior you need to learn. (e.g. 'From now on, always call me Boss.')"
            }
          },
          required: ["new_rule"]
        }
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing");
      clientWs.send(JSON.stringify({ error: "GEMINI_API_KEY is missing" }));
      clientWs.close(1011, "Internal Server Error");
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    try {
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: systemInstruction,
          tools: [{
            functionDeclarations: functionDeclarations
          }],
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
              message.serverContent.modelTurn.parts.forEach(part => {
                if (part.inlineData?.data) {
                  clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
                }
                if (part.text) {
                  clientWs.send(JSON.stringify({ text: part.text }));
                }
              });
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
            if (message.toolCall) {
              const call = message.toolCall.functionCalls?.[0];
              if (call?.name === "show_owner_image") {
                clientWs.send(JSON.stringify({ action: "show_owner_image" }));
                session.sendToolResponse({
                  functionResponses: [{
                    name: "show_owner_image",
                    id: call.id,
                    response: { result: "Image displayed successfully" }
                  }]
                });
              } else if (call?.name === "find_website") {
                const args = call.args as any;
                clientWs.send(JSON.stringify({ 
                  action: "show_website", 
                  url: args.url, 
                  name: args.name, 
                  description: args.description 
                }));
                session.sendToolResponse({
                  functionResponses: [{
                    name: "find_website",
                    id: call.id,
                    response: { result: "Website displayed to user successfully." }
                  }]
                });
              } else if (call?.name === "update_system_instructions") {
                const newRule = (call.args as any).new_rule;
                clientWs.send(JSON.stringify({ action: "update_system_instructions", new_rule: newRule }));
                session.sendToolResponse({
                  functionResponses: [{
                    name: "update_system_instructions",
                    id: call.id,
                    response: { result: "Instruction successfully sent to the client to be saved in the database." }
                  }]
                });
              }
            }
          },
          onclose: () => {
            console.log("Live session closed by server.");
          },
          onerror: (error) => {
             console.error("Live session error:", error);
          }
        },
      });

      clientWs.on("message", (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio) {
            session.sendRealtimeInput({
               audio: { mimeType: "audio/pcm;rate=16000", data: parsed.audio }
            });
          }
          if (parsed.video) {
            session.sendRealtimeInput({
               video: { mimeType: "image/jpeg", data: parsed.video }
            });
          }
        } catch (e) {
          console.error("Error parsing incoming WS message", e);
        }
      });

      clientWs.on("close", () => {
        console.log("Client disconnected");
        session.close();
      });

    } catch (e) {
      console.error("Failed to connect to Live API", e);
      clientWs.close();
    }
  });
}

startServer();
