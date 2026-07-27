import localforage from 'localforage';

localforage.config({
  name: 'TeluguChatDB',
  storeName: 'chats'
});

export const saveMessages = async (roomId, messages) => {
  try {
    await localforage.setItem(`messages_${roomId}`, messages);
  } catch (err) {
    console.error('Error saving messages offline:', err);
  }
};

export const getMessages = async (roomId) => {
  try {
    return await localforage.getItem(`messages_${roomId}`) || [];
  } catch (err) {
    console.error('Error getting messages offline:', err);
    return [];
  }
};

export const savePrivateMessages = async (conversationId, messages) => {
  try {
    await localforage.setItem(`pm_${conversationId}`, messages);
  } catch (err) {
    console.error('Error saving private messages:', err);
  }
};

export const getPrivateMessages = async (conversationId) => {
  try {
    return await localforage.getItem(`pm_${conversationId}`) || [];
  } catch (err) {
    console.error('Error getting private messages:', err);
    return [];
  }
};
