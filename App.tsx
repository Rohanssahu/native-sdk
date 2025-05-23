import React, { useEffect, useState, useRef } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { RetellWebClient } from "retell-client-native-sdk"; // your native SDK import

const agentId = "agent_1e1cc9d0370c420aab5f869e7e";

export default function App() {
  const [isCalling, setIsCalling] = useState(false);
  const [isAgentTalking, setIsAgentTalking] = useState(false);
  const [messages, setMessages] = useState<
    { type: "user" | "agent" | "system"; text: string }[]
  >([]);
  const [input, setInput] = useState("");

  const retellWebClientRef = useRef<RetellWebClient | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  function addMessage(text: string, type: "user" | "agent" | "system") {
    setMessages((msgs) => [...msgs, { type, text }]);
  }

  useEffect(() => {
    retellWebClientRef.current = new RetellWebClient();
    const client = retellWebClientRef.current;

    client.on("call_started", (data) => {
      addMessage(data ?? "Call started", "system");
    });

    client.on("call_ended", (data) => {
      addMessage(data ?? "Call ended", "system");
      setIsCalling(false);
      setIsAgentTalking(false);
    });

    client.on("agent_start_talking", () => setIsAgentTalking(true));
    client.on("agent_stop_talking", () => setIsAgentTalking(false));

    client.on("update", (update) => {
      if ("error" in update) {
        addMessage(update.error ?? "Unknown error", "system");
        client.stopCall();
        return;
      }
      if ("status" in update) {
        if (update.status === "listening") {
          addMessage("Agent is listening...", "system");
        }
        if (update.status === "recognizing") {
          addMessage("Recognizing speech...", "system");
        }
      }
      if ("agent_message" in update) {
        addMessage(update.agent_message ?? "", "agent");
      }
      if ("user_message" in update) {
        addMessage(update.user_message ?? "", "user");
      }
    });

    client.on("error", (error) => {
      addMessage(error ?? "Unknown error", "system");
      client.stopCall();
    });

    return () => {
      retellWebClientRef.current = null;
    };
  }, []);

  const startCall = () => {
    const client = retellWebClientRef.current;
    if (!client) {
      addMessage("Client not initialized", "system");
      return;
    }
    setIsCalling(true);
    addMessage("Calling agent...", "system");
    client.startCall(agentId);
  };

  const stopCall = () => {
    const client = retellWebClientRef.current;
    if (!client) {
      addMessage("Client not initialized", "system");
      return;
    }
    setIsCalling(false);
    setIsAgentTalking(false);
    client.stopCall();
    addMessage("Call ended", "system");
  };

  const sendMessage = () => {
    const client = retellWebClientRef.current;
    const message = input.trim();
    if (!client) {
      addMessage("Client not initialized", "system");
      return;
    }
    if (!message) return;

    addMessage(message, "user");
    client.sendUserMessage(message);
    setInput("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Retell Native SDK Demo</Text>
        {isCalling ? (
          <TouchableOpacity style={styles.buttonRed} onPress={stopCall}>
            <Text style={styles.buttonText}>End Call</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.buttonGreen} onPress={startCall}>
            <Text style={styles.buttonText}>Start Call</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.messagesContainer}
        ref={scrollViewRef}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
      >
        {messages.map((msg, i) => (
          <View
            key={i}
            style={[
              styles.message,
              msg.type === "user"
                ? styles.userMessage
                : msg.type === "agent"
                ? styles.agentMessage
                : styles.systemMessage,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                msg.type === "system" && styles.systemMessageText,
              ]}
            >
              {msg.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      {isAgentTalking && (
        <View style={styles.agentTalkingContainer}>
          <Text style={styles.agentTalkingText}>Agent is talking...</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={100}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            value={input}
            onChangeText={setInput}
            editable={isCalling}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <Button title="Send" onPress={sendMessage} disabled={!isCalling} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 16 },
  header: {
    marginTop: 20,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "bold" },
  buttonGreen: {
    backgroundColor: "#22c55e",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5,
  },
  buttonRed: {
    backgroundColor: "#ef4444",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5,
  },
  buttonText: { color: "white", fontWeight: "bold" },
  messagesContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 8,
    marginBottom: 12,
  },
  message: {
    marginVertical: 4,
    padding: 10,
    borderRadius: 10,
    maxWidth: "80%",
  },
  userMessage: {
    backgroundColor: "#3b82f6",
    alignSelf: "flex-end",
  },
  agentMessage: {
    backgroundColor: "#374151",
    alignSelf: "flex-start",
  },
  systemMessage: {
    backgroundColor: "#d1d5db",
    alignSelf: "center",
  },
  messageText: {
    color: "white",
  },
  systemMessageText: {
    color: "black",
    fontStyle: "italic",
  },
  agentTalkingContainer: {
    padding: 8,
    alignItems: "center",
  },
  agentTalkingText: {
    color: "green",
    fontWeight: "bold",
  },
  inputContainer: {
    flexDirection: "row",
    paddingBottom: 24,
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
});
