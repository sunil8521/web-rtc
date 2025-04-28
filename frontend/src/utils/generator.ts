function generateUserId(): string {
    return Math.floor(10000 + Math.random() * 90000).toString(); 
  }
  
  function generateRoomIdWithLetters(length = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let roomId = '';
    for (let i = 0; i < length; i++) {
      roomId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return roomId;
  }
  
  export {generateRoomIdWithLetters,generateUserId}