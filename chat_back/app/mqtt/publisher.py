# app/mqtt/publisher.py
import paho.mqtt.publish as publish
import json
import os

def publish_mqtt(topic: str, payload: dict):
    print(f"📤 Publishing MQTT to {topic}: {payload}")

    publish.single(
        topic,
        json.dumps(payload),
        hostname=os.getenv("MQTT_BROKER", "chat-mqtt"),  # ✅ use Docker name
        port=int(os.getenv("MQTT_PORT", 1883))
    )
