function handleClick(target) {
    if(target == "others") {
      window.location = "/test-tfjs"
      return
    }
    window.location = `/test-tfjs/html/${target}.html`
}  

function startCamera(video1, frameCB) {
  const camera = new Camera(video1, {
    'audio': false,
    'video': {
      // facingMode: 'user',
      width: 480,
      height: 400,
      frameRate: {
        ideal: 30,
      }
    },
    onFrame: async () => {
      await frameCB(video1)
    },
    width: 480,
    height: 400
  });
  console.log('攝影機已取得');
  return camera
}

function stopCamera(camera) {
  if (camera && camera.video) {
    const stream = camera.video.srcObject; // 獲取媒體流
    if (stream) {
      const tracks = stream.getTracks(); // 獲取所有軌道
      tracks.forEach(track => track.stop()); // 停止每個軌道
    }
    camera.video.srcObject = null; // 釋放 <video> 元素的媒體流
  }

  // 如果 Camera 類有 stop 方法，也可以直接調用
  if (camera && typeof camera.stop === 'function') {
    camera.stop();
  }
  console.log('攝影機已停止');
}