import { useEffect, useState } from 'react';
import mqtt from 'mqtt';
import { useDispatch } from 'react-redux';
import { addNewGuest, receiveMsg } from '@/app/store/apps/chat/ChatSlice';
import { useUser } from '@/app/context/user-context';

export const useAdminEvents = () => {
  const dispatch = useDispatch();
  const { user } = useUser();
  const [organisationId] = useState(user?.organisation_id);

  useEffect(() => {
    console.log(`📡 Initializing MQTT for org: ${organisationId}`);
    const client = mqtt.connect('ws://localhost:9001');

    client.on('connect', () => {
      console.log('🟢 MQTT connected (admin panel)');
      client.subscribe(`admin/${organisationId}`, (err) => {
        if (!err) {
          console.log(`✅ Subscribed to admin/${organisationId}`);
        } else {
          console.error(`❌ Failed to subscribe to admin/${organisationId}`, err);
        }
      });
    });

    client.on('message', (topic, payload) => {
      const msgStr = payload.toString();
      console.log('📩 MQTT Message Received:', topic, msgStr);

      try {
        const data = JSON.parse(msgStr);

        // ✅ Typing Event
        if (data.event === 'typing') {
          console.log("✍️ Typing event received:", data);
          dispatch({
            type: 'chat/typingStatusUpdated',
            payload: {
              room_id: data.room_id,
              typing: data.typing,
            },
          });
          return;
        }

        // ✅ Online Event
       // ✅ Online Event
if (data.event === 'online') {
  console.log("🟢 Online status event:", data);
  dispatch({
    type: 'chat/updateGuestStatus',
    payload: {
      room_id: data.room_id,
      status: 'online', // 💡 match your reducer logic
    },
  });
  return;
}

if (data.event === 'offline') {
  console.log("🔴 Offline status event:", data);
  dispatch({
    type: 'chat/updateGuestStatus',
    payload: {
      room_id: data.room_id,
      status: 'offline', // 💡 match your reducer logic
    },
  });
  return;
}


        // ✅ New Message Event
        if (data.event === 'new_message') {
          const { room_id, message, new_guest, widget_token } = data;
          console.log("🧠 Parsed Message:", { room_id, message, new_guest });

          if (new_guest) {
            const newGuestPayload = {
              id: Date.now(),
              name: message.senderId,
              room_id,
              thumb: `https://api.dicebear.com/7.x/thumbs/svg?seed=${message.senderId}`,
              status: 'online',
              messages: [message],
              last_active: message.createdAt,
              last_message: message.msg,
              widget_token,
            };
            console.log("👤 Dispatching addNewGuest:", newGuestPayload);
            dispatch(addNewGuest(newGuestPayload));
          } else {
            const receivePayload = { room_id, msg: message };
            console.log("📬 Dispatching receiveMsg:", receivePayload);
            dispatch(receiveMsg(receivePayload));
          }
        } else {
          console.log("⚠️ Unknown event type received via MQTT:", data.event);
        }
      } catch (err) {
        console.error('❌ Failed to parse MQTT payload:', err);
      }
    });

    client.on('error', (err) => {
      console.error('🔴 MQTT Error:', err);
    });

    return () => {
      client.end(true, () => {
        console.log("🔌 MQTT disconnected (admin)");
      });
    };
  }, [dispatch]);
};
