# app/mqtt/client.py
import json
import paho.mqtt.client as mqtt
import os

BROKER = os.getenv("MQTT_BROKER", "chat-mosquitto")  # ✅ use Docker service name
PORT = int(os.getenv("MQTT_PORT", 1883))

client = mqtt.Client()

def on_connect(client, userdata, flags, rc):
    print("✅ MQTT Connected:", rc)
    client.subscribe("chat/#")
    client.subscribe("admin/#")

def on_message(client, userdata, msg):
    print(f"📥 MQTT MSG | {msg.topic} → {msg.payload.decode()}")

client.on_connect = on_connect
client.on_message = on_message

def start_mqtt():
    client.connect(BROKER, PORT, 60)
    client.loop_start()
