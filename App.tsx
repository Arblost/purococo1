
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Chat, FunctionDeclaration, Type } from '@google/genai';
import { Message } from './types';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';

// Definición de la función que el modelo de Gemini puede llamar.
// Esto le da al modelo una estructura de datos que debe llenar.
const guardarPedidoFunctionDeclaration: FunctionDeclaration = {
  name: 'guardarPedido',
  parameters: {
    type: Type.OBJECT,
    description: 'Guarda los detalles de un pedido en una hoja de cálculo.',
    properties: {
      nombre: {
        type: Type.STRING,
        description: 'Nombre del cliente o de la empresa.',
      },
      lugar: { // El script de Google usa 'lugar', así que lo mantenemos consistente.
        type: Type.STRING,
        description: 'La dirección de entrega completa.',
      },
      cantidad: {
        type: Type.NUMBER,
        description: 'La cantidad del producto solicitado.',
      },
      producto: {
        type: Type.STRING,
        description: 'El nombre del producto solicitado, por ejemplo "agua de coco".',
      },
    },
    required: ['nombre', 'lugar', 'cantidad', 'producto'],
  },
};


const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const chatRef = useRef<Chat | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const initializeChat = useCallback(() => {
    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      chatRef.current = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: `Eres un asistente de pedidos para 'Puro Coco'. Tu objetivo es guiar al usuario a través del proceso de pedido paso a paso de una manera conversacional y natural. Sé conciso, claro y amigable. Sigue estrictamente esta secuencia y no te saltes ningún paso:
1. Comienza la conversación con el siguiente saludo y pregunta: "Hola soy tu asistente de pedidos de Puro Coco.

¿Podría indicarme su nombre o empresa?".
2. Una vez que te den un nombre, pide su dirección de entrega completa.
3. Inmediatamente después de que el usuario proporcione la dirección, sin hacer ningún comentario, pasa a la siguiente pregunta: "¿Me podría indicar la cantidad y el producto que desea pedir?". El único producto disponible es 'Agua de Coco'.
4. Cuando tengas toda la información (nombre, dirección, producto y cantidad), resume el pedido completo en una lista clara y pide confirmación al usuario (por ejemplo, '¿Es todo correcto?').
5. Si el usuario confirma, NO respondas directamente al usuario. En su lugar, llama a la herramienta 'guardarPedido' con todos los detalles recopilados (nombre, lugar, cantidad, producto).
6. Una vez que la herramienta 'guardarPedido' se ejecute, el sistema te lo notificará. SOLO ENTONCES, responde al usuario agradeciéndole por el pedido y diciéndole que ha sido procesado. Después de confirmar, reinicia la conversación para un nuevo pedido comenzando desde el paso 1.
7. Si el usuario no confirma o quiere cambiar algo, pregúntale qué le gustaría modificar y ayúdale a corregirlo. Luego, vuelve a presentar el resumen para su confirmación.
No respondas con JSON. Mantén la conversación en español.`,
          tools: [{ functionDeclarations: [guardarPedidoFunctionDeclaration] }],
        },
      });
      return true;
    } catch (error) {
      console.error("Failed to initialize Gemini AI:", error);
      setMessages([
        {
          id: 'error-init',
          text: 'Error: No se pudo inicializar el chatbot. Asegúrate de que la clave de API esté configurada correctamente.',
          sender: 'bot',
        },
      ]);
      return false;
    }
  }, []);

  useEffect(() => {
    const startConversation = async () => {
      if (!initializeChat() || !chatRef.current) return;

      setIsLoading(true);
      try {
        const response = await chatRef.current.sendMessage({ message: 'Hola' });
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            text: response.text,
            sender: 'bot',
          },
        ]);
      } catch (error) {
        console.error('Error starting conversation:', error);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            text: 'Lo siento, estoy teniendo problemas para conectarme. Por favor, inténtalo de nuevo más tarde.',
            sender: 'bot',
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    startConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initializeChat]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (inputText: string) => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      text: inputText,
      sender: 'user',
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      if (!chatRef.current) {
        throw new Error('Chat not initialized');
      }

      let response = await chatRef.current.sendMessage({ message: inputText });

      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        const fc = functionCalls[0];
        if (fc.name === 'guardarPedido') {
           // --------------------------------------------------------------------------
           // ¡ACCIÓN REQUERIDA!
           // Reemplaza la siguiente URL con la URL de tu aplicación web de Google Apps Script.
           // --------------------------------------------------------------------------
          const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwJh4O9vrX4FjiBMo6SjQyeNvPRWfXd9_SHqjgfjAA2XMJJHITDHLrGepQdQTbWD_YiUA/exec';
          
          // Fix: Removed check for placeholder URL. This comparison was causing a TypeScript
          // error because the constant SCRIPT_URL and the placeholder string have no overlap.
          
          const orderDetails = fc.args;
          let apiResult;

          try {
            await fetch(SCRIPT_URL, {
              method: 'POST',
              mode: 'no-cors',
              body: JSON.stringify(orderDetails)
            });
            apiResult = { result: "Pedido guardado exitosamente." };
          } catch (apiError) {
            console.error('Error calling Google Sheet API:', apiError);
            apiResult = { error: "Hubo un error al guardar el pedido." };
          }
          
          response = await chatRef.current.sendMessage({ 
            toolResponse: {
              functionResponses: {
                id: fc.id,
                name: fc.name,
                response: apiResult,
              }
            }
          });
        }
      }

      const botMessage: Message = {
        id: crypto.randomUUID(),
        text: response.text,
        sender: 'bot',
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        text: 'Oops, algo salió mal. Por favor, intenta de nuevo.',
        sender: 'bot',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="flex flex-col h-screen bg-black text-gray-200 font-sans">
      <main className="flex-1 flex flex-col items-center p-0 md:p-4 overflow-hidden">
        <div className="w-full max-w-3xl h-full flex flex-col bg-gray-900 md:rounded-2xl shadow-2xl overflow-hidden">
          <header className="bg-gray-900/80 backdrop-blur-sm p-4 border-b border-gray-800 flex justify-center items-center">
             <img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAE+AT4DASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXp0dHh5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T1denp+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A9/ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigA..."/>
          </header>
          <div ref={chatContainerRef} className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto scroll-smooth">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && (
               <div className="flex justify-start items-end gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-teal-400">
                    <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V5.25A.75.75 0 019 4.5zm5.854 1.854a.75.75 0 00-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM12 7.5a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V8.25A.75.75 0 0112 7.5zM7.146 6.354a.75.75 0 00-1.06-1.06L4.25 7.146a.75.75 0 101.06 1.06l1.836-1.852zM4.5 9a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V9.75A.75.75 0 014.5 9zm1.854 5.854a.75.75 0 00-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM15 12a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0115 12zm-2.854 1.146a.75.75 0 00-1.06-1.06l-1.836 1.852a.75.75 0 101.06 1.06l1.836-1.852zM18 9a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V9.75A.75.75 0 0118 9zm1.146-2.646a.75.75 0 00-1.06-1.06l-1.836 1.852a.75.75 0 101.06 1.06l1.836-1.852z" clipRule="evenodd" />
                    </svg>
                </div>
                <div className="bg-gray-800 p-4 rounded-tr-2xl rounded-bl-2xl rounded-br-2xl">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-teal-300 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-teal-300 rounded-full animate-pulse delay-200"></div>
                        <div className="w-2 h-2 bg-teal-300 rounded-full animate-pulse delay-400"></div>
                    </div>
                </div>
               </div>
            )}
          </div>
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </main>
    </div>
  );
};

export default App;
